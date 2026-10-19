import { spawn } from "node:child_process";
import path from "node:path";

const viteBin = path.resolve("node_modules/vite/bin/vite.js");
const child = spawn(process.execPath, [viteBin, "--configLoader", "runner", "--host", "127.0.0.1", "--port", "5176", "--strictPort"], {
  stdio: "inherit",
  windowsHide: true,
});

let stopping = false;

function stop() {
  if (stopping) return;
  stopping = true;
  if (process.platform === "win32" && child.pid) {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", windowsHide: true });
  } else {
    child.kill("SIGTERM");
  }
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
child.once("exit", (code) => process.exit(stopping ? 0 : (code ?? 1)));
