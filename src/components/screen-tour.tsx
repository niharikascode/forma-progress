"use client";
import Image from "next/image";
import { useState } from "react";

const screens = [
  {
    id: "project",
    label: "Projects",
    title: "See every project at a glance",
    text: "Milestones and tasks roll up into one progress bar, worked out from the steps you’ve actually finished.",
    alt: "Forma project page showing milestone progress and actionable tasks",
  },
  {
    id: "progress",
    label: "Progress",
    title: "Keep a record of what you made",
    text: "Your output journal lists everything you’ve shipped, and a weekly chart shows the small steps adding up.",
    alt: "Forma progress page with output journal and a seven-day chart",
  },
  {
    id: "notepad",
    label: "Notepad",
    title: "Think it through on the task itself",
    text: "Every task has its own sketch canvas for diagrams, notes and arrows. It’s saved right next to the work.",
    alt: "Forma task notepad with a hand-drawn diagram of projects, tasks and subtasks",
  },
] as const;

export function ScreenTour() {
  const [active, setActive] =
    useState<(typeof screens)[number]["id"]>("project");
  const current = screens.find((s) => s.id === active)!;
  return (
    <div className="tour">
      <div className="tour-tabs" role="tablist" aria-label="Forma screens">
        {screens.map((s) => (
          <button
            key={s.id}
            role="tab"
            id={`tab-${s.id}`}
            aria-selected={s.id === active}
            aria-controls="tour-panel"
            className={s.id === active ? "active" : ""}
            onClick={() => setActive(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div
        className="tour-panel"
        id="tour-panel"
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
      >
        <div className="tour-copy">
          <h3>{current.title}</h3>
          <p>{current.text}</p>
        </div>
        <div className="frame">
          <div className="frame-bar" aria-hidden>
            <span />
            <span />
            <span />
            <em>forma-progress.vercel.app</em>
          </div>
          {screens.map((s) => (
            <Image
              key={s.id}
              src={`/screens/${s.id}.webp`}
              alt={s.alt}
              width={2400}
              height={1500}
              sizes="(max-width: 1120px) 100vw, 1072px"
              className={s.id === active ? "shown" : "hidden"}
              aria-hidden={s.id !== active}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
