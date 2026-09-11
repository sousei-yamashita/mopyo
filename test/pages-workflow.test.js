import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

test("pages workflow serializes every gh-pages writer", () => {
  assert.match(workflow, /concurrency:\n  group: gh-pages-writes\n  cancel-in-progress: false/);
});

test("every writer run uses the reconcile script so a later run can rebuild preview state", () => {
  assert.match(workflow, /node "\$GITHUB_WORKSPACE\/scripts\/reconcile-pages\.js" preview "\$PAGES_DIR"/);
  assert.match(workflow, /node "\$GITHUB_WORKSPACE\/scripts\/reconcile-pages\.js" production "\$PAGES_DIR"/);
});
