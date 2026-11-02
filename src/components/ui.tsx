"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Modal({
  title,
  description,
  children,
  onClose,
  wide = false,
  fullscreen = false,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  fullscreen?: boolean;
}) {
  return (
    <Dialog.Root
      open
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          className={`modal ${wide ? "modal-wide" : ""} ${fullscreen ? "modal-notepad" : ""}`}
          onEscapeKeyDown={
            fullscreen ? (event) => event.preventDefault() : undefined
          }
          onPointerDownOutside={
            fullscreen ? (event) => event.preventDefault() : undefined
          }
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              <Dialog.Description>
                {description || "Make your next step clear and actionable."}
              </Dialog.Description>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close dialog">
              <X size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Badge({
  children,
  color = "gray",
}: {
  children: ReactNode;
  color?: string;
}) {
  return <span className={`badge badge-${color}`}>{children}</span>;
}
export function Status({ status }: { status: string }) {
  return (
    <span
      className={`status status-${status.toLowerCase().replaceAll(" ", "-")}`}
    >
      <i />
      {status}
    </span>
  );
}
export function Bar({
  value,
  color = "green",
}: {
  value: number;
  color?: string;
}) {
  return (
    <div className="progress-track">
      <div
        className={`progress-fill fill-${color}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
