import { test, expect } from "@playwright/test";

test("checklist progress changes without completing the task and rolls up to its project", async ({
  page,
  request,
}) => {
  await request.post("/api/workspace", {
    data: { type: "reset", data: { seed: true } },
  });
  await page.goto("/tasks");
  await page
    .getByRole("button", {
      name: "Open Implement project and task management",
      exact: true,
    })
    .click();
  const panel = page.getByRole("region", { name: "Task subtasks" });
  const bar = panel.getByRole("progressbar");
  await panel
    .getByRole("textbox", { name: "New subtask" })
    .fill("Sketch the data flow");
  await panel.getByRole("button", { name: "Add subtask" }).click();
  const check = panel.getByRole("checkbox", { name: "Sketch the data flow" });
  await expect(check).toBeEnabled();
  await check.check();
  await expect(bar).toHaveAttribute("aria-valuenow", "100");
  await expect(
    page.getByRole("button", { name: "Mark complete", exact: true }),
  ).toBeVisible();
  await panel
    .getByRole("textbox", { name: "New subtask" })
    .fill("Build the endpoint");
  await panel.getByRole("button", { name: "Add subtask" }).click();
  await expect(bar).toHaveAttribute("aria-valuenow", "50");
  await check.uncheck();
  await expect(bar).toHaveAttribute("aria-valuenow", "0");
  await check.check();
  await expect(bar).toHaveAttribute("aria-valuenow", "50");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("progressbar", {
      name: "Implement project and task management subtask progress",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "50");
  await page.goto("/projects/p1");
  await expect(
    page.getByRole("progressbar", {
      name: "Build My Progress App subtask progress",
      exact: true,
    }),
  ).toHaveAttribute("aria-valuenow", "50");
  const workspace = await (await request.get("/api/workspace")).json();
  expect(
    workspace.tasks.find((t: { id: string }) => t.id === "t1").status,
  ).toBe("In Progress");
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", {
      name: "Open Implement project and task management",
      exact: true,
    })
    .click();
  await expect(
    panel.getByRole("textbox", { name: "New subtask" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Add subtask" }),
  ).toBeVisible();
});
