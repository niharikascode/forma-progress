import { z } from "zod";
const id = z.string().min(1);
const text = z.string().max(10000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !isNaN(new Date(v).valueOf()), "Choose a valid date");
export const projectSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1).max(150),
  description: text.default(""),
  category: z
    .enum(["Work", "Learning", "Research", "Side Project", "Personal"])
    .default("Side Project"),
  status: z
    .enum(["Active", "Paused", "Completed", "Archived"])
    .default("Active"),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  targetDate: date.nullable().default(null),
  color: z.enum(["green", "purple", "orange", "blue", "pink"]).default("green"),
});
export const taskSchema = z.object({
  id: id.optional(),
  projectId: id,
  milestoneId: id.nullable().default(null),
  title: z.string().trim().min(1).max(200),
  description: text.default(""),
  priority: z.enum(["High", "Medium", "Low"]).default("Medium"),
  status: z
    .enum(["Backlog", "Ready", "In Progress", "Blocked"])
    .default("Backlog"),
  effort: z.coerce.number().int().min(1).max(10000).default(30),
  dueDate: date.nullable().default(null),
  definition: text.default(""),
  expectedOutput: text.default(""),
  mandatory: z.boolean().default(false),
  dependencies: z.array(id).default([]),
});
export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addSubtask"),
    data: z.object({ taskId: id, title: z.string().trim().min(1).max(200) }),
  }),
  z.object({
    type: z.literal("toggleSubtask"),
    data: z.object({ taskId: id, id, completed: z.boolean() }),
  }),
  z.object({
    type: z.literal("deleteSubtask"),
    data: z.object({ taskId: id, id }),
  }),
  z.object({
    type: z.literal("notepad"),
    data: z.object({
      id,
      scene: z
        .string()
        .max(5_000_000)
        .refine((value) => {
          try {
            const scene = JSON.parse(value);
            return (
              scene?.type === "excalidraw" &&
              Array.isArray(scene.elements) &&
              scene.elements.length <= 10000 &&
              scene.elements.every(
                (element: unknown) =>
                  typeof element === "object" &&
                  element !== null &&
                  "id" in element &&
                  typeof element.id === "string" &&
                  "type" in element &&
                  typeof element.type === "string",
              )
            );
          } catch {
            return false;
          }
        }, "Invalid notepad drawing."),
    }),
  }),
  z.object({ type: z.literal("project"), data: projectSchema }),
  z.object({
    type: z.literal("milestone"),
    data: z.object({ projectId: id, title: z.string().trim().min(1).max(150) }),
  }),
  z.object({ type: z.literal("task"), data: taskSchema }),
  z.object({
    type: z.literal("status"),
    data: z.object({
      id,
      status: z.enum(["Backlog", "Ready", "In Progress", "Blocked", "Done"]),
      accepted: z.boolean().optional(),
      notes: text.optional(),
      completionNotes: text.optional(),
      artifact: text.optional(),
    }),
  }),
  z.object({
    type: z.literal("output"),
    data: z.object({
      id,
      note: z.string().trim().min(1).max(10000),
      artifact: text.default(""),
    }),
  }),
  z.object({ type: z.literal("deleteTask"), data: z.object({ id }) }),
  z.object({
    type: z.literal("plan"),
    data: z.object({
      date,
      taskIds: z.array(id).max(12),
    }),
  }),
  z.object({
    type: z.literal("carryForward"),
    data: z.object({ id, to: date }),
  }),
  z.object({
    type: z.literal("reschedule"),
    data: z.object({ id, from: date, to: date }),
  }),
  z.object({
    type: z.literal("review"),
    data: z.object({
      date,
      outputs: text,
      unfinished: text,
      blockers: text,
      learned: text,
      nextActions: text,
    }),
  }),
  z.object({ type: z.literal("reset"), data: z.object({ seed: z.boolean() }) }),
]);
export type Action = z.infer<typeof actionSchema>;
