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
  isRunAlreadyNotified,
  runCiGate,
} from "../scripts/ci-gate.js";

test("buildMarkerPayload and parseMarkerPayload round-trip test", () => {
  const data = {
    prNumber: 42,
    headSha: "abc123def456",
    runId: 987654321,
    workflowName: "CI",
    conclusion: "success",
    createdAt: "2026-03-30T10:00:00Z",
  };

  const markerStr = buildMarkerPayload(data);
  assert.ok(markerStr.startsWith(MARKER_PREFIX));
  assert.ok(markerStr.endsWith(MARKER_SUFFIX));

  const parsed = parseMarkerPayload(markerStr);
  assert.deepEqual(parsed, data);
});

test("parseMarkerPayload handles invalid or missing markers gracefully", () => {
  assert.equal(parseMarkerPayload(null), null);
  assert.equal(parseMarkerPayload("Hello world without marker"), null);
  assert.equal(parseMarkerPayload("<!-- CI_GATE_MARKER: invalid json -->"), null);
});

test("isTrustedComment validates comment author identity strictly", () => {
  assert.equal(isTrustedComment(null), false);
  assert.equal(isTrustedComment({}), false);
  assert.equal(isTrustedComment({ user: { login: "some-user", type: "User" } }), false);
  assert.equal(isTrustedComment({ user: { login: "other-bot[bot]", type: "Bot" } }), false);
  assert.equal(isTrustedComment({ user: { login: "github-actions[bot]", type: "User" } }), false);
  assert.equal(isTrustedComment({ user: { login: "github-actions[bot]", type: "Bot" } }), true);
});

test("extractPullRequestNumbers extracts numbers correctly", () => {
  const payload = {
    workflow_run: {
      pull_requests: [{ number: 10 }, { number: 12 }],
    },
  };
  assert.deepEqual(extractPullRequestNumbers(payload), [10, 12]);
  assert.deepEqual(extractPullRequestNumbers({}), []);
  assert.deepEqual(extractPullRequestNumbers({ workflow_run: {} }), []);
});

test("buildCommentBody produces formatted markdown with marker and distinguishes conclusions", () => {
  const bodySuccess = buildCommentBody({
    prNumber: 5,
    headSha: "fedcba987654",
    runId: 100,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/example/repo/actions/runs/100",
    createdAt: "2026-03-30T12:00:00Z",
  });
  assert.ok(bodySuccess.includes(MARKER_PREFIX));
  assert.ok(bodySuccess.includes("## CI Gate Result: ✅ SUCCESS"));

  const bodyFailure = buildCommentBody({
    prNumber: 5,
    headSha: "fedcba987654",
    runId: 101,
    workflowName: "CI",
    conclusion: "failure",
    runUrl: "https://github.com/example/repo/actions/runs/101",
    createdAt: "2026-03-30T12:05:00Z",
  });
  assert.ok(bodyFailure.includes("## CI Gate Result: ❌ FAILURE"));

  const bodyCancelled = buildCommentBody({
    prNumber: 5,
    headSha: "fedcba987654",
    runId: 102,
    workflowName: "CI",
    conclusion: "cancelled",
    runUrl: "https://github.com/example/repo/actions/runs/102",
    createdAt: "2026-03-30T12:10:00Z",
  });
  assert.ok(bodyCancelled.includes("## CI Gate Result: 🛑 CANCELLED"));

  const parsedSuccess = parseMarkerPayload(bodySuccess);
  const parsedFailure = parseMarkerPayload(bodyFailure);
  const parsedCancelled = parseMarkerPayload(bodyCancelled);

  assert.equal(parsedSuccess.conclusion, "success");
  assert.equal(parsedFailure.conclusion, "failure");
  assert.equal(parsedCancelled.conclusion, "cancelled");
});

test("isRunAlreadyNotified detects duplicates per PR, SHA, run ID, and runAttempt accurately", () => {
  const existingList = [
    { prNumber: 7, headSha: "sha123", runId: 555, runAttempt: 1, conclusion: "failure" },
  ];

  const sameRunAttempt = { prNumber: 7, headSha: "sha123", runId: 555, runAttempt: 1, conclusion: "failure" };
  const sameRunDiffAttempt = { prNumber: 7, headSha: "sha123", runId: 555, runAttempt: 2, conclusion: "success" };
  const newRunSameSha = { prNumber: 7, headSha: "sha123", runId: 556, runAttempt: 1, conclusion: "success" };

  assert.equal(isRunAlreadyNotified(existingList, sameRunAttempt), true);
  assert.equal(isRunAlreadyNotified(existingList, sameRunDiffAttempt), false);
  assert.equal(isRunAlreadyNotified(existingList, newRunSameSha), false);
  assert.equal(isRunAlreadyNotified([], sameRunAttempt), false);
});

test("runCiGate notifies rerun success after failure or cancellation (run_attempt increment)", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  // Attempt 2 succeeded after attempt 1 failed
  const payloadRerunSuccess = {
    workflow_run: {
      id: 20001,
      run_attempt: 2,
      name: "CI",
      head_sha: "headsha123",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/20001",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payloadRerunSuccess));

  const existingAttempt1FailureCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 20001,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "failure",
    runUrl: "https://github.com/owner/repo/actions/runs/20001",
  });

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && (!options.method || options.method === "GET")) {
      return [
        {
          user: { login: "github-actions[bot]", type: "Bot" },
          body: existingAttempt1FailureCommentBody,
        },
      ];
    }
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && options.method === "POST") {
      return { id: 3001, body: options.body };
    }
    return {};
  };

  await runCiGate({
    env: {
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_TOKEN: "mock_token",
      GITHUB_REPOSITORY: "owner/repo",
    },
    octokit: mockOctokit,
  });

  // Must post a new comment for attempt 2 despite attempt 1 failure comment existing
  assert.ok(apiCalls.some((call) => call.options.method === "POST"));

  const postCall = apiCalls.find((call) => call.options.method === "POST");
  const postedBody = JSON.parse(postCall.options.body).body;
  const parsedMarker = parseMarkerPayload(postedBody);
  assert.equal(parsedMarker.runId, 20001);
  assert.equal(parsedMarker.runAttempt, 2);
  assert.equal(parsedMarker.conclusion, "success");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate pagination retrieves trusted markers across all pages", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 30001,
      run_attempt: 1,
      name: "CI",
      head_sha: "headsha789",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/30001",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const page1Comments = Array.from({ length: 100 }, (_, i) => ({
    user: { login: `user${i}`, type: "User" },
    body: `Comment ${i}`,
  }));

  const markerCommentOnPage2 = buildCommentBody({
    prNumber: 99,
    headSha: "headsha789",
    runId: 30001,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/30001",
  });

  const page2Comments = [
    {
      user: { login: "github-actions[bot]", type: "Bot" },
      body: markerCommentOnPage2,
    },
  ];

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    const url = new URL(endpoint, "https://api.github.com");
    if (url.searchParams.get("page") === "1") {
      return page1Comments;
    }
    if (url.searchParams.get("page") === "2") {
      return page2Comments;
    }
    return [];
  };

  await runCiGate({
    env: {
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_TOKEN: "mock_token",
      GITHUB_REPOSITORY: "owner/repo",
    },
    octokit: mockOctokit,
  });

  // Should fetch both page 1 and page 2, find trusted marker on page 2, and skip duplicate POST
  assert.ok(apiCalls.some((call) => call.endpoint.includes("page=1")));
  assert.ok(apiCalls.some((call) => call.endpoint.includes("page=2")));
  assert.equal(apiCalls.filter((call) => call.options && call.options.method === "POST").length, 0);

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate skips notification ONLY when trusted github-actions[bot] comment contains identical marker", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 10001,
      name: "CI",
      head_sha: "headsha123",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/10001",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const validMarkerCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 10001,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/10001",
  });

  // 1) Test with trusted github-actions[bot] comment
  const trustedComments = [
    {
      user: { login: "github-actions[bot]", type: "Bot" },
      body: validMarkerCommentBody,
    },
  ];

  let apiCalls = [];
  let mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments")) {
      return trustedComments;
    }
    return {};
  };

  await runCiGate({
    env: {
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_TOKEN: "mock_token",
      GITHUB_REPOSITORY: "owner/repo",
    },
    octokit: mockOctokit,
  });

  // Should skip posting because trusted github-actions[bot] comment exists
  assert.equal(apiCalls.length, 1);
  assert.ok(apiCalls[0].endpoint.startsWith("/repos/owner/repo/issues/99/comments"));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate DOES NOT skip notification when user or untrusted bot posts fake marker", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 10001,
      name: "CI",
      head_sha: "headsha123",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/10001",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const fakeMarkerCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 10001,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/10001",
  });

  // Comments from normal user and other bot
  const untrustedComments = [
    {
      user: { login: "attacker-user", type: "User" },
      body: fakeMarkerCommentBody,
    },
    {
      user: { login: "some-other-bot[bot]", type: "Bot" },
      body: fakeMarkerCommentBody,
    },
  ];

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && (!options.method || options.method === "GET")) {
      return untrustedComments;
    }
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && options.method === "POST") {
      return { id: 2002, body: options.body };
    }
    return {};
  };

  await runCiGate({
    env: {
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_TOKEN: "mock_token",
      GITHUB_REPOSITORY: "owner/repo",
    },
    octokit: mockOctokit,
  });

  // Must post a new comment despite fake markers from untrusted users/bots
  assert.equal(apiCalls.length, 2);
  assert.equal(apiCalls[1].options.method, "POST");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate creates a new top-level comment when a new run ID arrives for an existing PR comment thread", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 10002, // New Run ID
      name: "CI",
      head_sha: "headsha123",
      conclusion: "failure",
      html_url: "https://github.com/owner/repo/actions/runs/10002",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const existingCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 10001, // Previous Run ID
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/10001",
  });

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && (!options.method || options.method === "GET")) {
      return [{ user: { login: "github-actions[bot]", type: "Bot" }, body: existingCommentBody }];
    }
    if (endpoint.startsWith("/repos/owner/repo/issues/99/comments") && options.method === "POST") {
      return { id: 889, body: options.body };
    }
    return {};
  };

  await runCiGate({
    env: {
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_TOKEN: "mock_token",
      GITHUB_REPOSITORY: "owner/repo",
    },
    octokit: mockOctokit,
  });

  assert.equal(apiCalls.length, 2);
  assert.equal(apiCalls[1].options.method, "POST");

  const newPostedBody = JSON.parse(apiCalls[1].options.body).body;
  const parsedMarker = parseMarkerPayload(newPostedBody);
  assert.equal(parsedMarker.runId, 10002);
  assert.equal(parsedMarker.conclusion, "failure");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("security assertion: workflow file has minimal permissions and checks out trusted repository base branch without executing PR code", () => {
  const workflowContent = fs.readFileSync(".github/workflows/ci-gate.yml", "utf8");
  assert.ok(workflowContent.includes("actions/checkout@v4"));
  assert.equal(workflowContent.includes("ref:"), false, "Must not specify ref to checkout untrusted PR code");
  assert.equal(workflowContent.includes("${{ github.event.pull_request"), false, "Must not execute PR payload ref");
  assert.ok(workflowContent.includes("contents: read"));
  assert.ok(workflowContent.includes("pull-requests: read"));
  assert.ok(workflowContent.includes("issues: write"));
  assert.equal(workflowContent.includes("pull-requests: write"), false, "Must not request write permission on pull-requests");
});
