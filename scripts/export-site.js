import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appEntries = ["index.html", "src"];

export async function initializePagesSite(destination, { preserve = [] } = {}) {
  if (!destination) throw new Error("Destination path is required.");

  const outputDir = resolve(destination);
  const preserved = new Set([".git", ...preserve]);
  await mkdir(outputDir, { recursive: true });

  for (const entry of await readdir(outputDir)) {
    if (preserved.has(entry)) continue;
    await rm(join(outputDir, entry), { recursive: true, force: true });
  }

  await writeFile(join(outputDir, ".nojekyll"), "");
  return outputDir;
}

export async function exportSite(destination, { preserve = [] } = {}) {
  const outputDir = await initializePagesSite(destination, { preserve });

  await Promise.all(appEntries.map(entry => cp(join(repoRoot, entry), join(outputDir, entry), { recursive: true })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preserveArg = process.argv.find(argument => argument.startsWith("--preserve="));
  const rootOnly = process.argv.includes("--root-only");
  const preserve = preserveArg ? preserveArg.slice("--preserve=".length).split(",").filter(Boolean) : [];

  const action = rootOnly ? initializePagesSite : exportSite;
  action(process.argv[2], { preserve }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
