import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/firebase-rules.test.mjs",
  globalTimeout: 120000,
  timeout: 15000,
  outputDir: path.join(os.tmpdir(), "bus-tracker-playwright-results"),
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5176", trace: "retain-on-failure", channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: {
    command: "node e2e/vite-server.mjs",
    url: "http://127.0.0.1:5176",
    reuseExistingServer: true,
    gracefulShutdown: { signal: "SIGTERM", timeout: 1000 },
    env: {
      VITE_API_BASE_URL: "http://127.0.0.1:5176/api",
      VITE_FIREBASE_API_KEY: "synthetic-test-key",
      VITE_FIREBASE_AUTH_DOMAIN: "synthetic.invalid",
      VITE_FIREBASE_DATABASE_URL: "https://synthetic-test.firebaseio.com",
      VITE_FIREBASE_PROJECT_ID: "synthetic-test",
    },
  },
});
