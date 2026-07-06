/* eslint-disable no-console */
const BASE = "http://localhost:3001";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    json = null;
  }
  return { status: res.status, text, json, headers: res.headers };
}

function assert(ok, message, detail = "") {
  if (!ok) {
    throw new Error(`${message}${detail ? ` | ${detail}` : ""}`);
  }
  console.log(`PASS: ${message}`);
}

async function main() {
  console.log("Running full flow test...");

  const health = await request("/health");
  assert(health.status === 200, "health endpoint available");

  const badLogin = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "bad", password: "bad" }),
  });
  assert(badLogin.status === 401, "reject invalid login");

  const login = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Test12345", password: "Test12345" }),
  });
  assert(login.status === 200 && login.json?.token, "staff login success");
  const token = login.json.token;
  const authHeaders = {
    "Content-Type": "application/json",
    "x-admin-token": token,
  };

  const unauthorizedFinance = await request("/finance/summary");
  assert(unauthorizedFinance.status === 401, "reject finance summary without token");

  const closedOrder = await request("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: "1A",
      guestCount: 2,
      items: [{ id: 1, quantity: 1 }],
    }),
  });
  assert(closedOrder.status === 403, "reject order while business closed");

  const start = await request("/business/start", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({}),
  });
  assert(start.status === 200, "start business");

  const tableList = await request("/api/tables");
  assert(
    tableList.status === 200 &&
      Array.isArray(tableList.json?.tables) &&
      tableList.json.tables.includes("1A"),
    "table whitelist endpoint available",
  );

  const menuList = await request("/api/menu");
  assert(
    menuList.status === 200 && Array.isArray(menuList.json) && menuList.json.length > 0,
    "menu endpoint available",
  );
  const firstMenuId = Number(menuList.json[0].id);
  const secondMenuId = Number((menuList.json[1] || menuList.json[0]).id);
  assert(Number.isInteger(firstMenuId), "extract first menu id");

  const invalidTableOrder = await request("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: "1C",
      guestCount: 2,
      items: [{ id: firstMenuId, quantity: 1 }],
    }),
  });
  assert(invalidTableOrder.status === 400, "reject invalid table id after opening");

  const order1 = await request("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: "1A",
      guestCount: 2,
      items: [{ id: firstMenuId, quantity: 1 }],
    }),
  });
  assert(order1.status === 200, "place order for 1A");

  const payDirect = await request("/pay", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ tableId: "1A", paymentMethod: "cash" }),
  });
  assert(payDirect.status === 200, "direct pay without checkout request");

  const invalidPayment = await request("/pay", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ tableId: "1A", paymentMethod: "invalid" }),
  });
  assert(invalidPayment.status === 400, "reject invalid payment method");

  const order2 = await request("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: "1B",
      guestCount: 2,
      items: [{ id: secondMenuId, quantity: 1 }],
    }),
  });
  assert(order2.status === 200, "place order for 1B");

  const historyWithPending = await request("/orders/history?page=1&pageSize=50", {
    headers: { "x-admin-token": token },
  });
  assert(historyWithPending.status === 200, "history endpoint available");
  const historyRowsBeforePayB = Array.isArray(historyWithPending.json?.rows)
    ? historyWithPending.json.rows
    : [];
  assert(
    historyRowsBeforePayB.every((row) => row.status === "paid" || row.status === "archived"),
    "history only includes paid/archived statuses",
  );
  assert(
    historyRowsBeforePayB.every((row) => row.tableId !== "1B"),
    "unpaid 1B order is not shown in history",
  );

  const orders = await request("/orders", { headers: { "x-admin-token": token } });
  assert(orders.status === 200 && Array.isArray(orders.json), "list orders for staff");
  const pending1B = orders.json.find((o) => o.tableId === "1B" && o.status === "pending");
  assert(!!pending1B, "find pending 1B order");

  const items = JSON.parse(pending1B.items || "[]");
  const firstItemId = Number(items[0]?.id);
  assert(Number.isInteger(firstItemId), "extract first item id for 1B");

  const markDone = await request("/order/item/status", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      orderId: pending1B.id,
      itemId: firstItemId,
      status: "done",
    }),
  });
  assert(markDone.status === 200, "mark item done");

  const payExclude = await request("/pay", {
    method: "POST",
    headers: {
      ...authHeaders,
      "x-idempotency-key": "pay-key-1b",
    },
    body: JSON.stringify({
      tableId: "1B",
      paymentMethod: "alipay",
      excludeUnfinished: true,
    }),
  });
  assert(payExclude.status === 200, "pay 1B with excludeUnfinished=true");

  const historyAfterPayB = await request("/orders/history?page=1&pageSize=50", {
    headers: { "x-admin-token": token },
  });
  const historyRowsAfterPayB = Array.isArray(historyAfterPayB.json?.rows)
    ? historyAfterPayB.json.rows
    : [];
  assert(
    historyRowsAfterPayB.some((row) => row.tableId === "1B"),
    "paid 1B order appears in history after payment",
  );

  const payExcludeReplay = await request("/pay", {
    method: "POST",
    headers: {
      ...authHeaders,
      "x-idempotency-key": "pay-key-1b",
    },
    body: JSON.stringify({
      tableId: "1B",
      paymentMethod: "alipay",
      excludeUnfinished: true,
    }),
  });
  assert(
    payExcludeReplay.status === 200 &&
      payExcludeReplay.headers.get("x-idempotent-replay") === "1",
    "pay idempotency replay works",
  );

  const financeBeforeClose = await request("/finance/summary", {
    headers: { "x-admin-token": token },
  });
  assert(
    financeBeforeClose.status === 200 &&
      Number(financeBeforeClose.json?.cash_revenue) >= 0 &&
      Number(financeBeforeClose.json?.alipay_revenue ?? financeBeforeClose.json?.wechat_revenue) >= 0,
    "finance summary available before close",
  );

  const closeDay = await request("/finance/close-day", {
    method: "POST",
    headers: {
      ...authHeaders,
      "x-idempotency-key": "close-day-key-1",
    },
    body: JSON.stringify({ expenses: 0, bank_deposit: 0 }),
  });
  assert(closeDay.status === 200, "close day success");

  const closeDayReplay = await request("/finance/close-day", {
    method: "POST",
    headers: {
      ...authHeaders,
      "x-idempotency-key": "close-day-key-1",
    },
    body: JSON.stringify({ expenses: 0, bank_deposit: 0 }),
  });
  assert(
    closeDayReplay.status === 200 &&
      closeDayReplay.headers.get("x-idempotent-replay") === "1",
    "close-day idempotency replay works",
  );

  const statusAfterClose = await request("/business/status");
  assert(statusAfterClose.status === 200 && statusAfterClose.json?.isOpen === false, "business closes after close-day");

  const invalidTableQuery = await request("/order?tableId=1C");
  assert(invalidTableQuery.status === 400, "reject invalid table query");

  const invalidQtyEdit = await request("/tables/1C/items/quantity", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ menuId: firstMenuId, quantity: 1 }),
  });
  assert(invalidQtyEdit.status === 400, "reject invalid table in quantity edit");

  console.log("ALL TESTS PASSED");
}

main().catch((err) => {
  console.error("TEST FAILED:", err.message || err);
  process.exit(1);
});

