import pg from "pg";
import { config } from "../config.ts";

const { Pool } = pg;

export const dbPool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

dbPool.on("error", (error) => {
  console.error("Unexpected idle PostgreSQL client error", error);
});
