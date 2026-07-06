(function recoveryPage() {
  if (!window.StaffAuth) {
    console.warn("[staff-auth] missing, using fallback bridge");
    window.StaffAuth = {
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
  }
  const auth = window.StaffAuth;
  let currentLang = auth.getLang("ja");

  const text = {
    ja: {
      title: "🛠 開機セルフチェック",
      overviewTitle: "主要指標",
      logsTitle: "最近の重要操作",
      refreshBtn: "再チェック",
      backFinanceBtn: "財務ページを開く",
      kBusiness: "営業状態",
      kActive: "未完了注文数",
      kCheckout: "会計待ちリクエスト",
      kInflight: "処理中リクエスト(異常候補)",
      businessOpen: "営業中",
      businessClosed: "停止営業",
      verdict_open_ready:
        "営業開始前です。予備金確認後に「営業開始」を押してください。",
      verdict_running_ok: "正常です。営業を継続できます。",
      verdict_retry_later:
        "処理中リクエストが残っています。30秒後に再チェックしてください。",
      verdict_db_integrity_fail:
        "データベース整合性に問題があります。会計を止め、バックアップ復元または担当者へ連絡してください。",
      verdict_system_error: "システム接続異常です。責任者に連絡してください。",
      tip: "店員向け判断: 緑=そのまま運用、橙/赤=再確認してから運用。赤かつDB異常=会計停止。",
      kDbIntegrity: "データファイル検査",
      kDbMode: "保存モード(WAL/同期)",
      dbIntegrityOk: "問題なし(quick_check)",
      dbIntegrityBadPrefix: "要確認:",
      noLogs: "ログはまだありません",
      updatedAtPrefix: "更新時刻",
    },
    zh: {
      title: "🛠 开机自检",
      overviewTitle: "关键指标",
      logsTitle: "最近关键操作",
      refreshBtn: "重新检查",
      backFinanceBtn: "打开财务页",
      kBusiness: "营业状态",
      kActive: "未完成订单数",
      kCheckout: "待结账请求数",
      kInflight: "处理中请求数(异常候选)",
      businessOpen: "正在营业",
      businessClosed: "停止营业",
      verdict_open_ready: "当前未开始营业。请先确认预备金并点击“开始营业”。",
      verdict_running_ok: "系统正常，可以继续营业。",
      verdict_retry_later: "有请求还在处理中。请等待 30 秒后再自检一次。",
      verdict_db_integrity_fail:
        "数据库自检未通过：请先停止收银，从备份恢复或联系负责人，勿继续使用本机数据库。",
      verdict_system_error: "系统连接异常，请联系负责人处理。",
      tip: "店员判断：绿色可继续；橙/红色先排查；红色且数据库异常须停止收银。",
      kDbIntegrity: "数据库文件自检",
      kDbMode: "持久化模式 (WAL/同步)",
      dbIntegrityOk: "正常 (quick_check)",
      dbIntegrityBadPrefix: "需处理:",
      noLogs: "暂无日志",
      updatedAtPrefix: "更新时间",
    },
  };

  function t(key) {
    return text[currentLang][key];
  }

  /** 自检页曾因 HTML 与脚本不同步出现过缺节点；容错避免整页报错。 */
  function setInner(id, value) {
    const el = document.getElementById(id);
    if (el != null) el.innerText = value;
  }

  function syncName(n) {
    const ja = { 0: "OFF", 1: "NORMAL", 2: "FULL", 3: "EXTRA" };
    const zh = { 0: "关", 1: "标准", 2: "完全", 3: "额外" };
    const map = currentLang === "ja" ? ja : zh;
    return map[n] != null ? map[n] : String(n);
  }

  function formatDbMode(data) {
    const jm = String(data.dbJournalMode || "?").toUpperCase();
    const sn = syncName(Number(data.dbSynchronous));
    return `${jm} · sync ${sn}`;
  }

  function fmtDbIntegrityLine(data) {
    if (data.dbQuickCheckOk) return t("dbIntegrityOk");
    const msg = Array.isArray(data.dbQuickCheckMessages)
      ? data.dbQuickCheckMessages[0]
      : "";
    const short = msg ? String(msg).slice(0, 160) : "";
    return short ? `${t("dbIntegrityBadPrefix")} ${short}` : t("dbIntegrityBadPrefix");
  }

  function fmtTime(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2, "0")}:${d
      .getMinutes()
      .toString()
      .padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  }

  function renderText() {
    document.documentElement.lang = currentLang === "ja" ? "ja" : "zh";
    window.StaffSettingsUi?.renderLabels();
    setInner("title", t("title"));
    setInner("overviewTitle", t("overviewTitle"));
    setInner("logsTitle", t("logsTitle"));
    setInner("refreshBtn", t("refreshBtn"));
    setInner("backFinanceBtn", t("backFinanceBtn"));
    setInner("kBusiness", t("kBusiness"));
    setInner("kActive", t("kActive"));
    setInner("kCheckout", t("kCheckout"));
    setInner("kInflight", t("kInflight"));
    setInner("kDbIntegrity", t("kDbIntegrity"));
    setInner("kDbMode", t("kDbMode"));
    setInner("tip", t("tip"));
  }

  async function loadCheck() {
    if (!auth.ensureLogin()) return;
    const verdictEl = document.getElementById("verdict");
    const logsEl = document.getElementById("logs");
    try {
      const res = await auth.authFetch("/recovery/check");
      const data = await res.json();
      const code = data?.verdict?.actionCode || "system_error";
      const level = data?.verdict?.level || "danger";
      const verdictKey = `verdict_${code}`;
      verdictEl.className = `verdict ${level}`;
      verdictEl.innerText = t(verdictKey) || t("verdict_system_error");
      setInner("updatedAt", `${t("updatedAtPrefix")}: ${fmtTime(data.timestamp)}`);
      setInner("vBusiness", data.businessOpen ? t("businessOpen") : t("businessClosed"));
      setInner("vActive", String(data.activeOrders || 0));
      setInner("vCheckout", String(data.checkoutRequests || 0));
      setInner("vInflight", String(data.inFlightRequests || 0));
      setInner("vDbIntegrity", fmtDbIntegrityLine(data));
      setInner("vDbMode", formatDbMode(data));

      logsEl.innerHTML = "";
      const logs = Array.isArray(data.recentLogs) ? data.recentLogs : [];
      if (logs.length === 0) {
        logsEl.innerHTML = `<li>${t("noLogs")}</li>`;
      } else {
        logs.forEach((log) => {
          const li = document.createElement("li");
          li.innerText = `${fmtTime(log.created_at)}  ${log.action}  ${
            log.table_id || "-"
          }`;
          logsEl.appendChild(li);
        });
      }
    } catch (err) {
      verdictEl.className = "verdict danger";
      verdictEl.innerText = t("verdict_system_error");
      setInner("vDbIntegrity", "—");
      setInner("vDbMode", "—");
      logsEl.innerHTML = `<li>${t("noLogs")}</li>`;
    }
  }

  function setLang(lang) {
    currentLang = lang;
    auth.setLang(lang);
    renderText();
    loadCheck();
  }

  window.setLang = setLang;
  window.loadCheck = loadCheck;

  renderText();
  window.StaffSettingsUi?.setup();
  loadCheck();
})();
