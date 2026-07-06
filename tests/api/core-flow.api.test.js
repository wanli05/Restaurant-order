const request = require("supertest");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");
const { app } = require("../../server");

describe("Core API flow: order -> kitchen -> pay", () => {
  let token = "";
  let menuId = 1;
  const idemKey = `jest-pay-${Date.now()}`;

  beforeAll(async () => {
    resetRuntimeDataForTests();

    const login = await request(app).post("/auth/login").send({
      username: "Test12345",
      password: "Test12345",
    });
    token = login.body.token;

    await request(app)
      .post("/business/start")
      .set("x-admin-token", token)
      .send({});

    const menuRes = await request(app).get("/api/menu");
    menuId = Number(menuRes.body?.[0]?.id || 1);
  });

  test("place order and kitchen can receive", async () => {
    const placeOrder = await request(app).post("/order").send({
      tableId: "1A",
      guestCount: 2,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(placeOrder.status).toBe(200);

    const kitchen = await request(app)
      .get("/kitchen")
      .set("x-admin-token", token);
    expect(kitchen.status).toBe(200);
    expect(Array.isArray(kitchen.body)).toBe(true);
    expect(kitchen.body.some((o) => o.tableId === "1A")).toBe(true);
  });

  test("checkout request then pay succeeds", async () => {
    const checkout = await request(app).post("/checkout").send({ tableId: "1A" });
    expect(checkout.status).toBe(200);

    const pay = await request(app)
      .post("/pay")
      .set("x-admin-token", token)
      .set("x-idempotency-key", idemKey)
      .send({ tableId: "1A", paymentMethod: "cash" });
    expect(pay.status).toBe(200);
  });

  test("exclude unfinished with zero payable should auto delete orders", async () => {
    const placePendingOnly = await request(app).post("/order").send({
      tableId: "2A",
      guestCount: 2,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(placePendingOnly.status).toBe(200);

    const payZero = await request(app)
      .post("/pay")
      .set("x-admin-token", token)
      .set("x-idempotency-key", `jest-pay-zero-${Date.now()}`)
      .send({ tableId: "2A", paymentMethod: "cash", excludeUnfinished: true });
    expect(payZero.status).toBe(200);
    expect(payZero.body?.message).toBe("NO_PAYABLE_ITEMS_CLEANED");
    expect(Number(payZero.body?.deletedCount) || 0).toBeGreaterThan(0);

    const tableAfterClean = await request(app).get("/order").query({ tableId: "2A" });
    expect(tableAfterClean.status).toBe(200);
    expect(Array.isArray(tableAfterClean.body)).toBe(true);
    expect(tableAfterClean.body.length).toBe(0);
  });

  test("duplicate pay request should return idempotent replay", async () => {
    const replay = await request(app)
      .post("/pay")
      .set("x-admin-token", token)
      .set("x-idempotency-key", idemKey)
      .send({ tableId: "1A", paymentMethod: "cash" });
    expect(replay.status).toBe(200);
    expect(replay.headers["x-idempotent-replay"]).toBe("1");
  });

  test("invalid table id should be rejected", async () => {
    const bad = await request(app).post("/order").send({
      tableId: "9Z",
      guestCount: 2,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(bad.status).toBe(400);
  });

  test("invalid guest count should be rejected", async () => {
    const badGuestCount = await request(app).post("/order").send({
      tableId: "1A",
      guestCount: 0,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(badGuestCount.status).toBe(400);
  });

  test("editing done item with increased quantity should create pending delta", async () => {
    const placeOrder = await request(app).post("/order").send({
      tableId: "3A",
      guestCount: 2,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(placeOrder.status).toBe(200);

    const kitchenBefore = await request(app)
      .get("/kitchen")
      .set("x-admin-token", token);
    expect(kitchenBefore.status).toBe(200);
    const targetOrder = (kitchenBefore.body || []).find((o) => o.tableId === "3A");
    expect(targetOrder).toBeTruthy();

    const markDone = await request(app)
      .post("/order/item/status")
      .set("x-admin-token", token)
      .send({ orderId: targetOrder.id, itemId: menuId, status: "done" });
    expect(markDone.status).toBe(200);

    const editAdd = await request(app)
      .put(`/orders/${targetOrder.id}/items`)
      .set("x-admin-token", token)
      .send({ items: [{ id: menuId, quantity: 2 }] });
    expect(editAdd.status).toBe(200);

    const kitchenAfter = await request(app)
      .get("/kitchen")
      .set("x-admin-token", token);
    expect(kitchenAfter.status).toBe(200);
    const editedOrder = (kitchenAfter.body || []).find((o) => o.id === targetOrder.id);
    expect(editedOrder).toBeTruthy();
    expect(editedOrder.status).toBe("pending");

    const parsedItems =
      typeof editedOrder.items === "string" ? JSON.parse(editedOrder.items) : editedOrder.items;
    const doneQty = parsedItems
      .filter((i) => Number(i.id) === menuId && i.status === "done")
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const pendingQty = parsedItems
      .filter((i) => Number(i.id) === menuId && i.status === "pending")
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    expect(doneQty).toBe(1);
    expect(pendingQty).toBe(1);
  });

  test("closed business should reject order", async () => {
    const close = await request(app)
      .post("/finance/close-day")
      .set("x-admin-token", token)
      .set("x-idempotency-key", `jest-close-${Date.now()}`)
      .send({ expenses: 0, bank_deposit: 0 });
    expect(close.status).toBe(200);

    const blocked = await request(app).post("/order").send({
      tableId: "1A",
      guestCount: 2,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(blocked.status).toBe(403);
  });
});
