import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildHandoffMarker,
  buildStopMarker,
  decideAutofixAction,
  isActionableReview
} from "../scripts/copilot-autofix-handoff.js";

const headSha = "0123456789abcdef0123456789abcdef01234567";
const nextHeadSha = "fedcba9876543210fedcba9876543210fedcba98";
const trustedAuthorLogin = "github-actions[bot]";
const trustedBotUser = { login: trustedAuthorLogin, type: "Bot" };

function buildTrustedHandoffComment({
  reviewId,
  currentHeadSha = headSha,
  attempt,
  maxAttempts = 3,
  includeStop = false
}) {
  return {
    user: trustedBotUser,
    body: [
      buildHandoffMarker({ reviewId, headSha: currentHeadSha, attempt, maxAttempts }),
      "@copilot Copilot Code Review の指摘対応をお願いします。",
      ...(includeStop
        ? [
            "",
            buildStopMarker({ attempt, maxAttempts }),
            "この自動中継は今回で停止します。"
          ]
        : [])
    ].join("\n")
  };
}

function buildTrustedStopComment({ attempt, maxAttempts = 3 }) {
  return {
    user: trustedBotUser,
    body: [
      buildStopMarker({ attempt, maxAttempts }),
      "自動修正の上限回数に達したため、このPRの自動中継を停止しました。"
    ].join("\n")
  };
}

test("does not treat broad fix/no-findings text as actionable", () => {
  const review = { state: "commented", body: "No fixes needed. No actionable findings." };
  assert.equal(isActionableReview(review, []), false);
});

test("treats changes_requested as actionable even without inline comments", () => {
  const review = { state: "changes_requested", body: "No inline comments." };
  assert.equal(isActionableReview(review, []), true);
});

test("ignores forged marker from non-trusted commenter", () => {
  const review = { id: 200, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const forgedComment = {
    user: { login: "someone-else" },
    body: buildHandoffMarker({ reviewId: 200, headSha, attempt: 1, maxAttempts: 3 })
  };
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: [forgedComment],
    headSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.equal(decision.kind, "handoff");
  assert.equal(decision.nextAttempt, 1);
});

test("dedupes same review/head only with trusted structured marker", () => {
  const review = { id: 200, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const existing = buildTrustedHandoffComment({ reviewId: 200, attempt: 1 });
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: [existing],
    headSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(decision, { kind: "skip", reason: "duplicate-review-head" });
});

test("ignores malformed marker bodies even from trusted bot", () => {
  const review = { id: 205, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const malformed = {
    user: trustedBotUser,
    body: `${buildHandoffMarker({ reviewId: 201, headSha, attempt: 1, maxAttempts: 3 })}\nnot the expected request body`
  };
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: [malformed],
    headSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.equal(decision.kind, "handoff");
  assert.equal(decision.nextAttempt, 1);
});

test("counts attempts across head changes and stops on the third handoff", () => {
  const review = { id: 203, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const comments = [
    buildTrustedHandoffComment({ reviewId: 201, currentHeadSha: headSha, attempt: 1 }),
    buildTrustedHandoffComment({ reviewId: 202, currentHeadSha: nextHeadSha, attempt: 2 })
  ];
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: comments,
    headSha: nextHeadSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.equal(decision.kind, "handoff");
  assert.equal(decision.nextAttempt, 3);
  assert.equal(decision.shouldCreateStop, true);
});

test("limit reached posts stop exactly once and future runs skip", () => {
  const review = { id: 204, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const comments = [
    buildTrustedHandoffComment({ reviewId: 201, currentHeadSha: headSha, attempt: 1 }),
    buildTrustedHandoffComment({ reviewId: 202, currentHeadSha: nextHeadSha, attempt: 2 }),
    buildTrustedHandoffComment({ reviewId: 203, currentHeadSha: headSha, attempt: 3, includeStop: true })
  ];
  const limitDecision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: comments,
    headSha: nextHeadSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(limitDecision, { kind: "limit-reached", shouldCreateStop: true, attemptCount: 3 });

  const postStopDecision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: comments,
    headSha: nextHeadSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(postStopDecision, { kind: "skip", reason: "pr-stopped" });
});

test("standalone stop comment remains trusted for backfill after legacy attempts", () => {
  const review = { id: 207, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: [buildTrustedStopComment({ attempt: 3 })],
    headSha: nextHeadSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(decision, { kind: "skip", reason: "pr-stopped" });
});

test("legacy trusted stop marker still blocks future handoffs", () => {
  const review = { id: 206, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: [
      {
        user: trustedBotUser,
        body: [
          "<!-- mopyo-copilot-autofix-stop v1 head:0123456789abcdef0123456789abcdef01234567 -->",
          "自動修正の上限回数に達したため、このPRの自動中継を停止しました。"
        ].join("\n")
      }
    ],
    headSha: nextHeadSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(decision, { kind: "skip", reason: "pr-stopped" });
});

test("workflow keeps privileged logic inline and avoids untrusted checkout execution", () => {
  const workflow = fs.readFileSync(
    new URL("../.github/workflows/copilot-autofix-handoff.yml", import.meta.url),
    "utf8"
  );

  assert.match(workflow, /permissions:\s*\{\}/);
  assert.match(workflow, /issues:\s*write/);
  assert.match(workflow, /pull-requests:\s*read/);
  assert.doesNotMatch(workflow, /actions\/checkout@/);
  assert.doesNotMatch(workflow, /await import/);
  assert.doesNotMatch(workflow, /scripts\/copilot-autofix-handoff\.js/);
  assert.doesNotMatch(workflow, /@copilot.*停止/);
});
