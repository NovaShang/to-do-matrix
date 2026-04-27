import { join } from "path";

export interface CliConfig {
  url: string;
  apiKey: string;
}

const CONFIG_DIR = join(process.env.HOME ?? "~", ".tdmx");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export async function loadConfig(): Promise<CliConfig> {
  const file = Bun.file(CONFIG_PATH);
  if (!(await file.exists())) {
    console.error(
      "错误: tdmx 尚未配置。\n" +
      "请运行 `tdmx config set-url <url>` 和 `tdmx config set-key <key>` 完成配置。",
    );
    process.exit(1);
  }
  const raw = (await file.json()) as Partial<CliConfig>;
  if (!raw.url || !raw.apiKey) {
    console.error(
      "错误: 配置不完整。\n" +
      "请运行 `tdmx config set-url <url>` 和 `tdmx config set-key <key>`。",
    );
    process.exit(1);
  }
  return raw as CliConfig;
}

export async function saveConfig(patch: Partial<CliConfig>): Promise<void> {
  await Bun.write(join(CONFIG_DIR, ".keep"), "").catch(() => {});
  let current: Partial<CliConfig> = {};
  const file = Bun.file(CONFIG_PATH);
  if (await file.exists()) {
    current = (await file.json()) as Partial<CliConfig>;
  }
  await Bun.write(CONFIG_PATH, JSON.stringify({ ...current, ...patch }, null, 2));
  Bun.spawnSync(["chmod", "600", CONFIG_PATH]);
}
