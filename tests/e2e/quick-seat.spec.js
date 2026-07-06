const { test, expect } = require("@playwright/test");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");
const { loginStaffExpectFinance } = require("../helpers/playwright-staff-login");

test.describe("E2E quick seat flow", () => {
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

  test("空桌快速开台应跳转并自动进入点单状态", async ({ browser }) => {
    const context = await browser.newContext();
    const staff = await context.newPage();

    await loginStaffExpectFinance(staff, expect);
    await staff.goto("/admin.html");

    await staff.locator("#emptyTableList .empty-table-chip", { hasText: "1A" }).click();
    await expect(staff.locator("#quickSeatModal")).toHaveClass(/show/);
    await staff.fill("#quickSeatGuestInput", "3");
    await staff.click("#quickSeatConfirmBtn");
    await expect(staff.locator("#quickOrderModal")).toHaveClass(/show/);
    await expect(staff.locator("#quickOrderTitle")).toContainText("1A");

    const frame = staff.frameLocator("#quickOrderFrame");
    await expect(frame.locator("#entryGate")).toBeHidden();
    await expect(frame.locator("#tabOrderPanel")).toHaveClass(/active/);
    await expect(frame.locator("#diningMeta")).toContainText("1A");
    await expect(frame.locator("#diningMeta")).toContainText("3");

    await context.close();
  });

  test("开台冲突时应提示并留在后台页", async ({ browser, request }) => {
    const context = await browser.newContext();
    const staff = await context.newPage();

    await loginStaffExpectFinance(staff, expect);
    await staff.goto("/admin.html");
    await staff.locator("#emptyTableList .empty-table-chip", { hasText: "1B" }).click();
    await expect(staff.locator("#quickSeatModal")).toHaveClass(/show/);

    const menuRes = await request.get("/api/menu");
    const menu = await menuRes.json();
    const menuId = Number(menu?.[0]?.id || 1);
    const placeOrder = await request.post("/order", {
      data: {
        tableId: "1B",
        guestCount: 2,
        items: [{ id: menuId, quantity: 1 }],
      },
    });
    expect(placeOrder.ok()).toBeTruthy();

    await staff.fill("#quickSeatGuestInput", "2");
    await staff.click("#quickSeatConfirmBtn");
    await expect(staff.locator("#uiAlertModal")).toHaveClass(/show/);
    await expect(staff.locator("#uiAlertMessage")).toContainText(/该桌已被占用|このテーブルは既に使用中/);
    await expect(staff).toHaveURL(/admin\.html/);

    await context.close();
  });
});

