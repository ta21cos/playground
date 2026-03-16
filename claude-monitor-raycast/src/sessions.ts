import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface ClaudeSession {
  sessionId: string;
  projectDir: string;
  shortName: string;
  branch: string | null;
  status: "Running" | "WaitingSubagent" | "Done" | "Idle" | "Dead";
  model: string | null;
  totalTokens: number | null;
  lastActivity: number | null;
  pid: number | null;
  cpuUsage: number | null;
  tty: string | null;
  lastMessagePreview: string | null;
  activeSubagents: number;
}

interface ProcessInfo {
  pid: number;
  cpu: number;
  tty: string | null;
  cwd: string | null;
}

const pathCache = new Map<string, string>();
const branchCache = new Map<string, { value: string | null; ts: number }>();
const BRANCH_TTL = 30_000;

const processCache: { data: ClaudeProcessResult | null; ts: number } = {
  data: null,
  ts: 0,
};
const PROCESS_TTL = 5_000;

interface CachedSessionState {
  state: SessionState;
  mtimeMs: number;
}
const sessionStateCache = new Map<string, CachedSessionState>();

let lastSessions: ClaudeSession[] = [];

const previousStatusMap = new Map<
  string,
  { status: ClaudeSession["status"]; doneAt: number | null }
>();
const DONE_TTL = 5 * 60 * 1000;

function getClaudeDir(): string {
  return path.join(os.homedir(), ".claude");
}

interface ClaudeProcessResult {
  bySessionId: Map<string, ProcessInfo>;
  byCwd: Map<string, ProcessInfo>;
}

const debugLog: string[] = [];
function dbg(msg: string) {
  debugLog.push(`[${new Date().toISOString()}] ${msg}`);
}
function flushDebug() {
  if (debugLog.length === 0) return;
  try {
    fs.appendFileSync(
      path.join(os.homedir(), ".claude", "raycast-debug.log"),
      debugLog.join("\n") + "\n",
    );
  } catch {
    /* ignore */
  }
  debugLog.length = 0;
}

function batchGetCwds(pids: number[]): Map<number, string> {
  if (pids.length === 0) return new Map();
  const result = new Map<number, string>();
  dbg(`batchGetCwds called with pids: ${pids.join(", ")}`);
  for (const pid of pids) {
    try {
      const out = execSync(`/usr/sbin/lsof -a -p ${pid} -d cwd -Fn`, {
        encoding: "utf-8",
        timeout: 3000,
      });
      for (const line of out.split("\n")) {
        if (line.startsWith("n/")) {
          result.set(pid, line.slice(1));
          break;
        }
      }
    } catch (e) {
      dbg(`lsof failed for ${pid}: ${e}`);
    }
  }
  dbg(`batchGetCwds result: ${JSON.stringify([...result.entries()])}`);
  return result;
}

function getRunningClaudeProcesses(): ClaudeProcessResult {
  const now = Date.now();
  if (processCache.data && now - processCache.ts < PROCESS_TTL)
    return processCache.data;

  const bySessionId = new Map<string, ProcessInfo>();
  const byCwd = new Map<string, ProcessInfo>();
  const unmatchedPids: { pid: number; cpu: number; tty: string | null }[] = [];

  try {
    const output = execSync("/bin/ps -eo pid,%cpu,tty,args", {
      encoding: "utf-8",
      timeout: 5000,
    });
    for (const line of output.split("\n")) {
      if (!line.includes("/.local/bin/claude")) continue;
      const match = line.trim().match(/^(\d+)\s+([\d.]+)\s+(\S+)\s+(.+)$/);
      if (!match) continue;
      const [, pidStr, cpuStr, tty, args] = match;
      const pid = parseInt(pidStr);
      const cpu = parseFloat(cpuStr);
      const ttyVal = tty === "??" ? null : tty;
      if (!ttyVal) continue;

      const rMatch = args.match(/(?:-r|--resume)\s+([a-f0-9-]+)/);
      if (rMatch) {
        bySessionId.set(rMatch[1], { pid, cpu, tty: ttyVal, cwd: null });
      } else {
        unmatchedPids.push({ pid, cpu, tty: ttyVal });
      }
    }
  } catch (e) {
    dbg(`ps failed: ${e}`);
  }

  dbg(`bySessionId: ${JSON.stringify([...bySessionId.keys()])}`);
  dbg(
    `unmatchedPids: ${JSON.stringify(unmatchedPids.map((p) => ({ pid: p.pid, tty: p.tty })))}`,
  );

  const cwdMap = batchGetCwds(unmatchedPids.map((p) => p.pid));
  for (const { pid, cpu, tty } of unmatchedPids) {
    const cwd = cwdMap.get(pid) ?? null;
    if (cwd) {
      byCwd.set(cwd, { pid, cpu, tty, cwd });
    }
  }

  dbg(`byCwd keys: ${JSON.stringify([...byCwd.keys()])}`);
  flushDebug();

  const result = { bySessionId, byCwd };
  processCache.data = result;
  processCache.ts = now;
  return result;
}

function resolveProjectPath(encoded: string): string {
  const cached = pathCache.get(encoded);
  if (cached) return cached;

  const home = os.homedir();
  const homeEncoded = home.replace(/\//g, "-");

  let resolved: string;
  if (encoded.startsWith(homeEncoded)) {
    let rest = encoded.slice(homeEncoded.length);
    if (rest.startsWith("-")) rest = rest.slice(1);
    resolved = tryResolvePath(home, rest);
  } else {
    resolved = encoded;
  }

  pathCache.set(encoded, resolved);
  return resolved;
}

function tryResolvePath(base: string, encoded: string): string {
  if (!encoded) return base;

  let bestPath = `${base}/${encoded}`;

  for (let i = 1; i <= encoded.length; i++) {
    const segment = encoded.slice(0, i);
    const rest = encoded.slice(i);
    if (rest && !rest.startsWith("-")) continue;
    const nextRest = rest.startsWith("-") ? rest.slice(1) : rest;

    const candidate = `${base}/${segment}`;
    if (fs.existsSync(candidate)) {
      if (!rest) return candidate;
      const resolved = tryResolvePath(candidate, nextRest);
      if (fs.existsSync(resolved)) return resolved;
      bestPath = resolved;
    }

    if (segment.includes("-")) {
      const dotSegment = segment.replace("-", ".");
      const dotCandidate = `${base}/${dotSegment}`;
      if (fs.existsSync(dotCandidate)) {
        if (!rest) return dotCandidate;
        const resolved = tryResolvePath(dotCandidate, nextRest);
        if (fs.existsSync(resolved)) return resolved;
        bestPath = resolved;
      }
    }
  }

  return bestPath;
}

function shortProjectName(dir: string): string {
  const parts = dir.split("/").filter(Boolean);
  const ghqIdx = parts.indexOf("ghq");
  if (ghqIdx >= 0) {
    const afterGhq = parts.slice(ghqIdx + 1);
    const domainIdx = afterGhq.findIndex((p) =>
      ["github.com", "gitlab.com", "bitbucket.org"].includes(p),
    );
    if (domainIdx >= 0 && domainIdx + 2 < afterGhq.length) {
      return afterGhq.slice(domainIdx + 1).join("/");
    }
    return afterGhq.join("/");
  }
  const homeUser = parts.indexOf("Users");
  if (homeUser >= 0 && homeUser + 2 < parts.length) {
    return "~/" + parts.slice(homeUser + 2).join("/");
  }
  return parts.slice(-2).join("/") || dir;
}

function getGitBranch(projectDir: string): string | null {
  const now = Date.now();
  const cached = branchCache.get(projectDir);
  if (cached && now - cached.ts < BRANCH_TTL) return cached.value;

  let branch: string | null = null;

  const headPath = path.join(projectDir, ".git", "HEAD");
  try {
    const content = fs.readFileSync(headPath, "utf-8").trim();
    const prefix = "ref: refs/heads/";
    if (content.startsWith(prefix)) {
      branch = content.slice(prefix.length);
    }
  } catch {
    try {
      const output = execSync(
        `git -C "${projectDir}" rev-parse --abbrev-ref HEAD`,
        {
          encoding: "utf-8",
          timeout: 3000,
        },
      ).trim();
      if (output && output !== "HEAD") branch = output;
    } catch {
      // not a git repo
    }
  }

  branchCache.set(projectDir, { value: branch, ts: now });
  return branch;
}

function readLastLines(filePath: string, maxLines: number): string[] {
  try {
    const fd = fs.openSync(filePath, "r");
    const stat = fs.fstatSync(fd);
    const readSize = Math.min(stat.size, 128 * 1024);
    const buf = Buffer.alloc(readSize);
    fs.readSync(fd, buf, 0, readSize, stat.size - readSize);
    fs.closeSync(fd);
    const lines = buf.toString("utf-8").split("\n").filter(Boolean);
    return lines.slice(-maxLines);
  } catch {
    return [];
  }
}

interface SessionState {
  status: ClaudeSession["status"];
  model: string | null;
  preview: string | null;
  activeSubagents: number;
  endsWithLastPrompt: boolean;
  hasSignificantEntry: boolean;
}

function analyzeSessionState(jsonlPath: string, mtimeMs: number): SessionState {
  const cached = sessionStateCache.get(jsonlPath);
  if (cached && cached.mtimeMs === mtimeMs) return cached.state;

  const lines = readLastLines(jsonlPath, 30);

  let model: string | null = null;
  let preview: string | null = null;
  let activeSubagents = 0;
  let lastSignificantType: string | null = null;
  let lastStopReason: string | null = null;
  let hasAgentToolUse = false;
  let lastEntryType: string | null = null;

  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      const msgType = msg.type;
      lastEntryType = msgType;

      if (msgType === "progress") {
        if (line.includes("agent_progress"))
          activeSubagents = Math.max(activeSubagents, 1);
        continue;
      }

      if (msgType === "assistant") {
        const inner = msg.message;
        if (inner) {
          if (!model && inner.model) model = inner.model;
          lastStopReason = inner.stop_reason ?? null;
          if (Array.isArray(inner.content)) {
            for (const block of inner.content) {
              if (block.type === "tool_use" && block.name === "Agent")
                hasAgentToolUse = true;
              if (block.type === "text" && block.text) {
                const trimmed = block.text.slice(0, 100);
                if (trimmed) preview = trimmed;
              }
            }
          }
        }
        lastSignificantType = "assistant";
      } else if (msgType === "user") {
        lastSignificantType = "user";
        hasAgentToolUse = false;
      }
    } catch {
      // skip invalid JSON lines
    }
  }

  const subagentsDir = path.join(path.dirname(jsonlPath), "subagents");
  try {
    if (fs.existsSync(subagentsDir)) {
      const now = Date.now();
      const entries = fs.readdirSync(subagentsDir);
      let count = 0;
      for (const entry of entries) {
        if (!entry.endsWith(".jsonl")) continue;
        const stat = fs.statSync(path.join(subagentsDir, entry));
        if (now - stat.mtimeMs < 30_000) count++;
      }
      if (count > 0) activeSubagents = count;
    }
  } catch {
    // ignore
  }

  let status: ClaudeSession["status"] = "Idle";
  if (hasAgentToolUse && activeSubagents > 0) {
    status = "WaitingSubagent";
  } else if (lastSignificantType === "user") {
    status = "Running";
  } else if (lastStopReason === "end_turn") {
    status = "Idle";
  } else if (lastStopReason === "tool_use") {
    status = "Running";
  }

  const endsWithLastPrompt = lastEntryType === "last-prompt";
  const hasSignificantEntry = lastSignificantType !== null;
  const state = {
    status,
    model,
    preview,
    activeSubagents,
    endsWithLastPrompt,
    hasSignificantEntry,
  };
  sessionStateCache.set(jsonlPath, { state, mtimeMs });
  return state;
}

export function collectSessions(): ClaudeSession[] {
  const claudeDir = getClaudeDir();
  const projectsDir = path.join(claudeDir, "projects");
  if (!fs.existsSync(projectsDir)) return lastSessions;

  const { bySessionId, byCwd } = getRunningClaudeProcesses();

  let tokenCache: Record<string, { totalTokens?: number; startTime?: number }> =
    {};
  try {
    const raw = fs.readFileSync(
      path.join(claudeDir, "token-usage-cache.json"),
      "utf-8",
    );
    tokenCache = JSON.parse(raw);
  } catch {
    // ignore
  }

  const sessions: ClaudeSession[] = [];
  const now = Date.now() / 1000;

  let projDirs: string[];
  try {
    projDirs = fs
      .readdirSync(projectsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return lastSessions;
  }

  const activeProjDirNames = new Set<string>();
  byCwd.forEach((_, cwd) => {
    const cwdEncoded = cwd.replace(/[/.]/g, "-");
    for (const name of projDirs) {
      if (name === cwdEncoded || cwdEncoded.startsWith(name)) {
        activeProjDirNames.add(name);
      }
    }
  });
  bySessionId.forEach((_, sessionId) => {
    for (const name of projDirs) {
      try {
        fs.accessSync(path.join(projectsDir, name, `${sessionId}.jsonl`));
        activeProjDirNames.add(name);
      } catch {
        /* not in this dir */
      }
    }
  });

  for (const projDirName of projDirs) {
    const projPath = path.join(projectsDir, projDirName);

    let projStat: fs.Stats;
    try {
      projStat = fs.statSync(projPath);
    } catch {
      continue;
    }
    if (
      !activeProjDirNames.has(projDirName) &&
      now - projStat.mtimeMs / 1000 > 86400
    )
      continue;

    const resolvedPath = resolveProjectPath(projDirName);
    const shortName = shortProjectName(resolvedPath);
    const branch = getGitBranch(resolvedPath);

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(projPath, { withFileTypes: true });
    } catch {
      continue;
    }

    let cwdProcForProject: ProcessInfo | null = null;
    byCwd.forEach((proc, cwd) => {
      if (cwdProcForProject) return;
      if (cwd === resolvedPath || cwd.startsWith(resolvedPath + "/")) {
        cwdProcForProject = proc;
        return;
      }
      const cwdEncoded = cwd.replace(/[/.]/g, "-");
      if (
        projDirName === cwdEncoded ||
        cwdEncoded.startsWith(projDirName + "-")
      ) {
        cwdProcForProject = proc;
      }
    });

    let newestMtime = 0;
    let newestSessionId: string | null = null;

    const projSessions: {
      filePath: string;
      sessionId: string;
      mtime: number;
      mtimeMs: number;
    }[] = [];

    for (const entry of entries) {
      if (
        !entry.isFile() ||
        !entry.name.endsWith(".jsonl") ||
        entry.name.startsWith(".")
      )
        continue;

      const filePath = path.join(projPath, entry.name);
      const sessionId = entry.name.replace(".jsonl", "");

      let fileStat: fs.Stats;
      try {
        fileStat = fs.statSync(filePath);
      } catch {
        continue;
      }

      const mtime = fileStat.mtimeMs / 1000;
      if (now - mtime > 86400) continue;

      projSessions.push({
        filePath,
        sessionId,
        mtime,
        mtimeMs: fileStat.mtimeMs,
      });

      if (mtime > newestMtime) {
        newestMtime = mtime;
        newestSessionId = sessionId;
      }
    }

    for (const { filePath, sessionId, mtime, mtimeMs } of projSessions) {
      const state = analyzeSessionState(filePath, mtimeMs);

      let procInfo = bySessionId.get(sessionId) ?? null;
      if (!procInfo && cwdProcForProject && sessionId === newestSessionId) {
        procInfo = cwdProcForProject;
      }

      let pid: number | null = null;
      let cpuUsage: number | null = null;
      let tty: string | null = null;
      let status = state.status;

      const prev = previousStatusMap.get(sessionId);

      if (procInfo) {
        pid = procInfo.pid;
        cpuUsage = procInfo.cpu;
        tty = procInfo.tty;
        if (!state.hasSignificantEntry) {
          status = "Running";
        } else if (status === "Idle") {
          status = "Done";
        } else if (cpuUsage > 1.0 && status !== "Running") {
          status = "Running";
        }
      } else {
        const wasActive =
          prev &&
          (prev.status === "Running" || prev.status === "WaitingSubagent");
        const turnCompleted =
          state.endsWithLastPrompt || state.status === "Idle";

        if (wasActive && turnCompleted) {
          status = "Done";
        } else if (
          prev?.status === "Done" &&
          prev.doneAt &&
          Date.now() - prev.doneAt < DONE_TTL
        ) {
          status = "Done";
        } else {
          status = status !== "Idle" ? "Dead" : "Idle";
        }
      }

      const tokenInfo = tokenCache[filePath];

      sessions.push({
        sessionId,
        projectDir: resolvedPath,
        shortName,
        branch,
        status,
        model: state.model,
        totalTokens: tokenInfo?.totalTokens ?? null,
        lastActivity: mtime,
        pid,
        cpuUsage,
        tty,
        lastMessagePreview: state.preview,
        activeSubagents: state.activeSubagents,
      });
    }
  }

  sessions.sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));

  const now2 = Date.now();
  for (const s of sessions) {
    const prev = previousStatusMap.get(s.sessionId);
    const doneAt = s.status === "Done" ? (prev?.doneAt ?? now2) : null;
    previousStatusMap.set(s.sessionId, { status: s.status, doneAt });
  }

  dbg(
    `collectSessions result (${sessions.length}): ${JSON.stringify(sessions.map((s) => ({ sid: s.sessionId.slice(0, 8), tty: s.tty, pid: s.pid, status: s.status, shortName: s.shortName })))}`,
  );
  flushDebug();

  lastSessions = sessions;
  return sessions;
}
