import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { TABLES } from "./k6-env.js";
import { staffSessionSetup } from "./k6-staff-session.js";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3001";
const METHODS = ["cash", "paypay", "alipay"];

const payFailedRate = new Rate("pay_failed_rate");
const payDuration = new Trend("pay_duration_ms");
const checkoutDuration = new Trend("checkout_duration_ms");
const kitchenDuration = new Trend("kitchen_duration_ms");

export const options = {
  scenarios: {
    staged_mixed_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 30 }, // warmup
        { duration: "20s", target: 200 }, // peak ramp
        { duration: "30s", target: 200 }, // peak hold
        { duration: "20s", target: 50 }, // cooldown
        { duration: "20s", target: 50 }, // stable low
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.03"],
    http_req_duration: ["p(95)<1500"],
    "http_req_duration{api:pay}": ["p(95)<1000"],
    "http_req_failed{api:pay}": ["rate<0.03"],
    "http_req_duration{api:checkout}": ["p(95)<800"],
    "http_req_duration{api:kitchen}": ["p(95)<800"],
    pay_failed_rate: ["rate<0.03"],
    pay_duration_ms: ["p(95)<1000"],
    checkout_duration_ms: ["p(95)<800"],
    kitchen_duration_ms: ["p(95)<800"],
  },
};

function pickTable() {
  return TABLES[Math.floor(Math.random() * TABLES.length)];
}

function pickMethod() {
  return METHODS[Math.floor(Math.random() * METHODS.length)];
}

export function setup() {
  return staffSessionSetup(BASE_URL);
}

export default function (data) {
  const tableId = pickTable();
  const dice = Math.random();

  // Realistic mix: order 78%, checkout 14%, kitchen 5%, pay 3%
  if (dice < 0.78) {
    const res = http.post(
      `${BASE_URL}/order`,
      JSON.stringify({ tableId, guestCount: 2, items: [{ id: data.menuId, quantity: 1 }] }),
      { headers: { "Content-Type": "application/json" }, tags: { api: "order" } },
    );
    check(res, { "order returns 200": (r) => r.status === 200 });
  } else if (dice < 0.92) {
    const res = http.post(
      `${BASE_URL}/checkout`,
      JSON.stringify({ tableId }),
      { headers: { "Content-Type": "application/json" }, tags: { api: "checkout" } },
    );
    checkoutDuration.add(res.timings.duration);
    check(res, { "checkout returns 200": (r) => r.status === 200 });
  } else if (dice < 0.97) {
    const res = http.get(`${BASE_URL}/kitchen`, {
      headers: { "x-admin-token": data.token },
      tags: { api: "kitchen" },
    });
    kitchenDuration.add(res.timings.duration);
    check(res, { "kitchen returns 200": (r) => r.status === 200 });
  } else {
    const idem = `k6-stage-pay-${__VU}-${__ITER}`;
    const headers = {
      "Content-Type": "application/json",
      "x-admin-token": data.token,
      "x-idempotency-key": idem,
    };
    const body = JSON.stringify({
      tableId,
      paymentMethod: pickMethod(),
      excludeUnfinished: Math.random() < 0.5,
    });
    const payRes = http.post(`${BASE_URL}/pay`, body, {
      headers,
      tags: { api: "pay" },
      timeout: "10s",
    });
    payFailedRate.add(payRes.status !== 200);
    payDuration.add(payRes.timings.duration);
    check(payRes, { "pay returns 200": (r) => r.status === 200 });
  }

  sleep(0.2);
}
