"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Task, Workspace } from "@/lib/types";
import type { Action } from "@/lib/validation";
import { Modal } from "./ui";

const NotepadCanvas = dynamic(() => import("./notepad-canvas"), {
  ssr: false,
  loading: () => <p className="notepad-loading">Loading drawing tools…</p>,
});

export default function NotepadDialog({
  task,
  notepad,
  save,
  onClose,
}: {
  task: Task;
  notepad?: Workspace["notepads"][number];
  save: (action: Action, message?: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [initialScene] = useState(notepad?.scene);
  const scene = useRef<string | null>(null);
  const savedScene = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [created, setCreated] = useState(!!notepad);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function persist(close = false) {
    if (!scene.current || busy) return;
    const snapshot = scene.current;
    setBusy(true);
    setError("");
    try {
      if (
        !(await save(
          { type: "notepad", data: { id: task.id, scene: snapshot } },
          "Task notepad saved",
        ))
      ) {
        setError(
          "Could not save the notepad. Your drawing is still here; please retry.",
        );
        return;
      }
      savedScene.current = snapshot;
      setCreated(true);
      setDirty(scene.current !== snapshot);
      setConfirmClose(false);
      if (close && scene.current === snapshot) onClose();
    } catch {
      setError(
        "Could not save the notepad. Your drawing is still here; please retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Task notepad"
      description={task.title}
      fullscreen
      onClose={() => {
        if (busy) return;
        if (dirty) setConfirmClose(true);
        else onClose();
      }}
    >
      <div className="notepad-toolbar">
        <span role="status">
          {busy
            ? "Saving…"
            : dirty
              ? "Unsaved changes"
              : created
                ? "Saved to this task"
                : "Draw, add text, or connect ideas with shapes."}
        </span>
        <button
          className="button primary"
          disabled={!ready || busy || (created && !dirty)}
          onClick={() => persist()}
        >
          Save notepad
        </button>
      </div>
      {error && (
        <p className="notepad-error" role="alert">
          {error}
        </p>
      )}
      {confirmClose && (
        <div className="notepad-confirm" role="alert">
          <span>Save your notepad before closing?</span>
          <button
            className="button"
            disabled={busy}
            onClick={() => setConfirmClose(false)}
          >
            Keep editing
          </button>
          <button className="button" disabled={busy} onClick={onClose}>
            Discard changes
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={() => persist(true)}
          >
            Save and close
          </button>
        </div>
      )}
      <div className="notepad-canvas">
        <NotepadCanvas
          initialScene={initialScene}
          onChange={(value) => {
            if (savedScene.current === null) savedScene.current = value;
            scene.current = value;
            setDirty(value !== savedScene.current);
            setReady(true);
          }}
        />
      </div>
      <p className="notepad-hint">
        V select · P draw · T text · R rectangle · O ellipse · A arrow ·
        Ctrl/Cmd+Z undo. Save to keep your notepad with this task.
      </p>
    </Modal>
  );
}
