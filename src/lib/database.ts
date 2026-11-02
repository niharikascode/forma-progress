import {
  createClient,
  type Client,
  type InStatement,
  type Row,
} from "@libsql/client";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { actionSchema, type Action } from "./validation";
import {
  dateKey,
  hasCycle,
  type Workspace,
  type Task,
  type Project,
} from "./types";
export const LOCAL_USER = "local-workspace";
type Executor = Pick<Client, "execute">;
type Value = string | number | null;
// Thin query helpers over a client or an open transaction.
export function queries(executor: Executor) {
  const query = async (sql: string, args: Value[]) => {
    const result = await executor.execute({ sql, args } as InStatement);
    return result.rows.map((row: Row) =>
      Object.fromEntries(result.columns.map((c, i) => [c, row[i]])),
    );
  };
  return {
    get: async (sql: string, ...args: Value[]) =>
      (await query(sql, args))[0] as unknown,
    all: (sql: string, ...args: Value[]) =>
      query(sql, args) as Promise<unknown[]>,
    run: (sql: string, ...args: Value[]) =>
      executor.execute({ sql, args } as InStatement),
  };
}
export type Db = ReturnType<typeof queries>;
export interface Database extends Db {
  client: Client;
  close(): void;
}
// DATABASE_URL may be a Turso libsql:// URL (with DATABASE_AUTH_TOKEN) or a
// local file: URL; the Vercel Turso integration sets TURSO_DATABASE_URL and
// TURSO_AUTH_TOKEN instead. DATABASE_PATH remains supported for local SQLite files.
export async function openDatabase(
  url = process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    `file:${process.env.DATABASE_PATH || ".data/forma.sqlite"}`,
): Promise<Database> {
  if (url.startsWith("file:"))
    mkdirSync(path.dirname(url.slice(5)), { recursive: true });
  const client = createClient({
    // libsql:// defaults to a long-lived WebSocket, which can go stale between
    // serverless invocations and hang requests; stateless HTTPS avoids that.
    url: url.replace(/^libsql:\/\//, "https://"),
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
  });
  await client.executeMultiple(
    readFileSync(path.join(process.cwd(), "db/001_initial.sql"), "utf8"),
  );
  const db = queries(client);
  await db.run(
    "INSERT OR IGNORE INTO users(id,name) VALUES (?,?)",
    LOCAL_USER,
    "My workspace",
  );
  return { ...db, client, close: () => client.close() };
}
let singleton: Promise<Database> | undefined;
export function getDatabase() {
  singleton ??= openDatabase().catch((error) => {
    singleton = undefined;
    throw error;
  });
  return singleton;
}
// Every read is scoped to one user's workspace.
const USER_PROJECTS = "SELECT id FROM projects WHERE userId=?";
const USER_TASKS =
  "SELECT tasks.id FROM tasks JOIN projects ON tasks.projectId=projects.id WHERE projects.userId=?";
const USER_PLANS = "SELECT id FROM daily_plans WHERE userId=?";
export async function readWorkspace(
  db: Db,
  userId = LOCAL_USER,
): Promise<Workspace> {
  const byTask = (table: string, order = "") =>
    db.all(
      `SELECT * FROM ${table} WHERE taskId IN (${USER_TASKS})${order}`,
      userId,
    );
  return {
    taskHistory: (
      (await byTask("task_history", " ORDER BY recordedAt, id")) as {
        taskId: string;
        recordedAt: string;
        status: string;
        subtasks: string;
      }[]
    ).map((row) => ({ ...row, subtasks: JSON.parse(row.subtasks) })),
    subtasks: await byTask("task_subtasks", " ORDER BY rowid"),
    notepads: await byTask("task_notepads"),
    projects: await db.all("SELECT * FROM projects WHERE userId=?", userId),
    milestones: await db.all(
      `SELECT * FROM milestones WHERE projectId IN (${USER_PROJECTS})`,
      userId,
    ),
    tasks: await db.all(
      `SELECT * FROM tasks WHERE projectId IN (${USER_PROJECTS})`,
      userId,
    ),
    outputs: await byTask("task_outputs", " ORDER BY createdAt DESC"),
    plans: await db.all("SELECT * FROM daily_plans WHERE userId=?", userId),
    planItems: await db.all(
      `SELECT * FROM daily_plan_items WHERE planId IN (${USER_PLANS})`,
      userId,
    ),
    reviews: await db.all(
      "SELECT * FROM daily_reviews WHERE userId=? ORDER BY date DESC",
      userId,
    ),
    dependencies: await byTask("task_dependencies"),
  } as Workspace;
}
async function taskFor(db: Db, id: string, userId: string) {
  const task = (await db.get(
    "SELECT tasks.* FROM tasks JOIN projects ON tasks.projectId=projects.id WHERE tasks.id=? AND projects.userId=?",
    id,
    userId,
  )) as Task | undefined;
  if (!task) throw new Error("Task not found.");
  return task;
}
async function projectFor(db: Db, id: string, userId: string) {
  const p = (await db.get(
    "SELECT * FROM projects WHERE id=? AND userId=?",
    id,
    userId,
  )) as Project | undefined;
  if (!p) throw new Error("Project not found.");
  return p;
}
export async function execute(
  db: Database,
  input: unknown,
  userId = LOCAL_USER,
) {
  const action = actionSchema.parse(input);
  const transaction = await db.client.transaction("write");
  try {
    const tx = queries(transaction);
    const before = await readWorkspace(tx, userId);
    await apply(tx, action, userId);
    const after = await readWorkspace(tx, userId);
    for (const task of after.tasks) {
      const previous = before.tasks.find((t) => t.id === task.id);
      const subtasks = after.subtasks.filter((s) => s.taskId === task.id);
      if (
        previous?.status !== task.status ||
        JSON.stringify(before.subtasks.filter((s) => s.taskId === task.id)) !==
          JSON.stringify(subtasks) ||
        !after.taskHistory.some((h) => h.taskId === task.id)
      ) {
        await tx.run(
          "INSERT INTO task_history(taskId,recordedAt,status,subtasks) VALUES (?,?,?,?)",
          task.id,
          new Date().toISOString(),
          task.status,
          JSON.stringify(subtasks),
        );
      }
    }
    const workspace = await readWorkspace(tx, userId);
    await transaction.commit();
    return workspace;
  } finally {
    transaction.close();
  }
}
async function apply(db: Db, action: Action, userId: string) {
  const { type, data } = action;
  if (type === "addSubtask") {
    await taskFor(db, data.taskId, userId);
    await db.run(
      "INSERT INTO task_subtasks(id,taskId,title) VALUES (?,?,?)",
      randomUUID(),
      data.taskId,
      data.title,
    );
  }
  if (type === "toggleSubtask" || type === "deleteSubtask") {
    await taskFor(db, data.taskId, userId);
    if (
      !(await db.get(
        "SELECT id FROM task_subtasks WHERE id=? AND taskId=?",
        data.id,
        data.taskId,
      ))
    )
      throw new Error("Subtask not found.");
    if (type === "toggleSubtask")
      await db.run(
        "UPDATE task_subtasks SET completed=? WHERE id=? AND taskId=?",
        Number(data.completed),
        data.id,
        data.taskId,
      );
    else
      await db.run(
        "DELETE FROM task_subtasks WHERE id=? AND taskId=?",
        data.id,
        data.taskId,
      );
  }
  if (type === "notepad") {
    await taskFor(db, data.id, userId);
    await db.run(
      "INSERT INTO task_notepads(taskId,scene,updatedAt) VALUES (?,?,?) ON CONFLICT(taskId) DO UPDATE SET scene=excluded.scene,updatedAt=excluded.updatedAt",
      data.id,
      data.scene,
      new Date().toISOString(),
    );
  }
  if (type === "project") {
    const d = data;
    const id = d.id || randomUUID();
    if (d.id) await projectFor(db, id, userId);
    await db.run(
      "INSERT INTO projects(id,userId,name,description,category,status,priority,targetDate,color) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,category=excluded.category,status=excluded.status,priority=excluded.priority,targetDate=excluded.targetDate,color=excluded.color",
      id,
      userId,
      d.name,
      d.description,
      d.category,
      d.status,
      d.priority,
      d.targetDate,
      d.color,
    );
  }
  if (type === "milestone") {
    await projectFor(db, data.projectId, userId);
    await db.run(
      "INSERT INTO milestones(id,projectId,title) VALUES (?,?,?)",
      randomUUID(),
      data.projectId,
      data.title,
    );
  }
  if (type === "task") {
    const d = data;
    await projectFor(db, d.projectId, userId);
    const id = d.id || randomUUID();
    const old = d.id ? await taskFor(db, id, userId) : null;
    if (old?.status === "Done")
      throw new Error(
        "Completed tasks retain their history. Reopen the task before editing.",
      );
    if (
      d.milestoneId &&
      !(await db.get(
        "SELECT id FROM milestones WHERE id=? AND projectId=?",
        d.milestoneId,
        d.projectId,
      ))
    )
      throw new Error("Milestone must belong to this project.");
    for (const dependency of d.dependencies) {
      await taskFor(db, dependency, userId);
      if (dependency === id) throw new Error("A task cannot depend on itself.");
    }
    const edges = (
      (await db.all(
        "SELECT * FROM task_dependencies WHERE taskId != ?",
        id,
      )) as { taskId: string; dependsOnId: string }[]
    ).concat(
      d.dependencies.map((dependsOnId) => ({ taskId: id, dependsOnId })),
    );
    if (hasCycle(edges))
      throw new Error("These dependencies create a circular dependency.");
    if (
      d.status === "In Progress" &&
      (
        await Promise.all(d.dependencies.map((dep) => taskFor(db, dep, userId)))
      ).some((dep) => dep.status !== "Done")
    )
      throw new Error("Complete the prerequisite tasks first.");
    await db.run(
      "INSERT INTO tasks(id,projectId,milestoneId,title,description,priority,status,effort,dueDate,definition,expectedOutput,mandatory) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET projectId=excluded.projectId,milestoneId=excluded.milestoneId,title=excluded.title,description=excluded.description,priority=excluded.priority,status=excluded.status,effort=excluded.effort,dueDate=excluded.dueDate,definition=excluded.definition,expectedOutput=excluded.expectedOutput,mandatory=excluded.mandatory",
      id,
      d.projectId,
      d.milestoneId,
      d.title,
      d.description,
      d.priority,
      d.status,
      d.effort,
      d.dueDate,
      d.definition,
      d.expectedOutput,
      Number(d.mandatory),
    );
    if (
      old &&
      (old.definition !== d.definition || !!old.mandatory !== d.mandatory)
    )
      await db.run("UPDATE tasks SET accepted=0 WHERE id=?", id);
    await db.run("DELETE FROM task_dependencies WHERE taskId=?", id);
    for (const dep of new Set(d.dependencies))
      await db.run("INSERT INTO task_dependencies VALUES (?,?)", id, dep);
  }
  if (type === "status") {
    const d = data,
      t = await taskFor(db, d.id, userId);
    if (t.status === "Done" && d.status === "Done") return;
    if (d.status === "In Progress" || d.status === "Done") {
      const blocked = await db.get(
        "SELECT tasks.id FROM task_dependencies JOIN tasks ON task_dependencies.dependsOnId=tasks.id WHERE task_dependencies.taskId=? AND tasks.status!='Done'",
        d.id,
      );
      if (blocked) throw new Error("Complete the prerequisite tasks first.");
    }
    // Completion is the owner's explicit choice; legacy acceptance fields
    // remain stored for history but no longer gate completion.
    const completed = d.status === "Done";
    const timestamp = completed ? new Date().toISOString() : null;
    await db.run(
      "UPDATE tasks SET status=?, accepted=?,notes=?,completionNotes=?,artifact=?,completedAt=? WHERE id=?",
      d.status,
      Number(d.accepted ?? !!t.accepted),
      d.notes ?? t.notes,
      d.completionNotes ?? t.completionNotes,
      d.artifact ?? t.artifact,
      timestamp,
      d.id,
    );
    if (completed)
      await db.run(
        "INSERT INTO task_outputs(id,taskId,note,artifact,createdAt) VALUES (?,?,?,?,?)",
        randomUUID(),
        d.id,
        d.completionNotes || t.expectedOutput || t.title,
        d.artifact || t.artifact,
        timestamp,
      );
  }
  if (type === "output") {
    await taskFor(db, data.id, userId);
    await db.run(
      "INSERT INTO task_outputs(id,taskId,note,artifact,createdAt) VALUES (?,?,?,?,?)",
      randomUUID(),
      data.id,
      data.note,
      data.artifact,
      new Date().toISOString(),
    );
  }
  if (type === "deleteTask") {
    const t = await taskFor(db, data.id, userId);
    if (
      t.status === "Done" ||
      (await db.get("SELECT id FROM task_outputs WHERE taskId=?", data.id))
    )
      throw new Error(
        "Tasks with recorded outputs are retained to protect your history.",
      );
    await db.run("DELETE FROM daily_plan_items WHERE taskId=?", data.id);
    await db.run(
      "DELETE FROM task_dependencies WHERE taskId=? OR dependsOnId=?",
      data.id,
      data.id,
    );
    await db.run("DELETE FROM task_notepads WHERE taskId=?", data.id);
    await db.run("DELETE FROM task_subtasks WHERE taskId=?", data.id);
    await db.run("DELETE FROM tasks WHERE id=?", data.id);
  }
  if (type === "plan") {
    const d = data;
    const ids = [...new Set(d.taskIds)];
    for (const id of ids) await taskFor(db, id, userId);
    const existing = (await db.get(
      "SELECT id FROM daily_plans WHERE userId=? AND date=?",
      userId,
      d.date,
    )) as { id: string } | undefined;
    const planId = existing?.id || randomUUID();
    await db.run(
      "INSERT INTO daily_plans(id,userId,date) VALUES (?,?,?) ON CONFLICT(userId,date) DO NOTHING",
      planId,
      userId,
      d.date,
    );
    await db.run("DELETE FROM daily_plan_items WHERE planId=?", planId);
    for (const [i, id] of ids.entries())
      await db.run(
        "INSERT INTO daily_plan_items VALUES (?,?,?,?)",
        planId,
        id,
        i,
        0,
      );
  }
  if (type === "reschedule" || type === "carryForward") {
    const t = await taskFor(db, data.id, userId);
    if (t.status === "Done")
      throw new Error("Completed work cannot be rescheduled.");
    if (type === "reschedule" && data.from === data.to) return;
    let plan = (await db.get(
      "SELECT id FROM daily_plans WHERE date=? AND userId=?",
      data.to,
      userId,
    )) as { id: string } | undefined;
    if (!plan) {
      plan = { id: randomUUID() };
      await db.run(
        "INSERT INTO daily_plans(id,userId,date) VALUES (?,?,?)",
        plan.id,
        userId,
        data.to,
      );
    }
    const count = (
      (await db.get(
        "SELECT COUNT(*) AS count FROM daily_plan_items WHERE planId=?",
        plan.id,
      )) as { count: number }
    ).count;
    if (
      count >= 12 &&
      !(await db.get(
        "SELECT taskId FROM daily_plan_items WHERE planId=? AND taskId=?",
        plan.id,
        data.id,
      ))
    )
      throw new Error("A daily plan can contain up to 12 tasks.");
    await db.run(
      "INSERT OR IGNORE INTO daily_plan_items VALUES (?,?,?,?)",
      plan.id,
      data.id,
      count,
      0,
    );
    if (type === "reschedule")
      await db.run(
        "DELETE FROM daily_plan_items WHERE taskId=? AND planId IN (SELECT id FROM daily_plans WHERE date=? AND userId=?)",
        data.id,
        data.from,
        userId,
      );
  }
  if (type === "review") {
    const d = data;
    await db.run(
      "INSERT INTO daily_reviews(id,userId,date,outputs,unfinished,blockers,learned,nextActions) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(userId,date) DO UPDATE SET outputs=excluded.outputs,unfinished=excluded.unfinished,blockers=excluded.blockers,learned=excluded.learned,nextActions=excluded.nextActions",
      randomUUID(),
      userId,
      d.date,
      d.outputs,
      d.unfinished,
      d.blockers,
      d.learned,
      d.nextActions,
    );
  }
  if (type === "reset") {
    // Delete children first so this does not rely on foreign-key cascades,
    // which a remote libsql connection may not enforce.
    // Only this user's rows are removed.
    for (const table of [
      "task_history",
      "task_notepads",
      "task_subtasks",
      "task_outputs",
    ])
      await db.run(
        `DELETE FROM ${table} WHERE taskId IN (${USER_TASKS})`,
        userId,
      );
    await db.run(
      `DELETE FROM task_dependencies WHERE taskId IN (${USER_TASKS}) OR dependsOnId IN (${USER_TASKS})`,
      userId,
      userId,
    );
    await db.run(
      `DELETE FROM daily_plan_items WHERE planId IN (${USER_PLANS})`,
      userId,
    );
    await db.run("DELETE FROM daily_plans WHERE userId=?", userId);
    await db.run("DELETE FROM daily_reviews WHERE userId=?", userId);
    await db.run(
      `DELETE FROM tasks WHERE projectId IN (${USER_PROJECTS})`,
      userId,
    );
    await db.run(
      `DELETE FROM milestones WHERE projectId IN (${USER_PROJECTS})`,
      userId,
    );
    await db.run("DELETE FROM projects WHERE userId=?", userId);
    if (data.seed) await seed(db, userId);
  }
}
export async function seed(db: Db, userId = LOCAL_USER) {
  if (await db.get("SELECT id FROM projects WHERE userId=? LIMIT 1", userId))
    return;
  // Example ids must be unique per account.
  const k = (id: unknown) =>
    userId === LOCAL_USER ? String(id) : `${id}-${userId}`;
  const projects = [
    [
      "p1",
      "Build My Progress App",
      "A thoughtful workspace to turn ambitious goals into tangible outcomes.",
      "Side Project",
      "green",
    ],
    [
      "p2",
      "Deepen TypeScript skills",
      "Build a stronger foundation in advanced TypeScript patterns.",
      "Learning",
      "purple",
    ],
    [
      "p3",
      "Product discovery research",
      "Turn customer conversations into clear product opportunities.",
      "Research",
      "orange",
    ],
    [
      "p4",
      "Personal website",
      "A considered home for my work, ideas, and experiments.",
      "Personal",
      "blue",
    ],
  ];
  for (const [id, name, description, category, color] of projects)
    await db.run(
      "INSERT INTO projects(id,userId,name,description,category,color,priority) VALUES (?,?,?,?,?,?,?)",
      k(id),
      userId,
      name,
      description,
      category,
      color,
      id === "p1" ? "High" : "Medium",
    );
  for (const [id, pid, title] of [
    ["m1", "p1", "MVP"],
    ["m2", "p2", "Advanced type patterns"],
    ["m3", "p3", "Research synthesis"],
    ["m4", "p4", "Portfolio launch"],
  ])
    await db.run(
      "INSERT INTO milestones(id,projectId,title) VALUES (?,?,?)",
      k(id),
      k(pid),
      title,
    );
  const tasks = [
    [
      "t1",
      "p1",
      "m1",
      "Implement project and task management",
      "Create the foundation for a workspace that connects daily work to bigger goals.",
      90,
      "High",
      "Ready",
      "Projects and tasks can be created, edited, and saved. Changes persist after refreshing.",
      "A working project & task management flow",
    ],
    [
      "t2",
      "p2",
      "m2",
      "Practice TypeScript utility types",
      "Put the theory into practice with reusable, type-safe helpers.",
      45,
      "Medium",
      "Ready",
      "Write and test three examples using Pick, Omit, and Partial.",
      "3 practical examples with notes",
    ],
    [
      "t3",
      "p3",
      "m3",
      "Synthesize customer interview notes",
      "Find the common threads in this week’s conversations.",
      30,
      "Medium",
      "Ready",
      "Identify three recurring themes and attach supporting quotes.",
      "A research summary with 3 key insights",
    ],
    [
      "t4",
      "p4",
      "m4",
      "Outline the portfolio case study",
      "Make it easier to share the story behind the work.",
      20,
      "Low",
      "Ready",
      "Outline the problem, process, and outcome of one project.",
      "A first draft of the case study outline",
    ],
    [
      "t5",
      "p1",
      "m1",
      "Define the app’s core data model",
      "Give every piece of work a clear place to live.",
      45,
      "High",
      "Done",
      "Document entities and their relationships.",
      "Database schema and relationship diagram",
    ],
    [
      "t6",
      "p1",
      "m1",
      "Design the daily planning experience",
      "Keep the daily plan simple and intentional.",
      60,
      "Medium",
      "Backlog",
      "Design a simple list of tasks to work on together.",
      "An interactive daily planning flow",
    ],
    [
      "t7",
      "p1",
      "m1",
      "Build output history and progress views",
      "Make meaningful progress visible.",
      60,
      "Medium",
      "Backlog",
      "Completed outputs appear in a chronological history.",
      "A working progress dashboard",
    ],
    [
      "t8",
      "p2",
      "m2",
      "Explore generics and constraints",
      "Create reusable functions with better type safety.",
      45,
      "Medium",
      "Done",
      "Complete generic function exercises.",
      "Annotated examples of generic functions",
    ],
    [
      "t9",
      "p3",
      "m3",
      "Complete customer interviews",
      "Listen to the challenges people face every day.",
      60,
      "High",
      "Done",
      "Capture notes from three customer conversations.",
      "Three documented customer interviews",
    ],
    [
      "t10",
      "p4",
      "m4",
      "Collect portfolio inspiration",
      "Establish a visual direction for the website.",
      30,
      "Low",
      "Done",
      "Select five references and explain what works.",
      "A curated reference board",
    ],
  ];
  for (const [
    i,
    [id, pid, mid, title, desc, effort, priority, status, def, output],
  ] of tasks.entries()) {
    const completed = new Date();
    completed.setDate(
      completed.getDate() - (i === 4 ? 0 : i === 7 ? 1 : i === 8 ? 2 : 3),
    );
    completed.setHours(9, 15, 0, 0);
    await db.run(
      "INSERT INTO tasks(id,projectId,milestoneId,title,description,effort,priority,status,definition,expectedOutput,completedAt,completionNotes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
      k(id),
      k(pid),
      k(mid),
      title,
      desc,
      effort,
      priority,
      status,
      def,
      output,
      status === "Done" ? completed.toISOString() : null,
      status === "Done" ? output : "",
    );
    if (status === "Done")
      await db.run(
        "INSERT INTO task_outputs VALUES (?,?,?,?,?)",
        randomUUID(),
        k(id),
        output,
        "",
        completed.toISOString(),
      );
  }
  await db.run(
    "INSERT INTO daily_plans(id,userId,date,availableMinutes) VALUES (?,?,?,?)",
    k("plan-today"),
    userId,
    dateKey(),
    240,
  );
  for (const [i, id] of ["t1", "t2", "t3", "t4", "t5"].entries())
    await db.run(
      "INSERT INTO daily_plan_items VALUES (?,?,?,?)",
      k("plan-today"),
      k(id),
      i,
      0,
    );
  await db.run("INSERT INTO task_dependencies VALUES (?,?)", k("t1"), k("t5"));
}
