import { ActionPanel, Action, List, Color, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { runAppleScript } from "@raycast/utils";
import { collectSessions, ClaudeSession } from "./sessions";

const STATUS_CONFIG = {
  Running: { label: "Running", color: Color.Green, icon: Icon.CircleFilled },
  WaitingSubagent: { label: "Subagent", color: Color.Yellow, icon: Icon.CircleFilled },
  Done: { label: "Done", color: Color.Blue, icon: Icon.CheckCircle },
  Idle: { label: "Idle", color: Color.SecondaryText, icon: Icon.Circle },
  Dead: { label: "Stopped", color: Color.SecondaryText, icon: Icon.CircleDisabled },
} as const;

function timeAgo(epoch: number | null): string {
  if (!epoch) return "";
  const diff = Math.floor(Date.now() / 1000 - epoch);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function focusIterm2(tty: string) {
  const script = `
    tell application "iTerm2"
      activate
      set targetTTY to "/dev/${tty}"
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
  `;
  const result = await runAppleScript(script);
  if (result !== "focused") {
    await showToast({ style: Toast.Style.Failure, title: "Session not found in iTerm2" });
  }
}

export default function Command() {
  const [sessions, setSessions] = useState<ClaudeSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      const result = collectSessions();
      setSessions(result);
    } catch (e) {
      console.error("Failed to collect sessions:", e);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  const visibleSessions = sessions.filter((s) => s.tty !== null);
  const activeSessions = visibleSessions.filter((s) => s.status === "Running" || s.status === "WaitingSubagent");
  const doneSessions = visibleSessions.filter((s) => s.status === "Done");
  const idleSessions = visibleSessions.filter((s) => s.status === "Idle");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter sessions...">
      {activeSessions.length > 0 && (
        <List.Section title="Active" subtitle={`${activeSessions.length}`}>
          {activeSessions.map((s) => (
            <SessionItem key={s.sessionId} session={s} />
          ))}
        </List.Section>
      )}
      {doneSessions.length > 0 && (
        <List.Section title="Done" subtitle={`${doneSessions.length}`}>
          {doneSessions.map((s) => (
            <SessionItem key={s.sessionId} session={s} />
          ))}
        </List.Section>
      )}
      {idleSessions.length > 0 && (
        <List.Section title="Idle" subtitle={`${idleSessions.length}`}>
          {idleSessions.map((s) => (
            <SessionItem key={s.sessionId} session={s} />
          ))}
        </List.Section>
      )}
      {sessions.length === 0 && !isLoading && (
        <List.EmptyView title="No sessions found" description="No Claude Code sessions active in the last 24h" />
      )}
    </List>
  );
}

function SessionItem({ session: s }: { session: ClaudeSession }) {
  const config = STATUS_CONFIG[s.status];
  const accessories: List.Item.Accessory[] = [];

  if (s.activeSubagents > 0) {
    accessories.push({ tag: { value: `${s.activeSubagents} sub`, color: Color.Yellow } });
  }
  if (s.lastActivity) {
    accessories.push({ text: timeAgo(s.lastActivity) });
  }
  accessories.push({ tag: { value: config.label, color: config.color } });

  const title = s.branch ? `⎇ ${s.branch}` : s.shortName;
  const dirLabel = s.shortName.split("/").pop() ?? s.shortName;

  return (
    <List.Item
      title={title}
      subtitle={dirLabel}
      keywords={[s.shortName, s.branch ?? "", s.sessionId]}
      icon={{ source: config.icon, tintColor: config.color }}
      accessories={accessories}
      actions={
        <ActionPanel>
          {s.tty && (
            <Action
              title="Focus in iTerm2"
              icon={Icon.Terminal}
              onAction={() => focusIterm2(s.tty!)}
            />
          )}
          <Action.CopyToClipboard title="Copy Session ID" content={s.sessionId} />
          <Action.CopyToClipboard title="Copy Project Path" content={s.projectDir} />
        </ActionPanel>
      }
    />
  );
}
