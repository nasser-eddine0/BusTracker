import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export default async function globalSetup() {
  const pidFile = path.join(os.tmpdir(), "bus-tracker-playwright-vite.pid");
  const child = spawn(process.execPath, [path.resolve("e2e/vite-server.mjs")], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      VITE_API_BASE_URL: "http://127.0.0.1:5176/api",
      VITE_FIREBASE_API_KEY: "synthetic-test-key",
      VITE_FIREBASE_AUTH_DOMAIN: "synthetic.invalid",
      VITE_FIREBASE_DATABASE_URL: "https://synthetic-test.firebaseio.com",
      VITE_FIREBASE_PROJECT_ID: "synthetic-test",
    },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  await writeFile(pidFile, String(child.pid), "utf8");

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch("http://127.0.0.1:5176/");
      if (response.ok) return;
    } catch {
      // Vite is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  child.kill();
  throw new Error("Vite did not become ready on http://127.0.0.1:5176 within 30 seconds.");
}
