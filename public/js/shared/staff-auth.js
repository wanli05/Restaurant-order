(function staffAuthBootstrap() {
  const STAFF_TOKEN_KEY = "staffToken";
  const STAFF_LANG_KEY = "staffLang";

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
    window.location.href = `/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
  }

  function ensureLogin() {
    if (!getToken()) {
      redirectToLogin();
      return false;
    }
    return true;
  }

  async function authFetch(url, options) {
    const opts = options || {};
    const headers = { ...(opts.headers || {}), "x-admin-token": getToken() };
    const res = await fetch(url, { ...opts, headers });
    if (res.status !== 401) {
      return res;
    }

    // 仅当「员工令牌无效」时登出。TOTP/二次验证错误应返回 403；若旧接口仍返回 401 且带业务 error，
    // 不可误判为登录失效（否则会表现为输验证码就退出）。
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
      // 保持 treatAsStaffAuthFailure === true
    }

    if (treatAsStaffAuthFailure) {
      clearToken();
      redirectToLogin();
      throw new Error("Unauthorized");
    }
    return res;
  }

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
  };
})();
