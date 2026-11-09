import { beforeAll, describe, expect, it } from "bun:test";
import { migrateDatabase } from "../src/db/migrate.ts";
import { dbPool } from "../src/db/pool.ts";

beforeAll(async () => {
  if (process.env.NODE_ENV !== "test" || !process.env.TEST_DATABASE_URL) {
    throw new Error("Tests require NODE_ENV=test and a separate TEST_DATABASE_URL.");
  }
  await migrateDatabase();
});

describe("PostgreSQL schema", () => {
  it("creates the required relational tables", async () => {
    const result = await dbPool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [["users", "classes", "tasks", "task_completions"]],
    );
    expect(result.rows.map((row) => row.table_name).sort()).toEqual([
      "classes",
      "task_completions",
      "tasks",
      "users",
    ]);
  });

  it("records migrations and can be safely applied again", async () => {
    const before = await dbPool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM schema_migrations");
    await migrateDatabase();
    const after = await dbPool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM schema_migrations");
    expect(after.rows[0].count).toBe(before.rows[0].count);
  });
});
