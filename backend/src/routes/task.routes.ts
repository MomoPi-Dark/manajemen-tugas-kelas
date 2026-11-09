import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middleware/auth.ts";
import { validateBody, validateQuery } from "../middleware/validate.ts";
import {
  completeTask,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "../services/task.service.ts";

const taskBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(10_000).nullable().optional(),
  dueAt: z.iso.datetime({ offset: true }),
  classId: z.uuid(),
});

const taskPatchSchema = taskBodySchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu kolom harus diubah.",
  });

const listQuerySchema = z.object({
  search: z.string().trim().max(100).default(""),
  status: z.enum(["completed", "pending"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const taskRouter = Router();

taskRouter.use(authenticate);

taskRouter.get(
  "/",
  validateQuery(listQuerySchema),
  async (request, response) => {
    const query = (
      request as typeof request & {
        validatedQuery: z.infer<typeof listQuerySchema>;
      }
    ).validatedQuery;
    response.json({ data: await listTasks(request.user!, query) });
  },
);

taskRouter.post(
  "/",
  requireRole("guru"),
  validateBody(taskBodySchema),
  async (request, response) => {
    const task = await createTask(request.user!, request.body);
    response.status(201).json({ data: task });
  },
);

taskRouter.patch(
  "/:id",
  requireRole("guru"),
  validateBody(taskPatchSchema),
  async (request, response) => {
    const taskId = z.string().uuid().parse(request.params.id);
    const task = await updateTask(request.user!, taskId, request.body);
    response.json({ data: task });
  },
);

taskRouter.delete("/:id", requireRole("guru"), async (request, response) => {
  const taskId = z.string().uuid().parse(request.params.id);
  await deleteTask(request.user!, taskId);
  response.status(204).send();
});

taskRouter.patch(
  "/:id/complete",
  requireRole("siswa"),
  async (request, response) => {
    const taskId = z.string().uuid().parse(request.params.id);
    response.json({ data: await completeTask(request.user!, taskId) });
  },
);
