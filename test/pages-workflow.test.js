import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

test("pages workflow serializes every gh-pages writer", () => {
  assert.match(workflow, /concurrency:\n  group: gh-pages-writes\n  cancel-in-progress: false/);
});

test("pages workflow reconciles previews from open non-draft same-repository PRs", () => {
  assert.match(workflow, /pull\.draft === false/);
  assert.match(workflow, /pull\.head\?\.repo\?\.full_name === repository/);
});

test("privileged pages jobs do not execute repository scripts from the PR branch", () => {
  assert.doesNotMatch(workflow, /node "\$GITHUB_WORKSPACE\/scripts\/reconcile-pages\.js"/);
  assert.doesNotMatch(workflow, /node "\$GITHUB_WORKSPACE\/scripts\/export-site\.js"/);
  assert.match(workflow, /git archive FETCH_HEAD index\.html src \| tar -x -C "\$SOURCE_DIR"/);
});

test("write permissions stay scoped to the pages publishing jobs", () => {
  assert.equal((workflow.match(/contents: write/g) || []).length, 3);
  assert.equal((workflow.match(/pull-requests: write/g) || []).length, 2);
});

test("preview-side write jobs do not check out PR branch code", () => {
  assert.equal((workflow.match(/actions\/checkout@v4/g) || []).length, 1);
});
