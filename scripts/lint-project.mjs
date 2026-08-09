import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src", "scripts"];
const allowedExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".css"]);
const forbidden = [
  ["TODO", "-BLOCKER"].join(""),
  ["FIXME", "-BLOCKER"].join(""),
  ["@ts", "-ignore"].join(""),
  ["eslint", "-disable"].join("")
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (allowedExtensions.has(extname(path))) files.push(path);
  }
  return files;
}

const errors = [];
for (const root of roots) {
  for (const file of await walk(root)) {
    const text = await readFile(file, "utf8");
    for (const marker of forbidden) {
      if (text.includes(marker)) errors.push(`${file}: forbidden marker ${marker}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Project lint: PASS");
