import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";
import { TABLES } from "./k6-env.js";
import { staffSessionSetup } from "./k6-staff-session.js";

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:3001";
const METHODS = ["cash", "paypay", "alipay"];

const payFailedRate = new Rate("pay_failed_rate");
const payDuration = new Trend("pay_duration_ms");

export const options = {
  scenarios: {
    tier_50: {
      executor: "constant-vus",
      vus: 50,
      duration: "25s",
      exec: "mixedFlow",
      tags: { tier: "50" },
    },
    tier_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "25s",
      startTime: "30s",
      exec: "mixedFlow",
      tags: { tier: "100" },
    },
    tier_150: {
      executor: "constant-vus",
      vus: 150,
      duration: "25s",
      startTime: "60s",
      exec: "mixedFlow",
      tags: { tier: "150" },
    },
    tier_200: {
      executor: "constant-vus",
      vus: 200,
      duration: "25s",
      startTime: "90s",
      exec: "mixedFlow",
      tags: { tier: "200" },
    },
  },
  thresholds: {
    "http_req_failed{api:pay}": ["rate<0.05"],
    "http_req_duration{api:pay}": ["p(95)<3000"],
    "http_req_failed{api:pay,scenario:tier_50}": ["rate<0.05"],
    "http_req_failed{api:pay,scenario:tier_100}": ["rate<0.05"],
    "http_req_failed{api:pay,scenario:tier_150}": ["rate<0.05"],
    "http_req_failed{api:pay,scenario:tier_200}": ["rate<0.05"],
    "http_req_duration{api:pay,scenario:tier_50}": ["p(95)<3000"],
    "http_req_duration{api:pay,scenario:tier_100}": ["p(95)<3000"],
    "http_req_duration{api:pay,scenario:tier_150}": ["p(95)<3000"],
    "http_req_duration{api:pay,scenario:tier_200}": ["p(95)<3000"],
    pay_failed_rate: ["rate<0.05"],
    pay_duration_ms: ["p(95)<3000"],
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

export function mixedFlow(data) {
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
    check(res, { "checkout returns 200": (r) => r.status === 200 });
  } else if (dice < 0.97) {
    const res = http.get(`${BASE_URL}/kitchen`, {
      headers: { "x-admin-token": data.token },
      tags: { api: "kitchen" },
    });
    check(res, { "kitchen returns 200": (r) => r.status === 200 });
  } else {
    const idem = `k6-tier-pay-${__VU}-${__ITER}`;
    const headers = {
      "Content-Type": "application/json",
      "x-admin-token": data.token,
      "x-idempotency-key": idem,
    };
    const payRes = http.post(
      `${BASE_URL}/pay`,
      JSON.stringify({
        tableId,
        paymentMethod: pickMethod(),
        excludeUnfinished: Math.random() < 0.5,
      }),
      {
        headers,
        tags: { api: "pay" },
        timeout: "10s",
      },
    );
    payFailedRate.add(payRes.status !== 200);
    payDuration.add(payRes.timings.duration);
    check(payRes, { "pay returns 200": (r) => r.status === 200 });
  }

  sleep(0.2);
}
