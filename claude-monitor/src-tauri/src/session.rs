use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufReader, Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::process::Command;
use std::sync::Mutex;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use sysinfo::{ProcessesToUpdate, ProcessRefreshKind, RefreshKind, System};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeSession {
    pub session_id: String,
    pub project_dir: String,
    pub branch: Option<String>,
    pub status: SessionStatus,
    pub model: Option<String>,
    pub total_tokens: Option<u64>,
    pub started_at: Option<u64>,
    pub last_activity: Option<u64>,
    pub pid: Option<u32>,
    pub cpu_usage: Option<f32>,
    pub tty: Option<String>,
    pub last_message_preview: Option<String>,
    pub active_subagents: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SessionStatus {
    Running,
    WaitingSubagent,
    Idle,
    Dead,
}

#[derive(Debug, Deserialize)]
struct JsonlMessage {
    #[serde(rename = "type")]
    msg_type: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AssistantMessage {
    message: Option<AssistantInner>,
}

#[derive(Debug, Deserialize)]
struct AssistantInner {
    model: Option<String>,
    stop_reason: Option<String>,
    content: Option<Vec<ContentBlock>>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    #[serde(rename = "type")]
    content_type: Option<String>,
    name: Option<String>,
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
struct TokenCacheEntry {
    #[serde(rename = "totalTokens")]
    total_tokens: Option<u64>,
    #[serde(rename = "startTime")]
    start_time: Option<u64>,
}

struct Cache {
    path_cache: HashMap<String, String>,
    branch_cache: HashMap<String, (Option<String>, Instant)>,
    tty_cache: HashMap<u32, (Option<String>, Instant)>,
}

static CACHE: Mutex<Option<Cache>> = Mutex::new(None);

const BRANCH_TTL: Duration = Duration::from_secs(30);
const TTY_TTL: Duration = Duration::from_secs(60);

fn with_cache<F, R>(f: F) -> R
where
    F: FnOnce(&mut Cache) -> R,
{
    let mut guard = CACHE.lock().unwrap();
    let cache = guard.get_or_insert_with(|| Cache {
        path_cache: HashMap::new(),
        branch_cache: HashMap::new(),
        tty_cache: HashMap::new(),
    });
    f(cache)
}

fn get_claude_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude"))
}

fn find_running_claude_processes(sys: &System) -> HashMap<String, (u32, f32, Option<String>)> {
    let mut result = HashMap::new();

    for (pid, process) in sys.processes() {
        let cmd = process.cmd();
        let exe_name = process.name().to_string_lossy().to_string();

        if !exe_name.contains("claude") {
            continue;
        }

        let mut session_id = None;
        let mut found_r = false;
        for arg in cmd.iter() {
            let arg_str = arg.to_string_lossy();
            if found_r {
                session_id = Some(arg_str.to_string());
                break;
            }
            if arg_str == "-r" || arg_str == "--resume" {
                found_r = true;
            }
            if arg_str.starts_with("-r=") {
                session_id = Some(arg_str.trim_start_matches("-r=").to_string());
                break;
            }
        }

        let pid_u32 = pid.as_u32();
        let tty = get_tty_for_pid_cached(pid_u32);

        if let Some(sid) = session_id {
            result.insert(sid, (pid_u32, process.cpu_usage(), tty));
        } else {
            let pid_str = format!("pid-{}", pid_u32);
            result.insert(pid_str, (pid_u32, process.cpu_usage(), tty));
        }
    }

    result
}

fn get_tty_for_pid_cached(pid: u32) -> Option<String> {
    let now = Instant::now();
    let cached = with_cache(|c| {
        c.tty_cache.get(&pid).and_then(|(val, ts)| {
            if now.duration_since(*ts) < TTY_TTL {
                Some(val.clone())
            } else {
                None
            }
        })
    });
    if let Some(val) = cached {
        return val;
    }

    let output = Command::new("ps")
        .args(["-o", "tty=", "-p", &pid.to_string()])
        .output()
        .ok();
    let tty = output.and_then(|o| {
        let s = String::from_utf8_lossy(&o.stdout).trim().to_string();
        if s.is_empty() || s == "??" { None } else { Some(s) }
    });
    with_cache(|c| { c.tty_cache.insert(pid, (tty.clone(), now)); });
    tty
}

fn read_last_lines(path: &PathBuf, max_lines: usize) -> Vec<String> {
    let file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return vec![],
    };

    let file_size = match file.metadata() {
        Ok(m) => m.len(),
        Err(_) => return vec![],
    };

    let read_size = std::cmp::min(file_size, 64 * 1024) as usize;
    let mut reader = BufReader::new(file);
    if file_size > read_size as u64 {
        let _ = reader.seek(SeekFrom::End(-(read_size as i64)));
    }

    let mut buf = vec![0u8; read_size];
    let bytes_read = match reader.read(&mut buf) {
        Ok(n) => n,
        Err(_) => return vec![],
    };
    buf.truncate(bytes_read);

    let text = String::from_utf8_lossy(&buf);
    let lines: Vec<String> = text.lines().map(|l| l.to_string()).collect();

    if lines.len() > max_lines {
        lines[lines.len() - max_lines..].to_vec()
    } else {
        lines
    }
}

fn analyze_session_state(jsonl_path: &PathBuf) -> (SessionStatus, Option<String>, Option<String>, u32) {
    let lines = read_last_lines(jsonl_path, 30);

    let mut status = SessionStatus::Idle;
    let mut model = None;
    let mut preview = None;
    let mut active_subagents: u32 = 0;

    let mut last_significant_type = None;
    let mut last_stop_reason = None;
    let mut has_agent_tool_use = false;

    for line in &lines {
        if let Ok(msg) = serde_json::from_str::<JsonlMessage>(line) {
            let msg_type = msg.msg_type.as_deref().unwrap_or("");

            if msg_type == "progress" {
                if line.contains("agent_progress") {
                    active_subagents = active_subagents.max(1);
                }
                continue;
            }

            if msg_type == "assistant" {
                if let Ok(am) = serde_json::from_str::<AssistantMessage>(line) {
                    if let Some(inner) = &am.message {
                        if model.is_none() {
                            model = inner.model.clone();
                        }
                        last_stop_reason = inner.stop_reason.clone();

                        if let Some(content) = &inner.content {
                            for block in content {
                                if block.content_type.as_deref() == Some("tool_use") {
                                    if block.name.as_deref() == Some("Agent") {
                                        has_agent_tool_use = true;
                                    }
                                }
                                if block.content_type.as_deref() == Some("text") {
                                    if let Some(text) = &block.text {
                                        let trimmed = text.chars().take(100).collect::<String>();
                                        if !trimmed.is_empty() {
                                            preview = Some(trimmed);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                last_significant_type = Some("assistant");
            } else if msg_type == "user" {
                last_significant_type = Some("user");
                has_agent_tool_use = false;
            }
        }
    }

    let subagents_dir = jsonl_path.parent().map(|p| p.join("subagents"));
    if let Some(sa_dir) = subagents_dir {
        if sa_dir.exists() {
            let now = SystemTime::now();
            if let Ok(entries) = fs::read_dir(&sa_dir) {
                let mut count = 0u32;
                for entry in entries.flatten() {
                    if entry.path().extension().map(|e| e == "jsonl").unwrap_or(false) {
                        if let Ok(meta) = entry.metadata() {
                            if let Ok(modified) = meta.modified() {
                                if now.duration_since(modified).unwrap_or(Duration::from_secs(999)) < Duration::from_secs(30) {
                                    count += 1;
                                }
                            }
                        }
                    }
                }
                if count > 0 {
                    active_subagents = count;
                }
            }
        }
    }

    if has_agent_tool_use && active_subagents > 0 {
        status = SessionStatus::WaitingSubagent;
    } else if last_significant_type == Some("user") {
        status = SessionStatus::Running;
    } else if last_stop_reason.as_deref() == Some("end_turn") {
        status = SessionStatus::Idle;
    } else if last_stop_reason.as_deref() == Some("tool_use") {
        status = SessionStatus::Running;
    }

    (status, model, preview, active_subagents)
}

fn get_file_mtime_epoch(path: &PathBuf) -> Option<u64> {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
}

pub fn collect_sessions() -> Vec<ClaudeSession> {
    let claude_dir = match get_claude_dir() {
        Some(d) => d,
        None => return vec![],
    };

    let projects_dir = claude_dir.join("projects");
    if !projects_dir.exists() {
        return vec![];
    }

    let mut sys = System::new_with_specifics(
        RefreshKind::nothing().with_processes(ProcessRefreshKind::everything()),
    );
    sys.refresh_processes(ProcessesToUpdate::All, true);
    let running_processes = find_running_claude_processes(&sys);

    let token_cache: HashMap<String, TokenCacheEntry> = fs::read_to_string(claude_dir.join("token-usage-cache.json"))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();

    let mut sessions = Vec::new();

    let project_dirs: Vec<_> = fs::read_dir(&projects_dir)
        .into_iter()
        .flat_map(|rd| rd.into_iter().flatten())
        .filter(|e| e.path().is_dir())
        .collect();

    for proj_entry in &project_dirs {
        let proj_path = proj_entry.path();
        let encoded_name = proj_entry.file_name().to_string_lossy().to_string();
        let proj_name = resolve_project_path_cached(&encoded_name);
        let branch = get_git_branch_cached(&proj_name);

        let jsonl_files: Vec<_> = fs::read_dir(&proj_path)
            .into_iter()
            .flat_map(|rd| rd.into_iter().flatten())
            .filter(|e| {
                e.path().extension().map(|ext| ext == "jsonl").unwrap_or(false)
                    && !e.file_name().to_string_lossy().starts_with(".")
            })
            .collect();

        for entry in jsonl_files {
            let path = entry.path();
            let session_id = path.file_stem()
                .map(|s| s.to_string_lossy().to_string())
                .unwrap_or_default();

            let mtime = get_file_mtime_epoch(&path);
            let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_secs();

            if let Some(mt) = mtime {
                if now - mt > 86400 {
                    continue;
                }
            }

            let (mut status, model, preview, active_subagents) = analyze_session_state(&path);

            let process_info = running_processes.get(&session_id);
            let (pid, cpu, tty) = match process_info {
                Some((p, c, t)) => (Some(*p), Some(*c), t.clone()),
                None => {
                    status = if status != SessionStatus::Idle {
                        SessionStatus::Dead
                    } else {
                        SessionStatus::Idle
                    };
                    (None, None, None)
                }
            };

            if pid.is_some() && cpu.unwrap_or(0.0) > 1.0 && status == SessionStatus::Idle {
                status = SessionStatus::Running;
            }

            let cache_key = path.to_string_lossy().to_string();
            let token_info = token_cache.get(&cache_key);
            let total_tokens = token_info.and_then(|t| t.total_tokens);
            let started_at = token_info.and_then(|t| t.start_time);

            sessions.push(ClaudeSession {
                session_id,
                project_dir: proj_name.clone(),
                branch: branch.clone(),
                status,
                model,
                total_tokens,
                started_at,
                last_activity: mtime,
                pid,
                cpu_usage: cpu,
                tty,
                last_message_preview: preview,
                active_subagents,
            });
        }
    }

    sessions.sort_by(|a, b| b.last_activity.cmp(&a.last_activity));
    sessions
}

fn resolve_project_path_cached(encoded: &str) -> String {
    let cached = with_cache(|c| c.path_cache.get(encoded).cloned());
    if let Some(val) = cached {
        return val;
    }
    let resolved = resolve_project_path(encoded);
    with_cache(|c| { c.path_cache.insert(encoded.to_string(), resolved.clone()); });
    resolved
}

fn resolve_project_path(encoded: &str) -> String {
    let home = dirs::home_dir()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_default();
    let home_encoded = home.replace('/', "-");

    if let Some(rest) = encoded.strip_prefix(&home_encoded) {
        let rest = rest.strip_prefix('-').unwrap_or(rest);
        try_resolve_path(&home, rest)
    } else {
        encoded.to_string()
    }
}

fn try_resolve_path(base: &str, encoded: &str) -> String {
    if encoded.is_empty() {
        return base.to_string();
    }

    let mut best_path = format!("{}/{}", base, encoded);

    for i in 1..=encoded.len() {
        let (segment, rest) = encoded.split_at(i);
        if !rest.is_empty() && !rest.starts_with('-') {
            continue;
        }
        let next_rest = rest.strip_prefix('-').unwrap_or(rest);

        let candidate = format!("{}/{}", base, segment);
        if std::path::Path::new(&candidate).exists() {
            if rest.is_empty() {
                return candidate;
            }
            let resolved = try_resolve_path(&candidate, next_rest);
            if std::path::Path::new(&resolved).exists() {
                return resolved;
            }
            best_path = resolved;
        }

        if segment.contains('-') {
            let dot_segment = segment.replacen('-', ".", 1);
            let dot_candidate = format!("{}/{}", base, dot_segment);
            if std::path::Path::new(&dot_candidate).exists() {
                if rest.is_empty() {
                    return dot_candidate;
                }
                let resolved = try_resolve_path(&dot_candidate, next_rest);
                if std::path::Path::new(&resolved).exists() {
                    return resolved;
                }
                best_path = resolved;
            }
        }
    }

    best_path
}

fn get_git_branch_cached(project_dir: &str) -> Option<String> {
    let now = Instant::now();
    let cached = with_cache(|c| {
        c.branch_cache.get(project_dir).and_then(|(val, ts)| {
            if now.duration_since(*ts) < BRANCH_TTL {
                Some(val.clone())
            } else {
                None
            }
        })
    });
    if let Some(val) = cached {
        return val;
    }

    let branch = get_git_branch(project_dir);
    with_cache(|c| { c.branch_cache.insert(project_dir.to_string(), (branch.clone(), now)); });
    branch
}

fn get_git_branch(project_dir: &str) -> Option<String> {
    let head_path = std::path::Path::new(project_dir).join(".git/HEAD");
    if let Ok(content) = fs::read_to_string(&head_path) {
        let content = content.trim();
        if let Some(branch) = content.strip_prefix("ref: refs/heads/") {
            return Some(branch.to_string());
        }
    }

    let output = Command::new("git")
        .args(["-C", project_dir, "rev-parse", "--abbrev-ref", "HEAD"])
        .output()
        .ok()?;
    if output.status.success() {
        let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if branch.is_empty() || branch == "HEAD" {
            None
        } else {
            Some(branch)
        }
    } else {
        None
    }
}

pub fn focus_iterm2_session(session: &ClaudeSession) -> Result<String, String> {
    let tty = session.tty.as_ref().ok_or("No TTY associated with this session")?;

    let script = format!(
        r#"
        tell application "iTerm2"
            activate
            set targetTTY to "/dev/{}"
            repeat with w in windows
                repeat with t in tabs of w
                    repeat with s in sessions of t
                        if (tty of s) is targetTTY then
                            select t
                            tell w
                                select
                            end tell
                            return "focused"
                        end if
                    end repeat
                end repeat
            end repeat
            return "not_found"
        end tell
        "#,
        tty
    );

    let output = Command::new("osascript")
        .arg("-e")
        .arg(&script)
        .output()
        .map_err(|e| format!("Failed to run osascript: {}", e))?;

    let result = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if result == "focused" {
        Ok("Session focused in iTerm2".to_string())
    } else {
        Err(format!("TTY {} not found in any iTerm2 session", tty))
    }
}
