import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.ts";
import { AppError } from "../errors.ts";

export type UserRole = "guru" | "siswa";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  classId: string | null;
}

export const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.header("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Login diperlukan."));
  }

  try {
    const payload = jwt.verify(authorization.slice(7), config.JWT_SECRET);
    if (typeof payload === "string" || !payload.sub || (payload.role !== "guru" && payload.role !== "siswa")) {
      throw new Error("Invalid token payload");
    }

    request.user = {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : "",
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role,
      classId: typeof payload.classId === "string" ? payload.classId : null,
    };
    next();
  } catch {
    next(new AppError(401, "INVALID_TOKEN", "Token tidak valid atau sudah kedaluwarsa."));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) return next(new AppError(401, "AUTHENTICATION_REQUIRED", "Login diperlukan."));
    if (!roles.includes(request.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "Anda tidak memiliki izin untuk melakukan tindakan ini."));
    }
    next();
  };
}
