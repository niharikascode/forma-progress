import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  openDatabase,
  execute,
  readWorkspace,
  seed,
  type Database,
} from "../src/lib/database";
import { dateKey, hasCycle, progress, subtaskProgress } from "../src/lib/types";
let db: Database;
let scratch: string;
beforeEach(async () => {
  scratch = mkdtempSync(path.join(tmpdir(), "forma-unit-"));
  db = await openDatabase(`file:${path.join(scratch, "db.sqlite")}`);
});
afterEach(() => {
  db.close();
  rmSync(scratch, { recursive: true, force: true });
});
async function setup() {
  await execute(db, {
    type: "project",
    data: { name: "Build My Progress App" },
  });
  const projectId = (await readWorkspace(db)).projects[0].id;
  await execute(db, { type: "milestone", data: { projectId, title: "MVP" } });
  const milestoneId = (await readWorkspace(db)).milestones[0].id;
  return { projectId, milestoneId };
}
async function task(extra: Record<string, unknown> = {}) {
  const ids = (await readWorkspace(db)).projects.length
    ? {
        projectId: (await readWorkspace(db)).projects[0].id,
        milestoneId: (await readWorkspace(db)).milestones[0]?.id,
      }
    : await setup();
  await execute(db, {
    type: "task",
    data: {
      ...ids,
      title: "Implement project and task management",
      definition: "Create, edit, and persist projects and tasks.",
      expectedOutput: "A working management flow",
      ...extra,
    },
  });
  return (await readWorkspace(db)).tasks.at(-1)!;
}
describe("Workspace domain and integration workflow", () => {
  it("tracks subtask progress independently of task completion and persists changes", async () => {
    const t = await task({ status: "In Progress" });
    expect(subtaskProgress((await readWorkspace(db)).subtasks, [t.id])).toEqual(
      { done: 0, total: 0, percent: 0 },
    );
    await execute(db, {
      type: "addSubtask",
      data: { taskId: t.id, title: "  Sketch the approach  " },
    });
    let workspace = await readWorkspace(db);
    const first = workspace.subtasks[0];
    expect(first.title).toBe("Sketch the approach");
    await execute(db, {
      type: "toggleSubtask",
      data: { taskId: t.id, id: first.id, completed: true },
    });
    workspace = await readWorkspace(db);
    expect(subtaskProgress(workspace.subtasks, [t.id]).percent).toBe(100);
    expect(workspace.tasks[0]).toMatchObject({
      status: "In Progress",
      completedAt: null,
    });
    expect(workspace.outputs).toEqual([]);
    await execute(db, {
      type: "addSubtask",
      data: { taskId: t.id, title: "Build the first version" },
    });
    workspace = await readWorkspace(db);
    expect(subtaskProgress(workspace.subtasks, [t.id])).toEqual({
      done: 1,
      total: 2,
      percent: 50,
    });
    // Completion remains an explicit decision even with unfinished subtasks.
    await execute(db, { type: "status", data: { id: t.id, status: "Done" } });
    db.close();
    db = await openDatabase(`file:${path.join(scratch, "db.sqlite")}`);
    workspace = await readWorkspace(db);
    expect(subtaskProgress(workspace.subtasks, [t.id]).percent).toBe(50);
    expect(workspace.tasks[0].status).toBe("Done");
    await execute(db, {
      type: "toggleSubtask",
      data: { taskId: t.id, id: first.id, completed: false },
    });
    workspace = await readWorkspace(db);
    expect(subtaskProgress(workspace.subtasks, [t.id]).percent).toBe(0);
    expect(workspace.tasks[0].status).toBe("Done");
    expect(workspace.outputs).toHaveLength(1);
  });
  it("aggregates project subtasks and cleans up deleted subtasks, tasks, and reset workspaces", async () => {
    const first = await task();
    const second = await task({ title: "Second task" });
    await execute(db, { type: "project", data: { name: "Other project" } });
    const otherProject = (await readWorkspace(db)).projects.find(
      (p) => p.id !== first.projectId,
    )!;
    const third = await task({
      title: "Unrelated task",
      projectId: otherProject.id,
      milestoneId: null,
    });
    for (const t of [first, second, third])
      await execute(db, {
        type: "addSubtask",
        data: { taskId: t.id, title: "One step" },
      });
    let workspace = await readWorkspace(db);
    const item = workspace.subtasks.find((s) => s.taskId === first.id)!;
    await execute(db, {
      type: "toggleSubtask",
      data: { taskId: first.id, id: item.id, completed: true },
    });
    workspace = await readWorkspace(db);
    expect(
      subtaskProgress(
        workspace.subtasks,
        workspace.tasks
          .filter((t) => t.projectId === first.projectId)
          .map((t) => t.id),
      ),
    ).toEqual({ done: 1, total: 2, percent: 50 });
    expect(subtaskProgress(workspace.subtasks, [third.id]).percent).toBe(0);
    await execute(db, {
      type: "deleteSubtask",
      data: { taskId: first.id, id: item.id },
    });
    expect((await readWorkspace(db)).subtasks).toHaveLength(2);
    await execute(db, { type: "deleteTask", data: { id: second.id } });
    expect((await readWorkspace(db)).subtasks.map((s) => s.taskId)).toEqual([
      third.id,
    ]);
    await execute(db, { type: "reset", data: { seed: false } });
    expect((await readWorkspace(db)).subtasks).toEqual([]);
  });
  it("validates subtask text and scopes mutations to the owning task", async () => {
    const first = await task();
    const second = await task();
    for (const title of ["   ", "x".repeat(201)])
      await expect(
        execute(db, { type: "addSubtask", data: { taskId: first.id, title } }),
      ).rejects.toThrow();
    await expect(
      execute(db, {
        type: "addSubtask",
        data: { taskId: "missing", title: "Step" },
      }),
    ).rejects.toThrow("Task not found");
    await execute(db, {
      type: "addSubtask",
      data: { taskId: first.id, title: "Step" },
    });
    const item = (await readWorkspace(db)).subtasks[0];
    await expect(
      execute(db, {
        type: "toggleSubtask",
        data: { taskId: second.id, id: item.id, completed: true },
      }),
    ).rejects.toThrow("Subtask not found");
    await expect(
      execute(db, {
        type: "deleteSubtask",
        data: { taskId: second.id, id: item.id },
      }),
    ).rejects.toThrow("Subtask not found");
    await db.run("INSERT INTO users(id,name) VALUES (?,?)", "other", "Other");
    await db.run(
      "UPDATE projects SET userId=? WHERE id=?",
      "other",
      first.projectId,
    );
    await expect(
      execute(db, {
        type: "toggleSubtask",
        data: { taskId: first.id, id: item.id, completed: true },
      }),
    ).rejects.toThrow("Task not found");
  });
  it("saves isolated task notepads, updates them, and retains them after reopening the database", async () => {
    const first = await task();
    const second = await task({ title: "Another task" });
    const drawing = JSON.stringify({
      type: "excalidraw",
      elements: [{ id: "shape", type: "rectangle", x: 10, y: 20 }],
    });
    await execute(db, {
      type: "notepad",
      data: { id: first.id, scene: drawing },
    });
    await execute(db, {
      type: "notepad",
      data: {
        id: second.id,
        scene: JSON.stringify({ type: "excalidraw", elements: [] }),
      },
    });
    await execute(db, {
      type: "status",
      data: { id: first.id, status: "Done" },
    });
    await execute(db, {
      type: "notepad",
      data: { id: first.id, scene: drawing },
    });
    db.close();
    db = await openDatabase(`file:${path.join(scratch, "db.sqlite")}`);
    const workspace = await readWorkspace(db);
    expect(workspace.notepads).toHaveLength(2);
    expect(workspace.notepads.find((n) => n.taskId === first.id)?.scene).toBe(
      drawing,
    );
    expect(
      JSON.parse(workspace.notepads.find((n) => n.taskId === second.id)!.scene)
        .elements,
    ).toEqual([]);
    await execute(db, { type: "deleteTask", data: { id: second.id } });
    expect((await readWorkspace(db)).notepads).toHaveLength(1);
    await execute(db, { type: "reset", data: { seed: false } });
    expect((await readWorkspace(db)).notepads).toEqual([]);
  });
  it("rejects malformed notepads and missing or foreign tasks", async () => {
    const first = await task();
    for (const scene of [
      "invalid",
      "null",
      '{"type":"excalidraw","elements":[null]}',
      "x".repeat(5_000_001),
    ]) {
      await expect(
        execute(db, { type: "notepad", data: { id: first.id, scene } }),
      ).rejects.toThrow();
    }
    const scene = JSON.stringify({ type: "excalidraw", elements: [] });
    await expect(
      execute(db, { type: "notepad", data: { id: "missing", scene } }),
    ).rejects.toThrow("Task not found");
    await db.run("INSERT INTO users(id,name) VALUES (?,?)", "other", "Other");
    await db.run(
      "UPDATE projects SET userId=? WHERE id=?",
      "other",
      first.projectId,
    );
    await expect(
      execute(db, { type: "notepad", data: { id: first.id, scene } }),
    ).rejects.toThrow("Task not found");
  });
  it("creates, edits and archives a project", async () => {
    const { projectId } = await setup();
    await execute(db, {
      type: "project",
      data: {
        id: projectId,
        name: "Updated project",
        status: "Archived",
        category: "Work",
      },
    });
    expect((await readWorkspace(db)).projects[0]).toMatchObject({
      name: "Updated project",
      status: "Archived",
      category: "Work",
    });
  });
  it("creates tasks assigned to their project milestone and edits them", async () => {
    const t = await task();
    await execute(db, {
      type: "task",
      data: { ...t, title: "Updated task", mandatory: false, dependencies: [] },
    });
    expect((await readWorkspace(db)).tasks[0]).toMatchObject({
      title: "Updated task",
      milestoneId: t.milestoneId,
    });
    expect((await readWorkspace(db)).milestones[0].projectId).toBe(t.projectId);
  });
  it("rejects milestones from a different project", async () => {
    const ids = await setup();
    await execute(db, { type: "project", data: { name: "Other" } });
    await expect(
      task({
        projectId: (await readWorkspace(db)).projects[1].id,
        milestoneId: ids.milestoneId,
      }),
    ).rejects.toThrow("Milestone must belong");
  });
  it("supports pause and blocked transitions without losing notes", async () => {
    const t = await task();
    for (const status of ["In Progress", "Blocked", "Ready"])
      await execute(db, {
        type: "status",
        data: { id: t.id, status, notes: "Resume by checking the schema" },
      });
    expect((await readWorkspace(db)).tasks[0]).toMatchObject({
      status: "Ready",
      notes: "Resume by checking the schema",
      completedAt: null,
    });
  });
  it("completes legacy mandatory tasks without acceptance and remains idempotent", async () => {
    const t = await task({ mandatory: true });
    await execute(db, {
      type: "status",
      data: {
        id: t.id,
        status: "Done",
        completionNotes: "Shipped the feature",
        artifact: "commit:abc",
      },
    });
    await execute(db, { type: "status", data: { id: t.id, status: "Done" } });
    expect((await readWorkspace(db)).outputs).toHaveLength(1);
    expect((await readWorkspace(db)).outputs[0]).toMatchObject({
      note: "Shipped the feature",
      artifact: "commit:abc",
    });
    expect((await readWorkspace(db)).tasks[0].completedAt).toBeTruthy();
    expect((await readWorkspace(db)).tasks[0].accepted).toBe(0);
  });
  it("allows user-judged completion for nonmandatory criteria", async () => {
    const t = await task();
    await execute(db, { type: "status", data: { id: t.id, status: "Done" } });
    expect((await readWorkspace(db)).tasks[0].status).toBe("Done");
  });
  it("rejects missing dependencies, cycles, and unmet prerequisites", async () => {
    const a = await task();
    const b = await task({ title: "Second", dependencies: [a.id] });
    await expect(
      execute(db, {
        type: "task",
        data: { ...a, mandatory: false, dependencies: [b.id] },
      }),
    ).rejects.toThrow("circular");
    await expect(task({ dependencies: ["missing"] })).rejects.toThrow(
      "not found",
    );
    await expect(
      execute(db, {
        type: "status",
        data: { id: b.id, status: "In Progress" },
      }),
    ).rejects.toThrow("prerequisite");
    await expect(
      execute(db, { type: "status", data: { id: b.id, status: "Done" } }),
    ).rejects.toThrow("prerequisite");
    await execute(db, { type: "status", data: { id: a.id, status: "Done" } });
    await execute(db, { type: "status", data: { id: b.id, status: "Done" } });
    expect(progress((await readWorkspace(db)).tasks).percent).toBe(100);
  });
  it("detects indirect cycles", async () => {
    expect(
      hasCycle([
        { taskId: "a", dependsOnId: "b" },
        { taskId: "b", dependsOnId: "c" },
        { taskId: "c", dependsOnId: "a" },
      ]),
    ).toBe(true);
    expect(hasCycle([{ taskId: "a", dependsOnId: "b" }])).toBe(false);
  });
  it("reschedules unfinished tasks without copying the underlying record", async () => {
    const t = await task();
    await execute(db, {
      type: "plan",
      data: {
        date: "2026-10-27",
        primary: t.id,
        taskIds: [t.id],
        availableMinutes: 240,
      },
    });
    await execute(db, {
      type: "reschedule",
      data: { id: t.id, from: "2026-10-27", to: "2026-10-28" },
    });
    const s = await readWorkspace(db);
    expect(s.tasks).toHaveLength(1);
    expect(s.planItems).toHaveLength(1);
    expect(s.plans.find((p) => p.id === s.planItems[0].planId)?.date).toBe(
      "2026-10-28",
    );
    expect(s.tasks[0].status).toBe("Backlog");
  });
  it("plans parallel tasks without a primary deliverable or durations", async () => {
    const first = await task();
    const second = await task({ title: "Parallel task" });
    await execute(db, {
      type: "plan",
      data: { date: dateKey(), taskIds: [first.id, second.id, first.id] },
    });
    let workspace = await readWorkspace(db);
    expect(workspace.planItems).toHaveLength(2);
    expect(workspace.planItems.every((item) => item.isPrimary === 0)).toBe(
      true,
    );
    for (const t of [first, second])
      await execute(db, {
        type: "status",
        data: { id: t.id, status: "In Progress" },
      });
    workspace = await readWorkspace(db);
    expect(workspace.tasks.every((t) => t.status === "In Progress")).toBe(true);
    await execute(db, {
      type: "status",
      data: { id: first.id, status: "Done" },
    });
    workspace = await readWorkspace(db);
    expect(workspace.planItems).toHaveLength(2);
    expect(workspace.tasks.find((t) => t.id === second.id)?.status).toBe(
      "In Progress",
    );
    await execute(db, {
      type: "reschedule",
      data: { id: second.id, from: dateKey(), to: "2030-01-02" },
    });
    expect(
      (await readWorkspace(db)).planItems.every((item) => item.isPrimary === 0),
    ).toBe(true);
  });
  it("retains output history and prevents destructive deletion", async () => {
    const t = await task();
    await execute(db, {
      type: "output",
      data: { id: t.id, note: "Implemented persistence" },
    });
    await expect(
      execute(db, { type: "deleteTask", data: { id: t.id } }),
    ).rejects.toThrow("retained");
    expect((await readWorkspace(db)).outputs).toHaveLength(1);
  });
  it("creates and updates one review per date", async () => {
    const review = {
      date: dateKey(),
      outputs: "A working feature",
      unfinished: "Docs",
      blockers: "None",
      learned: "Keep the scope small",
      nextActions: "Write the setup guide",
    };
    await execute(db, { type: "review", data: review });
    await execute(db, {
      type: "review",
      data: { ...review, learned: "Keep it simple" },
    });
    expect((await readWorkspace(db)).reviews).toHaveLength(1);
    expect((await readWorkspace(db)).reviews[0].learned).toBe("Keep it simple");
  });
  it("validates inputs and rolls back invalid writes", async () => {
    await expect(task({ effort: -1 })).rejects.toThrow();
    expect((await readWorkspace(db)).tasks).toHaveLength(0);
    await expect(
      execute(db, { type: "project", data: { name: "  " } }),
    ).rejects.toThrow();
  });
  it("seeds realistic data and clears the workspace explicitly", async () => {
    await seed(db);
    expect((await readWorkspace(db)).projects[0].name).toBe(
      "Build My Progress App",
    );
    expect((await readWorkspace(db)).outputs.length).toBeGreaterThan(0);
    await execute(db, { type: "reset", data: { seed: false } });
    expect((await readWorkspace(db)).projects).toHaveLength(0);
    expect((await readWorkspace(db)).outputs).toHaveLength(0);
  });
  it("runs the requested project → output → review workflow and persists across restart", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "forma-test-"));
    const file = path.join(directory, "db.sqlite");
    const disk = await openDatabase(`file:${file}`);
    try {
      await execute(disk, {
        type: "project",
        data: { name: "Build My Progress App" },
      });
      let s = await readWorkspace(disk);
      const projectId = s.projects[0].id;
      await execute(disk, {
        type: "milestone",
        data: { projectId, title: "MVP" },
      });
      s = await readWorkspace(disk);
      const milestoneId = s.milestones[0].id;
      await execute(disk, {
        type: "task",
        data: {
          projectId,
          milestoneId,
          title: "Implement project and task management",
          definition: "CRUD works and survives refresh.",
          mandatory: true,
        },
      });
      const t = (await readWorkspace(disk)).tasks[0];
      await execute(disk, {
        type: "plan",
        data: {
          date: dateKey(),
          primary: t.id,
          taskIds: [t.id],
          availableMinutes: 120,
        },
      });
      await execute(disk, {
        type: "status",
        data: { id: t.id, status: "In Progress" },
      });
      await execute(disk, {
        type: "output",
        data: { id: t.id, note: "Implemented the schema and management forms" },
      });
      await execute(disk, {
        type: "status",
        data: {
          id: t.id,
          status: "Done",
          accepted: true,
          completionNotes: "Project and task management works.",
        },
      });
      s = await readWorkspace(disk);
      expect(
        progress(s.tasks.filter((t) => t.projectId === projectId)).percent,
      ).toBe(100);
      expect(
        progress(s.tasks.filter((t) => t.milestoneId === milestoneId)).percent,
      ).toBe(100);
      await execute(disk, {
        type: "review",
        data: {
          date: dateKey(),
          outputs: "Working management flow",
          unfinished: "",
          blockers: "",
          learned: "Outputs matter",
          nextActions: "Plan tomorrow",
        },
      });
      disk.close();
      const restarted = await openDatabase(`file:${file}`);
      const restored = await readWorkspace(restarted);
      expect(restored.tasks[0].status).toBe("Done");
      expect(restored.outputs).toHaveLength(2);
      expect(restored.planItems[0].isPrimary).toBe(0);
      expect(restored.reviews[0].learned).toBe("Outputs matter");
      restarted.close();
    } finally {
      disk.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});

describe("Daily history and carrying work forward", () => {
  it("keeps the original plan and all task progress when added to another date", async () => {
    const t = await task({ status: "In Progress" });
    await execute(db, {
      type: "addSubtask",
      data: { taskId: t.id, title: "First step" },
    });
    const subtask = (await readWorkspace(db)).subtasks[0];
    await execute(db, {
      type: "toggleSubtask",
      data: { taskId: t.id, id: subtask.id, completed: true },
    });
    await execute(db, {
      type: "plan",
      data: { date: "2026-01-01", taskIds: [t.id] },
    });
    const before = await readWorkspace(db);
    await execute(db, {
      type: "carryForward",
      data: { id: t.id, to: "2026-01-02" },
    });
    await execute(db, {
      type: "carryForward",
      data: { id: t.id, to: "2026-01-02" },
    });
    const after = await readWorkspace(db);
    expect(after.planItems.filter((i) => i.taskId === t.id)).toHaveLength(2);
    expect(after.tasks).toEqual(before.tasks);
    expect(after.subtasks).toEqual(before.subtasks);
    expect(after.taskHistory).toEqual(before.taskHistory);
  });

  it("retains earlier checklist snapshots after later changes", async () => {
    const t = await task();
    await execute(db, {
      type: "addSubtask",
      data: { taskId: t.id, title: "First step" },
    });
    const before = await readWorkspace(db);
    await execute(db, {
      type: "toggleSubtask",
      data: { taskId: t.id, id: before.subtasks[0].id, completed: true },
    });
    const after = await readWorkspace(db);
    expect(after.taskHistory.slice(0, -1)).toEqual(before.taskHistory);
    expect(after.taskHistory.at(-2)?.subtasks[0].completed).toBe(0);
    expect(after.taskHistory.at(-1)?.subtasks[0].completed).toBe(1);
  });
});
describe("Per-account workspaces", () => {
  it("keeps each account's data private and seeds examples without id clashes", async () => {
    await db.run("INSERT INTO users(id,name) VALUES ('alice','A'),('bob','B')");
    await seed(db, "alice");
    await seed(db, "bob");
    const alice = await readWorkspace(db, "alice");
    const bob = await readWorkspace(db, "bob");
    expect(alice.projects).toHaveLength(4);
    expect(bob.projects).toHaveLength(4);
    expect(alice.tasks.some((t) => bob.tasks.some((b) => b.id === t.id))).toBe(
      false,
    );
    expect((await readWorkspace(db)).projects).toHaveLength(0);
    const bobTask = bob.tasks[0];
    await expect(
      execute(
        db,
        { type: "status", data: { id: bobTask.id, status: "Done" } },
        "alice",
      ),
    ).rejects.toThrow("Task not found.");
    await execute(db, { type: "reset", data: { seed: false } }, "alice");
    expect((await readWorkspace(db, "alice")).projects).toHaveLength(0);
    expect((await readWorkspace(db, "bob")).tasks).toHaveLength(
      bob.tasks.length,
    );
  });
});
