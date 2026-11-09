import bcrypt from "bcryptjs";
import { config } from "../config.ts";
import { migrateDatabase } from "./migrate.ts";
import { dbPool } from "./pool.ts";

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} must be set before seeding demo accounts`);
  return value;
}

export async function seedDatabase(): Promise<void> {
  const teacherEmail = required(config.SEED_TEACHER_EMAIL, "SEED_TEACHER_EMAIL").toLowerCase();
  const teacherPassword = required(config.SEED_TEACHER_PASSWORD, "SEED_TEACHER_PASSWORD");
  const studentEmail = required(config.SEED_STUDENT_EMAIL, "SEED_STUDENT_EMAIL").toLowerCase();
  const studentPassword = required(config.SEED_STUDENT_PASSWORD, "SEED_STUDENT_PASSWORD");
  const client = await dbPool.connect();

  try {
    await client.query("BEGIN");
    const teacherHash = await bcrypt.hash(teacherPassword, 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ('Guru Contoh', $1, $2, 'guru')
       ON CONFLICT DO NOTHING`,
      [teacherEmail, teacherHash],
    );
    const teacher = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND role = 'guru'",
      [teacherEmail],
    );
    if (!teacher.rowCount) throw new Error("Seed teacher email is already used by a non-teacher account");

    await client.query(
      `INSERT INTO classes (name, teacher_id)
       VALUES ('Kelas Demo', $1)
       ON CONFLICT (teacher_id, name) DO NOTHING`,
      [teacher.rows[0].id],
    );
    const classroom = await client.query<{ id: string }>(
      "SELECT id FROM classes WHERE teacher_id = $1 AND name = 'Kelas Demo'",
      [teacher.rows[0].id],
    );

    const studentHash = await bcrypt.hash(studentPassword, 12);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role, class_id)
       VALUES ('Siswa Contoh', $1, $2, 'siswa', $3)
       ON CONFLICT DO NOTHING`,
      [studentEmail, studentHash, classroom.rows[0].id],
    );
    const student = await client.query<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND role = 'siswa'",
      [studentEmail],
    );
    if (!student.rowCount) throw new Error("Seed student email is already used by another account");

    await client.query(
      `INSERT INTO tasks (title, description, due_at, class_id, teacher_id)
       SELECT 'Tugas Demo', 'Contoh tugas untuk memeriksa alur aplikasi.', NOW() + INTERVAL '7 days', $1, $2
       WHERE NOT EXISTS (
         SELECT 1 FROM tasks WHERE title = 'Tugas Demo' AND class_id = $1 AND teacher_id = $2
       )`,
      [classroom.rows[0].id, teacher.rows[0].id],
    );
    await client.query("COMMIT");
    console.info("Demo teacher, student, class, and task are ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.main) {
  try {
    await migrateDatabase();
    await seedDatabase();
    await dbPool.end();
  } catch (error) {
    console.error("Database seeding failed", error);
    await dbPool.end();
    process.exitCode = 1;
  }
}
