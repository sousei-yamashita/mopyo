import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");
const reconcileScript = await readFile(new URL("../scripts/reconcile-pages.js", import.meta.url), "utf8");

test("pages workflow serializes every gh-pages writer", () => {
  assert.match(workflow, /concurrency:\n  group: gh-pages-writes\n  cancel-in-progress: false/);
});

test("pages workflow uses trusted triggers instead of direct pull_request publishing", () => {
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /pull_request_target:/);
  assert.doesNotMatch(workflow, /\non:\n[\s\S]*pull_request:/);
});

test("pages workflow reconciles previews from open non-draft same-repository PRs", () => {
  assert.match(workflow, /pull\.draft === false/);
  assert.match(workflow, /pull\.head\?\.repo\?\.full_name === repository/);
});

test("privileged pages workflow checks out the default branch before running trusted scripts", () => {
  assert.match(workflow, /ref: \$\{\{ github\.event\.repository\.default_branch \}\}/);
  assert.match(workflow, /node scripts\/reconcile-pages\.js --mode production/);
  assert.match(workflow, /node scripts\/reconcile-pages\.js --mode preview/);
});

test("pages workflow publishes through official GitHub Pages artifact deployment", () => {
  assert.match(workflow, /actions\/configure-pages@v5/);
  assert.match(workflow, /actions\/upload-pages-artifact@v4/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
});

test("trusted Pages reconciliation takes only static app files from PR heads", () => {
  assert.match(reconcileScript, /git", \["-C", workspace, "archive", "FETCH_HEAD", "index\.html", "src"\]/);
});

test("write permissions stay scoped to the pages publishing jobs", () => {
  assert.equal((workflow.match(/contents: write/g) || []).length, 1);
  assert.equal((workflow.match(/pages: write/g) || []).length, 1);
  assert.equal((workflow.match(/id-token: write/g) || []).length, 1);
  assert.equal((workflow.match(/pull-requests: write/g) || []).length, 1);
});

test("Pages state branch updates stay inside the trusted prepare job", () => {
  assert.match(workflow, /git push origin gh-pages/);
});

test("uploaded Pages artifact excludes git metadata while keeping hidden files support", () => {
  assert.match(workflow, /Remove git metadata from Pages artifact/);
  assert.match(workflow, /rm -rf "\$\{\{ runner\.temp \}\}\/pages-site\/\.git"/);
  assert.match(workflow, /include-hidden-files: true/);
});
