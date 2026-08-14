import { spawnSync } from "node:child_process";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/validate-config.mjs <plan.json>");
  process.exit(2);
}

for (const script of ["scripts/validate-community-config.mjs", "scripts/validate-side-paths.mjs"]) {
  const result = spawnSync(process.execPath, [script, file], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
