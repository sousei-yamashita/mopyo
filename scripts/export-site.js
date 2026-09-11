import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const appEntries = ["index.html", "src"];

export async function exportSite(destination, { preserve = [], source = repoRoot } = {}) {
  if (!destination) throw new Error("Destination path is required.");

  const outputDir = resolve(destination);
  const sourceDir = resolve(source);
  const preserved = new Set([".git", ...preserve]);
  await mkdir(outputDir, { recursive: true });

  for (const entry of await readdir(outputDir)) {
    if (preserved.has(entry)) continue;
    await rm(join(outputDir, entry), { recursive: true, force: true });
  }

  await Promise.all(appEntries.map(entry => cp(join(sourceDir, entry), join(outputDir, entry), { recursive: true })));
  await writeFile(join(outputDir, ".nojekyll"), "");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const preserveArg = process.argv.find(argument => argument.startsWith("--preserve="));
  const sourceArg = process.argv.find(argument => argument.startsWith("--source="));
  const preserve = preserveArg ? preserveArg.slice("--preserve=".length).split(",").filter(Boolean) : [];
  const source = sourceArg ? sourceArg.slice("--source=".length) : repoRoot;

  exportSite(process.argv[2], { preserve, source }).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
