/**
 * 面类链路冒烟（需已 npm start）：校验菜单顺序 + API 下单 → 后厨出菜 → 结账请求 → 支付
 * 用法: node scripts/smoke-noodles-acceptance.js
 * 可选: set BASE_URL=http://127.0.0.1:3001
 */

const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3001").replace(/\/$/, "");

const EXPECTED_ZH_ORDER = [
  "麻辣烫",
  "麻辣香锅",
  "麻辣米线",
  "麻辣方便面",
  "麻辣拌面",
  "麻辣乌冬面",
  "土豆粉",
  "牛筋面",
  "大盘鸡拌面",
  "酸辣粉",
  "板面",
  "酸辣小面",
  "麻辣小面",
  "卤煮",
  "牛肉面",
  "牛肉乌冬",
  "牛肉米线",
  "𰻝𰻝面",
  "鸡汤米线",
  "鸭血粉丝汤",
  "担担面",
  "海鲜汤面",
  "鸡肉面",
  "肥肠面",
  "排骨面",
  "蔬菜汤面",
  "豚骨拉面",
];

async function fetchJson(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

function fail(msg) {
  console.error("✗", msg);
  process.exit(1);
}

async function main() {
  console.log("BASE_URL:", BASE_URL);

  const health = await fetchJson("/health");
  if (!health.ok || !health.body?.ok) {
    fail(`服务不可用（请先 npm start）。GET /health -> ${health.status} ${JSON.stringify(health.body)}`);
  }
  console.log("✓ /health");

  const menuRes = await fetchJson("/api/menu");
  if (!menuRes.ok || !Array.isArray(menuRes.body)) {
    fail(`GET /api/menu -> ${menuRes.status}`);
  }
  const noodles = menuRes.body.filter((r) => String(r.category || "").toLowerCase() === "noodles");
  noodles.sort((a, b) => Number(a.id) - Number(b.id));
  const zh = noodles.map((r) => r.name?.zh);
  if (noodles.length !== EXPECTED_ZH_ORDER.length) {
    fail(`面类条数期望 ${EXPECTED_ZH_ORDER.length}，实际 ${noodles.length}`);
  }
  for (let i = 0; i < EXPECTED_ZH_ORDER.length; i++) {
    if (zh[i] !== EXPECTED_ZH_ORDER[i]) {
      fail(`面类中文顺序 position ${i + 1}: 期望 «${EXPECTED_ZH_ORDER[i]}» 实际 «${zh[i]}»`);
    }
  }
  console.log("✓ /api/menu 面类顺序与文案（含 𰻝𰻝面）");

  const malatang = noodles.find((r) => String(r.image || "").includes("spicy_malatang"));
  if (!malatang?.id) fail("未找到麻辣烫菜单 id");
  const malatangId = Number(malatang.id);

  const login = await fetchJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "Test12345", password: "Test12345" }),
  });
  if (!login.ok || !login.body?.token) fail(`登录失败 ${login.status}`);
  const token = login.body.token;
  console.log("✓ /auth/login");

  const startBiz = await fetchJson("/business/start", {
    method: "POST",
    headers: { "x-admin-token": token },
    body: JSON.stringify({}),
  });
  if (!startBiz.ok && startBiz.status !== 409) {
    fail(`开店失败 ${startBiz.status} ${JSON.stringify(startBiz.body)}`);
  }
  console.log("✓ /business/start（已在营业则忽略 409）");

  const tableId = "T";
  const place = await fetchJson("/order", {
    method: "POST",
    body: JSON.stringify({
      tableId,
      guestCount: 2,
      items: [{ id: malatangId, quantity: 1 }],
    }),
  });
  if (!place.ok) fail(`下单失败 ${place.status} ${JSON.stringify(place.body)}`);
  console.log("✓ POST /order（面类 麻辣烫）");

  const kitchen = await fetchJson("/kitchen", { headers: { "x-admin-token": token } });
  if (!kitchen.ok || !Array.isArray(kitchen.body)) fail(`厨房列表失败 ${kitchen.status}`);
  const row = kitchen.body.find((o) => String(o.tableId) === tableId);
  if (!row?.id) fail(`厨房未见桌 ${tableId}`);
  const orderId = Number(row.id);
  let items = [];
  try {
    items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
  } catch {
    fail("订单 items JSON 损坏");
  }
  const line = Array.isArray(items) ? items.findIndex((it) => Number(it?.id) === malatangId) : -1;
  if (line < 0) fail("厨房订单中未见麻辣烫行");
  console.log("✓ GET /kitchen 含该单");

  const mark = await fetchJson("/order/item/status", {
    method: "POST",
    headers: { "x-admin-token": token },
    body: JSON.stringify({
      orderId,
      itemId: malatangId,
      lineIndex: line,
      status: "done",
    }),
  });
  if (!mark.ok) fail(`出菜标记失败 ${mark.status} ${mark.body}`);
  console.log("✓ POST /order/item/status done");

  const co = await fetchJson("/checkout", {
    method: "POST",
    body: JSON.stringify({ tableId }),
  });
  if (!co.ok) fail(`结账请求失败 ${co.status}`);
  console.log("✓ POST /checkout");

  const idem = `smoke-noodles-${Date.now()}`;
  const pay = await fetchJson("/pay", {
    method: "POST",
    headers: {
      "x-admin-token": token,
      "x-idempotency-key": idem,
    },
    body: JSON.stringify({ tableId, paymentMethod: "cash" }),
  });
  if (!pay.ok) fail(`支付失败 ${pay.status} ${JSON.stringify(pay.body)}`);
  console.log("✓ POST /pay cash");

  console.log("\n全部通过：面类菜单顺序 + 下单 → 后厨 → 结账 → 支付（API）");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
