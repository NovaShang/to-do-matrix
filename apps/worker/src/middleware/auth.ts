import type { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import type { HonoEnv } from "../types";
import { createAuth } from "../auth";
import { getDb } from "../db";
import { apiKeys } from "../db/schema";

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Accepts both x-api-key header (CLI) and Better Auth session/Bearer token (web)
export async function authMiddleware(c: Context<HonoEnv>, next: Next) {
  const rawKey = c.req.header("x-api-key");
  if (rawKey) {
    const hash = await sha256Hex(rawKey);
    const db = getDb(c.env.DB);
    const [row] = await db
      .select({ userId: apiKeys.userId, id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash));

    if (!row) return c.json({ error: "Unauthorized", message: "Invalid API key" }, 401);

    c.set("userId", row.userId);
    await next();
    return;
  }

  // Fall back to Better Auth session (cookie or Authorization: Bearer <session_token>)
  const auth = createAuth(c.env.DB, c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized", message: "Authentication required" }, 401);

  c.set("userId", session.user.id);
  await next();
}

// Session-only auth — used for API key management (can't use an API key to create API keys)
export async function sessionAuthMiddleware(c: Context<HonoEnv>, next: Next) {
  const auth = createAuth(c.env.DB, c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized", message: "Sign in required" }, 401);

  c.set("userId", session.user.id);
  await next();
}
