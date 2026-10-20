import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
export default async function globalTeardown() {
  const pidFile = path.join(os.tmpdir(), "bus-tracker-playwright-vite.pid");

  try {
    const pid = (await readFile(pidFile, "utf8").catch(() => "")).trim();
    if (pid && process.platform === "win32") {
      await execFileAsync(path.join(process.env.SystemRoot || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), ["-NoProfile", "-NonInteractive", "-Command", `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`], {
        windowsHide: true,
      });
    }
  } finally {
    await rm(pidFile, { force: true });
  }
}
