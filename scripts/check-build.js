import { access, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const entry = resolve(root, "index.html");
const visited = new Set();

function localReferences(source, extension) {
  const pattern = extension === ".html"
    ? /(?:src|href)=["']([^"']+)["']/g
    : /(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g;

  return [...source.matchAll(pattern)]
    .map(match => match[1])
    .filter(reference => !/^(?:[a-z]+:|#|\/\/)/i.test(reference));
}

async function checkFile(file) {
  const relativePath = relative(root, file);
  if (relativePath.startsWith("..")) throw new Error(`Asset escapes the site root: ${file}`);
  if (visited.has(file)) return;
  visited.add(file);

  await access(file);
  if (!/\.(?:html|js)$/.test(file)) return;

  const source = await readFile(file, "utf8");
  const extension = file.endsWith(".html") ? ".html" : ".js";
  const references = localReferences(source, extension);

  if (extension === ".html") {
    const rootRelative = references.find(reference => reference.startsWith("/"));
    if (rootRelative) throw new Error(`Root-relative asset is not GitHub Pages safe: ${rootRelative}`);
  }

  await Promise.all(references.map(reference => {
    const path = reference.split(/[?#]/, 1)[0];
    return checkFile(resolve(dirname(file), path));
  }));
}

await checkFile(entry);
console.log(`Build check passed (${visited.size} linked application files).`);
