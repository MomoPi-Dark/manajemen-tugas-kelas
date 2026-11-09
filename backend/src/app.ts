import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.ts";
import { dbPool } from "./db/pool.ts";
import { AppError } from "./errors.ts";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.ts";
import { authRouter } from "./routes/auth.routes.ts";
import { classRouter } from "./routes/class.routes.ts";
import { taskRouter } from "./routes/task.routes.ts";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(
        new AppError(403, "CORS_ORIGIN_DENIED", "Origin tidak diizinkan."),
      );
    },
  }),
);
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", async (_request, response) => {
  try {
    await dbPool.query("SELECT 1");
    response.json({ data: { status: "ok" } });
  } catch {
    response.status(503).json({
      error: {
        code: "DATABASE_UNAVAILABLE",
        message: "Database belum tersedia.",
      },
    });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/classes", classRouter);
app.use("/api/tasks", taskRouter);
app.use(notFoundHandler);
app.use(errorHandler);
