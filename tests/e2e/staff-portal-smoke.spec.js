const { test, expect } = require("@playwright/test");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");

async function getStaffTokenFromApi(request) {
  const login = await request.post("/auth/login", {
    data: { username: "Test12345", password: "Test12345" },
  });
  expect(login.ok()).toBeTruthy();
  const body = await login.json();
  expect(typeof body.token).toBe("string");
  return body.token;
}

test.describe("Staff portal smoke (pre-shop)", () => {
  test.beforeEach(async () => {
    resetRuntimeDataForTests();
  });

  test("login.html: settings gear visible and About modal opens and closes", async ({ page }) => {
    await page.goto("/login.html");
    await expect(page.locator("#adminSettingsTrigger")).toBeVisible();
    await page.locator("#adminSettingsTrigger").click();
    await expect(page.locator("#adminSettingsMenu")).toHaveClass(/show/);
    await page.locator("#adminSettingsMenuAboutBtn").click();
    await expect(page.locator("#adminAboutModal")).toHaveClass(/show/);
    await page.locator("#adminAboutOkBtn").click();
    await expect(page.locator("#adminAboutModal")).not.toHaveClass(/show/);
  });

  test("authenticated pages expose settings gear", async ({ browser, request }) => {
    const token = await getStaffTokenFromApi(request);
    const paths = ["/kitchen.html", "/finance.html", "/recovery.html", "/admin.html"];

    for (const path of paths) {
      const context = await browser.newContext();
      await context.addInitScript((t) => {
        localStorage.setItem("staffToken", t);
        localStorage.setItem("staffLang", "zh");
      }, token);
      const page = await context.newPage();
      await page.goto(path);
      await expect(page.locator("#adminSettingsTrigger")).toBeVisible({ timeout: 30000 });
      await context.close();
    }
  });
});
