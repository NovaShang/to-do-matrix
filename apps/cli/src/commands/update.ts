import { loadConfig } from "../config";
import { updateTask, TdmxApiError, type UpdateTaskBody } from "../api/client";
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
  due?: string | boolean;
  parent?: number;
  notes?: string;
  start?: boolean;
  done?: boolean;
  abandon?: boolean;
  reopen?: boolean;
  json?: boolean;
}

export async function updateCommand(id: number, opts: UpdateOptions) {
  const updates: UpdateTaskBody = {};

  if (opts.title !== undefined)      updates.title = opts.title;
  if (opts.importance !== undefined) updates.importance = Number(opts.importance);
  if (opts.effort !== undefined)     updates.effort = Number(opts.effort);

  if (opts.due !== undefined) {
    // -d ""（空字符串）或 -d 单独使用（cac 解析为 true）→ 清除截止时间
    updates.dueDate = opts.due === "" || opts.due === true ? null : parseDueDate(opts.due);
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
      updates.parentId = pid;
    }
  }

  if (opts.notes !== undefined) updates.notes = opts.notes;

  if (opts.start)   updates.status = "in_progress";
  if (opts.done)    updates.status = "done";
  if (opts.abandon) updates.status = "abandoned";
  if (opts.reopen)  updates.status = "pending";

  if (Object.keys(updates).length === 0) {
    console.log("没有提供任何更新内容，请使用 --help 查看可用选项。");
    process.exit(0);
  }

  const config = await loadConfig();

  let task;
  try {
    task = await updateTask(config, id, updates);
  } catch (e) {
    if (e instanceof TdmxApiError) {
      if (e.status === 404) {
        console.error(`错误: 找不到 ID 为 ${id} 的任务`);
      } else {
        console.error(`错误: ${e.body.message}`);
      }
      process.exit(1);
    }
    throw e;
  }

  if (opts.json) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  const meta = QUADRANT_META[task.quadrant]!;
  const icon = STATUS_ICON[task.status] ?? "?";

  console.log(`✏️  已更新任务 [${task.id}]`);
  console.log(`   标题: ${task.title}`);
  console.log(`   重要度: ${task.importance}  工时: ${task.effort}h`);
  console.log(`   象限: Q${task.quadrant} ${meta.emoji} ${meta.label}`);
  console.log(`   状态: ${icon} ${task.status}`);
  if (task.dueDate) console.log(`   截止: ${task.dueDate}`);
  if (task.parentId) console.log(`   父任务: #${task.parentId}`);
  if (task.notes) console.log(`   备注: ${task.notes}`);
}
