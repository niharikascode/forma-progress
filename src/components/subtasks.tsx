"use client";

import { useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { subtaskProgress, type Subtask } from "@/lib/types";
import type { Action } from "@/lib/validation";

export function ChecklistProgress({
  subtasks,
  taskIds,
  label,
  color = "green",
}: {
  subtasks: Subtask[];
  taskIds: string[];
  label: string;
  color?: string;
}) {
  const stats = subtaskProgress(subtasks, taskIds);
  return (
    <div className="checklist-progress">
      <div className="checklist-progress-label">
        <span>
          {stats.done} of {stats.total} subtasks done
        </span>
        <strong>{stats.percent}%</strong>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={stats.percent}
        aria-valuetext={`${stats.done} of ${stats.total} subtasks done`}
      >
        <div
          className={`progress-fill fill-${color}`}
          style={{ width: `${stats.percent}%` }}
        />
      </div>
    </div>
  );
}

export default function Subtasks({
  taskId,
  subtasks,
  save,
}: {
  taskId: string;
  subtasks: Subtask[];
  save: (action: Action, message?: string) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const items = subtasks.filter((item) => item.taskId === taskId);

  async function update(action: Action) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const ok = await save(action, "Subtasks saved");
      if (!ok) setError("Could not save this change. Please try again.");
      return ok;
    } catch {
      setError("Could not save this change. Please try again.");
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="subtasks-panel" aria-label="Task subtasks">
      <h4>Subtasks</h4>
      <ChecklistProgress
        subtasks={subtasks}
        taskIds={[taskId]}
        label="Task subtask progress"
      />
      <p className="subtasks-help">
        Small steps to track your work. You decide when to mark the task
        complete.
      </p>
      {items.length > 0 && (
        <ul className="subtasks-list">
          {items.map((item) => (
            <li key={item.id}>
              <label className={item.completed ? "subtask-done" : ""}>
                <input
                  type="checkbox"
                  checked={item.completed === 1}
                  disabled={busy}
                  onChange={(event) =>
                    update({
                      type: "toggleSubtask",
                      data: {
                        taskId,
                        id: item.id,
                        completed: event.target.checked,
                      },
                    })
                  }
                />
                <span>{item.title}</span>
              </label>
              <button
                type="button"
                className="icon-button"
                aria-label={`Delete subtask ${item.title}`}
                disabled={busy}
                onClick={() =>
                  update({
                    type: "deleteSubtask",
                    data: { taskId, id: item.id },
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="subtask-add"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!title.trim()) return;
          if (
            await update({
              type: "addSubtask",
              data: { taskId, title: title.trim() },
            })
          )
            setTitle("");
        }}
      >
        <input
          aria-label="New subtask"
          placeholder="Add a small step…"
          maxLength={200}
          required
          value={title}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
        />
        <button
          className="button"
          type="submit"
          disabled={busy || !title.trim()}
        >
          <Plus size={15} />
          Add subtask
        </button>
      </form>
      {error && (
        <p className="subtask-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
