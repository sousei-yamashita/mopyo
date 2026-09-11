import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportSite, initializePagesSite } from "../scripts/export-site.js";

test("exportSite copies the static app and removes stale files", async () => {
  const root = await mkdtemp(join(tmpdir(), "mopyo-export-site-"));
  const destination = join(root, "site");

  await writeFile(join(root, ".placeholder"), "");
  await exportSite(destination);
  await writeFile(join(destination, "stale.txt"), "old");

  await exportSite(destination);

  await assert.doesNotReject(readFile(join(destination, "index.html"), "utf8"));
  await assert.doesNotReject(readFile(join(destination, "src", "main.js"), "utf8"));
  await assert.doesNotReject(readFile(join(destination, ".nojekyll"), "utf8"));
  await assert.rejects(readFile(join(destination, "stale.txt"), "utf8"));
});

test("exportSite preserves requested directories when refreshing a Pages checkout", async () => {
  const root = await mkdtemp(join(tmpdir(), "mopyo-export-site-git-"));
  const destination = join(root, "gh-pages");
  const gitDir = join(destination, ".git");
  const previewsDir = join(destination, "previews");
  await mkdir(destination, { recursive: true });
  await mkdir(previewsDir, { recursive: true });

  await writeFile(gitDir, "metadata");
  await writeFile(join(previewsDir, "keep.txt"), "keep");
  await exportSite(destination, { preserve: ["previews"] });

  assert.equal(await readFile(gitDir, "utf8"), "metadata");
  assert.equal(await readFile(join(previewsDir, "keep.txt"), "utf8"), "keep");
  await assert.doesNotReject(readFile(join(destination, "src", "style.css"), "utf8"));
});

test("initializePagesSite leaves preview bootstrap at root .nojekyll only", async () => {
  const root = await mkdtemp(join(tmpdir(), "mopyo-pages-root-"));
  const destination = join(root, "gh-pages");
  await mkdir(join(destination, "old"), { recursive: true });
  await writeFile(join(destination, "old", "stale.txt"), "old");

  await initializePagesSite(destination);

  await assert.doesNotReject(readFile(join(destination, ".nojekyll"), "utf8"));
  await assert.rejects(access(join(destination, "index.html")));
  await assert.rejects(access(join(destination, "src")));
  await assert.rejects(access(join(destination, "old", "stale.txt")));
});

test("exportSite can copy from an alternate source directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "mopyo-export-site-source-"));
  const source = join(root, "source");
  const destination = join(root, "preview");
  await mkdir(join(source, "src"), { recursive: true });
  await writeFile(join(source, "index.html"), "<!doctype html><title>preview</title>");
  await writeFile(join(source, "src", "main.js"), "console.log('preview');");

  await exportSite(destination, { source });

  assert.equal(await readFile(join(destination, "index.html"), "utf8"), "<!doctype html><title>preview</title>");
  assert.equal(await readFile(join(destination, "src", "main.js"), "utf8"), "console.log('preview');");
});
