import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { exportSite, initializePagesSite } from "./export-site.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MAIN_PUBLISH_MARKER = ".pages-root-from-main";
const PREVIEWS_DIR = "previews";

export function previewDirectoryName(number) {
  return `pr-${number}`;
}

export function stalePreviewDirectories(existingEntries, openPullNumbers) {
  const desired = new Set(openPullNumbers.map(previewDirectoryName));
  return existingEntries.filter(entry => entry.startsWith("pr-") && !desired.has(entry));
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", code => code === 0 ? resolveRun() : rejectRun(new Error(`${command} ${args.join(" ")} exited with code ${code}`)));
    child.on("error", rejectRun);
  });
}

function runWithOutput(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { ...options, stdio: ["ignore", "pipe", "inherit"] });
    let stdout = "";
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.on("exit", code => code === 0 ? resolveRun(stdout.trim()) : rejectRun(new Error(`${command} ${args.join(" ")} exited with code ${code}`)));
    child.on("error", rejectRun);
  });
}

async function waitForChild(child, label) {
  await new Promise((resolveWait, rejectWait) => {
    child.on("exit", code => code === 0 ? resolveWait() : rejectWait(new Error(`${label} exited with code ${code}`)));
    child.on("error", rejectWait);
  });
}

async function extractAppAtFetchHead(workspace, destination) {
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });

  const archive = spawn("git", ["-C", workspace, "archive", "FETCH_HEAD", "index.html", "src"], { stdio: ["ignore", "pipe", "inherit"] });
  const untar = spawn("tar", ["-x", "-C", destination], { stdio: ["pipe", "inherit", "inherit"] });
  archive.stdout.pipe(untar.stdin);
  await Promise.all([waitForChild(archive, "git archive"), waitForChild(untar, "tar extract")]);
}

async function listOpenSameRepoPullNumbers(repository, token) {
  const numbers = [];
  for (let page = 1; ; page += 1) {
    const response = await fetch(`https://api.github.com/repos/${repository}/pulls?state=open&per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    if (!response.ok) throw new Error(`Failed to list open pull requests (${response.status})`);
    const pulls = await response.json();
    const sameRepoPulls = pulls.filter(pull => pull.head?.repo?.full_name === repository);
    numbers.push(...sameRepoPulls.map(pull => pull.number));
    if (pulls.length < 100) break;
  }
  return [...new Set(numbers)].sort((a, b) => a - b);
}

export async function reconcilePages({ mode, workspace = repoRoot, pagesDir, repository, token }) {
  if (!pagesDir) throw new Error("pagesDir is required");
  if (!repository) throw new Error("repository is required");
  if (!token) throw new Error("token is required");
  if (mode !== "preview" && mode !== "production") throw new Error("mode must be preview or production");

  const outputDir = resolve(pagesDir);
  const openPullNumbers = await listOpenSameRepoPullNumbers(repository, token);
  const previewsRoot = join(outputDir, PREVIEWS_DIR);
  const tempRoot = await mkdtemp(join(tmpdir(), "mopyo-pages-"));

  try {
    if (mode === "production") {
      await exportSite(outputDir, { preserve: [PREVIEWS_DIR], source: workspace });
      await writeFile(join(outputDir, MAIN_PUBLISH_MARKER), "published-from-main\n");
    } else {
      const existingRootEntries = await readdir(outputDir).catch(() => []);
      if (!existingRootEntries.includes(MAIN_PUBLISH_MARKER)) {
        await initializePagesSite(outputDir, { preserve: [PREVIEWS_DIR] });
      }
    }

    await mkdir(previewsRoot, { recursive: true });
    const existingPreviewEntries = (await readdir(previewsRoot, { withFileTypes: true }).catch(() => []))
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    for (const entry of stalePreviewDirectories(existingPreviewEntries, openPullNumbers)) {
      await rm(join(previewsRoot, entry), { recursive: true, force: true });
    }

    for (const number of openPullNumbers) {
      const sourceDir = join(tempRoot, previewDirectoryName(number));
      await run("git", ["-C", workspace, "fetch", "--depth=1", "origin", `refs/pull/${number}/head`]);
      await extractAppAtFetchHead(workspace, sourceDir);
      await exportSite(join(previewsRoot, previewDirectoryName(number)), { source: sourceDir });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  const pagesDir = process.argv[3];

  runWithOutput("git", ["-C", repoRoot, "rev-parse", "--show-toplevel"])
    .then(workspace => reconcilePages({
      mode,
      workspace,
      pagesDir,
      repository: process.env.REPOSITORY || process.env.GITHUB_REPOSITORY,
      token: process.env.GH_TOKEN || process.env.GITHUB_TOKEN
    }))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
