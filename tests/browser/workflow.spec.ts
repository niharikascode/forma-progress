import { test, expect } from "@playwright/test";
test("create, plan, execute, retain output, review, and respond on mobile", async ({
  page,
  request,
}) => {
  await request.post("/api/workspace", {
    data: { type: "reset", data: { seed: false } },
  });
  await page.goto("/projects");
  await page
    .getByRole("main")
    .getByRole("button", { name: "New project", exact: true })
    .click();
  await page.getByLabel("Project name").fill("Build My Progress App");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await page
    .getByRole("link")
    .filter({ hasText: "Build My Progress App" })
    .last()
    .click();
  await page.getByRole("button", { name: "Add milestone" }).click();
  await page.getByLabel("Milestone name").fill("MVP");
  await page.getByRole("button", { name: "Create milestone" }).click();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page
    .getByLabel("Task title")
    .fill("Implement project and task management");
  await page.getByLabel("Milestone · optional").selectOption({ label: "MVP" });
  for (const label of [
    "Priority",
    "Status",
    "Definition of done",
    "Why this matters",
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toHaveCount(0);
  }
  await page
    .getByLabel("Expected output", { exact: true })
    .fill("A working management flow");
  await page.getByRole("button", { name: "Create task", exact: true }).click();
  await page.goto("/app");
  await page.getByRole("button", { name: "Edit daily plan" }).click();
  await page
    .getByLabel("Include Implement project and task management")
    .check();
  await page.getByRole("button", { name: "Save daily plan" }).click();
  await page.getByRole("button", { name: "Start this task" }).click();
  await page
    .getByLabel("What did you produce?")
    .fill("Implemented persistent project and task management.");
  await expect(
    page.getByText("Definition of done", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText("WHY THIS MATTERS", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Save notes", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(
    page.getByRole("button", { name: "View output", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "View output", exact: true }).click();
  await expect(
    page.getByText("Implemented persistent project and task management.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/progress");
  await expect(
    page.getByText("1 of 1 complete", { exact: true }),
  ).toBeVisible();
  await page.goto("/reviews");
  await page.getByRole("button", { name: "Daily review", exact: true }).click();
  await page
    .getByLabel("What did you learn?")
    .fill("Clear outputs make progress visible.");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await page.reload();
  await expect(
    page.getByText("Clear outputs make progress visible."),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "All tasks", exact: true }),
  ).toBeVisible();
});
