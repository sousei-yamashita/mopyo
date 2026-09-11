import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const workflow = await readFile(new URL("../.github/workflows/pages.yml", import.meta.url), "utf8");

test("pages workflow serializes every gh-pages writer", () => {
  assert.match(workflow, /concurrency:\n  group: gh-pages-writes\n  cancel-in-progress: false/);
});

test("preview bootstrap initializes only the pages root marker before exporting the preview path", () => {
  assert.match(workflow, /MAIN_PUBLISH_MARKER: \.pages-root-from-main/);
  assert.match(workflow, /if \[ ! -f "\$MAIN_PUBLISH_MARKER" \]; then\n            node "\$GITHUB_WORKSPACE\/scripts\/export-site\.js" "\$PAGES_DIR" --root-only --preserve=previews\n          fi/);
});

test("production publish marks that the Pages root now belongs to main", () => {
  assert.match(workflow, /printf 'published-from-main\\n' > "\$PAGES_DIR\/\$MAIN_PUBLISH_MARKER"/);
});
