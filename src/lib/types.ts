export type Project = {
  id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  targetDate: string | null;
  color: string;
};
export type Milestone = { id: string; projectId: string; title: string };
export type TaskStatus =
  "Backlog" | "Ready" | "In Progress" | "Blocked" | "Done";
export type Task = {
  id: string;
  projectId: string;
  milestoneId: string | null;
  title: string;
  description: string;
  priority: string;
  status: TaskStatus;
  effort: number;
  dueDate: string | null;
  definition: string;
  expectedOutput: string;
  mandatory: number;
  accepted: number;
  notes: string;
  completionNotes: string;
  artifact: string;
  completedAt: string | null;
};
export type Output = {
  id: string;
  taskId: string;
  note: string;
  artifact: string;
  createdAt: string;
};
export type Plan = { id: string; date: string; availableMinutes: number };
export type PlanItem = {
  planId: string;
  taskId: string;
  position: number;
  isPrimary: number;
};
export type Review = {
  id: string;
  date: string;
  outputs: string;
  unfinished: string;
  blockers: string;
  learned: string;
  nextActions: string;
};
export type TaskHistory = {
  taskId: string;
  recordedAt: string;
  status: TaskStatus;
  subtasks: Subtask[];
};
export type Workspace = {
  taskHistory: TaskHistory[];
  subtasks: Subtask[];
  notepads: { taskId: string; scene: string; updatedAt: string }[];
  projects: Project[];
  milestones: Milestone[];
  tasks: Task[];
  outputs: Output[];
  plans: Plan[];
  planItems: PlanItem[];
  reviews: Review[];
  dependencies: { taskId: string; dependsOnId: string }[];
};
export type Subtask = {
  id: string;
  taskId: string;
  title: string;
  completed: number;
};
export function subtaskProgress(subtasks: Subtask[], taskIds: string[]) {
  const ids = new Set(taskIds);
  const items = subtasks.filter((item) => ids.has(item.taskId));
  const done = items.filter((item) => item.completed === 1).length;
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  };
}
export function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function progress(tasks: Task[]) {
  const done = tasks.filter((t) => t.status === "Done").length;
  return {
    done,
    total: tasks.length,
    percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  };
}
export function hasCycle(edges: { taskId: string; dependsOnId: string }[]) {
  const active = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string): boolean {
    if (active.has(id)) return true;
    if (visited.has(id)) return false;
    active.add(id);
    for (const edge of edges.filter((e) => e.taskId === id)) {
      if (visit(edge.dependsOnId)) return true;
    }
    active.delete(id);
    visited.add(id);
    return false;
  }
  return edges.some((e) => visit(e.taskId));
}
