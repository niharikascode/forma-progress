PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL CHECK(category IN ('Work','Learning','Research','Side Project','Personal')), status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Paused','Completed','Archived')), priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('High','Medium','Low')), targetDate TEXT, color TEXT NOT NULL DEFAULT 'green', createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS milestones (id TEXT PRIMARY KEY, projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, milestoneId TEXT REFERENCES milestones(id) ON DELETE SET NULL, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('High','Medium','Low')), status TEXT NOT NULL DEFAULT 'Backlog' CHECK(status IN ('Backlog','Ready','In Progress','Blocked','Done')), effort INTEGER NOT NULL DEFAULT 30 CHECK(effort > 0), dueDate TEXT, definition TEXT NOT NULL DEFAULT '', expectedOutput TEXT NOT NULL DEFAULT '', mandatory INTEGER NOT NULL DEFAULT 0, accepted INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', completionNotes TEXT NOT NULL DEFAULT '', artifact TEXT NOT NULL DEFAULT '', completedAt TEXT, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS task_dependencies (taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, dependsOnId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, PRIMARY KEY(taskId,dependsOnId), CHECK(taskId != dependsOnId));
CREATE TABLE IF NOT EXISTS daily_plans (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL, availableMinutes INTEGER NOT NULL DEFAULT 240 CHECK(availableMinutes > 0), UNIQUE(userId,date));
CREATE TABLE IF NOT EXISTS daily_plan_items (planId TEXT NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE, taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, position INTEGER NOT NULL, isPrimary INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(planId,taskId));
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_per_plan ON daily_plan_items(planId) WHERE isPrimary = 1;
CREATE TABLE IF NOT EXISTS task_outputs (id TEXT PRIMARY KEY, taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, note TEXT NOT NULL, artifact TEXT NOT NULL DEFAULT '', createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS daily_reviews (id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), date TEXT NOT NULL, outputs TEXT NOT NULL DEFAULT '', unfinished TEXT NOT NULL DEFAULT '', blockers TEXT NOT NULL DEFAULT '', learned TEXT NOT NULL DEFAULT '', nextActions TEXT NOT NULL DEFAULT '', UNIQUE(userId,date));
CREATE INDEX IF NOT EXISTS projects_user ON projects(userId);
CREATE INDEX IF NOT EXISTS tasks_project ON tasks(projectId);
CREATE INDEX IF NOT EXISTS tasks_milestone ON tasks(milestoneId);
CREATE INDEX IF NOT EXISTS tasks_completion ON tasks(completedAt);
CREATE INDEX IF NOT EXISTS outputs_task ON task_outputs(taskId);
CREATE TABLE IF NOT EXISTS task_notepads (taskId TEXT PRIMARY KEY REFERENCES tasks(id) ON DELETE CASCADE, scene TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS task_subtasks (id TEXT PRIMARY KEY, taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, title TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0 CHECK(completed IN (0,1)));
CREATE INDEX IF NOT EXISTS subtasks_task ON task_subtasks(taskId);

CREATE TABLE IF NOT EXISTS task_history (id INTEGER PRIMARY KEY AUTOINCREMENT, taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, recordedAt TEXT NOT NULL, status TEXT NOT NULL, subtasks TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS history_task_time ON task_history(taskId,recordedAt);

CREATE TABLE IF NOT EXISTS accounts (userId TEXT PRIMARY KEY REFERENCES users(id), email TEXT NOT NULL UNIQUE COLLATE NOCASE, passwordHash TEXT NOT NULL, createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS sessions (tokenHash TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), expiresAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(userId);
