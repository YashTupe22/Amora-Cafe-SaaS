import { cp, mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const nextStandaloneDir = path.join(projectRoot, ".next", "standalone");
const nextStaticDir = path.join(projectRoot, ".next", "static");
const publicDir = path.join(projectRoot, "public");

const desktopDistRoot = path.join(projectRoot, "dist", "desktop");
const desktopAppDir = path.join(desktopDistRoot, "app");
const desktopBinDir = path.join(desktopDistRoot, "bin");

const nwManifest = path.join(projectRoot, "desktop", "package.json");
const nwMain = path.join(projectRoot, "desktop", "nw-main.js");
const localNwRuntimeDir = path.join(projectRoot, "node_modules", "nw", "nwjs-v0.96.0-win-x64");
const fallbackWinDir = path.join(desktopBinDir, "synplix-desktop-win64");

async function prepareDesktopApp() {
  await rm(desktopDistRoot, { recursive: true, force: true });
  await mkdir(desktopAppDir, { recursive: true });

  await cp(nextStandaloneDir, desktopAppDir, { recursive: true, dereference: true });
  await cp(nextStaticDir, path.join(desktopAppDir, ".next", "static"), {
    recursive: true,
  });
  await cp(publicDir, path.join(desktopAppDir, "public"), { recursive: true });

  // Overwrite the standalone package with NW.js app manifest.
  await cp(nwManifest, path.join(desktopAppDir, "package.json"));
  await cp(nwMain, path.join(desktopAppDir, "nw-main.js"));
}

function runNwBuilder() {
  const args = [
    desktopAppDir,
    "--mode",
    "build",
    "--platforms",
    "win64",
    "--buildDir",
    desktopBinDir,
    "--appName",
    "synplix-desktop",
    "--appVersion",
    "1.0.0",
    "--version",
    "0.96.0",
    "--flavor",
    "normal",
  ];

  return new Promise((resolve, reject) => {
    const nwbuildCmd =
      process.platform === "win32"
        ? path.join(projectRoot, "node_modules", ".bin", "nwbuild.cmd")
        : "npx";

    const fullArgs = process.platform === "win32" ? args : ["nwbuild", ...args];

    const child = spawn(nwbuildCmd, fullArgs, {
      cwd: projectRoot,
      stdio: "inherit",
      env: process.env,
      shell: process.platform === "win32",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`nwbuild exited with code ${code}`));
    });
  });
}

function runPowerShell(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      {
        cwd: projectRoot,
        stdio: "inherit",
        env: process.env,
      }
    );

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`PowerShell command exited with code ${code}`));
    });
  });
}

async function buildPortableWindowsFallback() {
  if (process.platform !== "win32") {
    throw new Error("Portable fallback is currently implemented for Windows only.");
  }

  await mkdir(desktopBinDir, { recursive: true });
  await rm(fallbackWinDir, { recursive: true, force: true });
  await cp(localNwRuntimeDir, fallbackWinDir, { recursive: true, dereference: true });

  const packageZipPath = path.join(fallbackWinDir, "package.zip");
  const packageNwPath = path.join(fallbackWinDir, "package.nw");
  await rm(packageZipPath, { force: true });
  await rm(packageNwPath, { force: true });

  const psCommand = [
    "$ErrorActionPreference='Stop'",
    `Compress-Archive -Path \"${desktopAppDir}/*\" -DestinationPath \"${packageZipPath}\" -Force`,
  ].join("; ");

  await runPowerShell(psCommand);
  await rename(packageZipPath, packageNwPath);
  await cp(path.join(fallbackWinDir, "nw.exe"), path.join(fallbackWinDir, "synplix-desktop.exe"));
}

async function main() {
  console.log("Preparing NW.js app bundle...");
  await prepareDesktopApp();

  console.log("Packaging Windows executable with nw-builder...");
  try {
    await runNwBuilder();
  } catch (error) {
    console.warn("nw-builder failed, using local runtime fallback:", error);
    await buildPortableWindowsFallback();
  }

  console.log("Desktop package created in dist/desktop/bin");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
