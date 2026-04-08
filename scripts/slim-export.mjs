import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const outDir = path.join(rootDir, "out");
const sourceConfig = path.join(rootDir, "config.json");
const outputConfig = path.join(outDir, "config.json");

if (!existsSync(outDir)) {
  throw new Error("Static export directory 'out' was not found. Run next build first.");
}

copyFileSync(sourceConfig, outputConfig);

const removablePaths = [
  path.join(outDir, "local"),
  path.join(outDir, "OidcTrustedDomains.js"),
  path.join(outDir, "OidcTrustedDomains.js.tmpl"),
  path.join(outDir, "assets", "flags", "1x1"),
];

for (const target of removablePaths) {
  if (!existsSync(target)) continue;
  rmSync(target, { force: true, recursive: true });
}

console.log("Slimmed static export and copied runtime config to out/config.json");
