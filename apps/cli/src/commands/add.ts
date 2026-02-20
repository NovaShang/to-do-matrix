import { eq } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../db/schema";
import { getQuadrant, getUrgencyScore } from "../engine";
import { parseDueDate, QUADRANT_META } from "../utils";

interface AddOptions {
  importance?: number;
  effort?: number;
  due?: string;
  parent?: number;
  notes?: string;
  json?: boolean;
}

export async function addCommand(title: string, opts: AddOptions) {
  if (opts.importance === undefined) {
    console.error("错误: 请通过 -i <n> 指定重要度（>0 重要，<0 不重要）");
    process.exit(1);
  }

  const importance = Number(opts.importance);
  if (isNaN(importance)) {
    console.error("错误: 重要度必须是数字");
    process.exit(1);
  }

  const effort = Number(opts.effort ?? 1);
  const dueDate = opts.due ? parseDueDate(opts.due) : undefined;
  const parentId = opts.parent ? Number(opts.parent) : undefined;

  // 验证父任务存在
  if (parentId) {
    const [parent] = await db.select().from(tasks).where(eq(tasks.id, parentId));
    if (!parent) {
      console.error(`错误: 找不到 ID 为 ${parentId} 的父任务`);
      process.exit(1);
    }
  }

  const rows = await db
    .insert(tasks)
    .values({
      title,
      importance,
      effort,
      dueDate,
      parentId: parentId ?? null,
      notes: opts.notes,
    })
    .returning();
  const inserted = rows[0]!;

  if (opts.json) {
    const quadrant = getQuadrant(inserted);
    const urgencyScore = getUrgencyScore(inserted);
    console.log(JSON.stringify({ ...inserted, quadrant, urgencyScore }, null, 2));
    return;
  }

  const q = getQuadrant(inserted);
  const meta = QUADRANT_META[q];
  const urgency = getUrgencyScore(inserted);

  console.log(`✅ 已添加任务 [${inserted.id}]`);
  console.log(`   标题: ${inserted.title}`);
  console.log(`   重要度: ${inserted.importance}  工时: ${inserted.effort}h`);
  console.log(`   象限: Q${q} ${meta.emoji} ${meta.label}  (紧急度: ${urgency.toFixed(2)})`);
  if (inserted.dueDate) console.log(`   截止: ${inserted.dueDate}`);
  if (inserted.parentId) console.log(`   父任务: #${inserted.parentId}`);
  if (inserted.notes) console.log(`   备注: ${inserted.notes}`);
}
