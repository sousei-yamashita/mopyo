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
  shouldSkipNotification,
  runCiGate,
} from "../scripts/ci-gate.js";

test("buildMarkerPayload and parseMarkerPayload round-trip test", () => {
  const data = {
    prNumber: 42,
    headSha: "abc123def456",
    runId: 987654321,
    workflowName: "CI",
    conclusion: "success",
    updatedAt: "2026-03-30T10:00:00Z",
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

test("buildCommentBody produces formatted markdown with marker", () => {
  const body = buildCommentBody({
    prNumber: 5,
    headSha: "fedcba987654",
    runId: 100,
    workflowName: "CI",
    conclusion: "failure",
    runUrl: "https://github.com/example/repo/actions/runs/100",
    updatedAt: "2026-03-30T12:00:00Z",
  });

  assert.ok(body.includes(MARKER_PREFIX));
  assert.ok(body.includes("## CI Gate Result: ❌ FAILURE"));
  assert.ok(body.includes("`fedcba987654`"));
  assert.ok(body.includes("[100](https://github.com/example/repo/actions/runs/100)"));
});

test("shouldSkipNotification detects duplicate state accurately", () => {
  const existing = {
    prNumber: 7,
    headSha: "sha123",
    runId: 555,
    conclusion: "success",
  };

  const same = {
    prNumber: 7,
    headSha: "sha123",
    runId: 555,
    conclusion: "success",
  };

  const differentConclusion = {
    prNumber: 7,
    headSha: "sha123",
    runId: 555,
    conclusion: "failure",
  };

  const differentSha = {
    prNumber: 7,
    headSha: "sha456",
    runId: 555,
    conclusion: "success",
  };

  const differentRunId = {
    prNumber: 7,
    headSha: "sha123",
    runId: 666,
    conclusion: "success",
  };

  assert.equal(shouldSkipNotification(existing, same), true);
  assert.equal(shouldSkipNotification(existing, differentConclusion), false);
  assert.equal(shouldSkipNotification(existing, differentSha), false);
  assert.equal(shouldSkipNotification(existing, differentRunId), false);
  assert.equal(shouldSkipNotification(null, same), false);
});

test("runCiGate posts a new comment when no marker comment exists", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 12345,
      name: "CI",
      head_sha: "headsha123",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/12345",
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
  assert.equal(parsedMarker.conclusion, "success");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate updates an existing comment when marker exists", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 12346,
      name: "CI",
      head_sha: "headsha123",
      conclusion: "failure",
      html_url: "https://github.com/owner/repo/actions/runs/12346",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const existingCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 12345,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/12345",
  });

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint === "/repos/owner/repo/issues/99/comments" && (!options.method || options.method === "GET")) {
      return [{ id: 888, body: existingCommentBody }];
    }
    if (endpoint === "/repos/owner/repo/issues/comments/888" && options.method === "PATCH") {
      return { id: 888, body: options.body };
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
  assert.equal(apiCalls[1].endpoint, "/repos/owner/repo/issues/comments/888");
  assert.equal(apiCalls[1].options.method, "PATCH");

  const updatedBody = JSON.parse(apiCalls[1].options.body).body;
  const parsedMarker = parseMarkerPayload(updatedBody);
  assert.equal(parsedMarker.conclusion, "failure");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("runCiGate skips notification when PR status and runId are identical", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 12345,
      name: "CI",
      head_sha: "headsha123",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/12345",
      pull_requests: [{ number: 99 }],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const existingCommentBody = buildCommentBody({
    prNumber: 99,
    headSha: "headsha123",
    runId: 12345,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/12345",
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

test("runCiGate falls back to commit PR lookup when pull_requests array is empty", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-test-"));
  const eventPath = path.join(tmpDir, "event.json");

  const payload = {
    workflow_run: {
      id: 99999,
      name: "CI",
      head_sha: "forksha777",
      conclusion: "success",
      html_url: "https://github.com/owner/repo/actions/runs/99999",
      pull_requests: [],
    },
  };
  fs.writeFileSync(eventPath, JSON.stringify(payload));

  const apiCalls = [];
  const mockOctokit = async (endpoint, options = {}) => {
    apiCalls.push({ endpoint, options });
    if (endpoint === "/repos/owner/repo/commits/forksha777/pulls") {
      return [{ number: 50 }];
    }
    if (endpoint === "/repos/owner/repo/issues/50/comments" && (!options.method || options.method === "GET")) {
      return [];
    }
    if (endpoint === "/repos/owner/repo/issues/50/comments" && options.method === "POST") {
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

  assert.equal(apiCalls.length, 3);
  assert.equal(apiCalls[0].endpoint, "/repos/owner/repo/commits/forksha777/pulls");
  assert.equal(apiCalls[1].endpoint, "/repos/owner/repo/issues/50/comments");
  assert.equal(apiCalls[2].endpoint, "/repos/owner/repo/issues/50/comments");
  assert.equal(apiCalls[2].options.method, "POST");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
