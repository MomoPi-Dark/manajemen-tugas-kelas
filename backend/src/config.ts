import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  TEST_DATABASE_URL: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must contain at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  TEACHER_REGISTRATION_CODE: z.string().min(1).optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  SEED_TEACHER_EMAIL: z.email().optional(),
  SEED_TEACHER_PASSWORD: z.string().min(12).optional(),
  SEED_STUDENT_EMAIL: z.email().optional(),
  SEED_STUDENT_PASSWORD: z.string().min(12).optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  throw new Error("Backend environment configuration is invalid");
}

export const config = {
  ...parsed.data,
  corsOrigins: parsed.data.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  databaseUrl:
    parsed.data.NODE_ENV === "test" && parsed.data.TEST_DATABASE_URL
      ? parsed.data.TEST_DATABASE_URL
      : parsed.data.DATABASE_URL,
};
