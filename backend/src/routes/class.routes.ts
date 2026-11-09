import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.ts";
import { dbPool } from "../db/pool.ts";

export const classRouter = Router();

classRouter.get(
  "/mine",
  authenticate,
  requireRole("guru"),
  async (request, response) => {
    const result = await dbPool.query<{ id: string; name: string }>(
      "SELECT id, name FROM classes WHERE teacher_id = $1 ORDER BY name ASC",
      [request.user!.id],
    );
    response.json({ data: result.rows });
  },
);

classRouter.get("/", async (_request, response) => {
  const result = await dbPool.query<{ id: string; name: string }>(
    "SELECT id, name FROM classes ORDER BY name ASC",
  );
  response.json({ data: result.rows });
});
