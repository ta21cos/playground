import { invoke } from "@tauri-apps/api/core";

interface ClaudeSession {
  session_id: string;
  project_dir: string;
  branch: string | null;
  status: "Running" | "WaitingSubagent" | "Idle" | "Dead";
  model: string | null;
  total_tokens: number | null;
  started_at: number | null;
  last_activity: number | null;
  pid: number | null;
  cpu_usage: number | null;
  tty: string | null;
  last_message_preview: string | null;
  active_subagents: number;
}

const STATUS_CONFIG = {
  Running: { label: "Running", css: "running" },
  WaitingSubagent: { label: "Subagent", css: "waiting" },
  Idle: { label: "Idle", css: "idle" },
  Dead: { label: "Stopped", css: "dead" },
} as const;

function formatTokens(tokens: number | null): string {
  if (!tokens) return "";
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M tok`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(0)}K tok`;
  return `${tokens} tok`;
}

function timeAgo(epoch: number | null): string {
  if (!epoch) return "";
  const diff = Math.floor(Date.now() / 1000 - epoch);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortProject(dir: string): string {
  const parts = dir.split("/").filter(Boolean);
  const ghqIdx = parts.indexOf("ghq");
  if (ghqIdx >= 0) {
    const afterGhq = parts.slice(ghqIdx + 1);
    const domainParts = ["github.com", "gitlab.com", "bitbucket.org"];
    const domainIdx = afterGhq.findIndex((p) => domainParts.includes(p));
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

function renderSessions(sessions: ClaudeSession[]) {
  const list = document.getElementById("sessions-list")!;

  if (sessions.length === 0) {
    list.innerHTML = `<div class="empty-state">No active sessions found</div>`;
    return;
  }

  list.innerHTML = sessions
    .map((s) => {
      const config = STATUS_CONFIG[s.status];
      const meta = [
        s.model ? s.model.replace("claude-", "") : null,
        s.pid ? `PID ${s.pid}` : null,
        formatTokens(s.total_tokens) || null,
        s.last_activity ? timeAgo(s.last_activity) : null,
        s.active_subagents > 0 ? `${s.active_subagents} subagent(s)` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `
        <div class="session-card" data-session-id="${s.session_id}">
          <div class="status-dot ${config.css}"></div>
          <div class="session-info">
            <div class="session-project">${shortProject(s.project_dir)}</div>
            ${s.branch ? `<div class="session-branch-line"><span class="session-branch">${escapeHtml(s.branch)}</span></div>` : ""}
            <div class="session-meta">${meta}</div>
            ${s.last_message_preview ? `<div class="session-preview">${escapeHtml(s.last_message_preview)}</div>` : ""}
          </div>
          <span class="session-status-label ${config.css}">${config.label}</span>
        </div>
      `;
    })
    .join("");

  list.querySelectorAll(".session-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const sessionId = (card as HTMLElement).dataset.sessionId;
      if (!sessionId) return;
      try {
        await invoke("focus_session", { sessionId });
      } catch (e) {
        console.error("Failed to focus session:", e);
      }
    });
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function refresh() {
  try {
    const sessions = await invoke<ClaudeSession[]>("get_sessions");
    renderSessions(sessions);
  } catch (e) {
    console.error("Failed to get sessions:", e);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  refresh();
  setInterval(refresh, 3000);
  document.getElementById("refresh-btn")?.addEventListener("click", refresh);
});
