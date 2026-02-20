import { eq, and, or, asc } from "drizzle-orm";
import { db } from "../db";
import { tasks } from "../db/schema";
import { enrichTasks } from "../engine";
import { renderMatrix, renderFlat } from "../utils";

interface ListOptions {
  quadrant?: number;
  status?: string;
  all?: boolean;
  flat?: boolean;
  json?: boolean;
}

export async function listCommand(opts: ListOptions) {
  const conditions = [];

  // 状态过滤：默认只显示 pending + in_progress
  if (opts.status) {
    const valid = ["pending", "in_progress", "done", "abandoned"];
    if (!valid.includes(opts.status)) {
      console.error(`错误: 状态必须是 ${valid.join(" / ")}`);
      process.exit(1);
    }
    conditions.push(eq(tasks.status, opts.status as any));
  } else if (!opts.all) {
    conditions.push(
      or(eq(tasks.status, "pending"), eq(tasks.status, "in_progress"))!,
    );
  }

  const result = await db
    .select()
    .from(tasks)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.createdAt));

  const enriched = enrichTasks(result);

  // 按象限过滤（在 enrich 之后，因为象限是动态计算的）
  const filtered = opts.quadrant
    ? enriched.filter((t) => t.quadrant === Number(opts.quadrant))
    : enriched;

  if (opts.json) {
    console.log(JSON.stringify(filtered, null, 2));
    return;
  }

  if (filtered.length === 0) {
    console.log("没有找到任务。使用 `tdmx add` 添加任务。");
    return;
  }

  if (opts.flat) {
    renderFlat(filtered);
  } else {
    renderMatrix(filtered);
  }
}
