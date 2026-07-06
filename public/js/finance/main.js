function installStyledAlert() {
  const modal = document.getElementById("uiAlertModal");
  const messageEl = document.getElementById("uiAlertMessage");
  const okBtn = document.getElementById("uiAlertOkBtn");
  const cancelBtn = document.getElementById("uiAlertCancelBtn");
  if (!modal || !messageEl || !okBtn || !cancelBtn) return;
  let resolver = null;
  let confirmMode = false;
  const setModalMessage = (message) => {
    const raw = String(message ?? "");
    messageEl.innerHTML = "";
    const lines = raw.split("\n");
    lines.forEach((line, index) => {
      const text = line.trim();
      if (!text) {
        const gap = document.createElement("div");
        gap.className = "ui-alert-gap";
        messageEl.appendChild(gap);
        return;
      }
      const row = document.createElement("div");
      row.className = "ui-alert-line";
      if (index === 0) row.classList.add("heading");
      if (text.endsWith("：") || text.endsWith(":")) row.classList.add("note");
      if (text.includes("|||")) {
        row.classList.add("kv");
        const [left, right] = text.split("|||");
        const label = document.createElement("span");
        label.className = "ui-alert-kv-label";
        label.textContent = left;
        const value = document.createElement("span");
        value.className = "ui-alert-kv-value";
        value.textContent = right || "";
        row.appendChild(label);
        row.appendChild(value);
      } else {
        if (text.startsWith("- ")) row.style.paddingLeft = "14px";
        row.textContent = text;
      }
      messageEl.appendChild(row);
    });
  };
  const close = (result) => {
    modal.classList.remove("show");
    cancelBtn.classList.remove("show");
    if (resolver) {
      const fn = resolver;
      resolver = null;
      fn(result);
    }
  };
  window.alert = (message) => {
    confirmMode = false;
    setModalMessage(message);
    cancelBtn.classList.remove("show");
    modal.classList.add("show");
    okBtn.focus();
  };
  window.uiConfirm = (message) =>
    new Promise((resolve) => {
      resolver = resolve;
      confirmMode = true;
      setModalMessage(message);
      cancelBtn.classList.add("show");
      modal.classList.add("show");
      okBtn.focus();
    });
  okBtn.addEventListener("click", () => close(true));
  cancelBtn.addEventListener("click", () => close(false));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close(!confirmMode);
  });
}

installStyledAlert();

let revenue = 0;
let cashRevenue = 0;
let paypayRevenue = 0;
let alipayRevenue = 0;
let customerCount = 0;
let avgTicketPrice = 0;
const DEFAULT_FLOAT_CASH = 80000;
let financeRefreshTimer = null;
let summaryLoading = false;
let businessOpen = false;
let currentLang = window.StaffAuth.getLang("ja");
const text = {
  ja: {
    title: "📅 日次精算",
    labelRevenue: "本日の売上",
    labelCustomerCount: "客数",
    labelAvgTicket: "客単価",
    labelCashRevenue: "現金売上",
    labelPaypayRevenue: "PayPay売上",
    labelWechatRevenue: "Alipay売上",
    labelExpense: "本日の支出",
    labelFloat: "レジ現金",
    labelDeposit: "銀行入金予定（現金）",
    labelTheoryCash: "理論現金（レジ内）",
    labelCashCheck: "🔍 レジ総現金",
    navAdmin: "レジ",
    navKitchen: "厨房",
    navFinance: "財務",
    navRecovery: "点検",
    cashPlaceholder: "現在のレジ内総現金を入力",
    startBtn: "🌅 営業開始",
    logoutBtn: "ログアウト",
    openStatusOpen: "営業中",
    openStatusClosed: "未開始",
    startConfirm: "レジ予備金 ¥{floatCash} を確認しました。営業開始しますか？",
    startNeedFloat: "予備金が ¥80,000 であることを確認してから開始してください",
    startSuccess: "営業を開始しました。",
    alreadyOpen: "すでに営業中です。",
    logoutConfirm: "現在のアカウントからログアウトしますか？",
    closeBtn: "🌙 営業終了して締め処理",
    tokenPrompt: "財務アクセス用トークンを入力してください",
    authFailed: "認証に失敗しました。トークンを再入力してください",
    summaryFail: "財務データを取得できません",
    dataLoadFail:
      "データ読み込みに失敗しました。サーバー接続を確認してください",
    match: "✅ 帳尻一致",
    mismatch: "⚠️ 帳尻不一致：{type} ¥{amount}",
    extra: "過剰",
    shortage: "不足",
    confirmClose:
      "本日の入金予定額は ¥{deposit} です。締め処理を実行しますか？",
    closing: "締め処理中...",
    closeFail: "締め処理に失敗しました",
    closeSuccess:
      "精算完了。銀行入金分を取り出し、80,000 の予備金をレジに残してください。",
    closeError: "締め処理エラー。再試行してください",
    closeCheckTitle: "締め処理前チェック",
    closeCheckMismatchTitle: "以下の項目が理論値と一致しないため、締め処理できません：",
    closeCheckConfirm: "すべて一致しました。締め処理を実行しますか？",
    closeCheckNeedActualCash: "レジ総現金が未入力です",
    checkDeposit: "銀行入金予定（現金）",
    checkActualCash: "レジ総現金",
    expectedValueLabel: "理論値",
    actualValueLabel: "入力値",
    closeInitTitle: "初期化確認",
    closeInitAfterCloseHint: "以下は締め処理完了後に戻る初期化結果です：",
    closeInitConfirm: "締め処理後、レジが初期化状態に戻ることを確認しましたか？",
    closeInitRevenue: "本日の売上",
    closeInitCashRevenue: "現金売上",
    closeInitPaypayRevenue: "PayPay売上",
    closeInitWechatRevenue: "Alipay売上",
    closeInitExpense: "本日の支出",
    closeInitFloatCash: "レジ現金",
    closeInitDeposit: "銀行入金予定（現金）",
    closeInitActualCash: "レジ総現金",
    exportCsvBtn: "CSV出力",
    exportStartDate: "開始日",
    exportEndDate: "終了日",
    exportDateRangeInvalid: "期間指定が不正です。開始日と終了日を確認してください",
    exportCsvFail: "CSV出力に失敗しました",
    uiOk: "確定",
    uiCancel: "キャンセル",
  },
  zh: {
    title: "📅 每日盘点",
    labelRevenue: "今日营业额",
    labelCustomerCount: "客数",
    labelAvgTicket: "客单价",
    labelCashRevenue: "现金收款",
    labelPaypayRevenue: "PayPay收款",
    labelWechatRevenue: "支付宝收款",
    labelExpense: "今日支出",
    labelFloat: "现金储备",
    labelDeposit: "银行预入金（现金）",
    labelTheoryCash: "理论现金数额",
    labelCashCheck: "🔍 柜台总现金",
    navAdmin: "收银台",
    navKitchen: "厨房",
    navFinance: "财务",
    navRecovery: "自检",
    cashPlaceholder: "输入当前柜台总现金",
    startBtn: "🌅 开始营业",
    logoutBtn: "退出账号",
    openStatusOpen: "营业中",
    openStatusClosed: "未开始营业",
    startConfirm: "已确认预备金为 ¥{floatCash}，现在开始营业吗？",
    startNeedFloat: "请先确认预备金为 ¥80,000 后再开始营业",
    startSuccess: "已开始营业，系统进入正常运行状态。",
    alreadyOpen: "当前已经是营业中状态。",
    logoutConfirm: "确认退出当前账号吗？",
    closeBtn: "🌙 结束营业并封账",
    tokenPrompt: "请输入财务访问令牌",
    authFailed: "鉴权失败，请重新输入令牌",
    summaryFail: "无法获取财务数据",
    dataLoadFail: "数据加载失败，请检查服务器连接",
    match: "✅ 账实相符",
    mismatch: "⚠️ 账实不符：{type} ¥{amount}",
    extra: "多出",
    shortage: "短缺",
    confirmClose: "今日预入金为 ¥{deposit}。确认封账归档吗？",
    closing: "正在封账...",
    closeFail: "封账失败",
    closeSuccess: "盘点成功！请将银行预入金取出，留存 80,000 备用金在。",
    closeError: "封账出错，请重试",
    closeCheckTitle: "封账前核对",
    closeCheckMismatchTitle: "以下项目与理论值不一致，无法封账：",
    closeCheckConfirm: "全部一致，确认执行封账吗？",
    closeCheckNeedActualCash: "柜台总现金未填写",
    checkDeposit: "银行预入金（现金）",
    checkActualCash: "柜台总现金",
    expectedValueLabel: "理论",
    actualValueLabel: "输入",
    closeInitTitle: "初始化确认",
    closeInitAfterCloseHint: "以下为封账完成后应恢复的初始化结果：",
    closeInitConfirm: "请确认封账后柜台已恢复初始化状态，是否继续？",
    closeInitRevenue: "今日营业额",
    closeInitCashRevenue: "现金收款",
    closeInitPaypayRevenue: "PayPay收款",
    closeInitWechatRevenue: "支付宝收款",
    closeInitExpense: "今日支出",
    closeInitFloatCash: "现金储备",
    closeInitDeposit: "银行预入金（现金）",
    closeInitActualCash: "柜台总现金",
    exportCsvBtn: "导出CSV",
    exportStartDate: "开始日期",
    exportEndDate: "结束日期",
    exportDateRangeInvalid: "日期范围无效，请检查开始和结束日期",
    exportCsvFail: "导出CSV失败，请稍后重试",
    uiOk: "确定",
    uiCancel: "取消",
  },
};
function t(key) {
  return text[currentLang][key];
}
function setLang(lang) {
  currentLang = lang;
  window.StaffAuth.setLang(lang);
  renderText();
  calculateBankDeposit();
}
function openModule(path) {
  window.open(path, "_blank", "noopener");
}
function renderText() {
  document.documentElement.lang = currentLang === "ja" ? "ja" : "zh";
  window.StaffSettingsUi?.renderLabels();
  document.getElementById("navAdminBtn").innerText = t("navAdmin");
  document.getElementById("navKitchenBtn").innerText = t("navKitchen");
  document.getElementById("navFinanceBtn").innerText = t("navFinance");
  document.getElementById("navRecoveryBtn").innerText = t("navRecovery");
  document.getElementById("title").innerText = t("title");
  document.getElementById("labelRevenue").innerText = t("labelRevenue");
  document.getElementById("labelCustomerCount").innerText = t("labelCustomerCount");
  document.getElementById("labelAvgTicket").innerText = t("labelAvgTicket");
  document.getElementById("labelExpense").innerText = t("labelExpense");
  document.getElementById("labelCashRevenue").innerText = t("labelCashRevenue");
  document.getElementById("labelPaypayRevenue").innerText =
    t("labelPaypayRevenue");
  document.getElementById("labelWechatRevenue").innerText =
    t("labelWechatRevenue");
  document.getElementById("labelFloat").innerText = t("labelFloat");
  document.getElementById("labelDeposit").innerText = t("labelDeposit");
  document.getElementById("labelTheoryCash").innerText = t("labelTheoryCash");
  document.getElementById("labelCashCheck").innerText = t("labelCashCheck");
  document.getElementById("actual-cash").placeholder = t("cashPlaceholder");
  document.getElementById("startBtn").innerText = t("startBtn");
  document.getElementById("logoutBtn").innerText = t("logoutBtn");
  document.getElementById("closeBtn").innerText = t("closeBtn");
  document.getElementById("exportCsvBtn").innerText = t("exportCsvBtn");
  const exportStart = document.getElementById("export-start-date");
  if (exportStart) {
    exportStart.setAttribute("aria-label", t("exportStartDate"));
    exportStart.title = t("exportStartDate");
  }
  const exportEnd = document.getElementById("export-end-date");
  if (exportEnd) {
    exportEnd.setAttribute("aria-label", t("exportEndDate"));
    exportEnd.title = t("exportEndDate");
  }
  document.getElementById("uiAlertOkBtn").innerText = t("uiOk");
  document.getElementById("uiAlertCancelBtn").innerText = t("uiCancel");
  renderBusinessStatus();
}

function getTokyoDateString(date = new Date()) {
  const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
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

function loadSummary() {
  if (summaryLoading) return;
  summaryLoading = true;
  authFetch("/finance/summary")
    .then((res) => {
      if (!res.ok) throw new Error(t("summaryFail"));
      return res.json();
    })
    .then((data) => {
      revenue = parseFloat(data.total_revenue) || 0;
      cashRevenue = parseFloat(data.cash_revenue) || 0;
      paypayRevenue = parseFloat(data.paypay_revenue) || 0;
      alipayRevenue = parseFloat(data.alipay_revenue ?? data.wechat_revenue) || 0;
      customerCount = Number(data.customer_count) || 0;
      avgTicketPrice = Number(data.avg_ticket_price) || 0;
      document.getElementById("total-revenue").innerText =
        "¥" + revenue.toLocaleString();
      document.getElementById("customer-count").innerText =
        customerCount.toLocaleString();
      document.getElementById("avg-ticket").innerText =
        "¥" + avgTicketPrice.toLocaleString(undefined, { maximumFractionDigits: 1 });
      document.getElementById("cash-revenue").innerText =
        "¥" + cashRevenue.toLocaleString();
      document.getElementById("paypay-revenue").innerText =
        "¥" + paypayRevenue.toLocaleString();
      document.getElementById("wechat-revenue").innerText =
        "¥" + alipayRevenue.toLocaleString();
      calculateBankDeposit();
    })
    .catch((err) => {
      console.error(err);
      alert(t("dataLoadFail"));
    })
    .finally(() => {
      summaryLoading = false;
    });
}

function scheduleFinanceRefresh() {
  if (financeRefreshTimer) clearTimeout(financeRefreshTimer);
  financeRefreshTimer = setTimeout(() => {
    loadSummary();
  }, 120);
}

function calculateBankDeposit() {
  const exp = parseFloat(document.getElementById("expenses").value) || 0;
  const floatCash =
    parseFloat(document.getElementById("float-cash").value) || 0;
  const actual = parseFloat(document.getElementById("actual-cash").value) || 0;

  const deposit = cashRevenue - exp;
  const theoryInDrawer = Number(floatCash) + Number(cashRevenue) - Number(exp);
  const diff = actual - theoryInDrawer;

  document.getElementById("bank-deposit").innerText =
    "¥" + deposit.toLocaleString();
  document.getElementById("theory-cash").innerText =
    "¥" + theoryInDrawer.toLocaleString();

  const report = document.getElementById("diff-report");
  if (actual > 0) {
    if (diff === 0) {
      report.innerText = t("match");
      report.style.color = "green";
    } else {
      report.innerText = t("mismatch")
        .replace("{type}", diff > 0 ? t("extra") : t("shortage"))
        .replace("{amount}", Math.abs(diff).toLocaleString());
      report.style.color = "red";
    }
  } else {
    report.innerText = "";
  }
}

async function fetchLatestSummaryForCloseCheck() {
  const res = await authFetch("/finance/summary");
  if (!res.ok) throw new Error("close-check-summary-failed");
  const data = await res.json();
  return {
    totalRevenue: Number(data?.total_revenue) || 0,
    cashRevenue: Number(data?.cash_revenue) || 0,
    paypayRevenue: Number(data?.paypay_revenue) || 0,
    wechatRevenue: Number(data?.alipay_revenue ?? data?.wechat_revenue) || 0,
  };
}

function buildCloseCheckMismatches({
  expectedDeposit,
  expectedActualCash,
  inputDeposit,
  actualCash,
}) {
  const issues = [];
  if (inputDeposit !== expectedDeposit) {
    issues.push(
      `${t("checkDeposit")}（${t("expectedValueLabel")}：¥${expectedDeposit} / ${t("actualValueLabel")}：¥${inputDeposit}）`,
    );
  }
  if (!Number.isFinite(actualCash)) {
    issues.push(t("closeCheckNeedActualCash"));
  } else if (actualCash !== expectedActualCash) {
    issues.push(
      `${t("checkActualCash")}（${t("expectedValueLabel")}：¥${expectedActualCash} / ${t("actualValueLabel")}：¥${actualCash}）`,
    );
  }
  return issues;
}

function renderBusinessStatus() {
  const statusEl = document.getElementById("openStatus");
  const topEl = document.getElementById("openStatusTop");
  const startBtn = document.getElementById("startBtn");
  const closeBtn = document.getElementById("closeBtn");
  if (!statusEl) return;
  const statusText = businessOpen ? t("openStatusOpen") : t("openStatusClosed");
  statusEl.innerText = statusText;
  if (startBtn) {
    startBtn.disabled = businessOpen;
    startBtn.title = businessOpen ? t("alreadyOpen") : "";
  }
  if (closeBtn) {
    closeBtn.disabled = !businessOpen;
    closeBtn.title = businessOpen ? "" : t("openStatusClosed");
  }
  if (topEl) {
    topEl.innerText = statusText;
    topEl.classList.toggle("open", businessOpen);
  }
}

async function refreshBusinessStatus() {
  const res = await fetch("/business/status");
  if (!res.ok) throw new Error("business-status-failed");
  const data = await res.json();
  businessOpen = !!data.isOpen;
  renderBusinessStatus();
}

async function startBusiness() {
  if (businessOpen) {
    alert(t("alreadyOpen"));
    return;
  }
  const floatCash =
    parseFloat(document.getElementById("float-cash").value) || 0;
  if (Math.round(floatCash) !== DEFAULT_FLOAT_CASH) {
    alert(t("startNeedFloat"));
    return;
  }
  const confirmed = await window.uiConfirm(
    t("startConfirm").replace("{floatCash}", floatCash.toLocaleString()),
  );
  if (!confirmed) return;
  const res = await authFetch("/business/start", { method: "POST" });
  if (!res.ok) {
    if (res.status === 409) {
      alert(t("alreadyOpen"));
      await refreshBusinessStatus();
      return;
    }
    throw new Error("start-business-failed");
  }
  await refreshBusinessStatus();
  alert(t("startSuccess"));
}

async function logout() {
  const confirmed = await window.uiConfirm(t("logoutConfirm"));
  if (!confirmed) return;
  window.StaffAuth.clearToken();
  window.location.href = "/login.html";
}

document.getElementById("actual-cash").oninput = calculateBankDeposit;

async function closeDay() {
  let safeExpenses = 0;
  let expectedDeposit = 0;
  try {
    const latest = await fetchLatestSummaryForCloseCheck();
    const expenses = parseFloat(document.getElementById("expenses").value);
    const floatCash = parseFloat(document.getElementById("float-cash").value);
    const actualCashRaw = parseFloat(
      document.getElementById("actual-cash").value,
    );
    const actualCash = Number.isFinite(actualCashRaw)
      ? actualCashRaw
      : Number.NaN;
    safeExpenses = Number.isFinite(expenses) ? expenses : 0;
    const safeFloatCash = Number.isFinite(floatCash) ? floatCash : 0;
    expectedDeposit = latest.cashRevenue - safeExpenses;
    const expectedActualCash =
      safeFloatCash + latest.cashRevenue - safeExpenses;
    const inputDeposit =
      Number(
        document
          .getElementById("bank-deposit")
          .innerText.replace(/[^\d.-]/g, ""),
      ) || 0;
    const mismatches = buildCloseCheckMismatches({
      expectedDeposit,
      expectedActualCash,
      inputDeposit,
      actualCash,
    });
    if (mismatches.length > 0) {
      alert(`${t("closeCheckMismatchTitle")}\n\n- ${mismatches.join("\n- ")}`);
      return;
    }
    const ok = await window.uiConfirm(
      `${t("closeCheckTitle")}\n\n${t("closeCheckConfirm")}\n\n${t("checkDeposit")}|||¥${expectedDeposit}\n${t("checkActualCash")}|||¥${expectedActualCash}`,
    );
    if (!ok) return;
    const initConfirm = await window.uiConfirm(
      `${t("closeInitTitle")}\n\n${t("closeInitAfterCloseHint")}\n\n${t("closeInitRevenue")}|||¥0\n${t("closeInitCashRevenue")}|||¥0\n${t("closeInitPaypayRevenue")}|||¥0\n${t("closeInitWechatRevenue")}|||¥0\n${t("closeInitExpense")}|||¥0\n${t("closeInitFloatCash")}|||¥${DEFAULT_FLOAT_CASH}\n${t("closeInitDeposit")}|||¥0\n${t("closeInitActualCash")}|||${Number.isFinite(actualCash) ? `¥${actualCash - expectedDeposit}` : "-"}\n\n${t("closeInitConfirm")}`,
    );
    if (!initConfirm) return;
  } catch (err) {
    alert(t("closeError"));
    return;
  }

  const btn = document.querySelector(".btn-close");
  btn.disabled = true;
  btn.innerText = t("closing");

  authFetch("/finance/close-day", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      expenses: safeExpenses,
      bank_deposit: expectedDeposit,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error(t("closeFail"));
      alert(t("closeSuccess"));
      window.StaffAuth.clearToken();
      window.location.href = "/login.html";
    })
    .catch(() => {
      alert(t("closeError"));
      btn.disabled = false;
      btn.innerText = t("closeBtn");
    });
}

async function exportFinanceCsv() {
  const today = getTokyoDateString();
  const startInput = document.getElementById("export-start-date");
  const endInput = document.getElementById("export-end-date");
  const startDate = String(startInput?.value || "").trim() || today;
  const endDate = String(endInput?.value || "").trim() || today;
  if (startDate > endDate) {
    alert(t("exportDateRangeInvalid"));
    return;
  }
  const response = await authFetch(
    `/finance/export-csv?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
  );
  if (!response.ok) {
    alert(t("exportCsvFail"));
    return;
  }
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    startDate === endDate
      ? `finance-${startDate}.csv`
      : `finance-${startDate}_to_${endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

if (ensureStaffLogin()) {
  renderText();
  window.StaffSettingsUi?.setup();
  document.getElementById("float-cash").value = String(DEFAULT_FLOAT_CASH);
  const today = getTokyoDateString();
  document.getElementById("export-start-date").value = today;
  document.getElementById("export-end-date").value = today;
  loadSummary();
  refreshBusinessStatus().catch(() => {});
}
function setupStaffSocket() {
  const token = window.StaffAuth.getToken();
  if (!token) return;
  const socket = io("/staff", {
    auth: { token },
  });
  socket.on("connect_error", (err) => {
    console.error("WebSocket 鉴权失败:", err.message);
  });
  socket.on("data-updated", () => {
    scheduleFinanceRefresh();
    refreshBusinessStatus().catch(() => {});
  });
}
if (ensureStaffLogin()) setupStaffSocket();
