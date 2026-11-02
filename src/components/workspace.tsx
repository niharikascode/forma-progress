"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Flag,
  Folder,
  FolderOpen,
  ListTodo,
  Menu,
  NotebookPen,
  Plus,
  Search,
  Settings2,
  LogOut,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge, Bar } from "./ui";
import WorkspaceDialog, { type ModalState } from "./dialogs";
import { ChecklistProgress } from "./subtasks";
import {
  dateKey,
  progress,
  subtaskProgress,
  type Workspace,
  type Task,
  type Project,
} from "@/lib/types";
import type { Action } from "@/lib/validation";
import { logout } from "@/app/(auth)/actions";
const nav = [
  { href: "/app", label: "Today", icon: Sun },
  { href: "/app/projects", label: "Projects", icon: FolderOpen },
  { href: "/app/tasks", label: "All tasks", icon: ListTodo },
  { href: "/app/progress", label: "Progress", icon: ChartNoAxesCombined },
  { href: "/app/reviews", label: "Daily reviews", icon: BookOpen },
];
export default function WorkspaceApp({
  initial,
  account,
}: {
  initial: Workspace;
  account: { name: string; email: string };
}) {
  const [data, setData] = useState(initial);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    error?: boolean;
  } | null>(null);
  const [mobile, setMobile] = useState(false);
  const pathname = usePathname();
  const section = pathname.split("/")[2] || "today";
  const projectId = pathname.split("/")[3];
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (modal) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setModal({ kind: "search" });
      }
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [modal]);
  async function save(action: Action, message = "Saved") {
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
        // Never leave "Saving…" spinning if the server stops responding.
        signal: AbortSignal.timeout(20000),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Could not save.");
      setData(result);
      setToast({ message });
      return true;
    } catch (error) {
      setToast({
        message:
          error instanceof DOMException && error.name === "TimeoutError"
            ? "Saving took too long. Check your connection and try again."
            : error instanceof Error
              ? error.message
              : "Could not save. Please try again.",
        error: true,
      });
      return false;
    }
  }
  async function start(task: Task) {
    if (task.status === "Ready" || task.status === "Backlog") {
      if (
        !(await save(
          { type: "status", data: { id: task.id, status: "In Progress" } },
          "One task. One meaningful outcome.",
        ))
      )
        return;
    }
    setModal({ kind: "execute", task });
  }
  const pageLabel =
    nav.find((n) => n.href === `/app/${section}`)?.label ||
    (section === "today"
      ? "Today"
      : section === "settings"
        ? "Settings"
        : "Projects");
  const common = { data, open: setModal, start };
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Link href="/app" className="brand">
          <span className="brand-mark">
            <span />
            <span />
            <span />
          </span>
          forma<span className="brand-dot">.</span>
        </Link>
        <button
          className="workspace-switch"
          onClick={() => setModal({ kind: "search" })}
        >
          <span className="workspace-avatar">M</span>
          <span>
            My workspace<small>Personal space</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <Link
              onClick={() => setMobile(false)}
              href={n.href}
              key={n.href}
              className={`nav-link ${(section === "today" && n.href === "/app") || n.href === `/app/${section}` ? "active" : ""}`}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.href === "/app" && (
                <span className="nav-count">
                  {
                    data.planItems.filter(
                      (i) =>
                        i.planId ===
                          data.plans.find((p) => p.date === dateKey())?.id &&
                        data.tasks.find((t) => t.id === i.taskId)?.status !==
                          "Done",
                    ).length
                  }
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="nav-label projects-label">
          YOUR PROJECTS
          <button
            aria-label="Create project"
            onClick={() => setModal({ kind: "project" })}
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="sidebar-projects">
          {data.projects.slice(0, 5).map((p) => (
            <Link
              key={p.id}
              href={`/app/projects/${p.id}`}
              onClick={() => setMobile(false)}
            >
              <i className={`project-dot dot-${p.color}`} />
              <span>{p.name}</span>
            </Link>
          ))}
          <button onClick={() => setModal({ kind: "project" })}>
            <Plus size={14} />
            New project
          </button>
        </div>
        <div className="sidebar-bottom">
          <div className="philosophy">
            <span className="philosophy-icon">
              <TrendingUp size={19} />
            </span>
            <strong>Small steps. Real progress.</strong>
            <p>
              Focus on what you create,
              <br />
              not how long you work.
            </p>
          </div>
          <Link
            href="/app/settings"
            className={`nav-link ${section === "settings" ? "active" : ""}`}
          >
            <Settings2 size={17} />
            <span>Settings</span>
          </Link>
          <div className="profile">
            <div className="profile-avatar">
              {initials(account.name || account.email)}
            </div>
            <div className="profile-text">
              <strong>{account.name || "My workspace"}</strong>
              <small title={account.email}>{account.email}</small>
            </div>
            <form action={logout}>
              <button
                className="profile-logout"
                aria-label="Log out"
                title="Log out"
              >
                <LogOut size={15} />
              </button>
            </form>
          </div>
        </div>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={12} />
            <strong>{pageLabel}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="search-button"
              onClick={() => setModal({ kind: "search" })}
            >
              <Search size={16} />
              <span>Quick search</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="topbar-divider" />
            <span className="private-badge">
              <span />
              Personal workspace
            </span>
          </div>
        </header>
        <main>
          {section === "today" ? (
            <Today {...common} save={save} />
          ) : section === "projects" ? (
            <Projects {...common} projectId={projectId} />
          ) : section === "tasks" ? (
            <Tasks {...common} />
          ) : section === "progress" ? (
            <Progress {...common} />
          ) : section === "reviews" ? (
            <Reviews {...common} />
          ) : section === "settings" ? (
            <Settings open={setModal} email={account.email} />
          ) : (
            <div className="empty-state">
              <FolderOpen />
              <h2>This page doesn’t exist.</h2>
              <Link href="/app" className="button primary">
                Back to today
              </Link>
            </div>
          )}
        </main>
        <footer className="page-footer">
          <span>A little more intentional. A little further along.</span>
          <span>
            Made for meaningful work <span className="footer-flower">✳</span>
          </span>
        </footer>
      </div>
      {modal && (
        <WorkspaceDialog
          key={`${modal.kind}-${"task" in modal ? modal.task?.id || "new" : ""}`}
          modal={
            // New tasks started while viewing a project belong to that project.
            modal.kind === "task" &&
            !modal.task &&
            !modal.projectId &&
            section === "projects" &&
            projectId
              ? { ...modal, projectId }
              : modal
          }
          data={data}
          onClose={() => setModal(null)}
          save={save}
          open={setModal}
        />
      )}
      {toast && (
        <div
          role={toast.error ? "alert" : "status"}
          className={`toast ${toast.error ? "toast-error" : ""}`}
        >
          {toast.error ? <Flag size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
type PageProps = {
  data: Workspace;
  open: (m: ModalState) => void;
  start: (t: Task) => void;
};
function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="page-eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{children}</div>
    </div>
  );
}
function Today({
  data,
  open,
  start,
  save,
}: PageProps & {
  save: (action: Action, message?: string) => Promise<boolean>;
}) {
  const today = dateKey();
  const [selectedDate, setSelectedDate] = useState(today);
  const [adding, setAdding] = useState<string | null>(null);
  const isToday = selectedDate === today;
  const isPast = selectedDate < today;
  const selectedDay = new Date(selectedDate + "T12:00:00");
  function changeDay(offset: number) {
    const day = new Date(selectedDate + "T12:00:00");
    day.setDate(day.getDate() + offset);
    setSelectedDate(dateKey(day));
  }
  const todayPlan = data.plans.find((p) => p.date === today);
  const todayIds = new Set(
    data.planItems
      .filter((i) => i.planId === todayPlan?.id)
      .map((i) => i.taskId),
  );
  async function addToToday(task: Task) {
    setAdding(task.id);
    await save(
      { type: "carryForward", data: { id: task.id, to: today } },
      "Added to today with your progress intact",
    );
    setAdding(null);
  }
  const plan = data.plans.find((p) => p.date === selectedDate);
  function historyFor(task: Task) {
    return data.taskHistory
      .filter(
        (h) =>
          h.taskId === task.id &&
          dateKey(new Date(h.recordedAt)) <= selectedDate,
      )
      .at(-1);
  }
  const items = data.planItems
    .filter((i) => i.planId === plan?.id)
    .sort((a, b) => a.position - b.position);
  const planned = items
    .map((i) => data.tasks.find((t) => t.id === i.taskId))
    .filter((t): t is Task => !!t);
  const done = planned.filter((t) =>
    isPast
      ? historyFor(t)?.status === "Done" ||
        (!historyFor(t) &&
          !!t.completedAt &&
          dateKey(new Date(t.completedAt)) <= selectedDate)
      : t.status === "Done",
  );
  const outputs = data.outputs.filter(
    (o) => dateKey(new Date(o.createdAt)) === selectedDate,
  );
  const percent = planned.length
    ? Math.round((done.length / planned.length) * 100)
    : 0;
  const dailySubtasks = isPast
    ? planned.flatMap((task) => historyFor(task)?.subtasks ?? [])
    : data.subtasks;
  const plannedIds = planned.map((task) => task.id);
  const checklist = subtaskProgress(dailySubtasks, plannedIds);
  return (
    <>
      <PageHeading
        eyebrow={selectedDay
          .toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })
          .toUpperCase()}
        title="Good things start with a little focus."
        description="You don’t have to do it all. Just move the right things forward."
      >
        <button
          className="button"
          onClick={() => open({ kind: "plan", date: selectedDate })}
        >
          <CalendarDays size={16} />
          Edit daily plan
        </button>
        <button
          className="button primary"
          onClick={() => open({ kind: "task" })}
        >
          <Plus size={17} />
          New task
        </button>
      </PageHeading>
      <nav className="day-navigation" aria-label="Daily plan dates">
        <button
          className="button"
          aria-label="Previous day"
          onClick={() => changeDay(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          aria-label="View date"
          value={selectedDate}
          onChange={(e) => {
            if (e.target.value) setSelectedDate(e.target.value);
          }}
        />
        <button
          className="button"
          aria-label="Next day"
          onClick={() => changeDay(1)}
        >
          <ChevronRight size={18} />
        </button>
        <button
          className="button"
          disabled={isToday}
          onClick={() => setSelectedDate(today)}
        >
          Today
        </button>
      </nav>
      <div className="daily-intro">
        <div className="today-title">
          <Sun size={19} />
          <h2>{isToday ? "Your focus today" : "Your daily plan"}</h2>
          <span>{planned.length} tasks planned</span>
        </div>
      </div>
      <div className="today-grid">
        <div className="today-main">
          <div className="today-task-list">
            {planned.map((task) => {
              const project = data.projects.find(
                (p) => p.id === task.projectId,
              );
              const history = isPast ? historyFor(task) : undefined;
              return (
                <section className="today-task-card card" key={task.id}>
                  <div className="today-task-top">
                    <Link href={`/app/projects/${task.projectId}`}>
                      {project?.name}
                    </Link>
                  </div>
                  <button
                    className="today-task-title"
                    onClick={() => open({ kind: "execute", task })}
                  >
                    <h3>{task.title}</h3>
                  </button>
                  {task.expectedOutput && <p>{task.expectedOutput}</p>}
                  {isPast && (
                    <p className="history-caption">
                      {history
                        ? `At the end of this day: ${history.status}`
                        : "Progress history unavailable for this date. Current progress shown below."}
                    </p>
                  )}
                  <ChecklistProgress
                    subtasks={history?.subtasks ?? data.subtasks}
                    taskIds={[task.id]}
                    label={`${task.title} subtask progress`}
                  />
                  <div className="today-task-actions">
                    <button
                      className="button"
                      onClick={() => open({ kind: "notepad", task })}
                    >
                      <NotebookPen size={15} />
                      Notepad
                    </button>
                    {!isPast && task.status !== "Done" && (
                      <button
                        className="button"
                        aria-label={`Reschedule ${task.title}`}
                        onClick={() => open({ kind: "reschedule", task })}
                      >
                        <CalendarDays size={15} />
                        Reschedule
                      </button>
                    )}
                    {isPast && task.status !== "Done" && (
                      <button
                        className="button primary"
                        disabled={todayIds.has(task.id) || adding !== null}
                        onClick={() => addToToday(task)}
                      >
                        {todayIds.has(task.id)
                          ? "Already in today"
                          : adding === task.id
                            ? "Adding…"
                            : "Add to today"}
                        <ArrowRight size={15} />
                      </button>
                    )}
                    <button
                      className="button primary"
                      onClick={() =>
                        isPast ? open({ kind: "execute", task }) : start(task)
                      }
                    >
                      {isPast
                        ? "View task"
                        : task.status === "Done"
                          ? "View output"
                          : task.status === "In Progress"
                            ? "Continue task"
                            : "Start this task"}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              );
            })}
            {!planned.length && (
              <section className="today-task-card card empty-state">
                <Sun size={30} />
                <h3>
                  {isToday
                    ? "What would you like to work on today?"
                    : "No tasks planned for this date"}
                </h3>
                <p>Choose the tasks you want to move forward together.</p>
                <button
                  className="button primary"
                  onClick={() => open({ kind: "plan", date: selectedDate })}
                >
                  Build your daily plan
                  <ArrowRight size={16} />
                </button>
              </section>
            )}
          </div>
        </div>
        <aside className="today-aside">
          <section className="day-progress card">
            <div className="section-heading">
              <h3>A little further along</h3>
              <TrendingUp size={17} />
            </div>
            <div
              className="progress-ring"
              style={{
                background: `conic-gradient(var(--green) ${percent}%, #edf0eb 0)`,
              }}
            >
              <div>
                <strong>
                  {done.length}
                  <span> / {planned.length}</span>
                </strong>
                <small>
                  {isPast ? "completed by this day" : "tasks completed"}
                </small>
              </div>
            </div>
            <div className="day-subtask-progress">
              <h4>
                {isPast ? "Recorded subtask progress" : "Subtask progress"}
              </h4>
              <ChecklistProgress
                subtasks={dailySubtasks}
                taskIds={plannedIds}
                label="Daily subtask progress"
              />
              {!checklist.total && (
                <p className="history-caption">
                  {isPast
                    ? "No subtasks recorded for this date."
                    : "Add subtasks to your planned tasks to track each small step."}
                </p>
              )}
            </div>
            {isPast && planned.some((task) => !historyFor(task)) && (
              <p className="history-caption">
                Some tasks predate progress tracking. Completion counts use
                recorded history and completion dates.
              </p>
            )}
            <p className="progress-caption">
              {done.length || checklist.done
                ? "Every completed task and small step moves you forward."
                : "Your next small step starts here."}
            </p>
            <div className="progress-stats">
              <div>
                <span className="stat-icon">
                  <CheckCheck size={17} />
                </span>
                <span>Outputs created</span>
                <strong>{outputs.length}</strong>
              </div>
              <div>
                <span className="stat-icon orange-icon">
                  <Target size={17} />
                </span>
                <span>Tasks remaining</span>
                <strong>{planned.length - done.length}</strong>
              </div>
            </div>
            <Link href="/app/progress" className="card-link">
              See your progress
              <ArrowRight size={14} />
            </Link>
          </section>
          <section className="review-card">
            <span className="review-illustration">
              <BookOpen size={23} />
              <span>✧</span>
            </span>
            <h3>Close the day with clarity.</h3>
            <p>
              A quick reflection on what you made,
              <br className="desktop-break" /> learned, and want to carry
              forward.
            </p>
            <button
              className="button"
              onClick={() => open({ kind: "review", date: selectedDate })}
            >
              {data.reviews.some((r) => r.date === selectedDate)
                ? "View daily reflection"
                : "Write a daily review"}
              <ArrowUpRight size={15} />
            </button>
            <span className="review-hint">
              A few minutes. A fresh perspective.
            </span>
          </section>
        </aside>
      </div>
      <section className="projects-overview">
        <div className="section-heading">
          <h3>
            The bigger picture{" "}
            <span className="subheading">Small outputs, bigger goals.</span>
          </h3>
          <Link className="text-button" href="/app/projects">
            All projects
            <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mini-project-grid">
          {data.projects.slice(0, 3).map((p) => (
            <MiniProject key={p.id} project={p} data={data} />
          ))}
          {!data.projects.length && (
            <button
              className="card new-project-card"
              onClick={() => open({ kind: "project" })}
            >
              <Plus size={22} />
              Create your first project
            </button>
          )}
        </div>
      </section>
      {done.length > 0 && (
        <section className="completed-today">
          <CheckCircle2 size={17} />
          <span>Already in the books</span>
          <button onClick={() => open({ kind: "execute", task: done[0] })}>
            {done[0].title}
          </button>
          <Badge color="green">Done</Badge>
        </section>
      )}
    </>
  );
}
function MiniProject({
  project: p,
  data,
}: {
  project: Project;
  data: Workspace;
}) {
  const tasks = data.tasks.filter((t) => t.projectId === p.id);
  return (
    <Link href={`/app/projects/${p.id}`} className="mini-project-card">
      <div>
        <span className={`project-icon icon-${p.color}`}>
          <Folder size={18} />
        </span>
        <Badge color={p.color}>{p.category}</Badge>
        <ArrowUpRight className="project-arrow" size={16} />
      </div>
      <h4>{p.name}</h4>
      <p>
        {data.milestones.find((m) => m.projectId === p.id)?.title ||
          "Your next meaningful goal"}
      </p>
      <ChecklistProgress
        subtasks={data.subtasks}
        taskIds={tasks.map((t) => t.id)}
        label={`${p.name} subtask progress`}
        color={p.color}
      />
    </Link>
  );
}
function Projects({
  data,
  open,
  start,
  projectId,
}: PageProps & { projectId?: string }) {
  const project = data.projects.find((p) => p.id === projectId);
  if (projectId && !project)
    return (
      <div className="empty-state">
        <FolderOpen />
        <h2>Project not found</h2>
        <Link href="/app/projects" className="button">
          All projects
        </Link>
      </div>
    );
  if (project) {
    const tasks = data.tasks.filter((t) => t.projectId === project.id);
    const stats = progress(tasks);
    return (
      <>
        <Link className="back-link" href="/app/projects">
          <ChevronLeft size={15} />
          All projects
        </Link>
        <PageHeading
          eyebrow={project.category.toUpperCase()}
          title={project.name}
          description={project.description}
        >
          <button
            className="button"
            onClick={() => open({ kind: "project", project })}
          >
            Edit project
          </button>
          <button
            className="button primary"
            onClick={() => open({ kind: "task", projectId: project.id })}
          >
            <Plus size={16} />
            New task
          </button>
        </PageHeading>
        <div className="project-summary card">
          <div>
            {project.targetDate && <span>Target: {project.targetDate}</span>}
          </div>
          <div>
            <strong>Subtask progress</strong>
            <span>
              {stats.done} of {stats.total} outputs delivered
            </span>
            <ChecklistProgress
              subtasks={data.subtasks}
              taskIds={tasks.map((t) => t.id)}
              label={`${project.name} subtask progress`}
              color={project.color}
            />
          </div>
        </div>
        <div className="section-heading">
          <h3>Milestones</h3>
          <button
            className="text-button"
            onClick={() => open({ kind: "milestone", projectId: project.id })}
          >
            <Plus size={15} />
            Add milestone
          </button>
        </div>
        <div className="milestone-grid">
          {data.milestones
            .filter((m) => m.projectId === project.id)
            .map((m) => {
              const s = progress(tasks.filter((t) => t.milestoneId === m.id));
              return (
                <div key={m.id} className="milestone-card card">
                  <div>
                    <Flag size={18} />
                    <h3>{m.title}</h3>
                    <Badge color={s.percent === 100 ? "green" : "gray"}>
                      {s.percent === 100 ? "Reached" : "In progress"}
                    </Badge>
                  </div>
                  <Bar value={s.percent} />
                  <small>
                    {s.done} of {s.total} tasks completed
                  </small>
                </div>
              );
            })}
        </div>
        <div className="section-heading">
          <h3>Actionable tasks</h3>
          <span>{tasks.length} tasks</span>
        </div>
        <TaskTable tasks={tasks} data={data} open={open} start={start} />
      </>
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="THE BIGGER PICTURE"
        title="Good work starts with a clear direction."
        description="A home for your goals, and the small steps that get you there."
      >
        <button
          className="button primary"
          onClick={() => open({ kind: "project" })}
        >
          <Plus size={16} />
          New project
        </button>
      </PageHeading>
      <div className="project-grid">
        {data.projects.map((p) => (
          <div className="full-project-card card" key={p.id}>
            <MiniProject project={p} data={data} />
            <p>{p.description}</p>
            <div className="full-project-next">
              <span>NEXT STEP</span>
              <button
                onClick={() => {
                  const t = data.tasks.find(
                    (t) => t.projectId === p.id && t.status !== "Done",
                  );
                  if (t) open({ kind: "execute", task: t });
                  else open({ kind: "task", projectId: p.id });
                }}
              >
                {data.tasks.find(
                  (t) => t.projectId === p.id && t.status !== "Done",
                )?.title || "Define the next meaningful output"}
                <ArrowRight size={15} />
              </button>
            </div>
            <div className="full-project-footer">
              <button
                className="text-button"
                onClick={() => open({ kind: "project", project: p })}
              >
                Edit project
              </button>
            </div>
          </div>
        ))}
        <button
          className="new-project-card"
          onClick={() => open({ kind: "project" })}
        >
          <span>
            <Plus size={22} />
          </span>
          <strong>Make room for a new goal</strong>
          <p>Create a project and take the first step.</p>
        </button>
      </div>
    </>
  );
}
function TaskTable({
  tasks,
  data,
  open,
  start,
}: PageProps & { tasks: Task[] }) {
  return (
    <div className="tasks-table card">
      <div className="table-header">
        <span>TASK & EXPECTED OUTPUT</span>
        <span />
      </div>
      {tasks.map((t) => (
        <div className="table-row" key={t.id}>
          <button
            className="table-task"
            onClick={() => open({ kind: "execute", task: t })}
          >
            <span
              className={`task-checkbox ${t.status === "Done" ? "checked" : ""}`}
            >
              {t.status === "Done" && <Check size={12} />}
            </span>
            <div>
              <strong>{t.title}</strong>
              <ChecklistProgress
                subtasks={data.subtasks}
                taskIds={[t.id]}
                label={`${t.title} subtask progress`}
              />
              <small>
                <i
                  className={`project-dot dot-${data.projects.find((p) => p.id === t.projectId)?.color}`}
                />
                {data.projects.find((p) => p.id === t.projectId)?.name} ·{" "}
                {t.expectedOutput || "Define an expected output"}
              </small>
            </div>
          </button>
          <div className="table-actions">
            <button
              className="icon-button task-notepad-button"
              title="Task notepad"
              aria-label={`Notepad for ${t.title}`}
              onClick={() => open({ kind: "notepad", task: t })}
            >
              <NotebookPen size={17} />
            </button>
            {t.status !== "Done" && (
              <>
                <button
                  className="icon-button task-edit-button"
                  title="Edit task"
                  aria-label={`Edit ${t.title}`}
                  onClick={() => open({ kind: "task", task: t })}
                >
                  <Ellipsis size={17} />
                </button>
                <button
                  className="icon-button"
                  title="Reschedule"
                  aria-label={`Reschedule ${t.title}`}
                  onClick={() => open({ kind: "reschedule", task: t })}
                >
                  <CalendarDays size={15} />
                </button>
              </>
            )}
            <button
              className="icon-button"
              title={t.status === "Done" ? "View output" : "Start task"}
              aria-label={`Open ${t.title}`}
              onClick={() => start(t)}
            >
              <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
      ))}
      {!tasks.length && (
        <div className="empty-state">
          <ListTodo size={28} />
          <h3>A little room for possibility.</h3>
          <p>Create a task with a clear output to get started.</p>
          <button className="button" onClick={() => open({ kind: "task" })}>
            <Plus size={15} />
            New task
          </button>
        </div>
      )}
    </div>
  );
}
function Tasks({ data, open, start }: PageProps) {
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("all");
  const tasks = data.tasks.filter(
    (t) =>
      (project === "all" || t.projectId === project) &&
      `${t.title} ${t.expectedOutput}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="ONE CLEAR STEP AT A TIME"
        title="A place for every next step."
        description="Turn good intentions into concrete, achievable outputs."
      >
        <button className="button" onClick={() => open({ kind: "plan" })}>
          <CalendarDays size={16} />
          Plan your day
        </button>
        <button
          className="button primary"
          onClick={() => open({ kind: "task" })}
        >
          <Plus size={16} />
          New task
        </button>
      </PageHeading>
      <div className="task-toolbar">
        <div className="input-icon">
          <Search size={16} />
          <input
            aria-label="Search tasks"
            placeholder="Find a task…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Filter by project"
          value={project}
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="all">All projects</option>
          {data.projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <TaskTable tasks={tasks} data={data} open={open} start={start} />
    </>
  );
}
function Progress({ data, open }: PageProps) {
  const [period, setPeriod] = useState("week");
  const today = dateKey();
  const week = new Date();
  week.setDate(week.getDate() - 6);
  week.setHours(0, 0, 0, 0);
  const outputs = data.outputs.filter(
    (o) =>
      period === "all" ||
      (period === "today"
        ? dateKey(new Date(o.createdAt)) === today
        : new Date(o.createdAt) >= week),
  );
  const done = data.tasks.filter((t) => t.status === "Done");
  const reached = data.milestones.filter((m) => {
    const ts = data.tasks.filter((t) => t.milestoneId === m.id);
    return ts.length && ts.every((t) => t.status === "Done");
  });
  const active = data.projects;
  return (
    <>
      <PageHeading
        eyebrow="PROOF OF PROGRESS"
        title="Look at what you’ve moved forward."
        description="Real outputs. Meaningful milestones. A clearer view of the bigger picture."
      >
        <div className="segmented">
          {[
            ["today", "Today"],
            ["week", "This week"],
            ["all", "All time"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={period === v ? "selected" : ""}
              onClick={() => setPeriod(v)}
            >
              {l}
            </button>
          ))}
        </div>
      </PageHeading>
      <div className="metric-grid">
        <div className="card metric">
          <span>
            <CheckCheck size={18} />
            Outputs recorded
          </span>
          <strong>{outputs.length}</strong>
          <p>
            {period === "week"
              ? "Over the last 7 days"
              : period === "today"
                ? "Created today"
                : "Across your workspace"}
          </p>
        </div>
        <div className="card metric">
          <span>
            <Flag size={18} />
            Milestones reached
          </span>
          <strong>{reached.length}</strong>
          <p>All tasks in the milestone completed</p>
        </div>
        <div className="card metric">
          <span>
            <FolderOpen size={18} />
            Tasks still ahead
          </span>
          <strong>{data.tasks.length - done.length}</strong>
          <p>Clear opportunities to move forward</p>
        </div>
      </div>
      <div className="progress-page-grid">
        <section className="card output-timeline">
          <div className="section-heading">
            <h3>Your output journal</h3>
            <Badge color="green">{outputs.length} outputs</Badge>
          </div>
          {outputs.map((o) => {
            const task = data.tasks.find((t) => t.id === o.taskId);
            const project = data.projects.find((p) => p.id === task?.projectId);
            return (
              <div className="timeline-item" key={o.id}>
                <span className="timeline-check">
                  <Check size={13} />
                </span>
                <div>
                  <small>
                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                  <button
                    onClick={() => task && open({ kind: "execute", task })}
                  >
                    <h4>{o.note}</h4>
                  </button>
                  <p>
                    <i className={`project-dot dot-${project?.color}`} />
                    {project?.name}
                    <span>·</span>
                    {task?.title}
                  </p>
                  {o.artifact &&
                    (/^https?:\/\//.test(o.artifact) ? (
                      <a
                        href={o.artifact}
                        target="_blank"
                        rel="noreferrer"
                        className="artifact-link"
                      >
                        View artifact
                        <ArrowUpRight size={13} />
                      </a>
                    ) : (
                      <small>{o.artifact}</small>
                    ))}
                </div>
              </div>
            );
          })}
          {!outputs.length && (
            <div className="empty-state">
              <Target size={27} />
              <h3>Your work will speak for itself.</h3>
              <p>Record your first output to start your journal.</p>
            </div>
          )}
        </section>
        <section className="card weekly-activity">
          <div className="section-heading">
            <h3>Small steps add up</h3>
            <ChartNoAxesCombined size={17} />
          </div>
          <p>Outputs created in the last 7 days</p>
          <div className="activity-chart">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - 6 + i);
              const key = dateKey(date);
              const count = data.outputs.filter(
                (o) => dateKey(new Date(o.createdAt)) === key,
              ).length;
              const max = Math.max(
                3,
                ...Array.from({ length: 7 }, (_, j) => {
                  const d = new Date();
                  d.setDate(d.getDate() - 6 + j);
                  return data.outputs.filter(
                    (o) => dateKey(new Date(o.createdAt)) === dateKey(d),
                  ).length;
                }),
              );
              return (
                <div key={key} className="chart-column">
                  <strong>{count || ""}</strong>
                  <div className="chart-space">
                    <span
                      style={{ height: `${Math.max(3, (count / max) * 100)}%` }}
                      title={`${count} outputs on ${key}`}
                    />
                  </div>
                  <small>
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </small>
                </div>
              );
            })}
          </div>
          <div className="activity-footnote">
            <Sparkles size={15} />
            Progress is what you make, not the time it takes.
          </div>
        </section>
      </div>
      <div className="section-heading">
        <h3>Where your projects stand</h3>
        <span>{active.length} projects</span>
      </div>
      <div className="project-progress-list">
        {active.map((p) => {
          const ts = data.tasks.filter((t) => t.projectId === p.id);
          const s = progress(ts);
          const recent = ts.some(
            (t) => t.completedAt && new Date(t.completedAt) >= week,
          );
          return (
            <Link
              href={`/app/projects/${p.id}`}
              className="card project-progress-row"
              key={p.id}
            >
              <span className={`project-icon icon-${p.color}`}>
                <Folder size={18} />
              </span>
              <div>
                <h4>{p.name}</h4>
                <p>{s.total - s.done} tasks remaining</p>
              </div>
              <Badge color={recent ? "green" : "orange"}>
                {recent ? "Moving forward" : "No outputs this week"}
              </Badge>
              <div>
                <ChecklistProgress
                  subtasks={data.subtasks}
                  taskIds={ts.map((t) => t.id)}
                  label={`${p.name} subtask progress`}
                  color={p.color}
                />
                <small>
                  {s.done} of {s.total} complete
                </small>
              </div>
              <ArrowUpRight size={17} />
            </Link>
          );
        })}
      </div>
      {reached.length > 0 && (
        <div className="reached-milestones">
          <h3>Milestones reached</h3>
          {reached.map((m) => (
            <Badge key={m.id} color="green">
              <Flag size={13} />
              {m.title}
            </Badge>
          ))}
        </div>
      )}
    </>
  );
}
function Reviews({ data, open }: PageProps) {
  return (
    <>
      <PageHeading
        eyebrow="PAUSE. NOTICE. MOVE FORWARD."
        title="A little reflection goes a long way."
        description="Keep the lessons, celebrate the outputs, and give tomorrow a clear starting point."
      >
        <button
          className="button primary"
          onClick={() => open({ kind: "review" })}
        >
          <Plus size={16} />
          Daily review
        </button>
      </PageHeading>
      {data.reviews.length ? (
        <div className="reviews-grid">
          {data.reviews.map((r) => (
            <button
              key={r.id}
              className="card review-entry"
              onClick={() => open({ kind: "review", review: r })}
            >
              <div>
                <BookOpen size={20} />
                <span>
                  {new Date(r.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
                <ArrowUpRight size={17} />
              </div>
              <h3>{r.learned || "A moment of clarity."}</h3>
              <p>{r.outputs || "No outputs noted."}</p>
              <span className="text-button">
                Read reflection
                <ArrowRight size={14} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state review-empty">
          <div className="empty-icon">
            <BookOpen size={32} />
          </div>
          <h2>Good work deserves a moment of reflection.</h2>
          <p>
            What did you make? What did you learn?
            <br />A few honest lines can make tomorrow a little clearer.
          </p>
          <button
            className="button primary"
            onClick={() => open({ kind: "review" })}
          >
            Write your first review
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
function initials(name: string) {
  return (
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "F"
  );
}
function Settings({
  open,
  email,
}: {
  open: (m: ModalState) => void;
  email: string;
}) {
  return (
    <>
      <PageHeading
        eyebrow="YOUR SPACE, YOUR PACE"
        title="Keep your workspace intentional."
        description="A simple, private home for the work that matters."
      />
      <section className="card settings-section">
        <div className="section-heading">
          <h3>Your workspace</h3>
          <Badge color="green">Private</Badge>
        </div>
        <div className="setting-row">
          <div>
            <h4>Signed in as {email}</h4>
            <p>
              Your projects, plans, outputs, and reflections are saved to your
              account and visible only to you.
            </p>
          </div>
          <form action={logout}>
            <button className="button">
              <LogOut size={14} /> Log out
            </button>
          </form>
        </div>
        <div className="setting-row">
          <div>
            <h4>Output-first by design</h4>
            <p>
              No mandatory timers, streaks, or productivity scores. Just
              meaningful work.
            </p>
          </div>
          <Target size={20} />
        </div>
      </section>
      <section className="card settings-section">
        <h3>Make it yours</h3>
        <div className="setting-row">
          <div>
            <h4>Start a clean workspace</h4>
            <p>Remove the example data and begin with your own goals.</p>
          </div>
          <button
            className="button"
            onClick={() => open({ kind: "reset", seed: false })}
          >
            Start fresh
          </button>
        </div>
        <div className="setting-row">
          <div>
            <h4>Restore example workspace</h4>
            <p>
              Replace all current work with a fresh set of realistic sample
              projects.
            </p>
          </div>
          <button
            className="button"
            onClick={() => open({ kind: "reset", seed: true })}
          >
            Restore examples
          </button>
        </div>
      </section>
    </>
  );
}
