import test from "node:test";
import assert from "node:assert/strict";
import { previewDirectoryName, reviewablePullNumbers, stalePreviewDirectories } from "../scripts/reconcile-pages.js";

test("preview directory names stay PR-scoped", () => {
  assert.equal(previewDirectoryName(24), "pr-24");
});

test("a later reconcile removes previews for PRs that are no longer open", () => {
  assert.deepEqual(
    stalePreviewDirectories(["pr-22", "pr-24", "notes"], [22]),
    ["pr-24"]
  );
});

test("reviewablePullNumbers excludes draft and fork PRs", () => {
  const pulls = [
    { number: 22, state: "open", draft: false, head: { repo: { full_name: "sousei-yamashita/mopyo" } } },
    { number: 23, state: "open", draft: true, head: { repo: { full_name: "sousei-yamashita/mopyo" } } },
    { number: 24, state: "open", draft: false, head: { repo: { full_name: "someone-else/mopyo" } } }
  ];

  assert.deepEqual(reviewablePullNumbers(pulls, "sousei-yamashita/mopyo"), [22]);
});

test("reviewablePullNumbers follows draft, ready, and close state transitions", () => {
  const repository = "sousei-yamashita/mopyo";
  const draft = [{ number: 24, state: "open", draft: true, head: { repo: { full_name: repository } } }];
  const ready = [{ number: 24, state: "open", draft: false, head: { repo: { full_name: repository } } }];
  const closed = [{ number: 24, state: "closed", draft: false, head: { repo: { full_name: repository } } }];

  assert.deepEqual(reviewablePullNumbers(draft, repository), []);
  assert.deepEqual(reviewablePullNumbers(ready, repository), [24]);
  assert.deepEqual(stalePreviewDirectories(["pr-24"], reviewablePullNumbers(draft, repository)), ["pr-24"]);
  assert.deepEqual(stalePreviewDirectories(["pr-24"], reviewablePullNumbers(closed, repository)), ["pr-24"]);
});
