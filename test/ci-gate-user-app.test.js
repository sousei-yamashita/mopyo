import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedComment } from "../scripts/ci-gate.js";

const currentGateComment = {
  user: { login: "sousei-yamashita", type: "User" },
  performed_via_github_app: { slug: "sousei-approval-test" },
};

test("trusts current user-attributed CI Gate GitHub App comments", () => {
  assert.equal(isTrustedComment(currentGateComment), true);
});

test("keeps legacy github-actions bot comments trusted", () => {
  assert.equal(
    isTrustedComment({ user: { login: "github-actions[bot]", type: "Bot" } }),
    true
  );
});

test("does not trust a manual comment from the same user without app attribution", () => {
  assert.equal(
    isTrustedComment({ user: { login: "sousei-yamashita", type: "User" } }),
    false
  );
});

test("does not trust another app using the same user attribution", () => {
  assert.equal(
    isTrustedComment({
      user: { login: "sousei-yamashita", type: "User" },
      performed_via_github_app: { slug: "other-app" },
    }),
    false
  );
});

test("does not trust the CI Gate app when the actor identity is different", () => {
  assert.equal(
    isTrustedComment({
      user: { login: "someone-else", type: "User" },
      performed_via_github_app: { slug: "sousei-approval-test" },
    }),
    false
  );
});
