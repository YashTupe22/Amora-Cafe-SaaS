const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn } = require("child_process");
const crypto = require("crypto");

const HOST = "127.0.0.1";
const PORT = process.env.PORT || "3001";
const APP_URL = `http://${HOST}:${PORT}`;
const DESKTOP_API_TOKEN = crypto.randomBytes(24).toString("hex");

let serverProcess;

function resolveAppRoot() {
  const packagedRootHasStandalone = fs.existsSync(path.join(__dirname, "server.js"));
  if (packagedRootHasStandalone) {
    return __dirname;
  }

  return path.resolve(__dirname, "..");
}

function startNextServer(appRoot) {
  const standaloneServerPath = path.join(appRoot, "server.js");
  const desktopDataDir = nw.App.dataPath;
  const allowedDirs = {
    imports: path.join(desktopDataDir, "imports"),
    exports: path.join(desktopDataDir, "exports"),
    backups: path.join(desktopDataDir, "backups"),
  };

  if (fs.existsSync(standaloneServerPath)) {
    serverProcess = spawn(process.execPath, [standaloneServerPath], {
      cwd: appRoot,
      env: {
        ...process.env,
        HOSTNAME: HOST,
        PORT,
        DESKTOP_RUNTIME: "1",
        DESKTOP_ALLOWED_DIRS_JSON: JSON.stringify(allowedDirs),
        DESKTOP_LOCAL_API_TOKEN: DESKTOP_API_TOKEN,
      },
      stdio: "inherit",
    });
    return;
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  serverProcess = spawn(npmCommand, ["run", "dev"], {
    cwd: appRoot,
    env: {
      ...process.env,
      PORT,
      DESKTOP_RUNTIME: "1",
      DESKTOP_ALLOWED_DIRS_JSON: JSON.stringify(allowedDirs),
      DESKTOP_LOCAL_API_TOKEN: DESKTOP_API_TOKEN,
    },
    stdio: "inherit",
  });
}

function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const tryConnect = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });

      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error("Timed out waiting for Next.js server to start."));
          return;
        }

        setTimeout(tryConnect, 500);
      });
    };

    tryConnect();
  });
}

function stopServerAndExit(code = 0) {
  if (serverProcess && !serverProcess.killed) {
    try {
      serverProcess.kill();
    } catch (error) {
      console.error("Failed to stop server process cleanly:", error);
    }
  }

  nw.App.quit();
  process.exit(code);
}

(async () => {
  const appRoot = resolveAppRoot();

  try {
    startNextServer(appRoot);
    await waitForServer(APP_URL);

    nw.Window.open(
      APP_URL,
      {
        width: 1440,
        height: 900,
        min_width: 1100,
        min_height: 700,
        position: "center",
        frame: true,
        toolbar: false,
        show: true,
      },
      (win) => {
        win.on("loaded", () => {
          // Make token available to the local renderer for authenticated desktop API calls.
          win.window.localStorage.setItem("desktopApiToken", DESKTOP_API_TOKEN);
        });

        win.on("close", () => {
          this.close(true);
          stopServerAndExit(0);
        });
      }
    );
  } catch (error) {
    console.error("Desktop bootstrap failed:", error);
    stopServerAndExit(1);
  }
})();

process.on("SIGINT", () => stopServerAndExit(0));
process.on("SIGTERM", () => stopServerAndExit(0));
process.on("exit", () => {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
});
