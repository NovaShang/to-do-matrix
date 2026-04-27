import type { EnrichedTask } from "@tdmx/core/engine";
import type { TaskStatus } from "@tdmx/core";
import type { CliConfig } from "../config";

export interface ApiError {
  error: string;
  message: string;
}

export class TdmxApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError,
  ) {
    super(`API ${status}: ${body.message}`);
  }
}

async function request<T>(
  config: CliConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${config.url.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const json = await res.json();
  if (!res.ok) throw new TdmxApiError(res.status, json as ApiError);
  return json as T;
}

export interface GetTasksParams {
  status?: string;
  all?: boolean;
  quadrant?: number;
  flat?: boolean;
}

export function getTasks(config: CliConfig, params: GetTasksParams): Promise<EnrichedTask[]> {
  const qs = new URLSearchParams();
  if (params.status)   qs.set("status",   params.status);
  if (params.all)      qs.set("all",      "true");
  if (params.quadrant) qs.set("quadrant", String(params.quadrant));
  if (params.flat)     qs.set("flat",     "true");
  const q = qs.toString();
  return request(config, "GET", `/api/tasks${q ? "?" + q : ""}`);
}

export interface CreateTaskBody {
  title: string;
  importance: number;
  effort?: number;
  dueDate?: string | null;
  parentId?: number | null;
  notes?: string | null;
}

export function createTask(config: CliConfig, data: CreateTaskBody): Promise<EnrichedTask> {
  return request(config, "POST", "/api/tasks", data);
}

export interface UpdateTaskBody {
  title?: string;
  importance?: number;
  effort?: number;
  dueDate?: string | null;
  parentId?: number | null;
  notes?: string | null;
  status?: TaskStatus;
}

export function updateTask(config: CliConfig, id: number, data: UpdateTaskBody): Promise<EnrichedTask> {
  return request(config, "PATCH", `/api/tasks/${id}`, data);
}
