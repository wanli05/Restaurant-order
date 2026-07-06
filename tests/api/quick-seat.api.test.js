const request = require("supertest");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");
const { app } = require("../../server");

describe("Quick seat API flow", () => {
  let token = "";
  let menuId = 1;

  beforeAll(async () => {
    resetRuntimeDataForTests();

    const login = await request(app).post("/auth/login").send({
      username: "Test12345",
      password: "Test12345",
    });
    token = login.body.token;

    const start = await request(app)
      .post("/business/start")
      .set("x-admin-token", token)
      .send({});
    expect(start.status).toBe(200);

    const menuRes = await request(app).get("/api/menu");
    menuId = Number(menuRes.body?.[0]?.id || 1);
  });

  test("new session should succeed on empty table", async () => {
    const res = await request(app)
      .post("/tables/3A/new-session")
      .set("x-admin-token", token)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.tableId).toBe("3A");
    expect(typeof res.body.sessionId).toBe("string");
    expect(res.body.sessionId.length).toBeGreaterThan(5);

    const activeOrders = await request(app)
      .get("/tables/3A/active-orders")
      .set("x-admin-token", token);
    expect(activeOrders.status).toBe(200);
    expect(activeOrders.body.tableId).toBe("3A");
    expect(activeOrders.body.sessionId).toBe(res.body.sessionId);
    expect(Array.isArray(activeOrders.body.rows)).toBe(true);
    expect(activeOrders.body.rows.length).toBe(0);
  });

  test("new session should be blocked when table has unpaid orders", async () => {
    const order = await request(app).post("/order").send({
      tableId: "1A",
      guestCount: 2,
      items: [{ id: menuId, quantity: 1 }],
    });
    expect(order.status).toBe(200);

    const blocked = await request(app)
      .post("/tables/1A/new-session")
      .set("x-admin-token", token)
      .send({});
    expect(blocked.status).toBe(409);
  });
});

