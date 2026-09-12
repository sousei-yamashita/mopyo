import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildCommentBody,
  isRunAlreadyNotified,
  parseMarkerPayload,
  runCiGate,
} from "../scripts/ci-gate.js";

function makeEnv(eventPath, extra = {}) {
  return {
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_TOKEN: "mock_token",
    GITHUB_REPOSITORY: "owner/repo",
    ...extra,
  };
}

function writeEvent(workflowRun) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ci-gate-extra-"));
  const eventPath = path.join(tmpDir, "event.json");
  fs.writeFileSync(eventPath, JSON.stringify({ workflow_run: workflowRun }));
  return { tmpDir, eventPath };
}

test("legacy marker without runAttempt matches attempt 1 but not attempt 2", () => {
  const legacy = [{ prNumber: 7, headSha: "sha123", runId: 555 }];
  assert.equal(
    isRunAlreadyNotified(legacy, { prNumber: 7, headSha: "sha123", runId: 555, runAttempt: 1 }),
    true
  );
  assert.equal(
    isRunAlreadyNotified(legacy, { prNumber: 7, headSha: "sha123", runId: 555, runAttempt: 2 }),
    false
  );
});

test("same run ID on a different SHA is not a duplicate", () => {
  const existing = [{ prNumber: 7, headSha: "sha123", runId: 555, runAttempt: 1 }];
  assert.equal(
    isRunAlreadyNotified(existing, { prNumber: 7, headSha: "sha999", runId: 555, runAttempt: 1 }),
    false
  );
});

test("cancelled attempt 1 does not suppress successful attempt 2", async () => {
  const { tmpDir, eventPath } = writeEvent({
    id: 20002,
    run_attempt: 2,
    name: "CI",
    head_sha: "headsha-cancelled",
    conclusion: "success",
    html_url: "https://github.com/owner/repo/actions/runs/20002",
    pull_requests: [{ number: 99 }],
  });

  const attempt1 = buildCommentBody({
    prNumber: 99,
    headSha: "headsha-cancelled",
    runId: 20002,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "cancelled",
    runUrl: "https://github.com/owner/repo/actions/runs/20002",
  });

  const calls = [];
  const api = async (endpoint, options = {}) => {
    calls.push({ endpoint, options });
    if (endpoint.includes("/issues/99/comments") && !options.method) {
      return [{ user: { login: "github-actions[bot]", type: "Bot" }, body: attempt1 }];
    }
    if (endpoint.includes("/issues/99/comments") && options.method === "POST") {
      return { id: 1 };
    }
    return [];
  };

  await runCiGate({ env: makeEnv(eventPath), octokit: api });
  const post = calls.find((call) => call.options.method === "POST");
  assert.ok(post);
  const marker = parseMarkerPayload(JSON.parse(post.options.body).body);
  assert.equal(marker.runAttempt, 2);
  assert.equal(marker.conclusion, "success");

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("PR lookup API failure is surfaced instead of becoming a normal no-op", async () => {
  const { tmpDir, eventPath } = writeEvent({
    id: 30001,
    run_attempt: 1,
    name: "CI",
    head_sha: "lookup-failure-sha",
    conclusion: "success",
    pull_requests: [],
  });

  const api = async (endpoint) => {
    if (endpoint.includes("/commits/lookup-failure-sha/pulls")) {
      throw new Error("simulated lookup outage");
    }
    return [];
  };

  await assert.rejects(
    runCiGate({ env: makeEnv(eventPath), octokit: api }),
    /simulated lookup outage/
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("non-array comments response fails closed", async () => {
  const { tmpDir, eventPath } = writeEvent({
    id: 30002,
    run_attempt: 1,
    name: "CI",
    head_sha: "comments-shape-sha",
    conclusion: "success",
    pull_requests: [{ number: 99 }],
  });

  const api = async (endpoint) => {
    if (endpoint.includes("/issues/99/comments")) {
      return { unexpected: true };
    }
    return [];
  };

  await assert.rejects(
    runCiGate({ env: makeEnv(eventPath), octokit: api }),
    /Unexpected comments API response/
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("optional notify login produces an explicit GitHub mention", () => {
  const body = buildCommentBody({
    prNumber: 29,
    headSha: "notify-sha",
    runId: 40001,
    runAttempt: 1,
    workflowName: "CI",
    conclusion: "success",
    runUrl: "https://github.com/owner/repo/actions/runs/40001",
    notifyLogin: "sousei-yamashita",
    createdAt: "2026-09-13T00:00:00Z",
  });
  assert.ok(body.includes("@sousei-yamashita"));
  const marker = parseMarkerPayload(body);
  assert.equal(marker.runId, 40001);
});

test("workflow serializes duplicate notifications per run attempt and configures native notify target", () => {
  const workflow = fs.readFileSync(".github/workflows/ci-gate.yml", "utf8");
  assert.ok(workflow.includes("concurrency:"));
  assert.ok(workflow.includes("github.event.workflow_run.id"));
  assert.ok(workflow.includes("github.event.workflow_run.run_attempt"));
  assert.ok(workflow.includes("cancel-in-progress: false"));
  assert.ok(workflow.includes("CI_GATE_NOTIFY_LOGIN: sousei-yamashita"));
});
