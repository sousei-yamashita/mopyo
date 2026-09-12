import fs from "node:fs";

export const MARKER_PREFIX = "<!-- CI_GATE_MARKER:";
export const MARKER_SUFFIX = "-->";

/**
 * Parses the event payload from workflow_run event.
 */
export function parseEventPayload(eventPath) {
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error(`Event payload file not found: ${eventPath}`);
  }
  const content = fs.readFileSync(eventPath, "utf8");
  return JSON.parse(content);
}

/**
 * Extracts PR numbers from workflow_run payload.
 * Handles both pull_request event triggers and target branch pushes.
 */
export function extractPullRequestNumbers(payload) {
  const prs = payload?.workflow_run?.pull_requests;
  if (Array.isArray(prs) && prs.length > 0) {
    return prs.map((pr) => pr.number).filter((n) => typeof n === "number");
  }
  return [];
}

/**
 * Formats structured metadata into the stable HTML marker comment string.
 */
export function buildMarkerPayload(data) {
  const jsonString = JSON.stringify(data);
  return `${MARKER_PREFIX} ${jsonString} ${MARKER_SUFFIX}`;
}

/**
 * Parses structured data from a comment string if marker exists.
 */
export function parseMarkerPayload(commentBody) {
  if (typeof commentBody !== "string") return null;
  const startIndex = commentBody.indexOf(MARKER_PREFIX);
  if (startIndex === -1) return null;
  const endIndex = commentBody.indexOf(MARKER_SUFFIX, startIndex);
  if (endIndex === -1) return null;

  const jsonStr = commentBody
    .substring(startIndex + MARKER_PREFIX.length, endIndex)
    .trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Generates human-readable Markdown body with top-level marker for PR comments.
 */
export function buildCommentBody({
  prNumber,
  headSha,
  runId,
  workflowName,
  conclusion,
  runUrl,
  updatedAt = new Date().toISOString(),
}) {
  const markerData = {
    prNumber,
    headSha,
    runId,
    workflowName,
    conclusion,
    updatedAt,
  };
  const marker = buildMarkerPayload(markerData);
  const statusEmoji = conclusion === "success" ? "✅" : conclusion === "failure" ? "❌" : "⚠️";

  return `${marker}
## CI Gate Result: ${statusEmoji} ${conclusion.toUpperCase()}

- **Workflow**: ${workflowName}
- **PR Number**: #${prNumber}
- **Head SHA**: \`${headSha}\`
- **Run ID**: [${runId}](${runUrl})
- **Conclusion**: **${conclusion}**
- **Updated At**: ${updatedAt}

---
*This comment is automatically posted/updated by CI Gate. Machine-readable marker is embedded above for downstream automation.*`;
}

/**
 * Determines whether to skip posting/updating notification based on existing marker payload.
 */
export function shouldSkipNotification(existingPayload, currentData) {
  if (!existingPayload) return false;
  return (
    Number(existingPayload.prNumber) === Number(currentData.prNumber) &&
    String(existingPayload.headSha) === String(currentData.headSha) &&
    String(existingPayload.runId) === String(currentData.runId) &&
    String(existingPayload.conclusion) === String(currentData.conclusion)
  );
}

/**
 * Main execution logic for GitHub Actions CI Gate script.
 */
export async function runCiGate({ env = process.env, octokit = null } = {}) {
  const eventPath = env.GITHUB_EVENT_PATH;
  const token = env.GITHUB_TOKEN;
  const repository = env.GITHUB_REPOSITORY;

  if (!eventPath || !token || !repository) {
    throw new Error("Missing required environment variables (GITHUB_EVENT_PATH, GITHUB_TOKEN, GITHUB_REPOSITORY)");
  }

  const [owner, repo] = repository.split("/");
  const payload = parseEventPayload(eventPath);
  const workflowRun = payload.workflow_run;

  if (!workflowRun) {
    console.log("No workflow_run payload found. Exiting.");
    return;
  }

  const headSha = workflowRun.head_sha;
  const runId = workflowRun.id;
  const workflowName = workflowRun.name || "CI";
  const conclusion = workflowRun.conclusion || "unknown";
  const runUrl = workflowRun.html_url || `https://github.com/${owner}/${repo}/actions/runs/${runId}`;

  // Resolve PR numbers
  let prNumbers = extractPullRequestNumbers(payload);

  // Octokit / GitHub API Client setup
  const apiFetch = octokit || (async (endpoint, options = {}) => {
    const url = endpoint.startsWith("https://") ? endpoint : `https://api.github.com${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API request failed: ${res.status} ${res.statusText} - ${text}`);
    }
    return res.json();
  });

  if (prNumbers.length === 0 && headSha) {
    // Fallback: Query GitHub API for PRs associated with commit SHA
    try {
      const prs = await apiFetch(`/repos/${owner}/${repo}/commits/${headSha}/pulls`);
      if (Array.isArray(prs)) {
        prNumbers = prs.map((pr) => pr.number);
      }
    } catch (err) {
      console.warn(`Failed to query PRs for SHA ${headSha}: ${err.message}`);
    }
  }

  if (prNumbers.length === 0) {
    console.log(`No associated PR found for head SHA ${headSha}. Nothing to report.`);
    return;
  }

  for (const prNumber of prNumbers) {
    const currentData = { prNumber, headSha, runId, workflowName, conclusion };
    const comments = await apiFetch(`/repos/${owner}/${repo}/issues/${prNumber}/comments`);

    // Find top-level comment containing CI Gate marker
    let existingComment = null;
    let existingMarkerPayload = null;

    if (Array.isArray(comments)) {
      for (const comment of comments) {
        const parsed = parseMarkerPayload(comment.body);
        if (parsed) {
          existingComment = comment;
          existingMarkerPayload = parsed;
          break;
        }
      }
    }

    if (shouldSkipNotification(existingMarkerPayload, currentData)) {
      console.log(`Notification for PR #${prNumber}, runId ${runId}, headSha ${headSha}, status '${conclusion}' already up to date. Skipping.`);
      continue;
    }

    const commentBody = buildCommentBody({
      prNumber,
      headSha,
      runId,
      workflowName,
      conclusion,
      runUrl,
    });

    if (existingComment) {
      console.log(`Updating existing CI Gate comment ${existingComment.id} on PR #${prNumber}...`);
      await apiFetch(`/repos/${owner}/${repo}/issues/comments/${existingComment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body: commentBody }),
      });
    } else {
      console.log(`Creating new CI Gate comment on PR #${prNumber}...`);
      await apiFetch(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody }),
      });
    }
  }
}

// Auto-run if executed directly as a node script
if (process.argv[1] && process.argv[1].endsWith("ci-gate.js")) {
  runCiGate().catch((err) => {
    console.error("CI Gate execution failed:", err);
    process.exit(1);
  });
}
