#!/usr/bin/env node
/**
 * 快速验证营业状态、菜单、下单通路（用于部署后 1 分钟自检）。
 * 默认请求 http://127.0.0.1:3001，可用 BASE_URL 覆盖。
 */
const BASE_URL = (process.env.BASE_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");
const TABLE_ID = (process.env.SMOKE_TABLE_ID || "1A").trim();
const GUEST_COUNT = Number(process.env.SMOKE_GUEST_COUNT || 2);

async function request(path, init) {
  const res = await fetch(`${BASE_URL}${path}`, init);
  const text = await res.text();
  return { res, text };
}

async function main() {
  console.log(`[smoke] base=${BASE_URL} table=${TABLE_ID} guests=${GUEST_COUNT}`);

  const statusRet = await request("/business/status");
  if (!statusRet.res.ok) {
    throw new Error(`[business/status] ${statusRet.res.status} ${statusRet.text}`);
  }
  const statusJson = JSON.parse(statusRet.text || "{}");
  console.log(`[ok] business/status isOpen=${!!statusJson.isOpen}`);
  if (!statusJson.isOpen) {
    throw new Error("门店未营业，无法执行下单烟测");
  }

  const menuRet = await request("/api/menu", { cache: "no-store" });
  if (!menuRet.res.ok) {
    throw new Error(`[api/menu] ${menuRet.res.status} ${menuRet.text}`);
  }
  const menu = JSON.parse(menuRet.text || "[]");
  if (!Array.isArray(menu) || menu.length === 0) {
    throw new Error("菜单为空，无法执行下单烟测");
  }
  const first = menu.find((it) => Number.isInteger(Number(it?.id)));
  if (!first) throw new Error("菜单没有可用菜品 ID");
  console.log(`[ok] menu count=${menu.length}, firstId=${first.id}`);

  const orderRet = await request("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tableId: TABLE_ID,
      guestCount: GUEST_COUNT,
      items: [{ id: Number(first.id), quantity: 1 }],
    }),
  });
  const orderCode = orderRet.res.headers.get("x-order-error-code") || "";
  if (!orderRet.res.ok) {
    throw new Error(
      `[order] ${orderRet.res.status} code=${orderCode || "-"} body=${orderRet.text || "-"}`,
    );
  }
  console.log(`[ok] order success: ${orderRet.text}`);
}

main()
  .then(() => {
    console.log("[smoke] done");
  })
  .catch((err) => {
    console.error("[smoke] failed:", err.message || err);
    process.exit(1);
  });
