import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  MARKER_PREFIX,
  MARKER_SUFFIX,
  buildMarkerPayload,
  parseMarkerPayload,
  buildCommentBody,
  extractPullRequestNumbers,
  isTrustedComment,
  isCurrentReviewablePullRequest,
  isRunAlreadyNotified,
  runCiGate,
} from "../scripts/ci-gate.js";

function makeEnv(eventPath) {
  return {
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_TOKEN: "mock_token",
    GITHUB_REPOSITORY: "owner/repo",
  };
}

function writeEvent(workflowRun) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");
  fs.writeFileSync(eventPath, JSON.stringify({ workflow_run: workflowRun }));
  return { tmpDir, eventPath };
}

function reviewablePr(headSha, overrides = {}) {
  return {
    number: 99,
    state: "open",
    draft: false,
    merged: false,
    head: { sha: headSha },
    ...overrides,
  };
}

function makeApi({
  headSha,
  pr = reviewablePr(headSha),
  commentsByPage = { 1: [] },
  fallbackPrs = null,
  failFallback = null,
  commentsShape = null,
} = {}) {
  const calls = [];
  const api = async (endpoint, options = {}) => {
    calls.push({ endpoint, options });

    if (endpoint.includes(`/commits/${headSha}/pulls`)) {
      if (failFallback) throw failFallback;
      return fallbackPrs ?? [];
    }

    if (endpoint === "/repos/owner/repo/pulls/99") {
      return pr;
    }

    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && (!options.method || options.method === "GET")) {
      if (commentsShape !== null) return commentsShape;
      const url = new URL(endpoint, "https://api.github.com");
      const page = Number(url.searchParams.get("page") || "1");
      return commentsByPage[page] ?? [];
    }

    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && options.method === "POST") {
      return { id: 123, body: options.body };
    }

    return {};
  };

  return { api, calls };
}

test("marker round-trip and parsing", () => {
  const data = {
    prNumber: 42,
    headSha: "abc123",
    runId: 987,
    runAttempt: 2,
    workflowName: "CI",
    conclusion: "success",
    createdAt: "2026-09-13T00:00:00Z",
  };
  const marker = buildMarkerPayload(data);
  assert.ok(marker.startsWith(MARKER_PREFIX));
  assert.ok(marker.endsWith(MARKER_SUFFIX));
  assert.deepEqual(parseMarkerPayload(marker), data);
  assert.equal(parseMarkerPayload("no marker"), null);
  assert.equal(parseMarkerPayload("<!-- CI_GATE_MARKER: invalid -->"), null);
});

test("trusted comments require the official GitHub Actions bot identity", () => {
  assert.equal(isTrustedComment({ user: { login: "github-actions[bot]", type: "Bot" } }), true);
  assert.equal(isTrustedComment({ user: { login: "github-actions[bot]", type: "User" } }), false);
  assert.equal(isTrustedComment({ user: { login: "other[bot]", type: "Bot" } }), false);
  assert.equal(isTrustedComment(null), false);
});

test("extractPullRequestNumbers returns workflow_run PR numbers", () => {
  assert.deepEqual(
    extractPullRequestNumbers({ workflow_run: { pull_requests: [{ number: 10 }, { number: 12 }] } }),
    [10, 12]
  );
  assert.deepEqual(extractPullRequestNumbers({ workflow_run: {} }), []);
});

test("current PR eligibility requires open, non-draft, exact current head", () => {
  assert.equal(isCurrentReviewablePullRequest(reviewablePr("sha-a"), "sha-a"), true);
  assert.equal(isCurrentReviewablePullRequest(reviewablePr("sha-b"), "sha-a"), false);
  assert.equal(isCurrentReviewablePullRequest(reviewablePr("sha-a", { state: "closed" }), "sha-a"), false);
  assert.equal(isCurrentReviewablePullRequest(reviewablePr("sha-a", { draft: true }), "sha-a"), false);
});

test("comment body distinguishes conclusions and does not mention anyone by default", () => {
  const body = buildCommentBody({
    prNumber: 5,
    headSha: "sha-a",
    runId: 100,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/example/repo/actions/runs/100",
    createdAt: "2026-09-13T00:00:00Z",
  });
  assert.ok(body.includes("## CI Gate Result: ✅ SUCCESS"));
  assert.equal(body.includes("@sousei-yamashita"), false);
  assert.equal(parseMarkerPayload(body).runAttempt, 1);
});

test("dedupe identity includes PR, SHA, run ID, and attempt with legacy attempt=1 compatibility", () => {
  const legacy = [{ prNumber: 7, headSha: "sha-a", runId: 555 }];
  assert.equal(isRunAlreadyNotified(legacy, { prNumber: 7, headSha: "sha-a", runId: 555, runAttempt: 1 }), true);
  assert.equal(isRunAlreadyNotified(legacy, { prNumber: 7, headSha: "sha-a", runId: 555, runAttempt: 2 }), false);
  assert.equal(isRunAlreadyNotified(legacy, { prNumber: 7, headSha: "sha-b", runId: 555, runAttempt: 1 }), false);
});

test("open non-draft PR at the current head is notified", async () => {
  const headSha = "current-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 10001,
    run_attempt: 1,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const { api, calls } = makeApi({ headSha });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.ok(calls.some((call) => call.endpoint === "/repos/owner/repo/pulls/99"));
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 1);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("old CI finishing after the PR head moved does not notify", async () => {
  const headSha = "old-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 10002,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const { api, calls } = makeApi({ headSha, pr: reviewablePr("new-sha") });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.equal(calls.filter((call) => call.options.method === "POST").length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("closed or merged PR does not notify", async () => {
  const headSha = "closed-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 10003,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const { api, calls } = makeApi({
    headSha,
    pr: reviewablePr(headSha, { state: "closed", merged: true, merged_at: "2026-09-13T00:00:00Z" }),
  });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.equal(calls.filter((call) => call.options.method === "POST").length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("draft PR does not notify", async () => {
  const headSha = "draft-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 10004,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const { api, calls } = makeApi({ headSha, pr: reviewablePr(headSha, { draft: true }) });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.equal(calls.filter((call) => call.options.method === "POST").length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("main-push fallback returning a merged PR does not notify", async () => {
  const headSha = "main-push-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 10005,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [],
  });
  const { api, calls } = makeApi({
    headSha,
    fallbackPrs: [{ number: 99 }],
    pr: reviewablePr(headSha, { state: "closed", merged: true }),
  });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.ok(calls.some((call) => call.endpoint.includes(`/commits/${headSha}/pulls`)));
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("attempt 2 success is notified after attempt 1 failure", async () => {
  const headSha = "rerun-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 20001,
    run_attempt: 2,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const attempt1 = buildCommentBody({
    prNumber: 99,
    headSha,
    runId: 20001,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "failure",
    runUrl: "https://github.com/owner/repo/actions/runs/20001",
  });
  const { api, calls } = makeApi({
    headSha,
    commentsByPage: {
      1: [{ user: { login: "github-actions[bot]", type: "Bot" }, body: attempt1 }],
    },
  });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  const post = calls.find((call) => call.options.method === "POST");
  assert.ok(post);
  assert.equal(parseMarkerPayload(JSON.parse(post.options.body).body).runAttempt, 2);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("pagination finds a trusted marker on page 2 and prevents a duplicate", async () => {
  const headSha = "page-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 30001,
    run_attempt: 1,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const marker = buildCommentBody({
    prNumber: 99,
    headSha,
    runId: 30001,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/30001",
  });
  const page1 = Array.from({ length: 100 }, (_, i) => ({
    user: { login: `user${i}`, type: "User" },
    body: `comment ${i}`,
  }));
  const { api, calls } = makeApi({
    headSha,
    commentsByPage: {
      1: page1,
      2: [{ user: { login: "github-actions[bot]", type: "Bot" }, body: marker }],
    },
  });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.ok(calls.some((call) => call.endpoint.includes("page=2")));
  assert.equal(calls.filter((call) => call.options.method === "POST").length, 0);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("untrusted fake marker does not suppress notification", async () => {
  const headSha = "fake-marker-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 30002,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const fake = buildCommentBody({
    prNumber: 99,
    headSha,
    runId: 30002,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/30002",
  });
  const { api, calls } = makeApi({
    headSha,
    commentsByPage: {
      1: [{ user: { login: "attacker", type: "User" }, body: fake }],
    },
  });

  await runCiGate({ env: makeEnv(eventPath), octokit: api });

  assert.equal(calls.filter((call) => call.options.method === "POST").length, 1);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("fallback PR lookup API failure is surfaced", async () => {
  const headSha = "lookup-failure-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 40001,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [],
  });
  const { api } = makeApi({ headSha, failFallback: new Error("simulated lookup outage") });

  await assert.rejects(runCiGate({ env: makeEnv(eventPath), octokit: api }), /simulated lookup outage/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("non-array comments response fails closed", async () => {
  const headSha = "bad-comments-sha";
  const { tmpDir, eventPath } = writeEvent({
    id: 40002,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const { api } = makeApi({ headSha, commentsShape: { unexpected: true } });

  await assert.rejects(runCiGate({ env: makeEnv(eventPath), octokit: api }), /Unexpected comments API response/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("unexpected PR API response fails closed", async () => {
  const headSha = "bad-pr-shape";
  const { tmpDir, eventPath } = writeEvent({
    id: 40003,
    name: "CI",
    head_sha: headSha,
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });
  const { api } = makeApi({ headSha, pr: [] });

  await assert.rejects(runCiGate({ env: makeEnv(eventPath), octokit: api }), /Unexpected pull request API response/);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("workflow keeps minimum permissions, trusted checkout, per-attempt serialization, and no native user mention", () => {
  const workflow = fs.readFileSync(".github/workflows/ci-gate.yml", "utf8");
  assert.ok(workflow.includes("actions/checkout@v4"));
  assert.equal(workflow.includes("ref:"), false);
  assert.ok(workflow.includes("contents: read"));
  assert.ok(workflow.includes("pull-requests: read"));
  assert.ok(workflow.includes("issues: write"));
  assert.equal(workflow.includes("pull-requests: write"), false);
  assert.ok(workflow.includes("concurrency:"));
  assert.ok(workflow.includes("github.event.workflow_run.id"));
  assert.ok(workflow.includes("github.event.workflow_run.run_attempt"));
  assert.ok(workflow.includes("cancel-in-progress: false"));
  assert.equal(workflow.includes("CI_GATE_NOTIFY_LOGIN"), false);
});
