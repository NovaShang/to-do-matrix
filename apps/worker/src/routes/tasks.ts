import { Hono } from "hono";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { tasks, type DbTask } from "../db/schema";
import { authMiddleware } from "../middleware/auth";
import { enrichTasks } from "@tdmx/core/engine";
import type { Task, TaskStatus } from "@tdmx/core";
import type { HonoEnv } from "../types";

const router = new Hono<HonoEnv>();

router.use("*", authMiddleware);

function toTask(row: DbTask): Task {
  const { userId: _userId, ...task } = row;
  return task as Task;
}

// GET /api/tasks
router.get("/", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);

  const { status, all, quadrant: quadrantParam } = c.req.query();

  const conditions = [eq(tasks.userId, userId)];

  if (status) {
    conditions.push(eq(tasks.status, status as TaskStatus));
  } else if (all !== "true") {
    conditions.push(or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress"))!);
  }

  const rows = await db.select().from(tasks).where(and(...conditions));
  let enriched = enrichTasks(rows.map(toTask));

  if (quadrantParam) {
    const q = Number(quadrantParam);
    enriched = enriched.filter((t) => t.quadrant === q);
  }

  return c.json(enriched);
});

// POST /api/tasks
router.post("/", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);

  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ error: "Bad Request", message: "Invalid JSON body" }, 400);

  if (typeof body.title !== "string" || !body.title.trim()) {
    return c.json({ error: "Bad Request", message: "title is required" }, 400);
  }
  if (body.importance === undefined || body.importance === null) {
    return c.json({ error: "Bad Request", message: "importance is required" }, 400);
  }

  if (body.parentId) {
    const [parent] = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, body.parentId), eq(tasks.userId, userId)));
    if (!parent) {
      return c.json({ error: "Bad Request", message: `Parent task ${body.parentId} not found` }, 400);
    }
  }

  const [inserted] = await db
    .insert(tasks)
    .values({
      userId,
      title: body.title,
      importance: Number(body.importance),
      effort: Number(body.effort ?? 1),
      dueDate: body.dueDate ?? null,
      parentId: body.parentId ?? null,
      notes: body.notes ?? null,
    })
    .returning();

  const enriched = enrichTasks([toTask(inserted!)]);
  return c.json(enriched[0], 201);
});

// PATCH /api/tasks/:id
router.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);
  const id = Number(c.req.param("id"));

  if (isNaN(id)) return c.json({ error: "Bad Request", message: "Invalid task ID" }, 400);

  const [existing] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  if (!existing) return c.json({ error: "Not Found", message: "Task not found" }, 404);

  const body = await c.req.json().catch(() => ({}));

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if ("title" in body)      updates.title = body.title;
  if ("importance" in body) updates.importance = Number(body.importance);
  if ("effort" in body)     updates.effort = Number(body.effort);
  if ("dueDate" in body)    updates.dueDate = body.dueDate ?? null;
  if ("notes" in body)      updates.notes = body.notes ?? null;
  if ("status" in body)     updates.status = body.status;

  if ("parentId" in body) {
    const pid = body.parentId;
    if (!pid) {
      updates.parentId = null;
    } else {
      if (pid === id) {
        return c.json({ error: "Bad Request", message: "Task cannot be its own parent" }, 400);
      }
      const [parent] = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, pid), eq(tasks.userId, userId)));
      if (!parent) {
        return c.json({ error: "Bad Request", message: `Parent task ${pid} not found` }, 400);
      }
      updates.parentId = pid;
    }
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();

  const enriched = enrichTasks([toTask(updated!)]);
  return c.json(enriched[0]);
});

// DELETE /api/tasks/:id
router.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const db = getDb(c.env.DB);
  const id = Number(c.req.param("id"));

  if (isNaN(id)) return c.json({ error: "Bad Request", message: "Invalid task ID" }, 400);

  const result = await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning({ id: tasks.id });

  if (result.length === 0) return c.json({ error: "Not Found", message: "Task not found" }, 404);

  return new Response(null, { status: 204 });
});

export { router as tasksRouter };
