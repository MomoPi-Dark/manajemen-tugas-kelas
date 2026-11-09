import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return next(parsed.error);
    request.body = parsed.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.query);
    if (!parsed.success) return next(parsed.error);
    Object.assign(request, { validatedQuery: parsed.data });
    next();
  };
}
