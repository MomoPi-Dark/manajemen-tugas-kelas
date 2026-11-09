import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Pool, PoolClient } from "pg";
import { dbPool } from "./pool.ts";

const migrationsDirectory = fileURLToPath(new URL("./migrations/", import.meta.url));

export async function migrateDatabase(pool: Pool = dbPool): Promise<void> {
  const client: PoolClient = await pool.connect();

  try {
    await client.query("SELECT pg_advisory_lock(74192031)");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await readdir(migrationsDirectory))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const alreadyApplied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [file],
      );
      if (alreadyApplied.rowCount) continue;

      const sql = await readFile(join(migrationsDirectory, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.info(`Applied migration ${file}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(74192031)").catch(() => undefined);
    client.release();
  }
}

if (import.meta.main) {
  try {
    await migrateDatabase();
    await dbPool.end();
  } catch (error) {
    console.error("Database migration failed", error);
    await dbPool.end();
    process.exitCode = 1;
  }
}
