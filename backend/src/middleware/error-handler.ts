import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors.ts";

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan." },
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  _next,
) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Input tidak valid.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const requestError = error as {
    code?: string;
    type?: string;
    status?: number;
  };
  if (requestError.type === "entity.parse.failed") {
    response
      .status(400)
      .json({
        error: {
          code: "INVALID_JSON",
          message: "Body request bukan JSON yang valid.",
        },
      });
    return;
  }
  if (requestError.code === "23505") {
    response
      .status(409)
      .json({
        error: {
          code: "CONFLICT",
          message: "Data dengan nilai tersebut sudah ada.",
        },
      });
    return;
  }
  if (requestError.code === "23503" || requestError.code === "23514") {
    response
      .status(400)
      .json({
        error: {
          code: "INVALID_REFERENCE",
          message: "Relasi atau nilai yang dipilih tidak valid.",
        },
      });
    return;
  }
  if (requestError.type === "entity.too.large" || requestError.status === 413) {
    response
      .status(413)
      .json({
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Ukuran request terlalu besar.",
        },
      });
    return;
  }

  console.error("Unhandled API error", error);
  response.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Terjadi kesalahan pada server.",
    },
  });
};
