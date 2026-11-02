"use client";
import { useState, type FormEvent } from "react";
import NotepadDialog from "./notepad-dialog";
import Subtasks from "./subtasks";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Target,
  Trash2,
} from "lucide-react";
import { Modal, Field } from "./ui";
import {
  dateKey,
  type Workspace,
  type Project,
  type Task,
  type Review,
} from "@/lib/types";
import type { Action } from "@/lib/validation";
export type ModalState =
  | { kind: "project"; project?: Project }
  | { kind: "task"; task?: Task; projectId?: string }
  | { kind: "execute"; task: Task }
  | { kind: "notepad"; task: Task }
  | { kind: "plan"; date?: string }
  | { kind: "review"; review?: Review; date?: string }
  | { kind: "milestone"; projectId: string }
  | { kind: "reschedule"; task: Task }
  | { kind: "search" }
  | { kind: "reset"; seed: boolean };
type Props = {
  modal: ModalState;
  data: Workspace;
  onClose: () => void;
  save: (action: Action, message?: string) => Promise<boolean>;
  open: (modal: ModalState) => void;
};
function Submit({
  children = "Save changes",
  busy = false,
}: {
  children?: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <button className="button primary" disabled={busy} type="submit">
      {busy ? "Saving…" : children}
      {!busy && <ArrowRight size={15} />}
    </button>
  );
}
export default function WorkspaceDialog(props: Props) {
  const { modal } = props;
  switch (modal.kind) {
    case "notepad":
      return (
        <NotepadDialog
          task={modal.task}
          notepad={props.data.notepads.find((n) => n.taskId === modal.task.id)}
          save={props.save}
          onClose={props.onClose}
        />
      );
    case "project":
      return <ProjectDialog {...props} project={modal.project} />;
    case "task":
      return (
        <TaskDialog {...props} task={modal.task} projectId={modal.projectId} />
      );
    case "execute":
      return (
        <ExecuteDialog
          {...props}
          task={
            props.data.tasks.find((t) => t.id === modal.task.id) || modal.task
          }
        />
      );
    case "plan":
      return <PlanDialog {...props} />;
    case "review":
      return <ReviewDialog {...props} review={modal.review} />;
    case "milestone":
      return <MilestoneDialog {...props} projectId={modal.projectId} />;
    case "reschedule":
      return <RescheduleDialog {...props} task={modal.task} />;
    case "search":
      return <SearchDialog {...props} />;
    case "reset":
      return <ResetDialog {...props} seed={modal.seed} />;
  }
}
function ProjectDialog({
  project,
  onClose,
  save,
}: Props & { project?: Project }) {
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const ok = await save(
      {
        type: "project",
        data: {
          id: project?.id,
          name: String(f.get("name")),
          description: String(f.get("description")),
          category: f.get("category") as "Work",
          status: (project?.status || "Active") as "Active",
          priority: (project?.priority || "Medium") as "Medium",
          targetDate: String(f.get("targetDate")) || null,
          color: (project?.color || "green") as "green",
        },
      },
      project ? "Project updated" : "A new project, a new possibility",
    );
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <Modal
      title={project ? "Edit project" : "Create a project"}
      description="Give your bigger goal a place to grow."
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-stack">
        <Field label="Project name">
          <input
            name="name"
            defaultValue={project?.name}
            placeholder="e.g. Build My Progress App"
            required
            autoFocus
          />
        </Field>
        <Field label="What are you working toward?">
          <textarea
            name="description"
            defaultValue={project?.description}
            placeholder="Describe the outcome you want to create…"
            rows={3}
          />
        </Field>
        <div className="form-grid">
          <Field label="Category">
            <select
              name="category"
              defaultValue={project?.category || "Side Project"}
            >
              {["Work", "Learning", "Research", "Side Project", "Personal"].map(
                (c) => (
                  <option key={c}>{c}</option>
                ),
              )}
            </select>
          </Field>
          <Field label="Target date · optional">
            <input
              type="date"
              name="targetDate"
              defaultValue={project?.targetDate || ""}
            />
          </Field>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <Submit busy={busy}>
            {project ? "Save project" : "Create project"}
          </Submit>
        </div>
      </form>
    </Modal>
  );
}
function TaskDialog({
  task,
  projectId,
  data,
  onClose,
  save,
}: Props & { task?: Task; projectId?: string }) {
  // No silent fallback to the first project: outside a project page the
  // person chooses one explicitly.
  const [pid, setPid] = useState(task?.projectId || projectId || "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const ok = await save(
      {
        type: "task",
        data: {
          id: task?.id,
          projectId: pid,
          milestoneId: String(f.get("milestoneId")) || null,
          title: String(f.get("title")),
          description: task?.description || "",
          priority: (task?.priority || "Medium") as "Medium",
          status: task?.status === "Done" ? "Ready" : task?.status || "Ready",
          effort: task?.effort || 30,
          dueDate: String(f.get("dueDate")) || null,
          definition: task?.definition || "",
          expectedOutput: String(f.get("expectedOutput")),
          mandatory: !!task?.mandatory,
          dependencies: data.dependencies
            .filter((d) => d.taskId === task?.id)
            .map((d) => d.dependsOnId),
        },
      },
      task ? "Task updated" : "Task added to your workspace",
    );
    setBusy(false);
    if (ok) onClose();
  }
  return (
    <Modal
      title={task ? "Edit task" : "Create a meaningful task"}
      description="Start with the output. What will be different when this is done?"
      onClose={onClose}
      wide
    >
      <form onSubmit={submit} className="form-stack">
        <Field label="Task title">
          <input
            name="title"
            defaultValue={task?.title}
            placeholder="e.g. Implement project and task management"
            required
            autoFocus
          />
        </Field>
        <div className="form-grid">
          <Field label="Project">
            <select
              value={pid}
              onChange={(e) => setPid(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a project
              </option>
              {data.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Milestone · optional">
            <select
              name="milestoneId"
              key={pid}
              defaultValue={task?.milestoneId || ""}
            >
              <option value="">No milestone</option>
              {data.milestones
                .filter((m) => m.projectId === pid)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
            </select>
          </Field>
        </div>
        <Field label="Expected output">
          <input
            name="expectedOutput"
            defaultValue={task?.expectedOutput}
            placeholder="A working feature, a decision, a published document…"
          />
        </Field>
        <div className="form-grid">
          <Field label="Due date · optional">
            <input
              type="date"
              name="dueDate"
              defaultValue={task?.dueDate || ""}
            />
          </Field>
        </div>
        <div className="modal-footer">
          {task && (
            <button
              type="button"
              className="button danger"
              onClick={() => setConfirm(true)}
            >
              <Trash2 size={15} />
              Delete
            </button>
          )}
          <div className="spacer" />
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <Submit busy={busy}>{task ? "Save task" : "Create task"}</Submit>
        </div>
        {confirm && (
          <div className="confirm-inline">
            <p>Delete this task permanently? Recorded outputs are protected.</p>
            <button
              type="button"
              className="button danger"
              onClick={async () => {
                if (
                  await save(
                    { type: "deleteTask", data: { id: task!.id } },
                    "Task deleted",
                  )
                )
                  onClose();
              }}
            >
              Confirm deletion
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setConfirm(false)}
            >
              Keep task
            </button>
          </div>
        )}
      </form>
    </Modal>
  );
}
function ExecuteDialog({
  task,
  data,
  onClose,
  save,
  open,
}: Props & { task: Task }) {
  const [notepadOpen, setNotepadOpen] = useState(false);
  const [notes, setNotes] = useState(task.notes);
  const [completionNotes, setCompletion] = useState(task.completionNotes);
  const [artifact, setArtifact] = useState(task.artifact);
  const [busy, setBusy] = useState(false);
  const project = data.projects.find((p) => p.id === task.projectId);
  const outputs = data.outputs.filter((o) => o.taskId === task.id);
  async function update(status: Task["status"]) {
    setBusy(true);
    const ok = await save(
      {
        type: "status",
        data: {
          id: task.id,
          status,
          notes,
          completionNotes,
          artifact,
        },
      },
      status === "Done"
        ? "Output recorded. That’s meaningful progress."
        : status === "In Progress"
          ? "Your focus session is ready"
          : "Task updated",
    );
    setBusy(false);
    if (ok && status === "Done") onClose();
  }
  return (
    <Modal
      title={
        task.status === "Done" ? "A meaningful output" : "Your focus workspace"
      }
      description={`${project?.name} / ${data.milestones.find((m) => m.id === task.milestoneId)?.title || "Project task"}`}
      onClose={onClose}
      wide
    >
      <div className="execution-title">
        <h2>{task.title}</h2>
      </div>
      <Subtasks taskId={task.id} subtasks={data.subtasks} save={save} />
      <div className="output-box">
        <Target size={19} />
        <div>
          <span className="eyebrow">EXPECTED OUTPUT</span>
          <p>
            {task.expectedOutput ||
              "Define the concrete result you want to produce."}
          </p>
        </div>
      </div>
      <div className="form-stack">
        <Field label="Working notes">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ideas, decisions, or anything to pick up later…"
          />
        </Field>
        <button
          type="button"
          className="button"
          onClick={() => setNotepadOpen(true)}
        >
          {data.notepads.some((n) => n.taskId === task.id)
            ? "Open notepad"
            : "Create notepad"}{" "}
          · Draw, text & shapes
        </button>
        {notepadOpen && (
          <NotepadDialog
            task={task}
            notepad={data.notepads.find((n) => n.taskId === task.id)}
            save={save}
            onClose={() => setNotepadOpen(false)}
          />
        )}
        <Field label="What did you produce?">
          <textarea
            rows={3}
            value={completionNotes}
            onChange={(e) => setCompletion(e.target.value)}
            placeholder="Describe the concrete output or implementation…"
          />
        </Field>
        <Field label="Artifact link or reference · optional">
          <div className="input-icon">
            <Link2 size={16} />
            <input
              value={artifact}
              onChange={(e) => setArtifact(e.target.value)}
              placeholder="https://… or a file, commit, or document reference"
            />
          </div>
        </Field>
      </div>
      {outputs.length > 0 && (
        <div className="task-history">
          <h4>Output history</h4>
          {outputs.map((o) => (
            <div key={o.id}>
              <CheckCircle2 size={16} />
              <div>
                <p>{o.note}</p>
                <small>
                  {new Date(o.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {o.artifact && ` · ${o.artifact}`}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="modal-footer execution-actions">
        {task.status !== "Done" ? (
          <>
            <button
              className="button"
              disabled={busy}
              onClick={() => update(task.status)}
            >
              Save notes
            </button>
            <div className="spacer" />
            <button
              className="button primary"
              disabled={busy}
              onClick={() => update("Done")}
            >
              <Check size={16} />
              Mark complete
            </button>
          </>
        ) : (
          <>
            <button className="button" onClick={() => update("Ready")}>
              Reopen task
            </button>
            <div className="spacer" />
            <button className="button primary" onClick={onClose}>
              Done
            </button>
          </>
        )}
      </div>
      <div className="execution-links">
        <button
          disabled={busy || !completionNotes.trim()}
          onClick={async () => {
            setBusy(true);
            if (
              await save(
                {
                  type: "output",
                  data: { id: task.id, note: completionNotes, artifact },
                },
                "Output added to history",
              )
            )
              setCompletion("");
            setBusy(false);
          }}
        >
          Record an output without completing
        </button>
        {task.status !== "Done" && (
          <button onClick={() => open({ kind: "task", task })}>
            Edit task <ExternalLink size={12} />
          </button>
        )}
      </div>
    </Modal>
  );
}
function PlanDialog({ data, onClose, save, modal }: Props) {
  const [date, setDate] = useState(
    modal.kind === "plan" ? modal.date || dateKey() : dateKey(),
  );
  const initial = data.plans.find((p) => p.date === date);
  const [selected, setSelected] = useState(
    data.planItems.filter((i) => i.planId === initial?.id).map((i) => i.taskId),
  );
  const [busy, setBusy] = useState(false);
  function changeDate(value: string) {
    setDate(value);
    const plan = data.plans.find((p) => p.date === value);
    setSelected(
      data.planItems.filter((i) => i.planId === plan?.id).map((i) => i.taskId),
    );
  }
  return (
    <Modal
      title="Make a little room for progress."
      description="Choose the tasks you want to work on together."
      onClose={onClose}
      wide
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          if (
            await save(
              {
                type: "plan",
                data: {
                  date,
                  taskIds: selected,
                },
              },
              "Your daily plan is saved",
            )
          )
            onClose();
          setBusy(false);
        }}
      >
        <div className="form-grid">
          <Field label="Plan for">
            <input
              type="date"
              value={date}
              onChange={(e) => changeDate(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="plan-task-list">
          {data.tasks
            .filter((t) => t.status !== "Done" || selected.includes(t.id))
            .map((t) => {
              const checked = selected.includes(t.id);
              const blocked = data.dependencies.some(
                (d) =>
                  d.taskId === t.id &&
                  data.tasks.find((x) => x.id === d.dependsOnId)?.status !==
                    "Done",
              );
              return (
                <div
                  key={t.id}
                  className={`plan-task ${checked ? "selected" : ""}`}
                >
                  <input
                    aria-label={`Include ${t.title}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        setSelected(selected.filter((id) => id !== t.id));
                      } else {
                        setSelected([...selected, t.id]);
                      }
                    }}
                  />
                  <div>
                    <strong>{t.title}</strong>
                    <small>
                      {data.projects.find((p) => p.id === t.projectId)?.name}
                      {blocked ? " · Prerequisite unfinished" : ""}
                    </small>
                  </div>
                </div>
              );
            })}
          {!data.tasks.length && (
            <p className="empty-copy">
              Create your first project and task to start planning.
            </p>
          )}
        </div>
        <p className="form-note">
          Your plan belongs to this date. Unfinished work stays put until you
          choose to reschedule it.
        </p>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Cancel
          </button>
          <Submit busy={busy}>Save daily plan</Submit>
        </div>
      </form>
    </Modal>
  );
}
function ReviewDialog({
  modal,
  data,
  review,
  onClose,
  save,
}: Props & { review?: Review }) {
  const [date, setDate] = useState(
    review?.date ||
      (modal.kind === "review" ? modal.date : undefined) ||
      dateKey(),
  );
  const [busy, setBusy] = useState(false);
  const existing = data.reviews.find((r) => r.date === date);
  const done = data.tasks.filter((t) => t.completedAt?.slice(0, 10) === date);
  const plan = data.plans.find((p) => p.date === date);
  const unfinished = data.tasks.filter(
    (t) =>
      t.status !== "Done" &&
      data.planItems.some((i) => i.planId === plan?.id && i.taskId === t.id),
  );
  return (
    <Modal
      title="A moment to look back."
      description="Notice what moved forward. Make tomorrow a little clearer."
      onClose={onClose}
      wide
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          if (
            await save(
              {
                type: "review",
                data: {
                  date,
                  outputs: String(f.get("outputs")),
                  unfinished: String(f.get("unfinished")),
                  blockers: String(f.get("blockers")),
                  learned: String(f.get("learned")),
                  nextActions: String(f.get("nextActions")),
                },
              },
              "Your reflection is saved",
            )
          )
            onClose();
          setBusy(false);
        }}
      >
        <Field label="Review date">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <div className="form-stack" key={date}>
          <Field label="What did you produce?">
            <textarea
              name="outputs"
              rows={2}
              defaultValue={
                existing?.outputs ??
                done
                  .map((t) => t.completionNotes || t.expectedOutput || t.title)
                  .join("\n")
              }
              placeholder="The concrete outputs you’re taking away…"
            />
          </Field>
          <Field label="What’s still in progress?">
            <textarea
              name="unfinished"
              rows={2}
              defaultValue={
                existing?.unfinished ??
                unfinished.map((t) => t.title).join("\n")
              }
            />
          </Field>
          <Field label="Did anything get in the way?">
            <textarea
              name="blockers"
              rows={2}
              defaultValue={existing?.blockers}
              placeholder="Any blockers, dependencies, or distractions…"
            />
          </Field>
          <Field label="What did you learn?">
            <textarea
              name="learned"
              rows={2}
              defaultValue={existing?.learned}
              placeholder="One useful insight is enough."
            />
          </Field>
          <Field label="What’s the next step for unfinished work?">
            <textarea
              name="nextActions"
              rows={2}
              defaultValue={existing?.nextActions}
              placeholder="Name the task and its next concrete action…"
            />
          </Field>
        </div>
        <div className="modal-footer">
          <button type="button" className="button" onClick={onClose}>
            Not now
          </button>
          <Submit busy={busy}>Save reflection</Submit>
        </div>
      </form>
    </Modal>
  );
}
function MilestoneDialog({
  projectId,
  onClose,
  save,
}: Props & { projectId: string }) {
  return (
    <Modal
      title="Add a milestone"
      description="A meaningful checkpoint on the way to your goal."
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (
            await save(
              {
                type: "milestone",
                data: { projectId, title: String(f.get("title")) },
              },
              "Milestone created",
            )
          )
            onClose();
        }}
      >
        <Field label="Milestone name">
          <input name="title" required autoFocus placeholder="e.g. MVP" />
        </Field>
        <div className="modal-footer">
          <Submit>Create milestone</Submit>
        </div>
      </form>
    </Modal>
  );
}
function RescheduleDialog({
  task,
  onClose,
  save,
  data,
}: Props & { task: Task }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    <Modal
      title="Give this task a new day"
      description={task.title}
      onClose={onClose}
    >
      <form
        className="form-stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (
            await save(
              {
                type: "reschedule",
                data: {
                  id: task.id,
                  from: String(f.get("from")),
                  to: String(f.get("to")),
                },
              },
              "Task rescheduled",
            )
          )
            onClose();
        }}
      >
        <Field label="Move from">
          <select name="from" defaultValue={dateKey()}>
            <option value={dateKey()}>Today</option>
            {data.plans
              .filter(
                (p) =>
                  p.date !== dateKey() &&
                  data.planItems.some(
                    (i) => i.planId === p.id && i.taskId === task.id,
                  ),
              )
              .map((p) => (
                <option key={p.id} value={p.date}>
                  {p.date}
                </option>
              ))}
          </select>
        </Field>
        <Field label="New date">
          <input
            name="to"
            type="date"
            defaultValue={dateKey(tomorrow)}
            required
          />
        </Field>
        <p className="form-note">
          Your task, notes, and outputs stay intact. Only its place in the plan
          changes.
        </p>
        <div className="modal-footer">
          <Submit>Reschedule task</Submit>
        </div>
      </form>
    </Modal>
  );
}
function SearchDialog({ data, onClose, open }: Props) {
  const [query, setQuery] = useState("");
  const matches = data.tasks.filter((t) =>
    `${t.title} ${t.expectedOutput}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <Modal
      title="Find your next step"
      description="Search tasks and their expected outputs."
      onClose={onClose}
    >
      <input
        autoFocus
        className="search-input"
        placeholder="Search your workspace…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="search-results">
        {matches.map((t) => (
          <button key={t.id} onClick={() => open({ kind: "execute", task: t })}>
            <div>
              <strong>{t.title}</strong>
              <small>
                {data.projects.find((p) => p.id === t.projectId)?.name}
              </small>
            </div>
            <ArrowRight size={17} />
          </button>
        ))}
        {!matches.length && <p>No matching tasks. Try another word.</p>}
      </div>
    </Modal>
  );
}
function ResetDialog({ seed, onClose, save }: Props & { seed: boolean }) {
  return (
    <Modal
      title={
        seed
          ? "Restore the example workspace?"
          : "Start with a clean workspace?"
      }
      description="This permanently removes all projects, tasks, outputs, plans, and reviews."
      onClose={onClose}
    >
      <p className="form-note">
        {seed
          ? "A fresh set of sample projects will be created."
          : "Your empty workspace will be ready for your own goals."}{" "}
        This action cannot be undone.
      </p>
      <div className="modal-footer">
        <button className="button" onClick={onClose}>
          Keep my work
        </button>
        <button
          className="button danger"
          onClick={async () => {
            if (
              await save(
                { type: "reset", data: { seed } },
                seed
                  ? "Example workspace restored"
                  : "Your clean workspace is ready",
              )
            )
              onClose();
          }}
        >
          Confirm and {seed ? "restore" : "clear"}
        </button>
      </div>
    </Modal>
  );
}
