import test from "node:test";
import assert from "node:assert/strict";
import {
  buildHandoffMarker,
  buildStopMarker,
  decideAutofixAction,
  isActionableReview
} from "../scripts/copilot-autofix-handoff.js";

const headSha = "0123456789abcdef0123456789abcdef01234567";
const trustedAuthorLogin = "github-actions[bot]";

test("does not treat negated fix/no-findings text as actionable", () => {
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
  const existing = {
    user: { login: trustedAuthorLogin },
    body: buildHandoffMarker({ reviewId: 200, headSha, attempt: 1, maxAttempts: 3 })
  };
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

test("records stop on third handoff attempt instead of waiting for fourth trigger", () => {
  const review = { id: 203, state: "changes_requested", body: "### 🟡 Changes recommended" };
  const comments = [
    {
      user: { login: trustedAuthorLogin },
      body: buildHandoffMarker({ reviewId: 201, headSha, attempt: 1, maxAttempts: 3 })
    },
    {
      user: { login: trustedAuthorLogin },
      body: buildHandoffMarker({ reviewId: 202, headSha, attempt: 2, maxAttempts: 3 })
    }
  ];
  const decision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: comments,
    headSha,
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
    {
      user: { login: trustedAuthorLogin },
      body: buildHandoffMarker({ reviewId: 201, headSha, attempt: 1, maxAttempts: 3 })
    },
    {
      user: { login: trustedAuthorLogin },
      body: buildHandoffMarker({ reviewId: 202, headSha, attempt: 2, maxAttempts: 3 })
    },
    {
      user: { login: trustedAuthorLogin },
      body: buildHandoffMarker({ reviewId: 203, headSha, attempt: 3, maxAttempts: 3 })
    }
  ];
  const limitDecision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: comments,
    headSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(limitDecision, { kind: "limit-reached", shouldCreateStop: true, attemptCount: 3 });

  const postStopDecision = decideAutofixAction({
    review,
    reviewSpecificComments: [],
    issueComments: [
      ...comments,
      { user: { login: trustedAuthorLogin }, body: buildStopMarker({ headSha }) }
    ],
    headSha,
    maxAttempts: 3,
    trustedAuthorLogin
  });
  assert.deepEqual(postStopDecision, { kind: "skip", reason: "head-stopped" });
});
