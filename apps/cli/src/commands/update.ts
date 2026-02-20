import { eq } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../db/schema";
import { getQuadrant, getUrgencyScore } from "../engine";
import { parseDueDate, QUADRANT_META } from "../utils";

const STATUS_ICON: Record<string, string> = {
  pending: "☐",
  in_progress: "▶",
  done: "✅",
  abandoned: "✖",
};

interface UpdateOptions {
  title?: string;
  importance?: number;
  effort?: number;
  due?: string;
  parent?: number;
  notes?: string;
  start?: boolean;
  done?: boolean;
  abandon?: boolean;
  reopen?: boolean;
  json?: boolean;
}

export async function updateCommand(id: number, opts: UpdateOptions) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!existing) {
    console.error(`错误: 找不到 ID 为 ${id} 的任务`);
    process.exit(1);
  }

  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };

  if (opts.title !== undefined) updates.title = opts.title;
  if (opts.importance !== undefined) updates.importance = Number(opts.importance);
  if (opts.effort !== undefined) updates.effort = Number(opts.effort);

  if (opts.due !== undefined) {
    updates.dueDate = opts.due === "" ? null : parseDueDate(opts.due);
  }

  if (opts.parent !== undefined) {
    const pid = Number(opts.parent);
    if (pid === 0) {
      updates.parentId = null;
    } else {
      if (pid === id) {
        console.error("错误: 不能将任务设为自己的子任务");
        process.exit(1);
      }
      const [p] = await db.select().from(tasks).where(eq(tasks.id, pid));
      if (!p) {
        console.error(`错误: 找不到 ID 为 ${pid} 的父任务`);
        process.exit(1);
      }
      updates.parentId = pid;
    }
  }

  if (opts.notes !== undefined) updates.notes = opts.notes;

  // 状态流转
  if (opts.start)   updates.status = "in_progress";
  if (opts.done)    updates.status = "done";
  if (opts.abandon) updates.status = "abandoned";
  if (opts.reopen)  updates.status = "pending";

  if (Object.keys(updates).length === 1) {
    console.log("没有提供任何更新内容，请使用 --help 查看可用选项。");
    process.exit(0);
  }

  const rows = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning();
  const updated = rows[0]!;

  if (opts.json) {
    const quadrant = getQuadrant(updated);
    const urgencyScore = getUrgencyScore(updated);
    console.log(JSON.stringify({ ...updated, quadrant, urgencyScore }, null, 2));
    return;
  }

  const q = getQuadrant(updated);
  const meta = QUADRANT_META[q]!;
  const icon = STATUS_ICON[updated.status] ?? "?";

  console.log(`✏️  已更新任务 [${updated.id}]`);
  console.log(`   标题: ${updated.title}`);
  console.log(`   重要度: ${updated.importance}  工时: ${updated.effort}h`);
  console.log(`   象限: Q${q} ${meta.emoji} ${meta.label}`);
  console.log(`   状态: ${icon} ${updated.status}`);
  if (updated.dueDate) console.log(`   截止: ${updated.dueDate}`);
  if (updated.parentId) console.log(`   父任务: #${updated.parentId}`);
  if (updated.notes) console.log(`   备注: ${updated.notes}`);
}
