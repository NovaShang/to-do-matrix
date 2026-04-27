import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { getDb } from "../db";
import { apiKeys } from "../db/schema";
import { sessionAuthMiddleware } from "../middleware/auth";
import type { HonoEnv } from "../types";

const router = new Hono<HonoEnv>();

router.use("*", sessionAuthMiddleware);

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// POST /api/keys — create API key (returns plaintext once)
router.post("/", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);
  const body = await c.req.json().catch(() => ({}));

  const rawKey = `tdmx_${randomHex(32)}`;
  const keyHash = await sha256Hex(rawKey);

  const [inserted] = await db
    .insert(apiKeys)
    .values({ userId, keyHash, label: body.label ?? null })
    .returning({ id: apiKeys.id, label: apiKeys.label, createdAt: apiKeys.createdAt });

  return c.json({ key: rawKey, keyId: inserted!.id, label: inserted!.label, createdAt: inserted!.createdAt }, 201);
});

// GET /api/keys — list keys (never returns hash)
router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);

  const rows = await db
    .select({ id: apiKeys.id, label: apiKeys.label, createdAt: apiKeys.createdAt, lastUsed: apiKeys.lastUsed })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  return c.json(rows);
});

// DELETE /api/keys/:id — revoke key
router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);
  const id = Number(c.req.param("id"));

  if (isNaN(id)) return c.json({ error: "Bad Request", message: "Invalid key ID" }, 400);

  const result = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
    .returning({ id: apiKeys.id });

  if (result.length === 0) return c.json({ error: "Not Found", message: "Key not found" }, 404);

  return new Response(null, { status: 204 });
});

export { router as keysRouter };
