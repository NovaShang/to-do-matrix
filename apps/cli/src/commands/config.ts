import { loadConfig, saveConfig } from "../config";

type ConfigAction = "set-url" | "set-key" | "show";

export async function configCommand(action: ConfigAction, value?: string) {
  switch (action) {
    case "set-url":
      if (!value) {
        console.error("用法: tdmx config set-url <url>");
        process.exit(1);
      }
      await saveConfig({ url: value });
      console.log(`✅ URL 已设置为: ${value}`);
      break;

    case "set-key":
      if (!value) {
        console.error("用法: tdmx config set-key <apiKey>");
        process.exit(1);
      }
      await saveConfig({ apiKey: value });
      console.log("✅ API Key 已保存。");
      break;

    case "show": {
      const cfg = await loadConfig();
      console.log(`URL:     ${cfg.url}`);
      console.log(`API Key: ${cfg.apiKey.slice(0, 8)}...（已截断）`);
      break;
    }

    default:
      console.error("未知操作。请使用: set-url | set-key | show");
      process.exit(1);
  }
}
