import { execSync } from "node:child_process";
import { getPreferenceValues } from "@raycast/api";

export interface CheckRun {
  name: string;
  status: string;
  conclusion: string | null;
  detailsUrl: string;
}

export interface PullRequest {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  repository: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  checks: CheckRun[];
  overallStatus: "success" | "failure" | "pending" | "no_checks";
}

interface Preferences {
  githubUser?: string;
}

function ghPath(): string {
  const candidates = ["/opt/homebrew/bin/gh", "/usr/local/bin/gh", "/usr/bin/gh"];
  for (const p of candidates) {
    try {
      execSync(`test -x ${p}`, { stdio: "ignore" });
      return p;
    } catch {
      // continue
    }
  }
  return "gh";
}

const GH = ghPath();

function exec(cmd: string): string {
  return execSync(cmd, { encoding: "utf-8", timeout: 30000 }).trim();
}

function getGitHubUser(): string {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.githubUser) return prefs.githubUser;
  return exec(`${GH} api user -q .login`);
}

interface GhPrNode {
  number: number;
  title: string;
  url: string;
  headRefName: string;
  isDraft: boolean;
  createdAt: string;
  updatedAt: string;
  repository: { nameWithOwner: string };
  statusCheckRollup?: {
    contexts: {
      nodes: Array<{
        __typename: string;
        name?: string;
        context?: string;
        status?: string;
        state?: string;
        conclusion?: string;
        detailsUrl?: string;
        targetUrl?: string;
      }>;
    };
  } | null;
}

export function fetchMyPRs(): PullRequest[] {
  const user = getGitHubUser();

  const query = `
    query($q: String!, $count: Int!) {
      search(query: $q, type: ISSUE, first: $count) {
        nodes {
          ... on PullRequest {
            number
            title
            url
            headRefName
            isDraft
            createdAt
            updatedAt
            repository { nameWithOwner }
            commits(last: 1) {
              nodes {
                commit {
                  statusCheckRollup {
                    contexts(first: 100) {
                      nodes {
                        __typename
                        ... on CheckRun {
                          name
                          status
                          conclusion
                          detailsUrl
                        }
                        ... on StatusContext {
                          context
                          state
                          targetUrl
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const searchQuery = `is:pr is:open author:${user} sort:updated-desc`;
  const raw = exec(
    `${GH} api graphql -f query='${query.replace(/'/g, "\\'")}' -F q='${searchQuery}' -F count=30`,
  );
  const data = JSON.parse(raw);
  const nodes = data.data.search.nodes as Array<{
    number: number;
    title: string;
    url: string;
    headRefName: string;
    isDraft: boolean;
    createdAt: string;
    updatedAt: string;
    repository: { nameWithOwner: string };
    commits: {
      nodes: Array<{
        commit: {
          statusCheckRollup: GhPrNode["statusCheckRollup"];
        };
      }>;
    };
  }>;

  return nodes.map((pr) => {
    const rollup = pr.commits?.nodes?.[0]?.commit?.statusCheckRollup;
    const checkNodes = rollup?.contexts?.nodes ?? [];

    const checks: CheckRun[] = checkNodes.map((c) => {
      if (c.__typename === "CheckRun") {
        return {
          name: c.name ?? "unknown",
          status: (c.status ?? "QUEUED").toUpperCase(),
          conclusion: c.conclusion?.toUpperCase() ?? null,
          detailsUrl: c.detailsUrl ?? pr.url,
        };
      }
      return {
        name: c.context ?? "unknown",
        status: "COMPLETED",
        conclusion: c.state?.toUpperCase() ?? null,
        detailsUrl: c.targetUrl ?? pr.url,
      };
    });

    let overallStatus: PullRequest["overallStatus"] = "no_checks";
    if (checks.length > 0) {
      const hasFailure = checks.some(
        (c) => c.conclusion === "FAILURE" || c.conclusion === "ERROR" || c.conclusion === "CANCELLED",
      );
      const hasPending = checks.some(
        (c) => c.status !== "COMPLETED" || c.conclusion === null,
      );
      if (hasFailure) overallStatus = "failure";
      else if (hasPending) overallStatus = "pending";
      else overallStatus = "success";
    }

    return {
      number: pr.number,
      title: pr.title,
      url: pr.url,
      headRefName: pr.headRefName,
      repository: pr.repository.nameWithOwner,
      isDraft: pr.isDraft,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,
      checks,
      overallStatus,
    };
  });
}
