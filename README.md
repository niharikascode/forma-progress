# Forma — meaningful progress

A desktop-first, responsive, single-user productivity workspace. Work on parallel tasks, track small steps, produce something concrete, and see how that work advances your projects. No timer or AI service is required.

## Run locally

Requires Node.js 22+ and npm. This checkout uses Next.js App Router, strict TypeScript, Tailwind CSS 4, Radix accessible dialogs, Lucide icons, Zod, and SQLite through `@libsql/client` (a local file, or a hosted Turso database).

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. On a brand-new database the app seeds examples automatically; explicit migrate/seed commands are also available. SQLite is saved to `.data/forma.sqlite`, outside source control. Refreshes and server restarts preserve records. Set `DATABASE_PATH` in the environment to change the location (the CLI scripts read process environment, not Next's `.env.local`). Back up the SQLite database with its WAL/SHM files while running, or stop the app and copy the database.

Settings → **Start fresh** clears example data after confirmation. **Restore examples** also requires confirmation and replaces current data. An intentionally cleared workspace remains empty on restart.

## What works

- Today: one list of equally presented tasks, subtask progress, completion counts, notepads, rescheduling, and quick task execution. No primary deliverable or duration estimates.
- Projects: create/edit, category, target date, milestones, tasks, and derived progress.
- Tasks: create/edit/delete unrecorded work, milestones, dependencies, due dates, notes, output artifacts, status changes, and explicit rescheduling.
- Subtasks: add short text steps inside a task, check/uncheck them, or delete them. Changes save immediately. Each task’s work progress is completed subtasks / total subtasks; project progress combines all subtasks across its tasks. No subtasks means 0%. Adding unfinished steps lowers progress. These bars never mark a task or project complete or block manual completion.
- Task notepads: open the notebook icon on any task row, or choose **Create notepad** inside a task. Draw, type text, add shapes and arrows, and use undo/redo with the embedded Excalidraw editor. **Save notepad** persists the canvas independently of task status; closing unsaved work offers save, discard, or keep editing. Each task has its own notepad, including completed tasks. Drawings are limited to 5 million JSON characters and 10,000 elements. The table is created automatically when the database opens. Drawing fonts are copied to `public/excalidraw/fonts` during `npm install` and served locally.
- Daily plans: any date, select the tasks to work on together, dependencies surfaced, save/revise without copying task records. No automatic carryover.
- Focus: open tasks, save working notes, record intermediate outputs, complete with output notes and an artifact reference. Use Save notes to persist unfinished working notes.
- Progress: filter output history by today / last seven days / all time, seven-day activity, milestone completion, project progress, remaining work and projects with no recent completions.
- Daily reviews: choose a date, prefilled completed/unfinished work, blockers, lessons, next actions, saved history and edits.
- Search: search task titles and outputs with the search button or Cmd/Ctrl+K.

### Example end-to-end workflow

The seed includes **Build My Progress App** → **MVP** → **Implement project and task management**, with a place in today's task list. Its prerequisite is already complete. Start it, write what you produced, and mark complete. Open Progress or the completed task to see its output; project and milestone percentages derive from the task records. Refresh to confirm persistence, then write a daily review.

You can also create the project and milestone yourself: Projects → New project → open the project → Add milestone → New task. Use Edit daily plan to select the tasks you want to work on together.

## Architecture

A modular monolith is appropriate for one person and one deployable service:

- `src/components/`: presentation, accessible dialogs, interaction state.
- `src/lib/types.ts`: domain types and pure progress/dependency helpers.
- `src/lib/validation.ts`: explicit discriminated Zod mutation contracts.
- `src/lib/database.ts`: normalized persistence and transactional domain operations.
- `src/app/api/workspace/route.ts`: server-only reads and validated mutations, consistent error responses and same-origin write checks.
- `db/001_initial.sql`: idempotent initial schema migration with foreign keys, checks, unique constraints and indexes.
- `scripts/database.ts`: migration and seed commands.
- `src/proxy.ts`: production access gate.

The initial migration runs idempotently when opening a connection. Future schema changes should be added as versioned migrations before production upgrades. Reads hydrate the workspace server-side; mutations return a fresh typed snapshot. This keeps the single-user app simple and consistent without a client cache framework. The service uses synchronous, transaction-scoped SQLite writes with WAL journaling.

The normalized relational model contains User, Project, Milestone, Task, TaskDependency, DailyPlan, DailyPlanItem, TaskOutput, and DailyReview. Plan membership is independent of task completion. Task/milestone membership is checked on writes. Priority, status selectors, definition of done, and task rationale are omitted from the UI. Legacy values remain stored; definition-of-done acceptance no longer gates completion. Dependencies must exist, cannot reference themselves or form cycles, and must be complete before starting or completing dependent work. Legacy duration and primary-selection columns are retained for database compatibility; the task and planning interfaces no longer use them. Repeated completion is idempotent. Records with outputs cannot be deleted through the task UI; reopening preserves prior output history. Task and project work progress comes from completed subtasks / total subtasks, independently of task status. A milestone is reached only when it has at least one task and all its tasks are complete.

### SQLite decision and PostgreSQL path

No PostgreSQL service or credentials were available. SQLite is a real durable relational database and keeps this local MVP runnable without external services. `@libsql/client` provides parameterized SQL and transactions; deletions remove child rows explicitly so they do not depend on foreign-key cascades. A PostgreSQL adapter/migration is **not** included. For a shared deployment, move this isolated persistence module to PostgreSQL (Prisma or another mature toolkit), port constraints/transactions, and add migration version tracking. Local files require a persistent writable disk and a single application instance. For serverless hosting (e.g. Vercel), set `DATABASE_URL` to a hosted libsql/Turso database and `DATABASE_AUTH_TOKEN` to its token; the same schema and code run against it via `@libsql/client`.

## Accounts, access and deployment

Forma has a public landing page at `/`, plus `/signup` and `/login`. Each account gets its own private workspace at `/app`. Every database read and write is scoped to the signed-in user, and the API returns 401 without a valid session.

- Passwords are hashed with scrypt (random salt per password). They are never stored in plain text.
- Sessions use a random 256-bit token in an `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production). Only a SHA-256 hash of the token is stored, in the `sessions` table. Sessions last 30 days, and logging out deletes them.
- `src/proxy.ts` does an optimistic cookie check and redirects old root-level links (`/projects`, …) to `/app/...`. The real session check happens on the server in the page and API route.
- New accounts start with example projects, which can be cleared in Settings → **Start fresh**.
- **Migrating the original single-user workspace:** while `APP_PASSWORD` is set and the original data has no owner yet, the sign-up page shows *"Moving over the original workspace?"*. Enter the old `APP_PASSWORD` there and the new account takes over the existing data. This works once. Remove `APP_PASSWORD` afterwards.

There is no password reset or email verification yet. Add rate limiting at the edge (for example, a Vercel Firewall rate-limit rule on `/login` and `/signup`) before promoting the site widely.

```bash
npm run build
npm run start
```

Store secrets in the deployment environment, not source control. Mount persistent storage at `DATABASE_PATH`. Build uses Webpack because this environment blocks Turbopack's build-worker socket. The supported `experimental.useTypeScriptCli=false` configuration uses the compiler API for build type checking, avoiding a subprocess-output issue in this environment. The app does not call an AI API. Typography uses Google Fonts with local sans-serif fallbacks; all core functionality works without font network access.

## Verification

```bash
npm run typecheck
npm run lint
npm run test
npm run format:check
npm run build
```

Vitest covers project creation/edit/archive, task and milestone association, status transitions, manual completion of legacy tasks, idempotent completion, output retention, direct and indirect dependency checks, plan validation, explicit rescheduling, reviews, seed/reset, and a complete project → milestone → task → plan → output → completion → review workflow with a file-backed database reopened to verify persistence.

A Playwright browser workflow is included separately:

```bash
npx playwright install chromium
npm run test:e2e
```

It launches an isolated app/database on port 3011 and exercises the UI, refresh persistence, and mobile overflow. Browser execution requires a host that permits Chromium and local sockets. See `VERIFICATION.md` for checks actually run in this environment.

## MVP limits

- SQLite local persistence rather than PostgreSQL; no multi-instance deployment.
- Single workspace with optional password gate rather than multi-user session authentication.
- Milestones can be created and viewed; renaming/deleting milestones is not implemented.
- No drag-and-drop ordering, notifications, recurring tasks, uploads, or external integrations.
- Edits to working notes are persisted with task actions; closing a focus dialog without saving an action discards unsaved text.
- Review date defaults and plan keys use the runtime's local date. Set the server timezone to your own for consistent auto-seeding. There is no per-user timezone setting yet.
