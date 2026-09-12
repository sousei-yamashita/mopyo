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

test("isRunAlreadyNotified detects duplicates per PR, SHA, and run ID accurately", () => {
  const existingList = [
    { prNumber: 7, headSha: "sha123", runId: 555, conclusion: "success" },
  ];

  const sameRun = { prNumber: 7, headSha: "sha123", runId: 555, conclusion: "success" };
  const sameRunDiffConclusion = { prNumber: 7, headSha: "sha123", runId: 555, conclusion: "failure" };
  const newRunSameSha = { prNumber: 7, headSha: "sha123", runId: 556, conclusion: "success" };
  const newShaSameRunId = { prNumber: 7, headSha: "sha999", runId: 555, conclusion: "success" };

  // Identical run ID + SHA + PR -> skip posting
  assert.equal(isRunAlreadyNotified(existingList, sameRun), true);
  assert.equal(isRunAlreadyNotified(existingList, sameRunDiffConclusion), true);

  // New run ID or new SHA -> create new notification comment
  assert.equal(isRunAlreadyNotified(existingList, newRunSameSha), false);
  assert.equal(isRunAlreadyNotified(existingList, newShaSameRunId), false);
  assert.equal(isRunAlreadyNotified([], sameRun), false);
});

test("runCiGate posts a new top-level comment for a new CI run", async () => {
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

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint === "/repos/owner/repo/issues/99/comments" && (!options.method || options.method === "GET")) {
      return [];
    }
    if (endpoint === "/repos/owner/repo/issues/99/comments" && options.method === "POST") {
      return { id: 1001, body: options.body };
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
  assert.equal(apiCalls[0].endpoint, "/repos/owner/repo/issues/99/comments");
  assert.equal(apiCalls[1].endpoint, "/repos/owner/repo/issues/99/comments");
  assert.equal(apiCalls[1].options.method, "POST");

  const postedBody = JSON.parse(apiCalls[1].options.body).body;
  const parsedMarker = parseMarkerPayload(postedBody);
  assert.equal(parsedMarker.prNumber, 99);
  assert.equal(parsedMarker.headSha, "headsha123");
  assert.equal(parsedMarker.runId, 10001);
  assert.equal(parsedMarker.conclusion, "success");

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
    if (endpoint === "/repos/owner/repo/issues/99/comments" && (!options.method || options.method === "GET")) {
      return [{ id: 888, body: existingCommentBody }];
    }
    if (endpoint === "/repos/owner/repo/issues/99/comments" && options.method === "POST") {
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
  assert.equal(apiCalls[0].endpoint, "/repos/owner/repo/issues/99/comments");
  assert.equal(apiCalls[1].endpoint, "/repos/owner/repo/issues/99/comments");
  // Crucial check: must be POST (new top-level comment), NOT PATCH
  assert.equal(apiCalls[1].options.method, "POST");

  const newPostedBody = JSON.parse(apiCalls[1].options.body).body;
  const parsedMarker = parseMarkerPayload(newPostedBody);
  assert.equal(parsedMarker.runId, 10002);
  assert.equal(parsedMarker.conclusion, "failure");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate skips creating duplicate comment if identical runId, headSha, and prNumber exist", async () => {
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

  const existingCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 10001,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/10001",
  });

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint === "/repos/owner/repo/issues/99/comments") {
      return [{ id: 888, body: existingCommentBody }];
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

  // Only GET comments should be called, no POST/PATCH
  assert.equal(apiCalls.length, 1);
  assert.equal(apiCalls[0].endpoint, "/repos/owner/repo/issues/99/comments");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("security assertion: workflow file checks out trusted repository base branch without checking out PR ref", () => {
  const workflowContent = fs.readFileSync(".github/workflows/ci-gate.yml", "utf8");
  assert.ok(workflowContent.includes("actions/checkout@v4"));
  assert.equal(workflowContent.includes("ref:"), false, "Must not specify ref to checkout untrusted PR code");
  assert.equal(workflowContent.includes("${{ github.event.pull_request"), false, "Must not execute PR payload ref");
});
