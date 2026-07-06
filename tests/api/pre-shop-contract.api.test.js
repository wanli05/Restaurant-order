const request = require("supertest");
const { app } = require("../../server");

/** 店铺进场前静态资源与登录契约，不依赖 reset-runtime-data（只读 health / 静态 / 公开 API）。 */
describe("Pre-shop contract: health, static staff pages, auth, public API", () => {
  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body?.ok).toBe(true);
    expect(typeof res.body?.businessOpen).toBe("boolean");
  });

  test("shared staff settings assets are served", async () => {
    const css = await request(app).get("/css/staff-settings.css");
    expect(css.status).toBe(200);
    expect(String(css.text || "").length).toBeGreaterThan(50);

    const authJs = await request(app).get("/js/shared/staff-auth.js");
    expect(authJs.status).toBe(200);
    expect(authJs.text).toContain("StaffAuth");

    const uiJs = await request(app).get("/js/shared/staff-settings-ui.js");
    expect(uiJs.status).toBe(200);
    expect(uiJs.text).toContain("StaffSettingsUi");
  });

  test("staff HTML pages include settings entry (shared or admin inline)", async () => {
    const sharedMarkers = [
      'id="adminSettingsTrigger"',
      "/js/shared/staff-settings-ui.js",
      "/js/shared/staff-auth.js",
      "/css/staff-settings.css",
    ];

    const pathsShared = ["/login.html", "/kitchen.html", "/finance.html", "/recovery.html"];
    for (const path of pathsShared) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      const html = String(res.text || "");
      for (const m of sharedMarkers) {
        expect(html).toContain(m);
      }
    }

    const admin = await request(app).get("/admin.html");
    expect(admin.status).toBe(200);
    const adminHtml = String(admin.text || "");
    expect(adminHtml).toContain('id="adminSettingsTrigger"');
    expect(adminHtml).toContain('id="adminAboutModal"');
  });

  test("customer index.html does not expose staff settings trigger", async () => {
    const res = await request(app).get("/index.html");
    expect(res.status).toBe(200);
    expect(String(res.text || "")).not.toContain('id="adminSettingsTrigger"');
  });

  test("POST /auth/login invalid credentials -> 401", async () => {
    const res = await request(app).post("/auth/login").send({
      username: "wrong",
      password: "wrong",
    });
    expect(res.status).toBe(401);
  });

  test("POST /auth/login valid test credentials -> token", async () => {
    const res = await request(app).post("/auth/login").send({
      username: "Test12345",
      password: "Test12345",
    });
    expect(res.status).toBe(200);
    expect(typeof res.body?.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
    expect(res.body.username).toBe("Test12345");
  });

  test("GET /api/menu returns non-empty array when DB has menu", async () => {
    const res = await request(app).get("/api/menu");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty("id");
    expect(res.body[0]).toHaveProperty("name");
  });

  test("GET /api/tables returns tables list", async () => {
    const res = await request(app).get("/api/tables");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body?.tables)).toBe(true);
    expect(res.body.tables.length).toBeGreaterThan(0);
  });

  test("GET /recovery/check returns quick_check ok and WAL metadata", async () => {
    const login = await request(app).post("/auth/login").send({
      username: "Test12345",
      password: "Test12345",
    });
    expect(login.status).toBe(200);
    const token = login.body.token;
    const res = await request(app).get("/recovery/check").set("x-admin-token", token);
    expect(res.status).toBe(200);
    expect(res.body.dbQuickCheckOk).toBe(true);
    expect(Array.isArray(res.body.dbQuickCheckMessages)).toBe(true);
    expect(res.body.dbJournalMode).toBeTruthy();
    expect(typeof res.body.dbSynchronous).toBe("number");
    expect(res.body.verdict?.level).toBeTruthy();
  });
});
