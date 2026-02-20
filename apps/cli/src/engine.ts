import type { Task } from "./db/schema";

// 紧急度阈值：urgencyScore > 此值 → 紧急
const URGENCY_THRESHOLD = 0.3;

export interface EnrichedTask extends Task {
  urgencyScore: number;
  quadrant: 1 | 2 | 3 | 4;
  executionScore: number;
}

/**
 * 紧急度评分
 *
 * urgencyScore = effort / hoursRemaining
 *   - 0.0  完全不紧急（时间充裕）
 *   - 0.3  开始有压力（默认阈值）
 *   - 1.0  刚好够用
 *   - >1.0 来不及了
 *   - 无 dueDate → 0
 *   - 已过期 → 999
 */
export function getUrgencyScore(task: Task, now: Date = new Date()): number {
  if (!task.dueDate) return 0;

  const due = new Date(task.dueDate);
  if (isNaN(due.getTime())) return 0;

  const msRemaining = due.getTime() - now.getTime();
  if (msRemaining <= 0) return 999; // 已过期

  const hoursRemaining = msRemaining / 3_600_000;
  const effort = task.effort ?? 1;

  return effort / hoursRemaining;
}

/**
 * 动态象限判定
 *
 * Q1: 重要 & 紧急     Q2: 重要 & 不紧急
 * Q3: 不重要 & 紧急   Q4: 不重要 & 不紧急
 */
export function getQuadrant(task: Task, now: Date = new Date()): 1 | 2 | 3 | 4 {
  const urgent = getUrgencyScore(task, now) > URGENCY_THRESHOLD;
  const important = task.importance > 0;

  if (important && urgent) return 1;
  if (important && !urgent) return 2;
  if (!important && urgent) return 3;
  return 4;
}

/**
 * 推荐执行优先级评分（越高越应该先做）
 *
 * 紧急权重 (5.0) > 重要权重 (1.0)
 * 紧急事情拖不起，但重要度仍参与排序
 */
export function getExecutionScore(task: Task, now: Date = new Date()): number {
  const urgency = Math.min(getUrgencyScore(task, now), 100); // cap 避免 Infinity 干扰
  return task.importance * 1.0 + urgency * 5.0;
}

/** 为一组任务添加计算字段并按执行优先级排序 */
export function enrichTasks(tasks: Task[], now: Date = new Date()): EnrichedTask[] {
  return tasks
    .map((t) => ({
      ...t,
      urgencyScore: getUrgencyScore(t, now),
      quadrant: getQuadrant(t, now),
      executionScore: getExecutionScore(t, now),
    }))
    .sort((a, b) => b.executionScore - a.executionScore);
}
