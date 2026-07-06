import http from "k6/http";
import { check, sleep } from "k6";
import { TABLES } from "./k6-env.js";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3001";

export const options = {
  scenarios: {
    order_spike: {
      executor: "constant-vus",
      vus: 100,
      duration: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1200"],
  },
};

export function setup() {
  const token = __ENV.ADMIN_TOKEN || "change-me-admin-token";
  const menuRes = http.get(`${BASE_URL}/api/menu`);
  if (menuRes.status !== 200) {
    throw new Error(`menu endpoint failed: ${menuRes.status}`);
  }
  const menu = menuRes.json();
  const menuId = Number(menu?.[0]?.id);
  if (!Number.isInteger(menuId)) {
    throw new Error("cannot resolve valid menu id from /api/menu");
  }

  const statusRes = http.get(`${BASE_URL}/business/status`);
  if (statusRes.status === 200 && !statusRes.json("isOpen")) {
    http.post(`${BASE_URL}/business/start`, "{}", {
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
    });
  }

  return { menuId };
}

function pickTable(__vu) {
  return TABLES[__vu % TABLES.length];
}

export default function (data) {
  const menuId = Number(data?.menuId) || 1;
  const payload = JSON.stringify({
    tableId: pickTable(__VU),
    guestCount: 2,
    items: [{ id: menuId, quantity: 1 }],
  });
  const res = http.post(`${BASE_URL}/order`, payload, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "order status is 200": (r) => r.status === 200,
  });

  sleep(0.2);
}
