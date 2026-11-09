import { Router } from "express";
import { dbPool } from "../db/pool.ts";

export const classRouter = Router();

classRouter.get("/", async (_request, response) => {
  const result = await dbPool.query<{ id: string; name: string }>(
    "SELECT id, name FROM classes ORDER BY name ASC",
  );
  response.json({ data: result.rows });
});
