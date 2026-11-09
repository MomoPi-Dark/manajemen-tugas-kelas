import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";
import { dbPool } from "../db/pool.ts";
import { AppError } from "../errors.ts";
import type { AuthenticatedUser, UserRole } from "../middleware/auth.ts";

interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  class_id: string | null;
}

export type RegistrationInput =
  | {
      name: string;
      email: string;
      password: string;
      role: "siswa";
      classId: string;
    }
  | {
      name: string;
      email: string;
      password: string;
      role: "guru";
      teacherRegistrationCode: string;
      className: string;
    };

function toPublicUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    classId: row.class_id,
  };
}

function createToken(user: AuthenticatedUser): string {
  return jwt.sign(
    {
      email: user.email,
      name: user.name,
      role: user.role,
      classId: user.classId,
    },
    config.JWT_SECRET,
    {
      subject: user.id,
      expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    },
  );
}

export async function registerUser(
  input: RegistrationInput,
): Promise<{ user: AuthenticatedUser; token: string }> {
  if (
    input.role === "guru" &&
    input.teacherRegistrationCode !== config.TEACHER_REGISTRATION_CODE
  ) {
    throw new AppError(
      403,
      "INVALID_TEACHER_CODE",
      "Kode pendaftaran guru tidak valid.",
    );
  }

  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");
    const passwordHash = await bcrypt.hash(input.password, 12);
    let row: UserRow;

    if (input.role === "siswa") {
      const classroom = await client.query(
        "SELECT 1 FROM classes WHERE id = $1",
        [input.classId],
      );
      if (!classroom.rowCount)
        throw new AppError(
          400,
          "INVALID_CLASS",
          "Kelas yang dipilih tidak ditemukan.",
        );
      const result = await client.query<UserRow>(
        `INSERT INTO users (name, email, password_hash, role, class_id)
         VALUES ($1, $2, $3, 'siswa', $4)
         RETURNING id, name, email, password_hash, role, class_id`,
        [input.name, input.email.toLowerCase(), passwordHash, input.classId],
      );
      row = result.rows[0];
    } else {
      const result = await client.query<UserRow>(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'guru')
         RETURNING id, name, email, password_hash, role, class_id`,
        [input.name, input.email.toLowerCase(), passwordHash],
      );
      row = result.rows[0];
      await client.query(
        "INSERT INTO classes (name, teacher_id) VALUES ($1, $2)",
        [input.className, row.id],
      );
    }

    await client.query("COMMIT");
    const user = toPublicUser(row);
    return { user, token: createToken(user) };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function loginUser(
  email: string,
  password: string,
): Promise<{ user: AuthenticatedUser; token: string }> {
  const result = await dbPool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, class_id
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Email atau password tidak cocok.",
    );
  }

  const user = toPublicUser(row);
  return { user, token: createToken(user) };
}

export async function findUserById(id: string): Promise<AuthenticatedUser> {
  const result = await dbPool.query<UserRow>(
    `SELECT id, name, email, password_hash, role, class_id FROM users WHERE id = $1`,
    [id],
  );
  if (!result.rowCount)
    throw new AppError(
      401,
      "INVALID_TOKEN",
      "Akun pada token tidak lagi tersedia.",
    );
  return toPublicUser(result.rows[0]);
}
