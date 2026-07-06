const { test, expect } = require("@playwright/test");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");

async function enterDiningInfo(page, tableId = "1A", guestCount = "2") {
  await page.fill("#guestCountInput", guestCount);
  await page.selectOption("#tableIdSelect", tableId);
  await page.click("#enterOrderingBtn");
}

test.describe("面类：前台展示 → 下单 → 后厨 → 后台结账", () => {
  test.beforeEach(async ({ request }) => {
    resetRuntimeDataForTests();
    const login = await request.post("/auth/login", {
      data: { username: "Test12345", password: "Test12345" },
    });
    expect(login.ok()).toBeTruthy();
    const { token } = await login.json();
    const start = await request.post("/business/start", {
      headers: { "x-admin-token": token },
      data: {},
    });
    expect(start.ok()).toBeTruthy();
  });

  test("切换麺類后首条为麻辣烫并完成链路", async ({ browser }) => {
    const context = await browser.newContext();
    const guest = await context.newPage();
    const staff = await context.newPage();
    const kitchen = await context.newPage();

    await staff.goto("/login.html");
    await staff.fill("#username", "Test12345");
    await staff.fill("#password", "Test12345");
    await staff.click("#loginBtn");
    await expect(staff).toHaveURL(/finance\.html/);

    await guest.goto("/index.html");
    await enterDiningInfo(guest, "1A", "2");
    await expect(guest.locator("#diningMeta")).toContainText("1A");

    await guest.getByRole("button", { name: "麺類" }).click();
    const firstRow = guest.locator(".menu-items-pane .menu-item").first();
    await expect(firstRow).toContainText("マーラータン");

    await firstRow.locator("button").filter({ hasText: "+" }).click();
    await guest.click("#tabCartBtn");
    await expect(guest.locator("#cartTotalAmount")).not.toHaveText("¥0");
    await guest.click("#submitOrderBtn");
    await guest.click("#uiAlertOkBtn");

    await guest.click("#tabOrdersBtn");
    await expect(guest.locator("#ordersActionBar")).toHaveClass(/show/);
    await expect(guest.locator("#ordersTotalAmount")).not.toHaveText("¥0");

    await guest.click("#checkoutFloatingBtn");
    await guest.click("#uiAlertOkBtn");

    await kitchen.goto("/kitchen.html");
    await expect(kitchen.locator("#active-orders")).toContainText("1A");
    await kitchen.locator(".item-btn.pending").first().click();

    await staff.goto("/admin.html");
    await expect(staff.locator("#summary")).toContainText("1A");
    await staff.getByRole("button", { name: /入金確認|确认收款/ }).first().click();
    await expect(staff.locator("#uiAlertModal")).toHaveClass(/show/);
    await staff.click("#uiAlertOkBtn");
    await expect(staff.locator("#payMethodModal")).toHaveClass(/show/);
    await staff.click("#payMethodCashBtn");
    await staff.click("#uiAlertOkBtn");
    await expect(staff.locator("#history-list")).toContainText("1A");

    await context.close();
  });
});
