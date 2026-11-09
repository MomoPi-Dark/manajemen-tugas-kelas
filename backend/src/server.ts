import { app } from "./app.ts";
import { config } from "./config.ts";
import { dbPool } from "./db/pool.ts";

const server = app.listen(config.PORT, () => {
  console.info(`Class Task Tracker API listening on port ${config.PORT}`);
});

async function shutdown(signal: string) {
  console.info(`${signal} received; shutting down gracefully.`);
  server.close(async () => {
    await dbPool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
