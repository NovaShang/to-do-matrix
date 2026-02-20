import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { join } from "path";
import * as schema from "./schema";

// 数据库文件存放在 ~/.tdmx/tasks.db
const DB_DIR = join(process.env.HOME ?? "~", ".tdmx");
const DB_PATH = join(DB_DIR, "tasks.db");

// 确保目录存在
await Bun.write(join(DB_DIR, ".keep"), "").catch(() => {});

const sqlite = new Database(DB_PATH, { create: true });
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });

// 自动应用未执行的迁移（drizzle/ 目录中的 .sql 文件）
migrate(db, { migrationsFolder: join(import.meta.dir, "../../drizzle") });
