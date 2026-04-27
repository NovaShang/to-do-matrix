import { loadConfig } from "../config";
import { createTask, TdmxApiError } from "../api/client";
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
  const dueDate = opts.due ? parseDueDate(opts.due) : null;
  const parentId = opts.parent ? Number(opts.parent) : null;

  const config = await loadConfig();

  let task;
  try {
    task = await createTask(config, { title, importance, effort, dueDate, parentId, notes: opts.notes ?? null });
  } catch (e) {
    if (e instanceof TdmxApiError) {
      console.error(`错误: ${e.body.message}`);
      process.exit(1);
    }
    throw e;
  }

  if (opts.json) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  const meta = QUADRANT_META[task.quadrant]!;
  console.log(`✅ 已添加任务 [${task.id}]`);
  console.log(`   标题: ${task.title}`);
  console.log(`   重要度: ${task.importance}  工时: ${task.effort}h`);
  console.log(`   象限: Q${task.quadrant} ${meta.emoji} ${meta.label}  (紧急度: ${task.urgencyScore.toFixed(2)})`);
  if (task.dueDate) console.log(`   截止: ${task.dueDate}`);
  if (task.parentId) console.log(`   父任务: #${task.parentId}`);
  if (task.notes) console.log(`   备注: ${task.notes}`);
}
