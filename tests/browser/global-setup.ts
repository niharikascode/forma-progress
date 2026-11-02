import { chromium, type FullConfig } from "@playwright/test";
// Sign up once, claiming the original workspace so fixture ids (p1, t1, …) stay stable.
export default async function globalSetup(config: FullConfig) {
  const { baseURL, storageState, launchOptions } = config.projects[0].use;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ baseURL });
  await page.goto("/signup");
  await page.locator("input[name=name]").fill("Browser test");
  await page
    .locator("input[name=email]")
    .fill(`browser-${Date.now()}@example.test`);
  await page.locator("input[name=password]").fill("browser-test-password");
  // In dev mode the toggle only works once React has hydrated; retry until it opens.
  const legacy = page.locator("input[name=legacyPassword]");
  for (let i = 0; i < 60 && !(await legacy.count()); i++) {
    await page
      .getByText("Moving over the original workspace?")
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.waitForTimeout(500);
  }
  await page.locator("input[name=legacyPassword]").fill("browser-test-legacy");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/app");
  await page.context().storageState({ path: storageState as string });
  await browser.close();
}
