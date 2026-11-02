import { test, expect } from "@playwright/test";

test.setTimeout(120000);

test("draw, write, save, reopen, isolate task notepads and retain failed saves", async ({
  page,
  request,
}) => {
  await request.post("/api/workspace", {
    data: { type: "reset", data: { seed: true } },
  });
  await page.goto("/tasks");
  await page
    .getByRole("button", {
      name: "Notepad for Implement project and task management",
      exact: true,
    })
    .click();
  const editor = page.locator(".notepad-canvas");
  const canvas = editor.locator("canvas.interactive");
  await expect(canvas).toBeVisible({ timeout: 60000 });
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width * 0.45;
  const y = box.y + box.height * 0.4;
  await editor.getByTitle(/^Rectangle/).click();
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 140, y + 90, { steps: 8 });
  await page.mouse.up();
  await editor.getByTitle(/^Draw/).click();
  await page.mouse.move(x, y + 140);
  await page.mouse.down();
  await page.mouse.move(x + 90, y + 180, { steps: 10 });
  await page.mouse.up();
  await editor.getByTitle(/^Text/).click();
  await page.mouse.click(x, y + 240);
  await page.keyboard.type("Notes for this task");
  await page.keyboard.press("Escape");
  await expect(
    page.getByText("Unsaved changes", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save notepad", exact: true }).click();
  await expect(
    page.getByText("Saved to this task", { exact: true }),
  ).toBeVisible();
  const state = await (await request.get("/api/workspace")).json();
  const scene = JSON.parse(state.notepads[0].scene);
  expect(scene.elements.map((e: { type: string }) => e.type)).toEqual(
    expect.arrayContaining(["rectangle", "freedraw", "text"]),
  );
  expect(
    scene.elements.find((e: { type: string }) => e.type === "text").text,
  ).toBe("Notes for this task");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.reload();
  await page
    .getByRole("button", {
      name: "Notepad for Implement project and task management",
      exact: true,
    })
    .click();
  await expect(canvas).toBeVisible();
  await expect(
    page.getByText("Saved to this task", { exact: true }),
  ).toBeVisible();
  await editor.getByTitle(/^Rectangle/).click();
  await page.mouse.move(x + 180, y);
  await page.mouse.down();
  await page.mouse.move(x + 260, y + 80, { steps: 6 });
  await page.mouse.up();
  await page.route("**/api/workspace", async (route) => {
    if (route.request().method() === "POST")
      await route.fulfill({ status: 500, json: { error: "Test failure" } });
    else await route.continue();
  });
  await page.getByRole("button", { name: "Save notepad", exact: true }).click();
  await expect(page.getByText(/Could not save the notepad/)).toBeVisible();
  await page.unroute("**/api/workspace");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await expect(
    page.getByText("Save your notepad before closing?"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save and close", exact: true })
    .click();
  await expect(editor).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "Notepad for Practice TypeScript utility types",
      exact: true,
    })
    .click();
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Save notepad", exact: true }).click();
  await expect(
    page.getByText("Saved to this task", { exact: true }),
  ).toBeVisible();
  const finalState = await (await request.get("/api/workspace")).json();
  expect(
    JSON.parse(
      finalState.notepads.find((n: { taskId: string }) => n.taskId === "t2")
        .scene,
    ).elements,
  ).toHaveLength(0);
  expect(
    JSON.parse(
      finalState.notepads.find((n: { taskId: string }) => n.taskId === "t1")
        .scene,
    ).elements,
  ).toHaveLength(4);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Save notepad", exact: true }),
  ).toBeVisible();
  await expect(canvas).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
