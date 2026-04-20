import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const DIST = path.join(ROOT, "dist");

const SHARED_PATHS = ["src", "options", "popup", "icons", "README.md"];

async function copyShared(targetDir) {
  await mkdir(targetDir, { recursive: true });
  for (const entry of SHARED_PATHS) {
    const from = path.join(ROOT, entry);
    const to = path.join(targetDir, entry);
    await cp(from, to, { recursive: true, force: true });
  }
}

async function buildTarget(name, manifestFile) {
  const targetDir = path.join(DIST, name);
  await rm(targetDir, { recursive: true, force: true });
  await copyShared(targetDir);

  const manifestRaw = await readFile(path.join(ROOT, "manifests", manifestFile), "utf8");
  const manifest = JSON.parse(manifestRaw);
  await writeFile(path.join(targetDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function main() {
  await mkdir(DIST, { recursive: true });
  await buildTarget("chrome", "manifest.chrome.json");
  await buildTarget("firefox", "manifest.firefox.json");
  console.log("Built dist/chrome and dist/firefox");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
