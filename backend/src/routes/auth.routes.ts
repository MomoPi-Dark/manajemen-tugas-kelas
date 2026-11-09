import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.ts";
import { validateBody } from "../middleware/validate.ts";
import {
  findUserById,
  loginUser,
  registerUser,
} from "../services/auth.service.ts";

const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.email().trim().max(254),
    password: z.string().min(12).max(128),
    role: z.enum(["guru", "siswa"]).optional().default("siswa"),
    classId: z.uuid().optional(),
    teacherRegistrationCode: z.string().min(1).optional(),
    className: z.string().trim().min(2).max(100).optional(),
  })
  .superRefine((input, context) => {
    if (input.role === "siswa" && !input.classId) {
      context.addIssue({
        code: "custom",
        path: ["classId"],
        message: "Siswa wajib memilih kelas.",
      });
    }
    if (input.role === "guru" && !input.teacherRegistrationCode) {
      context.addIssue({
        code: "custom",
        path: ["teacherRegistrationCode"],
        message: "Kode pendaftaran guru wajib diisi.",
      });
    }
    if (input.role === "guru" && !input.className) {
      context.addIssue({
        code: "custom",
        path: ["className"],
        message: "Guru perlu membuat nama kelas pertama.",
      });
    }
  });

const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(128),
});

export const authRouter = Router();

authRouter.post(
  "/register",
  validateBody(registerSchema),
  async (request, response) => {
    const body = request.body as z.infer<typeof registerSchema>;
    const input =
      body.role === "guru"
        ? {
            name: body.name,
            email: body.email,
            password: body.password,
            role: "guru" as const,
            teacherRegistrationCode: body.teacherRegistrationCode!,
            className: body.className!,
          }
        : {
            name: body.name,
            email: body.email,
            password: body.password,
            role: "siswa" as const,
            classId: body.classId!,
          };
    const result = await registerUser(input);
    response.status(201).json({ data: result });
  },
);

authRouter.post(
  "/login",
  validateBody(loginSchema),
  async (request, response) => {
    const result = await loginUser(request.body.email, request.body.password);
    response.status(200).json({ data: result });
  },
);

authRouter.get("/me", authenticate, async (request, response) => {
  const user = await findUserById(request.user!.id);
  response.json({ data: { user } });
});
