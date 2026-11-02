# Production deployment

- Main site: https://forma-progress.vercel.app/
- Platform: Vercel, project `forma-progress`.
- Project ID: `prj_2LVeoWAgRwqia9YVoPe5YP97f0r9`.
- Production source: the repository root (`src/`, `db/`, and `scripts/`). `hosted/forma/` is a separate, unpublished Sites edition and is not the main site.
- Verified deployment on 2026-10-28: `dpl_6S9ajQYuw4WCP43j26Y3PvzMF4jm`.

Vercel reported READY and assigned `forma-progress.vercel.app` to this deployment. It includes task notepads, simple subtask checklists, subtask-based task/project progress, equal Today task cards, and removal of primary deliverable selection and duration inputs.

The existing Turso connection and password protection were preserved. An unauthenticated request to the main URL returned the expected HTTP 401. Authenticated live UI and database checks were not performed; the local build, typecheck, and 24 tests passed before deployment.

Local edits and successful builds do not update production. Publish changes to this same Vercel project and verify both READY status and the main URL's assignment before reporting them as live. Normally run `vercel deploy --prod` from the repository root. This deployment used Vercel's authenticated deployment API because the CLI could not reach Vercel in the execution environment. It uploaded only application source/configuration; no local database or environment files were uploaded.

Preserve production environment variables and data. Additive schema initialization runs when the application opens its configured database; never reset or seed production to publish a UI change.

## Daily history deployment — 2026-10-30

- Production deployment: `dpl_DvU6XVt3snL96cqVfDUdEkzQTwzF`.
- Vercel reports `READY`, with `aliasAssigned: true` and `forma-progress.vercel.app` assigned.
- Adds daily date navigation, date-specific plans/reviews, carry-forward with retained task progress, and additive task progress history.
- Production build and all 26 unit/integration tests passed. An unauthenticated request returned the expected HTTP 401; authenticated live UI was not exercised.
- Existing production environment variables and database data were preserved. Only application source/configuration was uploaded.
- Refreshed CLI credentials are stored locally in ignored `.vercel/refreshed-auth.json`; do not upload or print this file.

## Compact date picker — 2026-10-30

Deployment `dpl_G9s5TJ5xBJgCVLHM2Vesp4a8mepq` is READY with `forma-progress.vercel.app` assigned. The daily date input is now 150px wide with 13px text and reduced padding. Production build passed.

## Daily subtask summary — 2026-10-30

Deployment `dpl_6fiEx4w5cWTg7yjJejHx4PMGzLNw` is READY with `forma-progress.vercel.app` assigned. “A little further along” now includes the planned tasks’ subtask completion count, percentage, and progress bar. Past dates use recorded checklist snapshots. Production build and targeted lint passed.
