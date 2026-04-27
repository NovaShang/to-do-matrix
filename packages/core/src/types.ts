export type TaskStatus = "pending" | "in_progress" | "done" | "abandoned";

export interface Task {
  id: number;
  title: string;
  importance: number;
  effort: number;
  dueDate: string | null;
  status: TaskStatus;
  parentId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewTask = Omit<Task, "id" | "createdAt" | "updatedAt">;
