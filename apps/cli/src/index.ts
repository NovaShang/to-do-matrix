import cac from "cac";
import { addCommand } from "./commands/add";
import { listCommand } from "./commands/list";
import { updateCommand } from "./commands/update";

const cli = cac("tdmx");

// ─────────────────────────────────────────────
//  tdmx add <title>
// ─────────────────────────────────────────────
cli
  .command("add <title>", "添加新任务")
  .option("-i, --importance <n>", "重要度（浮点数，>0 重要，<0 不重要，必填）")
  .option("-e, --effort <hours>", "预估工时/小时（默认 1）")
  .option("-d, --due <datetime>", "截止时间（如 '2025-12-31'）")
  .option("-p, --parent <id>", "父任务 ID")
  .option("-n, --notes <text>", "备注")
  .option("--json", "JSON 输出")
  .example("tdmx add '完成毕业论文' -i 5 -e 40 -d '2025-03-15'")
  .example("tdmx add '买菜' -i -1 -e 1 -d '2025-03-01'")
  .example("tdmx add '写第三章' -i 5 -e 10 -d '2025-03-10' -p 1")
  .action(async (title: string, opts) => {
    await addCommand(title, opts);
  });

// ─────────────────────────────────────────────
//  tdmx ls / tdmx list
// ─────────────────────────────────────────────
cli
  .command("ls", "查看任务矩阵（默认显示 pending + in_progress）")
  .option("-q, --quadrant <n>", "只显示指定象限 [1|2|3|4]（动态计算）")
  .option("-s, --status <status>", "按状态过滤（pending/in_progress/done/abandoned）")
  .option("--all", "显示所有状态的任务")
  .option("--flat", "平铺显示（按执行优先级排序，不按象限分组）")
  .option("--json", "JSON 输出（含 quadrant, urgencyScore, executionScore）")
  .example("tdmx ls")
  .example("tdmx ls -q 1")
  .example("tdmx ls --flat")
  .example("tdmx ls --json")
  .action(async (opts) => {
    await listCommand(opts);
  });

cli
  .command("list", "查看任务矩阵（ls 的别名）")
  .option("-q, --quadrant <n>", "只显示指定象限 [1|2|3|4]")
  .option("-s, --status <status>", "按状态过滤")
  .option("--all", "显示所有状态的任务")
  .option("--flat", "平铺显示")
  .option("--json", "JSON 输出")
  .action(async (opts) => {
    await listCommand(opts);
  });

// ─────────────────────────────────────────────
//  tdmx update <id>
// ─────────────────────────────────────────────
cli
  .command("update <id>", "更新任务")
  .option("-t, --title <text>", "修改标题")
  .option("-i, --importance <n>", "修改重要度")
  .option("-e, --effort <hours>", "修改预估工时")
  .option("-d, --due <datetime>", "修改截止时间（空字符串 '' 清除）")
  .option("-p, --parent <id>", "修改父任务（0 解除父子关系）")
  .option("-n, --notes <text>", "修改备注")
  .option("--start", "标记为进行中")
  .option("--done", "标记为已完成")
  .option("--abandon", "标记为放弃")
  .option("--reopen", "重新打开（回到 pending）")
  .option("--json", "JSON 输出")
  .example("tdmx update 1 --start")
  .example("tdmx update 1 --done")
  .example("tdmx update 1 -i 3 -e 20")
  .action(async (id: string, opts) => {
    await updateCommand(Number(id), opts);
  });

// ─────────────────────────────────────────────
cli.help();
cli.version("0.1.0");

/**
 * cac 会把 `-1` 解析为未知 flag，需要预处理 argv：
 * 将 `-i -1` 这类"选项 + 负数值"合并为 `-i=-1`
 */
const NUMERIC_FLAGS = new Set(["-i", "--importance", "-e", "--effort", "-p", "--parent"]);

function fixNegativeNumbers(argv: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    const next = argv[i + 1];
    if (NUMERIC_FLAGS.has(arg) && next !== undefined && /^-\d+(\.\d+)?$/.test(next)) {
      result.push(`${arg}=${next}`);
      i++; // 跳过已合并的 next
    } else {
      result.push(arg);
    }
  }
  return result;
}

cli.parse(fixNegativeNumbers(process.argv));
