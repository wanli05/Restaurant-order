const sqlite3 = require("sqlite3").verbose();
const request = require("supertest");
const speakeasy = require("speakeasy");
const { resetRuntimeDataForTests } = require("../helpers/reset-runtime-data");
const { app } = require("../../server");

function clearManagerTotpKeys() {
  const db = new sqlite3.Database("./orders.db");
  return new Promise((resolve, reject) => {
    db.run(
      "DELETE FROM app_settings WHERE key IN ('manager_totp_secret','manager_totp_pending')",
      (err) => {
        db.close();
        if (err) reject(err);
        else resolve();
      },
    );
  });
}

describe("Manager TOTP + paid order correction", () => {
  let token = "";
  let menuId = 1;
  let totpSecret = "";
  let paidOrderId = 0;

  beforeAll(async () => {
    resetRuntimeDataForTests();
    await clearManagerTotpKeys();

    const login = await request(app).post("/auth/login").send({
      username: "Test12345",
      password: "Test12345",
    });
    token = login.body.token;

    await request(app).post("/business/start").set("x-admin-token", token).send({});

    const start = await request(app)
      .post("/auth/manager-totp/enroll/start")
      .set("x-admin-token", token)
      .send({});
    expect(start.status).toBe(200);
    totpSecret = start.body.secretBase32;
    const code = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });
    const confirm = await request(app)
      .post("/auth/manager-totp/enroll/confirm")
      .set("x-admin-token", token)
      .send({ code });
    expect(confirm.status).toBe(200);

    const menuRes = await request(app).get("/api/menu");
    menuId = Number(menuRes.body?.[0]?.id || 1);

    await request(app).post("/order").send({
      tableId: "1A",
      guestCount: 1,
      items: [{ id: menuId, quantity: 1 }],
    });
    await request(app).post("/checkout").send({ tableId: "1A" });
    const pay = await request(app)
      .post("/pay")
      .set("x-admin-token", token)
      .set("x-idempotency-key", `jest-mtotp-${Date.now()}`)
      .send({ tableId: "1A", paymentMethod: "cash" });
    expect(pay.status).toBe(200);

    const hist = await request(app)
      .get("/orders/history?page=1&pageSize=10&status=paid")
      .set("x-admin-token", token);
    expect(hist.status).toBe(200);
    expect(Array.isArray(hist.body.rows)).toBe(true);
    expect(hist.body.rows.length).toBeGreaterThan(0);
    paidOrderId = hist.body.rows[0].id;
  });

  test("manager-delete-paid rejects wrong or missing TOTP", async () => {
    const missing = await request(app)
      .post(`/orders/${paidOrderId}/manager-delete-paid`)
      .set("x-admin-token", token)
      .send({ reason: "test" });
    expect(missing.status).toBe(403);

    const bad = await request(app)
      .post(`/orders/${paidOrderId}/manager-delete-paid`)
      .set("x-admin-token", token)
      .send({ reason: "test", managerTotp: "000000" });
    expect(bad.status).toBe(403);
  });

  test("manager-edit-paid-meta succeeds with valid TOTP", async () => {
    const totp = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });
    const edit = await request(app)
      .post(`/orders/${paidOrderId}/manager-edit-paid-meta`)
      .set("x-admin-token", token)
      .send({
        changes: { guest_count: 5 },
        reason: "jest meta edit",
        managerTotp: totp,
      });
    expect(edit.status).toBe(200);
    expect(Number(edit.body.guest_count)).toBe(5);

    const hist = await request(app)
      .get("/orders/history?page=1&pageSize=10&status=paid")
      .set("x-admin-token", token);
    const row = hist.body.rows.find((r) => r.id === paidOrderId);
    expect(row).toBeTruthy();
    expect(Number(row.guest_count)).toBe(5);
  });

  test("manager-totp check-code accepts valid token", async () => {
    const totp = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });
    const ok = await request(app)
      .post("/auth/manager-totp/check-code")
      .set("x-admin-token", token)
      .send({ code: totp });
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
    expect(typeof ok.body.skewSteps).toBe("number");

    const bad = await request(app)
      .post("/auth/manager-totp/check-code")
      .set("x-admin-token", token)
      .send({ managerTotp: "000000" });
    expect(bad.status).toBe(200);
    expect(bad.body.ok).toBe(false);
    expect(bad.body.error).toBe("invalid_manager_totp");

    const missing = await request(app)
      .post("/auth/manager-totp/check-code")
      .set("x-admin-token", token)
      .send({});
    expect(missing.status).toBe(400);
    expect(missing.body.ok).toBe(false);
  });

  test("manager-delete-paid succeeds with valid TOTP", async () => {
    const totp = speakeasy.totp({
      secret: totpSecret,
      encoding: "base32",
    });
    const del = await request(app)
      .post(`/orders/${paidOrderId}/manager-delete-paid`)
      .set("x-admin-token", token)
      .send({ reason: "jest correction", managerTotp: totp });
    expect(del.status).toBe(200);

    const histAfter = await request(app)
      .get(`/orders/history?page=1&pageSize=10&status=paid`)
      .set("x-admin-token", token);
    expect(histAfter.body.rows.every((r) => r.id !== paidOrderId)).toBe(true);
  });
});
