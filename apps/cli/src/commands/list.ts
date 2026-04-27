import { loadConfig } from "../config";
import { getTasks, TdmxApiError } from "../api/client";
import { renderMatrix, renderFlat } from "../utils";

interface ListOptions {
  quadrant?: number;
  status?: string;
  all?: boolean;
  flat?: boolean;
  json?: boolean;
}

export async function listCommand(opts: ListOptions) {
  if (opts.status) {
    const valid = ["pending", "in_progress", "done", "abandoned"];
    if (!valid.includes(opts.status)) {
      console.error(`错误: 状态必须是 ${valid.join(" / ")}`);
      process.exit(1);
    }
  }

  const config = await loadConfig();

  let tasks;
  try {
    tasks = await getTasks(config, {
      status: opts.status,
      all: opts.all,
      quadrant: opts.quadrant ? Number(opts.quadrant) : undefined,
      flat: opts.flat,
    });
  } catch (e) {
    if (e instanceof TdmxApiError) {
      console.error(`错误: ${e.body.message}`);
      process.exit(1);
    }
    throw e;
  }

  if (opts.json) {
    console.log(JSON.stringify(tasks, null, 2));
    return;
  }

  if (tasks.length === 0) {
    console.log("没有找到任务。使用 `tdmx add` 添加任务。");
    return;
  }

  if (opts.flat) {
    renderFlat(tasks);
  } else {
    renderMatrix(tasks);
  }
}
