import test from "node:test";
import assert from "node:assert/strict";
import { previewDirectoryName, stalePreviewDirectories } from "../scripts/reconcile-pages.js";

test("preview directory names stay PR-scoped", () => {
  assert.equal(previewDirectoryName(24), "pr-24");
});

test("a later reconcile removes previews for PRs that are no longer open", () => {
  assert.deepEqual(
    stalePreviewDirectories(["pr-22", "pr-24", "notes"], [22]),
    ["pr-24"]
  );
});
