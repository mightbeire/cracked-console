import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, sep } from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git", "node_modules", "dist", "target", "release", ".idea", ".vscode",
]);

const textExtensions = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".css", ".html",
  ".toml", ".sql", ".rs", ".ps1", ".txt", ".yml", ".yaml",
]);

const split = (...parts) => parts.join("");

const privateFingerprints = [
  ["private curriculum date", new RegExp(split("2026-", "08-", "10|2027-", "08-", "08"), "i")],
  ["private curriculum hash", new RegExp(split("3c9a9bc0399c9bf9", "4075e8296967535b", "5ba5277442faf229", "532e6e096a8944c1"), "i")],
  ["private camera model", new RegExp(split("\\b", "Nikon ", "D32", "00\\b|\\bD32", "00\\b"), "i")],
  ["private language curriculum", new RegExp(split("\\bTag", "alog\\b|American ", "Sign Language"), "i")],
  ["private reading syllabus", new RegExp(split("Season of Migration ", "to the North|Thinking ", "in Systems|Brave ", "New World"), "i")],
  ["private repository path", new RegExp(split("C:\\\\Users\\\\user\\\\Documents\\\\cracked", "-console(?!-community)"), "i")],
];

const secretPatterns = [
  ["OpenAI-style key", new RegExp(split("\\bsk", "-[A-Za-z0-9_-]{20,}\\b"), "g")],
  ["GitHub personal token", /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["private key block", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["generic assigned secret", /\b(?:api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["'][^"'\r\n]{8,}["']/gi],
];

const forbiddenNames = [
  /^cracked-console-backup-.*\.json$/i,
  /\.db$/i, /\.sqlite$/i, /\.sqlite3$/i, /\.db-wal$/i, /\.db-shm$/i,
];

const forbiddenDebris = new Set([
  "STAGE_2_HANDOFF.md", "STAGE_3_HANDOFF.md", "STAGE_4_HANDOFF.md",
  "COMMUNITY_BUILD_PLAN.md", "stage3-verify.log",
]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const files = await walk(root);
const failures = [];

for (const file of files) {
  const rel = relative(root, file).split(sep).join("/");
  const name = rel.split("/").at(-1) ?? rel;

  if (forbiddenDebris.has(name)) failures.push(`${rel}: intermediate build handoff must not ship`);
  if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) {
    failures.push(`${rel}: environment file must not ship`);
  }
  if (forbiddenNames.some((pattern) => pattern.test(name))) {
    failures.push(`${rel}: local data or backup file must not ship`);
  }
  if (rel.startsWith("user-config/") && !["user-config/.gitkeep", "user-config/README.md"].includes(rel)) {
    failures.push(`${rel}: personal user configuration must not ship`);
  }

  const extension = extname(name).toLowerCase();
  const shouldRead = textExtensions.has(extension) || name === ".gitignore" || name === "LICENSE";
  if (!shouldRead) continue;

  const info = await stat(file);
  if (info.size > 2_000_000) continue;

  const text = await readFile(file, "utf8");

  for (const [label, pattern] of privateFingerprints) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) failures.push(`${rel}: ${label}`);
  }

  for (const [label, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) failures.push(`${rel}: possible ${label}`);
  }
}

if (failures.length) {
  console.error(`Public release audit: FAIL (${failures.length} issue${failures.length === 1 ? "" : "s"})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Public release audit: PASS (${files.length} files checked)`);
