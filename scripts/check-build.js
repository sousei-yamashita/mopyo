import { readFile } from "node:fs/promises";

const files = ["index.html", "src/main.js", "src/style.css", "src/story.js", "src/engine.js", "src/creature.js", "src/storage.js", "scripts/reconcile-pages.js"];
await Promise.all(files.map(file => readFile(new URL(`../${file}`, import.meta.url))));
await import("../src/story.js");
await import("../src/engine.js");
await import("../src/creature.js");
await import("../src/storage.js");
await import("./reconcile-pages.js");
console.log(`Build check passed (${files.length} application files).`);
