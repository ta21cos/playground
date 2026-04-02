import { ActionPanel, Action, List, Color, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import { fetchMyPRs, PullRequest } from "./github";

const STATUS_CONFIG = {
  success: { label: "Passing", color: Color.Green, icon: Icon.CheckCircle },
  failure: { label: "Failing", color: Color.Red, icon: Icon.XMarkCircle },
  pending: { label: "Running", color: Color.Yellow, icon: Icon.CircleFilled },
  no_checks: { label: "No CI", color: Color.SecondaryText, icon: Icon.Circle },
} as const;

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function checkSummary(pr: PullRequest): string {
  const checks = pr.checks;
  if (checks.length === 0) return "";
  const passed = checks.filter((c) => c.conclusion === "SUCCESS").length;
  const failed = checks.filter(
    (c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR",
  ).length;
  const pending = checks.filter(
    (c) => c.status !== "COMPLETED" || c.conclusion === null,
  ).length;
  const parts: string[] = [];
  if (passed > 0) parts.push(`✓${passed}`);
  if (failed > 0) parts.push(`✗${failed}`);
  if (pending > 0) parts.push(`●${pending}`);
  return parts.join(" ");
}

export default function Command() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const result = fetchMyPRs();
      setPrs(result);
    } catch (e) {
      console.error("Failed to fetch PRs:", e);
      await showToast({ style: Toast.Style.Failure, title: "Failed to fetch PRs", message: String(e) });
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, [refresh]);

  const failing = prs.filter((p) => p.overallStatus === "failure");
  const pending = prs.filter((p) => p.overallStatus === "pending");
  const passing = prs.filter((p) => p.overallStatus === "success");
  const noChecks = prs.filter((p) => p.overallStatus === "no_checks");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter PRs...">
      <PRSection title="Failing" prs={failing} onRefresh={refresh} />
      <PRSection title="Running" prs={pending} onRefresh={refresh} />
      <PRSection title="Passing" prs={passing} onRefresh={refresh} />
      <PRSection title="No CI" prs={noChecks} onRefresh={refresh} />
      {prs.length === 0 && !isLoading && (
        <List.EmptyView title="No open PRs" description="You have no open pull requests" />
      )}
    </List>
  );
}

function PRSection({ title, prs, onRefresh }: { title: string; prs: PullRequest[]; onRefresh: () => Promise<void> }) {
  if (prs.length === 0) return null;
  return (
    <List.Section title={title} subtitle={`${prs.length}`}>
      {prs.map((pr) => (
        <PRItem key={`${pr.repository}#${pr.number}`} pr={pr} onRefresh={onRefresh} />
      ))}
    </List.Section>
  );
}

function PRItem({ pr, onRefresh }: { pr: PullRequest; onRefresh: () => Promise<void> }) {
  const config = STATUS_CONFIG[pr.overallStatus];
  const accessories: List.Item.Accessory[] = [];

  const summary = checkSummary(pr);
  if (summary) {
    accessories.push({ text: summary });
  }
  accessories.push({ text: timeAgo(pr.updatedAt) });
  accessories.push({ tag: { value: config.label, color: config.color } });

  const repoShort = pr.repository.split("/").pop() ?? pr.repository;
  const subtitle = `${repoShort}#${pr.number}`;
  const title = pr.isDraft ? `[Draft] ${pr.title}` : pr.title;

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      keywords={[pr.repository, pr.headRefName, `#${pr.number}`]}
      icon={{ source: config.icon, tintColor: config.color }}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open PR" url={pr.url} />
          {pr.checks
            .filter((c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR")
            .map((c, i) => (
              <Action.OpenInBrowser
                key={i}
                title={`Open Failed: ${c.name}`}
                url={c.detailsUrl}
                icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              />
            ))}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={onRefresh}
          />
          <Action.CopyToClipboard title="Copy PR URL" content={pr.url} />
        </ActionPanel>
      }
    />
  );
}
