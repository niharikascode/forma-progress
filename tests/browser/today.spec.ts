import { test, expect } from "@playwright/test";

test("Today presents equal parallel tasks without duration or primary selection", async ({
  page,
  request,
}) => {
  await request.post("/api/workspace", {
    data: { type: "reset", data: { seed: true } },
  });
  await page.goto("/app");
  await expect(page.locator(".today-task-card")).toHaveCount(5);
  await expect(
    page.getByText("PRIMARY DELIVERABLE", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/estimated remaining/)).toHaveCount(0);
  await page
    .locator(".today-task-card")
    .filter({ hasText: "Implement project and task management" })
    .getByRole("button", { name: "Start this task", exact: true })
    .click();
  await expect(page.getByText(/min estimate/)).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page
    .locator(".today-task-card")
    .filter({ hasText: "Practice TypeScript utility types" })
    .getByRole("button", { name: "Start this task", exact: true })
    .click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue task", exact: true }),
  ).toHaveCount(2);
  await page
    .getByRole("button", { name: "Edit daily plan", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Set primary" })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Available minutes")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Save daily plan", exact: true })
    .click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await expect(page.getByLabel("Estimated minutes")).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("browse daily plans and continue earlier work in today without losing history", async ({
  page,
  request,
}) => {
  const response = await request.post("/api/workspace", {
    data: { type: "reset", data: { seed: true } },
  });
  const workspace = await response.json();
  const task = workspace.tasks.find(
    (t: { status: string }) => t.status !== "Done",
  );
  const today = workspace.plans[0].date;
  const previous = new Date(today + "T12:00:00");
  previous.setDate(previous.getDate() - 1);
  const yesterday = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}-${String(previous.getDate()).padStart(2, "0")}`;
  await request.post("/api/workspace", {
    data: { type: "plan", data: { date: today, taskIds: [] } },
  });
  await request.post("/api/workspace", {
    data: { type: "plan", data: { date: yesterday, taskIds: [task.id] } },
  });
  await page.goto("/app");
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(page.getByLabel("View date")).toHaveValue(yesterday);
  await expect(page.locator(".today-task-title")).toHaveText(task.title);
  await page.getByRole("button", { name: "Add to today", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Already in today" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Edit daily plan", exact: true })
    .click();
  await expect(page.getByLabel("Plan for", { exact: true })).toHaveValue(
    yesterday,
  );
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Next day", exact: true }).click();
  await expect(page.getByLabel("View date")).toHaveValue(today);
  await expect(page.locator(".today-task-title")).toHaveText(task.title);
  await page.reload();
  await page.getByRole("button", { name: "Previous day", exact: true }).click();
  await expect(page.locator(".today-task-title")).toHaveText(task.title);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
