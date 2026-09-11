export function previewDirectoryName(number) {
  return `pr-${number}`;
}

export function normalizePreviewSources(previewSources = []) {
  if (previewSources.length > 0) {
    const byNumber = new Map();
    for (const source of previewSources) {
      if (!Number.isInteger(source?.number) || typeof source?.sha !== "string" || source.sha.length === 0) continue;
      byNumber.set(source.number, { number: source.number, sha: source.sha });
    }
    return [...byNumber.values()].sort((a, b) => a.number - b.number);
  }
  return [];
}

export function reviewablePullNumbers(pulls, repository) {
  return [...new Set(
    pulls
      .filter(pull => pull.state === "open" && pull.draft === false && pull.head?.repo?.full_name === repository)
      .map(pull => pull.number)
  )].sort((a, b) => a - b);
}

export function stalePreviewDirectories(existingEntries, openPullNumbers) {
  const desired = new Set(openPullNumbers.map(previewDirectoryName));
  return existingEntries.filter(entry => entry.startsWith("pr-") && !desired.has(entry));
}

import { access, mkdir, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { exportSite, initializePagesSite } from "./export-site.js";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", code => code === 0 ? resolveRun() : rejectRun(new Error(`${command} ${args.join(" ")} exited with code ${code}`)));
    child.on("error", rejectRun);
  });
}

async function waitForChild(child, label) {
  await new Promise((resolveWait, rejectWait) => {
    child.on("exit", code => code === 0 ? resolveWait() : rejectWait(new Error(`${label} exited with code ${code}`)));
    child.on("error", rejectWait);
  });
}

async function exportRef(workspace, ref, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await run("git", ["-C", workspace, "fetch", "--depth=1", "origin", ref]);

  const archive = spawn("git", ["-C", workspace, "archive", "FETCH_HEAD", "index.html", "src"], { stdio: ["ignore", "pipe", "inherit"] });
  const untar = spawn("tar", ["-x", "-C", destination], { stdio: ["pipe", "inherit", "inherit"] });
  archive.stdout.pipe(untar.stdin);
  await Promise.all([waitForChild(archive, "git archive"), waitForChild(untar, "tar extract")]);
}

export async function reconcilePages({ workspace, pagesDir, mode, previewSources = [], productionSource = "" }) {
  if (!workspace) throw new Error("workspace is required");
  if (!pagesDir) throw new Error("pagesDir is required");
  if (!["preview", "production"].includes(mode)) throw new Error("mode must be preview or production");
  if (mode === "production" && !productionSource) throw new Error("productionSource is required for production mode");

  const sources = normalizePreviewSources(previewSources);
  const outputDir = resolve(pagesDir);
  const previewsRoot = join(outputDir, "previews");
  const tempRoot = await mkdtemp(join(tmpdir(), "mopyo-pages-"));

  try {
    if (mode === "production") {
      const productionSourceDir = join(tempRoot, "production");
      await exportRef(workspace, productionSource, productionSourceDir);
      await exportSite(outputDir, { preserve: [".git", "previews"], source: productionSourceDir });
    } else if (!(await exists(join(outputDir, "index.html")))) {
      await initializePagesSite(outputDir, { preserve: [".git", "previews"] });
    }

    await mkdir(previewsRoot, { recursive: true });
    const existingPreviewEntries = (await readdir(previewsRoot, { withFileTypes: true }))
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const entry of stalePreviewDirectories(existingPreviewEntries, sources.map(source => source.number))) {
      await rm(join(previewsRoot, entry), { recursive: true, force: true });
    }

    for (const source of sources) {
      const sourceDir = join(tempRoot, previewDirectoryName(source.number));
      await exportRef(workspace, source.sha, sourceDir);
      await exportSite(join(previewsRoot, previewDirectoryName(source.number)), { source: sourceDir });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && process.argv[1].endsWith("reconcile-pages.js")) {
  const args = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    args.set(process.argv[index], process.argv[index + 1]);
  }

  reconcilePages({
    workspace: process.cwd(),
    pagesDir: args.get("--pages-dir"),
    mode: args.get("--mode"),
    previewSources: JSON.parse(args.get("--preview-sources") || "[]"),
    productionSource: args.get("--production-source") || ""
  }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
