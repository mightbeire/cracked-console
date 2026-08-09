import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";

const roots = ["src"];
const allowedExtensions = new Set([".ts", ".tsx", ".css"]);
const forbiddenPatterns = [
  [/\bblue\b/i, "color word: blue"],
  [/\bcyan\b/i, "color word: cyan"],
  [/\bpurple\b/i, "color word: purple"],
  [/linear-gradient\s*\(/i, "linear gradient"],
  [/radial-gradient\s*\(/i, "radial gradient"],
  [/conic-gradient\s*\(/i, "conic gradient"],
  [/#(?:00[0-9a-f]{4}|0{0,1}[0-9a-f]{2}ff|1e90ff|007bff|0d6efd|2563eb|3b82f6)\b/i, "known bright/accent hex"],
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

const failures = [];
for (const root of roots) {
  for (const file of await walk(root)) {
    const text = await readFile(file, "utf8");
    for (const [pattern, label] of forbiddenPatterns) {
      if (pattern.test(text)) failures.push(`${file}: ${label}`);
    }
  }
}

if (failures.length) {
  console.error("Visual guard failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log("Visual guard: PASS — grayscale-only source check");
