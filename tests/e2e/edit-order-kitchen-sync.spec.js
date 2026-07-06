const { test, expect } = require("@playwright/test");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");
const { loginStaffExpectFinance } = require("../helpers/playwright-staff-login");

test.describe("E2E edit order -> kitchen sync", () => {
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

  test("已出菜项目追加数量后应回到厨房待出菜", async ({ browser, request }) => {
    const loginRes = await request.post("/auth/login", {
      data: { username: "Test12345", password: "Test12345" },
    });
    const { token } = await loginRes.json();

    const menuRes = await request.get("/api/menu");
    expect(menuRes.ok()).toBeTruthy();
    const menu = await menuRes.json();
    const menuId = Number(menu?.[0]?.id || 1);

    const place = await request.post("/order", {
      data: {
        tableId: "2B",
        guestCount: 2,
        items: [{ id: menuId, quantity: 1 }],
      },
    });
    expect(place.ok()).toBeTruthy();

    const kitchenBefore = await request.get("/kitchen", {
      headers: { "x-admin-token": token },
    });
    expect(kitchenBefore.ok()).toBeTruthy();
    const kitchenRows = await kitchenBefore.json();
    const targetOrder = kitchenRows.find((o) => o.tableId === "2B");
    expect(targetOrder).toBeTruthy();

    const markDone = await request.post("/order/item/status", {
      headers: { "x-admin-token": token },
      data: {
        orderId: Number(targetOrder.id),
        itemId: menuId,
        status: "done",
      },
    });
    expect(markDone.ok()).toBeTruthy();

    const editRes = await request.put(`/orders/${targetOrder.id}/items`, {
      headers: { "x-admin-token": token },
      data: { items: [{ id: menuId, quantity: 2 }] },
    });
    expect(editRes.ok()).toBeTruthy();

    const context = await browser.newContext();
    const kitchen = await context.newPage();
    await loginStaffExpectFinance(kitchen, expect);
    await kitchen.goto("/kitchen.html");
    await expect(kitchen.locator("#active-orders")).toContainText("2B");
    await expect(kitchen.locator("#active-orders .item-btn.pending")).toHaveCount(1);

    await context.close();
  });
});

