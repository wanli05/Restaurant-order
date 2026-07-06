const { test, expect } = require("@playwright/test");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");

async function enterDiningInfo(page, tableId = "1A", guestCount = "2") {
  await page.fill("#guestCountInput", guestCount);
  await page.selectOption("#tableIdSelect", tableId);
  await page.click("#enterOrderingBtn");
}

test.describe("E2E exception cases", () => {
  test.beforeEach(async ({ request }) => {
    resetRuntimeDataForTests();
    const login = await request.post("/auth/login", {
      data: { username: "Test12345", password: "Test12345" },
    });
    const { token } = await login.json();
    await request.post("/business/start", {
      headers: { "x-admin-token": token },
      data: {},
    });
  });

  test("重复点击下单不应导致崩溃", async ({ page }) => {
    await page.goto("/index.html");
    await enterDiningInfo(page, "1A", "2");
    await page.locator(".menu-item button:has-text('+')").first().click();
    await page.click("#tabCartBtn");
    await page.dblclick("#submitOrderBtn");
    await expect(page.locator("#uiAlertModal")).toBeVisible();
  });

  test("网络断开时前台应给出错误反馈", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/index.html");
    await enterDiningInfo(page, "1A", "2");
    await page.locator(".menu-item button:has-text('+')").first().click();
    await page.click("#tabCartBtn");
    await page.click("#submitOrderBtn");
    await page.click("#uiAlertOkBtn");
    await page.click("#tabOrdersBtn");
    await expect(page.locator("#checkoutFloatingBtn")).toBeEnabled();
    await page.context().setOffline(true);
    await page.click("#checkoutFloatingBtn");
    await expect(page.locator("#uiAlertModal")).toBeVisible();
    await context.close();
  });
});
