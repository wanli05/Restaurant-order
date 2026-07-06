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

function assert(condition, message, detail = "") {
  if (!condition) {
    throw new Error(`${message}${detail ? ` | ${detail}` : ""}`);
  }
  console.log(`PASS: ${message}`);
}

function tokyoDateString(date = new Date()) {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

async function main() {
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

  const businessStart = await request("/business/start", {
    method: "POST",
    headers: authHeaders,
    body: "{}",
  });
  assert(
    businessStart.status === 200 || businessStart.status === 409,
    "business start or already open",
  );

  const menuRes = await request("/api/menu");
  assert(menuRes.status === 200 && Array.isArray(menuRes.json) && menuRes.json.length > 0, "menu available");
  const menuId = Number(menuRes.json[0].id);

  const tableId = "3B";
  const guestCount = 3;
  const orderRes = await request("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId, guestCount, items: [{ id: menuId, quantity: 1 }] }),
  });
  assert(orderRes.status === 200, "order with guestCount accepted");

  const payRes = await request("/pay", {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ tableId, paymentMethod: "cash" }),
  });
  assert(payRes.status === 200, "pay succeeds for guestCount order");

  const historyRes = await request("/orders/history?page=1&pageSize=100&status=paid,archived", {
    headers: { "x-admin-token": token },
  });
  assert(historyRes.status === 200, "history endpoint available");
  const rows = Array.isArray(historyRes.json?.rows) ? historyRes.json.rows : [];
  const matched = rows.find((row) => row.tableId === tableId && Number(row.guest_count) === guestCount);
  assert(!!matched, "history includes guest_count for paid order");

  const today = tokyoDateString();
  const csvRangeRes = await request(
    `/finance/export-csv?startDate=${encodeURIComponent(today)}&endDate=${encodeURIComponent(today)}`,
    { headers: { "x-admin-token": token } },
  );
  assert(csvRangeRes.status === 200, "csv export supports date range");
  assert(
    csvRangeRes.text.includes("customer_count_total") &&
      csvRangeRes.text.includes("avg_ticket_price_jpy"),
    "csv includes newly added columns",
  );

  const csvInvalidRange = await request(
    `/finance/export-csv?startDate=2099-01-02&endDate=2099-01-01`,
    { headers: { "x-admin-token": token } },
  );
  assert(csvInvalidRange.status === 400, "csv export rejects invalid range");

  console.log("ALL NEW-FEATURE SMOKE TESTS PASSED");
}

main().catch((err) => {
  console.error("TEST FAILED:", err.message || err);
  process.exit(1);
});
