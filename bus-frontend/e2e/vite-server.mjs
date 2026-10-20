import { createServer } from "vite";

const server = await createServer({
  configFile: "vite.config.js",
  configLoader: "runner",
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
  },
});

await server.listen();

let stopping = false;

async function stop() {
  if (stopping) return;
  stopping = true;

  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    console.error("Failed to close the Playwright Vite server:", error);
    process.exit(1);
  }
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
process.once("SIGBREAK", stop);
