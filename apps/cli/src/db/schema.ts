import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  title: text("title").notNull(),

  // 重要度：连续浮点数，>0 为重要，<0 为不重要
  importance: real("importance").notNull().default(0),

  // 预估工时（小时），用于动态计算紧急度
  effort: real("effort").notNull().default(1),

  // 截止时间（ISO 8601），无则视为不紧急
  dueDate: text("due_date"),

  // 状态
  status: text("status", {
    enum: ["pending", "in_progress", "done", "abandoned"],
  })
    .notNull()
    .default("pending"),

  // 父任务 ID（树形结构）
  parentId: integer("parent_id"),

  notes: text("notes"),

  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),

  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
