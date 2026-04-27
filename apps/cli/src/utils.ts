import type { EnrichedTask } from "@tdmx/core/engine";

export const QUADRANT_META: Record<number, { label: string; action: string; emoji: string }> = {
  1: { label: "重要 & 紧急",     action: "立即执行",   emoji: "🔴" },
  2: { label: "重要 & 不紧急",   action: "计划安排",   emoji: "🟡" },
  3: { label: "不重要 & 紧急",   action: "授权/自动化", emoji: "🟠" },
  4: { label: "不重要 & 不紧急", action: "消除",       emoji: "⚫" },
};

const STATUS_ICON: Record<string, string> = {
  pending: "☐",
  in_progress: "▶",
  done: "✅",
  abandoned: "✖",
};

export function formatDue(dueDate: string | null): string {
  if (!dueDate) return "-";
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return dueDate;
  return d.toLocaleString("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

export function parseDueDate(input: string): string {
  const d = new Date(input);
  if (!isNaN(d.getTime())) return d.toISOString();
  throw new Error(`无法解析时间: "${input}"，请使用 ISO 格式，如 "2025-12-31" 或 "2025-12-31 18:00"`);
}

/** 格式化紧急度标签 */
function urgencyTag(score: number): string {
  if (score >= 999) return "⚠ 已过期!";
  if (score > 1.0)  return `🔥 ${score.toFixed(2)}`;
  if (score > 0.3)  return `⏰ ${score.toFixed(2)}`;
  if (score > 0)    return `${score.toFixed(2)}`;
  return "";
}

/** 构建树形结构：parentId → children 映射
 *
 * 如果父任务不在当前列表中（如跨象限），子任务自动提升为根节点
 */
function buildTree(tasks: EnrichedTask[]): {
  roots: EnrichedTask[];
  childrenMap: Map<number, EnrichedTask[]>;
} {
  const idSet = new Set(tasks.map((t) => t.id));
  const childrenMap = new Map<number, EnrichedTask[]>();
  const roots: EnrichedTask[] = [];

  for (const t of tasks) {
    // 父任务存在于当前列表中才挂载为子节点，否则视为根
    if (t.parentId && idSet.has(t.parentId)) {
      const siblings = childrenMap.get(t.parentId) ?? [];
      siblings.push(t);
      childrenMap.set(t.parentId, siblings);
    } else {
      roots.push(t);
    }
  }

  return { roots, childrenMap };
}

/** 渲染单个任务行 */
function renderTaskLine(t: EnrichedTask, indent: number): string {
  const pad = "  ".repeat(indent);
  const icon = STATUS_ICON[t.status] ?? "?";
  const due = t.dueDate ? `  📅 ${formatDue(t.dueDate)}` : "";
  const urg = urgencyTag(t.urgencyScore);
  const urgStr = urg ? `  ${urg}` : "";
  const notes = t.notes ? `  💬 ${t.notes}` : "";
  return `${pad}${icon} [${t.id}] ${t.title}  (i:${t.importance} e:${t.effort}h)${due}${urgStr}${notes}`;
}

/** 递归渲染任务树 */
function renderSubtree(
  task: EnrichedTask,
  childrenMap: Map<number, EnrichedTask[]>,
  indent: number,
  lines: string[],
) {
  lines.push(renderTaskLine(task, indent));
  const children = childrenMap.get(task.id);
  if (children) {
    for (const child of children) {
      renderSubtree(child, childrenMap, indent + 1, lines);
    }
  }
}

/** 四象限矩阵视图（树形） */
export function renderMatrix(tasks: EnrichedTask[]): void {
  const byQuadrant: Record<1 | 2 | 3 | 4, EnrichedTask[]> = { 1: [], 2: [], 3: [], 4: [] };
  for (const t of tasks) {
    byQuadrant[t.quadrant].push(t);
  }

  for (const q of [1, 2, 3, 4] as const) {
    const meta = QUADRANT_META[q]!;
    const list = byQuadrant[q];
    console.log(`\n${meta.emoji} Q${q} ${meta.label}  [${meta.action}]`);
    console.log("─".repeat(60));

    if (list.length === 0) {
      console.log("  (空)");
      continue;
    }

    const { roots, childrenMap } = buildTree(list);
    const lines: string[] = [];
    for (const root of roots) {
      renderSubtree(root, childrenMap, 1, lines);
    }
    console.log(lines.join("\n"));
  }
  console.log();
}

/** 平铺列表视图（按执行优先级排序） */
export function renderFlat(tasks: EnrichedTask[]): void {
  if (tasks.length === 0) {
    console.log("没有找到任务。");
    return;
  }

  console.log(`\n按推荐执行顺序排列 (共 ${tasks.length} 项):`);
  console.log("─".repeat(60));

  for (const t of tasks) {
    const meta = QUADRANT_META[t.quadrant]!;
    const line = renderTaskLine(t, 0);
    console.log(`${meta.emoji} ${line}`);
  }
  console.log();
}
