import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/firebase-rules.test.mjs",
  globalSetup: "./e2e/vite-global-setup.mjs",
  globalTeardown: "./e2e/vite-global-teardown.mjs",
  globalTimeout: 120000,
  timeout: 30000,
  outputDir: path.join(os.tmpdir(), "bus-tracker-playwright-results"),
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5176", trace: "retain-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
});
