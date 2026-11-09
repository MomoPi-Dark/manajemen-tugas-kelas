import type { QueryResultRow } from "pg";
import { dbPool } from "../db/pool.ts";
import { AppError } from "../errors.ts";
import type { AuthenticatedUser } from "../middleware/auth.ts";

export interface TaskInput {
  title: string;
  description?: string | null;
  dueAt: string;
  classId: string;
}

export interface TaskPatch {
  title?: string;
  description?: string | null;
  dueAt?: string;
  classId?: string;
}

interface TaskRow extends QueryResultRow {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  classId: string;
  className: string;
  teacherId: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function isValidDate(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

export async function listTasks(
  user: AuthenticatedUser,
  options: {
    search: string;
    status?: "completed" | "pending";
    page: number;
    limit: number;
  },
) {
  const values: unknown[] = [user.id];
  const conditions =
    user.role === "guru"
      ? ["t.teacher_id = $1"]
      : ["u.id = $1", "u.class_id = t.class_id"];
  const joins = user.role === "siswa" ? "JOIN users u ON u.id = $1" : "";

  if (options.search) {
    values.push(`%${options.search}%`);
    conditions.push(`t.title ILIKE $${values.length}`);
  }
  if (user.role === "siswa" && options.status) {
    conditions.push(
      options.status === "completed"
        ? "EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id AND tc.student_id = $1)"
        : "NOT EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id AND tc.student_id = $1)",
    );
  }

  const where = conditions.join(" AND ");
  const countResult = await dbPool.query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM tasks t ${joins} WHERE ${where}`,
    values,
  );

  const offset = (options.page - 1) * options.limit;
  const pageValues = [...values, options.limit, offset];
  const result = await dbPool.query<TaskRow>(
    `SELECT t.id, t.title, t.description, t.due_at AS "dueAt", t.class_id AS "classId",
            c.name AS "className", t.teacher_id AS "teacherId",
            ${user.role === "siswa" ? "EXISTS (SELECT 1 FROM task_completions tc WHERE tc.task_id = t.id AND tc.student_id = $1)" : "FALSE"} AS completed,
            t.created_at AS "createdAt", t.updated_at AS "updatedAt"
     FROM tasks t
     JOIN classes c ON c.id = t.class_id
     ${joins}
     WHERE ${where}
     ORDER BY t.due_at ASC, t.created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    pageValues,
  );

  const total = Number(countResult.rows[0].total);
  return {
    data: result.rows,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
  };
}

export async function createTask(
  user: AuthenticatedUser,
  input: TaskInput,
): Promise<TaskRow> {
  if (!isValidDate(input.dueAt))
    throw new AppError(
      400,
      "INVALID_DUE_DATE",
      "Tenggat harus berupa tanggal yang valid.",
    );
  const result = await dbPool.query<TaskRow>(
    `INSERT INTO tasks (title, description, due_at, class_id, teacher_id)
     SELECT $1, $2, $3, c.id, $5
     FROM classes c WHERE c.id = $4 AND c.teacher_id = $5
     RETURNING id, title, description, due_at AS "dueAt", class_id AS "classId",
               (SELECT c.name FROM classes c WHERE c.id = class_id) AS "className",
               teacher_id AS "teacherId", FALSE AS completed, created_at AS "createdAt", updated_at AS "updatedAt"`,
    [
      input.title,
      input.description ?? null,
      input.dueAt,
      input.classId,
      user.id,
    ],
  );
  if (!result.rowCount)
    throw new AppError(
      404,
      "CLASS_NOT_FOUND",
      "Kelas tidak ditemukan atau bukan kelas yang Anda ajar.",
    );
  return result.rows[0];
}

export async function updateTask(
  user: AuthenticatedUser,
  taskId: string,
  input: TaskPatch,
): Promise<TaskRow> {
  if (input.dueAt && !isValidDate(input.dueAt)) {
    throw new AppError(
      400,
      "INVALID_DUE_DATE",
      "Tenggat harus berupa tanggal yang valid.",
    );
  }

  const result = await dbPool.query<TaskRow>(
    `UPDATE tasks t
     SET title = CASE WHEN $3::boolean THEN $4::varchar ELSE t.title END,
         description = CASE WHEN $5::boolean THEN $6::text ELSE t.description END,
         due_at = CASE WHEN $7::boolean THEN $8::timestamptz ELSE t.due_at END,
         class_id = CASE WHEN $9::boolean THEN $10::uuid ELSE t.class_id END,
         updated_at = NOW()
     WHERE t.id = $1 AND t.teacher_id = $2
       AND EXISTS (
         SELECT 1 FROM classes c
         WHERE c.id = CASE WHEN $9::boolean THEN $10::uuid ELSE t.class_id END
           AND c.teacher_id = $2
       )
     RETURNING t.id, t.title, t.description, t.due_at AS "dueAt", t.class_id AS "classId",
               (SELECT c.name FROM classes c WHERE c.id = t.class_id) AS "className",
               t.teacher_id AS "teacherId", FALSE AS completed, t.created_at AS "createdAt", t.updated_at AS "updatedAt"`,
    [
      taskId,
      user.id,
      Object.hasOwn(input, "title"),
      input.title ?? null,
      Object.hasOwn(input, "description"),
      input.description ?? null,
      Object.hasOwn(input, "dueAt"),
      input.dueAt ?? null,
      Object.hasOwn(input, "classId"),
      input.classId ?? null,
    ],
  );
  if (!result.rowCount)
    throw new AppError(
      404,
      "TASK_NOT_FOUND",
      "Tugas tidak ditemukan atau tidak dapat diakses.",
    );
  return result.rows[0];
}

export async function deleteTask(
  user: AuthenticatedUser,
  taskId: string,
): Promise<void> {
  const result = await dbPool.query(
    "DELETE FROM tasks WHERE id = $1 AND teacher_id = $2 RETURNING id",
    [taskId, user.id],
  );
  if (!result.rowCount)
    throw new AppError(
      404,
      "TASK_NOT_FOUND",
      "Tugas tidak ditemukan atau tidak dapat diakses.",
    );
}

export async function completeTask(user: AuthenticatedUser, taskId: string) {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const task = await client.query<{ id: string }>(
      `SELECT t.id FROM tasks t JOIN users u ON u.id = $2
       WHERE t.id = $1 AND u.role = 'siswa' AND u.class_id = t.class_id FOR SHARE OF t`,
      [taskId, user.id],
    );
    if (!task.rowCount)
      throw new AppError(
        404,
        "TASK_NOT_FOUND",
        "Tugas tidak ditemukan di kelas Anda.",
      );
    const result = await client.query<{ completedAt: Date }>(
      `INSERT INTO task_completions (task_id, student_id)
       VALUES ($1, $2)
       ON CONFLICT (task_id, student_id) DO UPDATE SET completed_at = task_completions.completed_at
       RETURNING completed_at AS "completedAt"`,
      [taskId, user.id],
    );
    await client.query("COMMIT");
    return { taskId, completed: true, completedAt: result.rows[0].completedAt };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
