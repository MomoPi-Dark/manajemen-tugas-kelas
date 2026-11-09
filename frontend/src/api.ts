import type { ApiEnvelope } from "./types";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    details?: Array<{ field?: string; message?: string }>;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: NonNullable<ApiErrorBody["error"]>["details"];

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: NonNullable<ApiErrorBody["error"]>["details"],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Tidak dapat menghubungi server. Periksa koneksi dan coba lagi.",
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 204) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const error = (body as ApiErrorBody | null)?.error;
    throw new ApiError(
      error?.message || "Permintaan gagal. Silakan coba lagi.",
      response.status,
      error?.code,
      error?.details,
    );
  }

  return body as T;
}

export async function getData<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const result = await apiRequest<ApiEnvelope<T>>(path, options, token);
  return result.data;
}
