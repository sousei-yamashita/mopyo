import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

test("pages workflow serializes every gh-pages writer", () => {
  assert.match(workflow, /concurrency:\n  group: gh-pages-writes\n  cancel-in-progress: false/);
});

test("preview bootstrap initializes only the pages root marker before exporting the preview path", () => {
  assert.match(workflow, /node "\$GITHUB_WORKSPACE\/scripts\/export-site\.js" "\$PAGES_DIR" --root-only/);
  assert.doesNotMatch(workflow, /BOOTSTRAP_DIR/);
});
