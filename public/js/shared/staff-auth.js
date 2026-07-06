(function staffAuthBootstrap() {
  const STAFF_TOKEN_KEY = "staffToken";
  const STAFF_LANG_KEY = "staffLang";
  const DEMO_STORE_KEY = "ghPagesDemoStoreV1";
  const DEMO_TOKEN = "gh-pages-demo-token";
  const nativeFetch = typeof window.fetch === "function" ? window.fetch.bind(window) : null;
  let mockInstalled = false;

  function isStaticDemoMode() {
    try {
      const host = String(location.hostname || "").toLowerCase();
      const qp = new URLSearchParams(location.search || "");
      return host.endsWith("github.io") || qp.get("demo") === "1";
    } catch (_) {
      return false;
    }
  }

  function repoBasePath() {
    try {
      const host = String(location.hostname || "").toLowerCase();
      if (!host.endsWith("github.io")) return "";
      const first = String(location.pathname || "/").split("/").filter(Boolean)[0] || "";
      return first ? `/${first}` : "";
    } catch (_) {
      return "";
    }
  }

  function getToken() {
    return localStorage.getItem(STAFF_TOKEN_KEY) || "";
  }

  function clearToken() {
    localStorage.removeItem(STAFF_TOKEN_KEY);
  }

  function getLang(defaultLang) {
    return localStorage.getItem(STAFF_LANG_KEY) || defaultLang || "ja";
  }

  function setLang(lang) {
    localStorage.setItem(STAFF_LANG_KEY, lang);
  }

  function redirectToLogin() {
    if (isStaticDemoMode()) return;
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
  }

  function ensureLogin() {
    if (isStaticDemoMode()) {
      if (!getToken()) localStorage.setItem(STAFF_TOKEN_KEY, DEMO_TOKEN);
      return true;
    }
    if (!getToken()) {
      redirectToLogin();
      return false;
    }
    return true;
  }

  function loadDemoStore() {
    const fallback = {
      menu: [],
      allowedTables: ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C", "T"],
      businessOpen: true,
      orders: [],
      checkoutRequests: [],
      seq: 1,
      operationLogs: [],
      managerTotp: { enrolled: true, pendingEnrollment: false },
    };
    try {
      const raw = localStorage.getItem(DEMO_STORE_KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return {
        ...fallback,
        ...parsed,
        menu: Array.isArray(parsed?.menu) ? parsed.menu : fallback.menu,
        allowedTables: Array.isArray(parsed?.allowedTables) && parsed.allowedTables.length
          ? parsed.allowedTables
          : fallback.allowedTables,
        orders: Array.isArray(parsed?.orders) ? parsed.orders : fallback.orders,
        checkoutRequests: Array.isArray(parsed?.checkoutRequests)
          ? parsed.checkoutRequests
          : fallback.checkoutRequests,
        operationLogs: Array.isArray(parsed?.operationLogs) ? parsed.operationLogs : fallback.operationLogs,
        seq: Number.isInteger(parsed?.seq) && parsed.seq > 0 ? parsed.seq : 1,
        managerTotp: typeof parsed?.managerTotp === "object" && parsed.managerTotp
          ? parsed.managerTotp
          : fallback.managerTotp,
      };
    } catch (_) {
      return fallback;
    }
  }

  function saveDemoStore(store) {
    localStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store));
  }

  function parseRequestPath(inputUrl) {
    const u = new URL(String(inputUrl || "/"), window.location.origin);
    let path = u.pathname;
    const base = repoBasePath();
    if (base && path.startsWith(`${base}/`)) {
      path = path.slice(base.length);
    } else if (base && path === base) {
      path = "/";
    }
    return { path, search: u.searchParams };
  }

  function mockHeaders(extra = {}) {
    const map = new Map(Object.entries(extra).map(([k, v]) => [String(k).toLowerCase(), String(v)]));
    return {
      get(name) {
        return map.get(String(name || "").toLowerCase()) || null;
      },
    };
  }

  function buildResponse(status, body, headers = {}) {
    const textBody = typeof body === "string" ? body : JSON.stringify(body);
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: mockHeaders(headers),
      async json() {
        if (typeof body === "string") {
          try {
            return JSON.parse(body);
          } catch (_) {
            return {};
          }
        }
        return body;
      },
      async text() {
        return textBody;
      },
      async blob() {
        return new Blob([textBody], { type: headers["content-type"] || "text/plain;charset=utf-8" });
      },
      clone() {
        return buildResponse(status, body, headers);
      },
    };
  }

  async function parseJsonBody(init) {
    if (!init || typeof init.body !== "string") return {};
    try {
      return JSON.parse(init.body);
    } catch (_) {
      return {};
    }
  }

  async function ensureDemoMenu(store) {
    if (Array.isArray(store.menu) && store.menu.length > 0) return store;
    const base = repoBasePath();
    const localUrl = `${base || ""}/demo/menu.full.json`;
    try {
      const res = await nativeFetch(localUrl, { cache: "no-store" });
      if (res.ok) {
        const menu = await res.json();
        if (Array.isArray(menu) && menu.length > 0) {
          const next = { ...store, menu };
          saveDemoStore(next);
          return next;
        }
      }
    } catch (_) {
      // ignore
    }
    try {
      const host = String(location.hostname || "").toLowerCase();
      const user = host.replace(/\.github\.io$/, "");
      const repo = (base || "").replace(/^\//, "");
      if (user && repo) {
        const rawUrl = `https://raw.githubusercontent.com/${user}/${repo}/main/public/demo/menu.full.json`;
        const res = await nativeFetch(rawUrl, { cache: "no-store" });
        if (res.ok) {
          const menu = await res.json();
          if (Array.isArray(menu) && menu.length > 0) {
            const next = { ...store, menu };
            saveDemoStore(next);
            return next;
          }
        }
      }
    } catch (_) {
      // ignore
    }
    return store;
  }

  function normalizeOrderItems(items, menuById) {
    const result = [];
    for (const item of items || []) {
      const id = Number(item?.id);
      const qty = Number(item?.quantity);
      const menu = menuById.get(id);
      if (!Number.isInteger(id) || !Number.isFinite(qty) || qty <= 0 || !menu) continue;
      result.push({
        id,
        name: menu.name || { zh: "", ja: "", en: "" },
        price: Number(menu.price) || 0,
        quantity: Math.floor(qty),
        status: item?.status === "done" ? "done" : "pending",
      });
    }
    return result;
  }

  function sumTotal(items) {
    return (items || []).reduce(
      (sum, it) => sum + (Number(it?.price) || 0) * (Number(it?.quantity) || 0),
      0,
    );
  }

  function addOperationLog(store, action, tableId = null) {
    const logs = Array.isArray(store.operationLogs) ? [...store.operationLogs] : [];
    logs.unshift({
      action,
      table_id: tableId,
      created_at: new Date().toISOString().replace("T", " ").slice(0, 19),
    });
    return { ...store, operationLogs: logs.slice(0, 30) };
  }

  async function handleDemoRequest(url, init = {}) {
    let store = await ensureDemoMenu(loadDemoStore());
    const { path, search } = parseRequestPath(url);
    const method = String(init?.method || "GET").toUpperCase();

    if (path === "/api/menu" && method === "GET") {
      return buildResponse(200, store.menu);
    }
    if (path === "/api/tables" && method === "GET") {
      return buildResponse(200, { tables: store.allowedTables });
    }
    if (path === "/business/status" && method === "GET") {
      return buildResponse(200, { isOpen: !!store.businessOpen });
    }
    if (path === "/business/start" && method === "POST") {
      store = addOperationLog({ ...store, businessOpen: true }, "business-start");
      saveDemoStore(store);
      return buildResponse(200, { message: "OK" });
    }
    if (path === "/auth/manager-totp/status" && method === "GET") {
      return buildResponse(200, store.managerTotp || { enrolled: true, pendingEnrollment: false });
    }
    if (path === "/auth/manager-totp/enroll/start" && method === "POST") {
      return buildResponse(200, {
        secret: "DEMO-TOTP-SECRET",
        otpauthUrl: "otpauth://totp/demo?secret=DEMO-TOTP-SECRET&issuer=Demo",
        qrDataUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiMxMTEiLz48L3N2Zz4=",
      });
    }
    if (path === "/auth/manager-totp/enroll/confirm" && method === "POST") {
      store = { ...store, managerTotp: { enrolled: true, pendingEnrollment: false } };
      saveDemoStore(store);
      return buildResponse(200, { message: "OK" });
    }
    if (path === "/auth/manager-totp/enroll/cancel" && method === "POST") {
      return buildResponse(200, { message: "OK" });
    }
    if (path === "/auth/manager-totp/rotate/start" && method === "POST") {
      return buildResponse(200, {
        qrDataUrl:
          "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2ZmZiIvPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjEyOCIgaGVpZ2h0PSIxMjgiIGZpbGw9IiMxMTEiLz48L3N2Zz4=",
      });
    }
    if (path === "/auth/manager-totp/rotate/confirm" && method === "POST") {
      return buildResponse(200, { message: "OK" });
    }
    if (path === "/checkout" && method === "GET") {
      const rows = (store.checkoutRequests || []).map((r, idx) => ({
        id: idx + 1,
        tableId: r.tableId,
        created_at: r.created_at || new Date().toISOString(),
      }));
      return buildResponse(200, rows);
    }
    if (path === "/checkout" && method === "POST") {
      const payload = await parseJsonBody(init);
      const tableId = String(payload?.tableId || "").trim();
      if (!store.allowedTables.includes(tableId)) return buildResponse(400, "无效桌号");
      const req = { tableId, created_at: new Date().toISOString() };
      store = { ...store, checkoutRequests: [...store.checkoutRequests.filter((r) => r.tableId !== tableId), req] };
      saveDemoStore(store);
      return buildResponse(200, "OK");
    }
    if (path === "/orders" && method === "GET") {
      return buildResponse(200, (store.orders || []).filter((o) => o.status !== "archived"));
    }
    if (path.startsWith("/orders/") && path.endsWith("/items") && method === "PUT") {
      const id = Number(path.split("/")[2]);
      const payload = await parseJsonBody(init);
      const nextOrders = [...store.orders];
      const idx = nextOrders.findIndex((o) => Number(o.id) === id);
      if (idx < 0) return buildResponse(404, "找不到该订单");
      const menuById = new Map((store.menu || []).map((m) => [Number(m.id), m]));
      const trustedItems = normalizeOrderItems(payload?.items || [], menuById);
      if (!trustedItems.length) return buildResponse(400, "无效菜品内容");
      nextOrders[idx] = {
        ...nextOrders[idx],
        items: JSON.stringify(trustedItems),
        total: sumTotal(trustedItems),
        status: trustedItems.every((it) => it.status === "done") ? "done" : "pending",
      };
      store = { ...store, orders: nextOrders };
      saveDemoStore(store);
      return buildResponse(200, { message: "OK", total: nextOrders[idx].total });
    }
    if (path.startsWith("/orders/") && path.endsWith("/manager-delete-paid") && method === "POST") {
      const id = Number(path.split("/")[2]);
      const nextOrders = (store.orders || []).filter((o) => Number(o.id) !== id);
      store = { ...store, orders: nextOrders };
      saveDemoStore(store);
      return buildResponse(200, { message: "OK" });
    }
    if (path.startsWith("/orders/") && path.endsWith("/manager-edit-paid-meta") && method === "POST") {
      return buildResponse(200, { message: "OK" });
    }
    if (path.startsWith("/orders/") && path.endsWith("/manager-edit-paid-items") && method === "POST") {
      return buildResponse(200, { message: "OK" });
    }
    if (path.startsWith("/orders/") && method === "DELETE") {
      const id = Number(path.split("/")[2]);
      const nextOrders = (store.orders || []).filter((o) => Number(o.id) !== id);
      store = { ...store, orders: nextOrders };
      saveDemoStore(store);
      return buildResponse(200, { message: "OK" });
    }
    if (path === "/orders/history" && method === "GET") {
      const page = Math.max(1, Number(search.get("page") || 1));
      const pageSize = Math.max(1, Number(search.get("pageSize") || 15));
      const historyRows = (store.orders || [])
        .filter((o) => o.status === "paid" || o.status === "archived")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const total = historyRows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const start = (page - 1) * pageSize;
      return buildResponse(200, {
        page,
        pageSize,
        total,
        totalPages,
        rows: historyRows.slice(start, start + pageSize),
      });
    }
    if (path === "/staff/order" && method === "POST") {
      const payload = await parseJsonBody(init);
      const tableId = String(payload?.tableId || "").trim();
      const guestCount = Number(payload?.guestCount);
      const menuById = new Map((store.menu || []).map((m) => [Number(m.id), m]));
      const trustedItems = normalizeOrderItems(payload?.items || [], menuById);
      if (!store.businessOpen) return buildResponse(403, "门店未营业，暂不接受下单");
      if (!store.allowedTables.includes(tableId)) {
        return buildResponse(400, "无效桌号", { "x-order-error-code": "ORDER_INVALID_TABLE" });
      }
      if (!Number.isInteger(guestCount) || guestCount <= 0) {
        return buildResponse(400, "无效人数", { "x-order-error-code": "ORDER_INVALID_GUEST" });
      }
      if (!trustedItems.length) {
        return buildResponse(400, "部分菜品不存在或已下架", { "x-order-error-code": "ORDER_MENU_STALE" });
      }
      const orderNo = `DEMO-${String(store.seq).padStart(4, "0")}`;
      const nextOrder = {
        id: Date.now(),
        order_no: orderNo,
        tableId,
        items: JSON.stringify(trustedItems),
        total: sumTotal(trustedItems),
        status: "pending",
        created_at: new Date().toISOString(),
        guest_count: guestCount,
        payment_method: null,
      };
      store = addOperationLog({ ...store, seq: store.seq + 1, orders: [...store.orders, nextOrder] }, "order-create", tableId);
      saveDemoStore(store);
      return buildResponse(200, { message: "下单成功", orderNo, sessionId: `${tableId}-demo` });
    }
    if (path.startsWith("/tables/") && path.endsWith("/active-orders") && method === "GET") {
      const tableId = decodeURIComponent(path.split("/")[2] || "");
      const rows = (store.orders || [])
        .filter((o) => o.tableId === tableId && (o.status === "pending" || o.status === "done"))
        .sort((a, b) => Number(b.id) - Number(a.id));
      return buildResponse(200, { tableId, sessionId: `${tableId}-demo`, rows });
    }
    if (path.startsWith("/tables/") && path.endsWith("/new-session") && method === "POST") {
      const tableId = decodeURIComponent(path.split("/")[2] || "");
      return buildResponse(200, { tableId, sessionId: `${tableId}-demo-${Date.now()}` });
    }
    if (path === "/pay" && method === "POST") {
      const payload = await parseJsonBody(init);
      const tableId = String(payload?.tableId || "").trim();
      const paymentMethod = String(payload?.paymentMethod || "cash");
      let paidCount = 0;
      const nextOrders = (store.orders || []).map((o) => {
        if (o.tableId !== tableId) return o;
        if (o.status === "pending" || o.status === "done") {
          paidCount += 1;
          return { ...o, status: "paid", payment_method: paymentMethod };
        }
        return o;
      });
      const nextReq = (store.checkoutRequests || []).filter((r) => r.tableId !== tableId);
      store = addOperationLog({ ...store, orders: nextOrders, checkoutRequests: nextReq }, "pay", tableId);
      saveDemoStore(store);
      return buildResponse(200, { message: "OK", paidCount, archivedPendingCount: 0 });
    }
    if (path === "/kitchen" && method === "GET") {
      const rows = (store.orders || [])
        .filter((o) => o.status === "pending" || o.status === "done")
        .sort((a, b) => Number(b.id) - Number(a.id));
      return buildResponse(200, rows);
    }
    if (path === "/order/item/status" && method === "POST") {
      const payload = await parseJsonBody(init);
      const orderId = Number(payload?.orderId);
      const itemId = Number(payload?.itemId);
      const nextStatus = payload?.status === "done" ? "done" : "pending";
      const nextOrders = [...store.orders];
      const idx = nextOrders.findIndex((o) => Number(o.id) === orderId);
      if (idx < 0) return buildResponse(404, "找不到该订单");
      let items = [];
      try {
        items = JSON.parse(nextOrders[idx].items || "[]");
      } catch (_) {
        items = [];
      }
      const target = items.find((it) => Number(it.id) === itemId);
      if (target) target.status = nextStatus;
      nextOrders[idx] = {
        ...nextOrders[idx],
        items: JSON.stringify(items),
        status: items.length && items.every((it) => it.status === "done") ? "done" : "pending",
      };
      store = { ...store, orders: nextOrders };
      saveDemoStore(store);
      return buildResponse(200, "OK");
    }
    if (path === "/finance/summary" && method === "GET") {
      const paidRows = (store.orders || []).filter((o) => o.status === "paid");
      const total = paidRows.reduce((s, o) => s + (Number(o.total) || 0), 0);
      const cash = paidRows
        .filter((o) => String(o.payment_method || "cash") === "cash")
        .reduce((s, o) => s + (Number(o.total) || 0), 0);
      const paypay = paidRows
        .filter((o) => String(o.payment_method || "") === "paypay")
        .reduce((s, o) => s + (Number(o.total) || 0), 0);
      const alipay = paidRows
        .filter((o) => ["alipay", "wechat"].includes(String(o.payment_method || "")))
        .reduce((s, o) => s + (Number(o.total) || 0), 0);
      const customers = paidRows.reduce((s, o) => s + (Number(o.guest_count) || 0), 0);
      return buildResponse(200, {
        total_revenue: total,
        cash_revenue: cash,
        paypay_revenue: paypay,
        alipay_revenue: alipay,
        customer_count: customers,
        avg_ticket_price: customers > 0 ? total / customers : 0,
      });
    }
    if (path === "/finance/close-day" && method === "POST") {
      const nextOrders = (store.orders || []).map((o) => (o.status === "paid" ? { ...o, status: "archived" } : o));
      store = addOperationLog({ ...store, orders: nextOrders, businessOpen: false }, "finance-close-day");
      saveDemoStore(store);
      return buildResponse(200, { message: "OK" });
    }
    if (path === "/finance/export-csv" && method === "GET") {
      const header = "order_no,tableId,total,status,created_at,payment_method,guest_count";
      const rows = (store.orders || [])
        .filter((o) => o.status === "paid" || o.status === "archived")
        .map((o) =>
          [o.order_no, o.tableId, o.total, o.status, o.created_at, o.payment_method || "", o.guest_count || 0].join(","),
        );
      const csv = [header, ...rows].join("\n");
      return buildResponse(200, csv, { "content-type": "text/csv;charset=utf-8" });
    }
    if (path === "/recovery/check" && method === "GET") {
      const active = (store.orders || []).filter((o) => o.status === "pending" || o.status === "done").length;
      const checkout = (store.checkoutRequests || []).length;
      const verdict = store.businessOpen
        ? { level: "ok", actionCode: "running_ok" }
        : { level: "ok", actionCode: "open_ready" };
      return buildResponse(200, {
        ok: true,
        timestamp: new Date().toISOString(),
        dbQuickCheckOk: true,
        dbQuickCheckMessages: ["ok"],
        dbJournalMode: "wal",
        dbSynchronous: 2,
        businessOpen: !!store.businessOpen,
        counts: {
          pending: (store.orders || []).filter((o) => o.status === "pending").length,
          done: (store.orders || []).filter((o) => o.status === "done").length,
          paid: (store.orders || []).filter((o) => o.status === "paid").length,
          archived: (store.orders || []).filter((o) => o.status === "archived").length,
        },
        activeOrders: active,
        checkoutRequests: checkout,
        inFlightRequests: 0,
        recentLogs: (store.operationLogs || []).slice(0, 12),
        verdict,
      });
    }

    return nativeFetch(url, init);
  }

  function installStaticDemoMock() {
    if (mockInstalled || !isStaticDemoMode() || typeof window.fetch !== "function") return;
    mockInstalled = true;
    window.fetch = async (url, init = {}) => {
      try {
        const { path } = parseRequestPath(url);
        const needsMock =
          path.startsWith("/auth/") ||
          path.startsWith("/orders") ||
          path.startsWith("/order") ||
          path.startsWith("/tables/") ||
          path.startsWith("/checkout") ||
          path.startsWith("/pay") ||
          path.startsWith("/kitchen") ||
          path.startsWith("/finance/") ||
          path.startsWith("/business/") ||
          path.startsWith("/api/") ||
          path.startsWith("/recovery/");
        if (!needsMock) {
          return nativeFetch(url, init);
        }
        return handleDemoRequest(url, init);
      } catch (_) {
        return nativeFetch(url, init);
      }
    };
  }

  async function authFetch(url, options) {
    installStaticDemoMock();
    const opts = options || {};
    const headers = { ...(opts.headers || {}), "x-admin-token": getToken() };
    const res = await fetch(url, { ...opts, headers });
    if (res.status !== 401 || isStaticDemoMode()) {
      return res;
    }

    let treatAsStaffAuthFailure = true;
    try {
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const j = await res.clone().json();
        const err = String(j?.error ?? j?.message ?? "").trim();
        if (err && err !== "Unauthorized") {
          treatAsStaffAuthFailure = false;
        }
      }
    } catch {
      // keep default
    }

    if (treatAsStaffAuthFailure) {
      clearToken();
      redirectToLogin();
      throw new Error("Unauthorized");
    }
    return res;
  }

  installStaticDemoMock();

  window.StaffAuth = {
    STAFF_TOKEN_KEY,
    STAFF_LANG_KEY,
    getToken,
    clearToken,
    getLang,
    setLang,
    ensureLogin,
    authFetch,
    redirectToLogin,
    isStaticDemoMode,
  };
})();
