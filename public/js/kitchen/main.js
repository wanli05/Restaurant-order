function ensureStaffAuth() {
  if (window.StaffAuth) return window.StaffAuth;
  console.warn("[staff-auth] missing, using fallback bridge");
  const fallback = {
    STAFF_TOKEN_KEY: "staffToken",
    STAFF_LANG_KEY: "staffLang",
    getToken: () => "",
    clearToken: () => {},
    getLang: (defaultLang) => defaultLang || "ja",
    setLang: () => {},
    ensureLogin: () => true,
    authFetch: (url, options) => fetch(url, options),
    redirectToLogin: () => {},
    isStaticDemoMode: () => true,
  };
  window.StaffAuth = fallback;
  return fallback;
}
ensureStaffAuth();

function installStyledAlert() {
  const modal = document.getElementById("uiAlertModal");
  const messageEl = document.getElementById("uiAlertMessage");
  const okBtn = document.getElementById("uiAlertOkBtn");
  if (!modal || !messageEl || !okBtn) return;
  window.alert = (message) => {
    messageEl.textContent = String(message ?? "");
    modal.classList.add("show");
    okBtn.focus();
  };
  const close = () => modal.classList.remove("show");
  okBtn.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });
}

installStyledAlert();

let kitchenRefreshTimer = null;
let kitchenLoading = false;
const pendingItemOps = new Set();
let businessOpen = false;
let currentLang = window.StaffAuth.getLang("ja");
const text = {
  ja: {
    pageTitle: "🍳 厨房調理センター",
    activeTitle: "🔥 調理中（未提供）",
    historyTitle: "✅ 最近完了",
    tokenPrompt: "厨房アクセス用トークンを入力してください",
    authFailed: "認証に失敗しました。トークンを再入力してください",
    loadFailed: "読み込みに失敗しました",
    noActive: "☕ 新規注文はありません",
    table: "テーブル",
    orderedAt: "注文",
    waited: "待機",
    itemDone: "提供済み",
    itemPending: "未提供",
    btnToPending: "↩ 未提供に戻す",
    btnToDone: "✅ 提供済みにする",
    navAdmin: "レジ",
    navKitchen: "厨房",
    navFinance: "財務",
    navRecovery: "点検",
    opFailed: "操作に失敗しました：",
    networkErr: "ネットワーク接続エラーです。サーバーを確認してください",
    openStatusOpen: "営業中",
    openStatusClosed: "停止営業",
    uiOk: "確定",
    commonOpFail: "操作に失敗しました。再試行してください",
    invalidStatusOp: "状態更新に失敗しました",
  },
  zh: {
    pageTitle: "🍳 厨房调度中心",
    activeTitle: "🔥 正在制作（待出菜）",
    historyTitle: "✅ 最近完成",
    tokenPrompt: "请输入厨房访问令牌",
    authFailed: "鉴权失败，请重新输入令牌",
    loadFailed: "加载失败",
    noActive: "☕ 暂时没有新订单",
    table: "桌号",
    orderedAt: "下单",
    waited: "已等",
    itemDone: "已出菜",
    itemPending: "待出菜",
    btnToPending: "↩ 设为待出菜",
    btnToDone: "✅ 标记已出菜",
    navAdmin: "收银台",
    navKitchen: "厨房",
    navFinance: "财务",
    navRecovery: "自检",
    opFailed: "操作失败：",
    networkErr: "网络请求失败，请检查服务器连接",
    openStatusOpen: "正在营业",
    openStatusClosed: "停止营业",
    uiOk: "确定",
    commonOpFail: "操作失败，请重试",
    invalidStatusOp: "更新状态失败",
  },
};
function t(key) {
  return text[currentLang][key];
}
function toLocalizedKitchenError(message) {
  const msg = String(message || "");
  if (msg.includes("无效状态")) return t("invalidStatusOp");
  if (msg.includes("无效桌号")) return currentLang === "ja" ? "無効なテーブル番号です" : "无效桌号";
  return t("commonOpFail");
}
function setLang(lang) {
  currentLang = lang;
  window.StaffAuth.setLang(lang);
  renderText();
  loadKitchen();
}
function openModule(path) {
  window.open(path, "_blank", "noopener");
}
function renderText() {
  document.documentElement.lang = currentLang === "ja" ? "ja" : "zh";
  window.StaffSettingsUi?.renderLabels();
  document.getElementById("pageTitle").innerText = t("pageTitle");
  document.getElementById("navAdminBtn").innerText = t("navAdmin");
  document.getElementById("navKitchenBtn").innerText = t("navKitchen");
  document.getElementById("navFinanceBtn").innerText = t("navFinance");
  document.getElementById("navRecoveryBtn").innerText = t("navRecovery");
  document.getElementById("activeTitle").innerText = t("activeTitle");
  document.getElementById("historyTitle").innerText = t("historyTitle");
  document.getElementById("uiAlertOkBtn").innerText = t("uiOk");
  renderBusinessWarning();
}

function renderBusinessWarning() {
  const warningEl = document.getElementById("openWarning");
  if (!warningEl) return;
  warningEl.textContent = businessOpen ? t("openStatusOpen") : t("openStatusClosed");
  warningEl.classList.toggle("open", businessOpen);
}

async function refreshBusinessStatus() {
  const res = await fetch("/business/status");
  if (!res.ok) throw new Error("business-status-failed");
  const data = await res.json();
  businessOpen = !!data.isOpen;
  renderBusinessWarning();
}

function ensureStaffLogin() {
  return window.StaffAuth.ensureLogin();
}

async function authFetch(url, options = {}) {
  try {
    return await window.StaffAuth.authFetch(url, options);
  } catch (err) {
    if (err && err.message === "Unauthorized") {
      alert(t("authFailed"));
    }
    throw err;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function loadKitchen() {
  if (kitchenLoading) return;
  kitchenLoading = true;
  authFetch("/kitchen")
    .then((res) => res.json())
    .then((data) => {
      renderOrders(data);
    })
    .catch((err) => console.error(t("loadFailed"), err))
    .finally(() => {
      kitchenLoading = false;
    });
}

function scheduleKitchenRefresh() {
  if (kitchenRefreshTimer) clearTimeout(kitchenRefreshTimer);
  kitchenRefreshTimer = setTimeout(() => {
    loadKitchen();
  }, 120);
}

function renderOrders(orders) {
  const activeContainer = document.getElementById("active-orders");
  const historyContainer = document.getElementById("history-orders");
  activeContainer.innerHTML = "";
  historyContainer.innerHTML = "";

  const normalized = orders.map((order) => {
    let items = [];
    try {
      items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    } catch (e) {
      items = [];
    }
    if (!Array.isArray(items)) items = [];
    items = items.map((item) => ({
      ...item,
      status: item?.status === "done" ? "done" : "pending",
    }));
    const hasPending = items.some((item) => item.status !== "done");
    return { ...order, parsedItems: items, hasPending };
  });

  const pendingOrders = normalized.filter((o) => o.hasPending);
  const doneOrders = normalized.filter((o) => !o.hasPending && o.parsedItems.length > 0);
  document.getElementById("activeCount").innerText = String(pendingOrders.length);
  document.getElementById("historyCount").innerText = String(Math.min(doneOrders.length, 5));

  pendingOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  doneOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (pendingOrders.length === 0) {
    activeContainer.innerHTML = `<div style="color:#666;">${t("noActive")}</div>`;
  } else {
    pendingOrders.forEach((order) => {
      activeContainer.appendChild(createOrderCard(order, false));
    });
  }
  doneOrders.slice(0, 5).forEach((order) => {
    historyContainer.appendChild(createOrderCard(order, true));
  });
}

function createOrderCard(order, isHistory) {
  const timeObj = new Date(order.created_at);
  const now = new Date();
  const waitMinutes = Math.floor((now - timeObj) / 60000);
  const timeStr =
    timeObj.getHours().toString().padStart(2, "0") +
    ":" +
    timeObj.getMinutes().toString().padStart(2, "0");

  const card = document.createElement("div");
  card.className = isHistory ? "order-card history-card" : "order-card";

  let itemsHtml = "";
  order.parsedItems.forEach((item, idx) => {
    const name = item?.name?.ja || item?.name?.zh || item?.name?.en || "未知菜品";
    const qty = Number(item?.quantity) || 0;
    const itemStatus = item?.status === "done" ? "done" : "pending";
    const statusText = itemStatus === "done" ? t("itemDone") : t("itemPending");
    const buttonText = itemStatus === "done" ? t("btnToPending") : t("btnToDone");
    const nextStatus = itemStatus === "done" ? "pending" : "done";
    itemsHtml += `
      <div class="item-row">
        <div>
          ${escapeHtml(name)} <span style="color:#ff4757; margin-left:10px;">x ${qty}</span>
          <span style="margin-left:10px; font-size:0.7em; color:${itemStatus === "done" ? "#2f9e44" : "#ff7f50"};">${statusText}</span>
        </div>
        <button class="item-btn ${itemStatus}" onclick="updateItemStatus(${order.id}, ${Number(item.id)}, '${nextStatus}', this, ${idx})">${buttonText}</button>
      </div>
    `;
  });

  card.innerHTML = `
    <div class="order-header">
      <div>
        <span class="order-no">#${escapeHtml(order.order_no || order.id)}</span>
        <span style="margin-left:15px; font-size:1.4em; font-weight:bold;">${t("table")}: ${escapeHtml(order.tableId)}</span>
      </div>
      <div style="font-size: 0.9em; color:#666;">
        ${!isHistory && waitMinutes > 10 ? `<span class="wait-warning">${t("waited")} ${waitMinutes}min</span>` : ""}
        ${t("orderedAt")}: ${timeStr}
      </div>
    </div>
    <div class="order-body">${itemsHtml}</div>
  `;
  return card;
}

async function updateItemStatus(orderId, itemId, newStatus, btnEl, lineIndex = -1) {
  const opKey = `${orderId}-${itemId}-${lineIndex}`;
  if (pendingItemOps.has(opKey)) return;
  pendingItemOps.add(opKey);
  if (btnEl) btnEl.disabled = true;
  try {
    const res = await authFetch("/order/item/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: Number(orderId),
        itemId: Number(itemId),
        lineIndex: Number.isInteger(lineIndex) ? lineIndex : -1,
        status: newStatus,
      }),
    });

    if (res.ok) {
      console.log(`order ${orderId} item ${itemId} -> ${newStatus}`);
      scheduleKitchenRefresh();
    } else {
      const errorMsg = await res.text().catch(() => "");
      alert(`${t("opFailed")} ${toLocalizedKitchenError(errorMsg)}`);
    }
  } catch (err) {
    console.error("network error:", err);
    alert(t("networkErr"));
  } finally {
    pendingItemOps.delete(opKey);
    if (btnEl) btnEl.disabled = false;
  }
}

function setupStaffSocket() {
  const token = window.StaffAuth.getToken();
  if (!token) return;
  if (window.StaffAuth.isStaticDemoMode?.()) return;
  if (typeof io !== "function") return;
  const socket = io("/staff", {
    auth: { token },
  });
  socket.on("connect_error", (err) => {
    console.error("WebSocket 鉴权失败:", err.message);
  });
  socket.on("data-updated", () => {
    refreshBusinessStatus().catch(() => {});
    scheduleKitchenRefresh();
  });
}

if (ensureStaffLogin()) {
  renderText();
  window.StaffSettingsUi?.setup();
  refreshBusinessStatus().catch(() => {});
  loadKitchen();
  setupStaffSocket();
}
