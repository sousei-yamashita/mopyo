import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/copilot-autofix-handoff.yml", import.meta.url), "utf8");

test("autofix workflow triggers only on pull_request_review submitted", () => {
  assert.match(workflow, /on:\n  pull_request_review:\n    types:\n      - submitted/);
  assert.doesNotMatch(workflow, /issue_comment:/);
});

test("autofix workflow scopes to Copilot PR reviewer bot", () => {
  assert.match(workflow, /if: github\.event\.review\.user\.login == 'copilot-pull-request-reviewer\[bot\]'/);
});

test("autofix workflow uses minimal permissions and no merge/deploy writes", () => {
  assert.match(workflow, /permissions:\n  contents: read/);
  assert.match(workflow, /pull-requests: read/);
  assert.match(workflow, /issues: write/);
  assert.doesNotMatch(workflow, /contents: write/);
  assert.doesNotMatch(workflow, /pages: write/);
});

test("autofix workflow includes dedupe and loop guard markers", () => {
  assert.match(workflow, /mopyo-copilot-autofix/);
  assert.match(workflow, /review:\$\{reviewId\} head:\$\{headSha\}/);
  assert.match(workflow, /MAX_AUTOFIX_ATTEMPTS/);
  assert.match(workflow, /mopyo-copilot-autofix-stop/);
});

test("autofix workflow posts @copilot request with review body and review comments", () => {
  assert.match(workflow, /@copilot Copilot Code Review の指摘対応をお願いします。/);
  assert.match(workflow, /review\.body/);
  assert.match(workflow, /listReviewComments/);
});
