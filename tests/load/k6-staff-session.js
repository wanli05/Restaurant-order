import http from "k6/http";

/**
 * 登录 + 取首个菜品 id + 必要时开店。
 * @param {string} baseUrl
 */
export function staffSessionSetup(baseUrl) {
  const username = __ENV.STAFF_USER || "Test12345";
  const password = __ENV.STAFF_PASS || "Test12345";

  const loginRes = http.post(
    `${baseUrl}/auth/login`,
    JSON.stringify({ username, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (loginRes.status !== 200) {
    throw new Error(`login failed: ${loginRes.status}`);
  }
  const token = loginRes.json("token");
  if (!token) throw new Error("missing auth token from login response");

  const menuRes = http.get(`${baseUrl}/api/menu`);
  if (menuRes.status !== 200) throw new Error(`/api/menu failed: ${menuRes.status}`);
  const menu = menuRes.json();
  const menuId = Number(menu?.[0]?.id);
  if (!Number.isInteger(menuId)) throw new Error("failed to resolve a valid menu id");

  const businessRes = http.get(`${baseUrl}/business/status`);
  if (businessRes.status !== 200) {
    throw new Error(`/business/status failed: ${businessRes.status}`);
  }
  if (!businessRes.json("isOpen")) {
    const startRes = http.post(`${baseUrl}/business/start`, "{}", {
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": token,
      },
    });
    if (startRes.status !== 200 && startRes.status !== 409) {
      throw new Error(`/business/start failed: ${startRes.status}`);
    }
  }

  return { token, menuId };
}
