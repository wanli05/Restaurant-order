/**
 * 后台非 admin 页面共用：设置（TOTP / 令牌说明 / 关于）+ Authenticator 绑定弹窗。
 * 依赖：先加载 /js/shared/staff-auth.js
 * 页面需在 body 内包含 settings 按钮、菜单与各 modal（id 与 admin.html 一致）。
 */
(function staffSettingsUiBootstrap() {
  const TEXT = {
    ja: {
      managerTotpBindModalTitle: "🔐 Authenticator を登録",
      managerTotpBindModalIntro:
        "決済済み注文の訂正・削除には Authenticator が必要です。アプリで QR を読み取り、表示された 6 桁コードで確定してください。",
      managerTotpSecretCaption: "手入力用キー（Base32）",
      managerTotpConfirmLabel: "アプリに表示される6桁コード",
      managerTotpConfirmBtn: "登録を確定",
      managerTotpCancelBtn: "キャンセル",
      managerTotpCodeRequired: "6桁の数字コードを入力してください",
      managerTotpEnrollOk: "Authenticator の登録が完了しました",
      managerTotpEnrollFail: "登録に失敗しました",
      adminSettingsTriggerTitle: "設定",
      adminSettingsMenuTotp: "Authenticator（TOTP）の登録・変更",
      adminSettingsMenuToken: "ログインとトークンについて",
      adminSettingsMenuAbout: "バージョンとヘルプ",
      adminSettingsTotpPendingBlocked:
        "Authenticator の登録手続きが進行中です。登録モーダルを完了するか、背景をタップしてキャンセルしてから再度お試しください。",
      adminSettingsTotpNeedsLogin: "この操作にはログイン後のスタッフ権限が必要です。先にログインしてください。",
      adminTokenHelpTitle: "ログインとトークン",
      adminTokenHelpBody:
        "・ログイン：ログインページで入力した「スタッフ用トークン」はブラウザに保存され、このページの閲覧や通常の操作に使われます。\n・Authenticator（TOTP）：決済済み注文の訂正・削除など、より強い確認が必要な操作のときだけ入力します。\nどちらも別物です。スタッフ用トークンを変えたい場合はログインページからやり直してください。",
      adminTokenHelpRelogin: "再ログイン（スタッフ用トークンをクリア）",
      adminTokenHelpReloginConfirm: "スタッフ用トークンを破棄しログインページへ移動します。よろしいですか？",
      adminAboutTitle: "バージョンとヘルプ",
      adminAboutVersionPrefix: "バージョン ",
      adminAboutBody:
        "【画面の役割】\n店舗レジ・管理向けウェブ画面。注文確認、会計依頼の処理、テーブル状況および会計履歴の参照等を行う。画面上部リンクより厨房・財務等関連画面を別タブで開く。\n\n【主な機能】\n・来客対応及び会計処理（現金・電子決済等）。\n・会計済み伝票の訂正・削除（業務上許容される場合。当該操作には Authenticator による 6 桁コード確認を要する）。\n・右上「設定」：Authenticator の登録・付け替え、ログイン／トークン説明、本ヘルプ。\n\n【障害・異常時】\n表示不良、エラー、金額・状態の不一致等についても、端末の設定又はファイルを無断で変更しないこと。事象を記録し又は画面を保存のうえ、店長・店舗担当者又はシステム管理者へ連絡する。\n機種変更等により Authenticator が利用できない場合、「設定」から QR による再登録を試行する。改善しないときは同様に担当者へ相談する。",
      adminAboutOk: "閉じる",
      adminTotpRotateTitle: "Authenticator の付け替え",
      adminTotpRotateHint:
        "現在の Authenticator に表示されている 6 桁コードを入力すると、新しい QR が発行されます。旧端末のコードは確認後は無効になります。",
      adminTotpRotateLabel: "現在の 6 桁コード",
      adminTotpRotateNextBtn: "次へ（QR を表示）",
      adminTotpRotateCancel: "キャンセル",
      uiOk: "確定",
      uiCancel: "キャンセル",
    },
    zh: {
      managerTotpBindModalTitle: "🔐 绑定动态口令",
      managerTotpBindModalIntro:
        "纠错修改或删除已结账订单需要使用 Authenticator。请用手机应用扫描下方二维码，输入应用中显示的 6 位码完成首次绑定。",
      managerTotpSecretCaption: "手动输入密钥（Base32）",
      managerTotpConfirmLabel: "应用中显示的 6 位验证码",
      managerTotpConfirmBtn: "确认完成绑定",
      managerTotpCancelBtn: "取消",
      managerTotpCodeRequired: "请填写 6 位数字验证码",
      managerTotpEnrollOk: "Authenticator 已绑定成功",
      managerTotpEnrollFail: "绑定失败",
      adminSettingsTriggerTitle: "设置",
      adminSettingsMenuTotp: "绑定 / 管理动态口令（TOTP）",
      adminSettingsMenuToken: "当前登录 / 令牌说明",
      adminSettingsMenuAbout: "关于 / 版本与帮助",
      adminSettingsTotpPendingBlocked:
        "动态口令绑定尚未完成。请先完成绑定弹窗，或点击遮罩关闭以取消后再试。",
      adminSettingsTotpNeedsLogin: "需要先登录并获得员工令牌后才能绑定动态口令。",
      adminTokenHelpTitle: "当前登录与令牌说明",
      adminTokenHelpBody:
        "· 登录：您在登录页输入的「员工令牌」保存在本机浏览器中，用于打开后台与日常操作。\n· 动态口令（TOTP / Authenticator）：仅在修改或删除已结账订单等敏感操作时作为第二步校验使用。\n二者不同。若要更换员工令牌，请使用下方「重新登录」。",
      adminTokenHelpRelogin: "重新登录（清除员工令牌）",
      adminTokenHelpReloginConfirm: "将清除员工令牌并跳转到登录页，确定吗？",
      adminAboutTitle: "关于 / 版本与帮助",
      adminAboutVersionPrefix: "版本 ",
      adminAboutBody:
        "【页面用途】\n本页为门店收银及管理后台，承担订单查阅、结账处理、桌台状态与历史账单查询；顶部导航可新开页面进入厨房、财务等关联模块。\n\n【主要功能】\n· 点餐与结账（现金及常用电子支付）。\n· 已结账订单之纠错修改或删除（须符合业务规则，并以 Authenticator 动态口令复核）。\n· 右上「设置」：验证器绑定与轮换、登录及令牌说明、本帮助。\n\n【异常处置】\n页面不可用、系统报错或账务显示异常时，不得擅自变更终端软硬件配置或删除文件；应留存文字记录或截图，报送店长、门店指定负责人或系统维护人员处置。\n因终端变更等致 Authenticator 不可用时，可于「设置」依指引扫码重新绑定；若仍未解决，请联系上述人员。",
      adminAboutOk: "关闭",
      adminTotpRotateTitle: "更换动态口令绑定",
      adminTotpRotateHint:
        "请输入当前 Authenticator 上的 6 位验证码，验证通过后将显示新的二维码供重新绑定。旧设备上的密钥将不再有效。",
      adminTotpRotateLabel: "当前 6 位验证码",
      adminTotpRotateNextBtn: "下一步（显示二维码）",
      adminTotpRotateCancel: "取消",
      uiOk: "确定",
      uiCancel: "取消",
    },
  };

  let uiBound = false;
  let enrollUiBound = false;
  let totpEnrolled = false;
  let totpPending = false;

  function lang() {
    const auth = window.StaffAuth;
    return auth && typeof auth.getLang === "function" ? auth.getLang("ja") : "ja";
  }

  function ts(key) {
    const L = lang();
    return TEXT[L]?.[key] ?? TEXT.ja[key] ?? key;
  }

  function normalizeTotp(raw) {
    if (raw == null || raw === "") return "";
    if (typeof raw === "number" && Number.isFinite(raw)) {
      const n = Math.floor(Math.abs(raw)) % 1000000;
      return String(n).padStart(6, "0");
    }
    const normalized = String(raw).normalize("NFKC");
    const compact = normalized
      .replace(/[\s\u200b-\u200d\ufeff]/g, "")
      .replace(/,/g, "");
    if (/^\d{6}$/.test(compact)) return compact;
    const embedded = normalized.match(/\d{6}/);
    return embedded ? embedded[0] : "";
  }

  function headersWithTotpJson(code) {
    return {
      "Content-Type": "application/json",
      "x-manager-totp": String(code),
    };
  }

  async function readHttpErrorMessage(res) {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        const j = await res.json();
        return String(j.error || j.message || "").trim() || res.statusText;
      } catch {
        return res.statusText;
      }
    }
    return (await res.text().catch(() => "")).trim() || res.statusText;
  }

  function getAppVersion() {
    const meta = document.querySelector('meta[name="app-version"]');
    const raw = meta?.getAttribute("content");
    const v = raw != null ? String(raw).trim() : "";
    return v || "1.0.0";
  }

  async function refreshTotpStatus() {
    try {
      const res = await window.StaffAuth.authFetch("/auth/manager-totp/status");
      if (!res.ok) {
        totpEnrolled = false;
        totpPending = false;
        return;
      }
      const data = await res.json();
      totpEnrolled = !!data.enrolled;
      totpPending = !!data.pendingEnrollment;
    } catch {
      totpEnrolled = false;
      totpPending = false;
    }
  }

  async function postEnrollStart(body) {
    const payload = body || {};
    const headers = { "Content-Type": "application/json" };
    if (payload.rotateTotp !== undefined && payload.rotateTotp !== null && `${payload.rotateTotp}`.trim()) {
      const norm = normalizeTotp(payload.rotateTotp);
      if (norm) headers["x-manager-totp"] = norm;
    }
    const res = await window.StaffAuth.authFetch("/auth/manager-totp/enroll/start", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await readHttpErrorMessage(res);
      window.alert(msg || ts("managerTotpEnrollFail"));
      return null;
    }
    return res.json();
  }

  function closeEnrollModal() {
    const modal = document.getElementById("managerTotpEnrollModal");
    if (modal) modal.classList.remove("show");
  }

  function showEnrollModal(data) {
    renderTotpModalLabels();
    const modal = document.getElementById("managerTotpEnrollModal");
    const img = document.getElementById("managerTotpQrImg");
    if (!modal || !img) return;
    if (data.qrDataUrl) {
      img.src = data.qrDataUrl;
      img.style.display = "block";
    } else {
      img.removeAttribute("src");
      img.style.display = "none";
    }
    const secretEl = document.getElementById("managerTotpSecretText");
    if (secretEl) secretEl.textContent = data.secretBase32 || "";
    const cin = document.getElementById("managerTotpConfirmInput");
    if (cin) cin.value = "";
    modal.classList.add("show");
    if (cin) cin.focus();
  }

  async function cancelPendingEnrollment() {
    await window.StaffAuth.authFetch("/auth/manager-totp/enroll/cancel", { method: "POST" }).catch(() => {});
    closeEnrollModal();
    await refreshTotpStatus().catch(() => {});
  }

  function renderTotpModalLabels() {
    const mtt = document.getElementById("managerTotpEnrollModalTitle");
    if (mtt) mtt.textContent = ts("managerTotpBindModalTitle");
    const mti = document.getElementById("managerTotpEnrollModalIntro");
    if (mti) mti.textContent = ts("managerTotpBindModalIntro");
    const sc = document.getElementById("managerTotpSecretCaption");
    if (sc) sc.textContent = ts("managerTotpSecretCaption");
    const cl = document.getElementById("managerTotpConfirmLabel");
    if (cl) cl.textContent = ts("managerTotpConfirmLabel");
    const cb = document.getElementById("managerTotpConfirmBtn");
    if (cb) cb.textContent = ts("managerTotpConfirmBtn");
    const cx = document.getElementById("managerTotpCancelBtn");
    if (cx) cx.textContent = ts("managerTotpCancelBtn");
  }

  function closeSettingsMenu() {
    const menu = document.getElementById("adminSettingsMenu");
    const trig = document.getElementById("adminSettingsTrigger");
    if (menu) menu.classList.remove("show");
    if (trig) trig.setAttribute("aria-expanded", "false");
  }

  function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("show");
  }

  function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("show");
  }

  async function confirmRelogin() {
    const msg = ts("adminTokenHelpReloginConfirm");
    let ok = false;
    if (typeof window.uiConfirm === "function") {
      ok = await window.uiConfirm(msg);
    } else {
      ok = window.confirm(msg);
    }
    if (!ok) return;
    window.StaffAuth.clearToken();
    window.StaffAuth.redirectToLogin();
  }

  async function openTotpFlow() {
    closeSettingsMenu();
    if (!window.StaffAuth.getToken?.()) {
      window.alert(ts("adminSettingsTotpNeedsLogin"));
      return;
    }
    await refreshTotpStatus().catch(() => {});
    if (totpPending) {
      window.alert(ts("adminSettingsTotpPendingBlocked"));
      return;
    }
    if (totpEnrolled) {
      const rin = document.getElementById("adminTotpRotateInput");
      if (rin) rin.value = "";
      renderLabels();
      openModal("adminTotpRotateModal");
      rin?.focus();
      return;
    }
    const data = await postEnrollStart({});
    if (!data) return;
    showEnrollModal(data);
  }

  async function submitRotateAndQr() {
    const rin = document.getElementById("adminTotpRotateInput");
    const code = normalizeTotp(rin ? rin.value : "");
    if (!code) {
      window.alert(ts("managerTotpCodeRequired"));
      return;
    }
    const data = await postEnrollStart({ rotateTotp: code });
    if (!data) return;
    closeModal("adminTotpRotateModal");
    showEnrollModal(data);
  }

  function bindModalBackdrop(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (ev) => {
      if (ev.target === el) fn();
    });
  }

  function setupEnrollUiOnce() {
    if (enrollUiBound) return;
    const enrollModal = document.getElementById("managerTotpEnrollModal");
    const confirmBtn = document.getElementById("managerTotpConfirmBtn");
    const cancelBtn = document.getElementById("managerTotpCancelBtn");
    const closeBtn = document.getElementById("managerTotpEnrollModalCloseBtn");
    if (!enrollModal || !confirmBtn) return;
    enrollUiBound = true;

    enrollModal.addEventListener("click", (ev) => {
      if (ev.target === enrollModal) cancelPendingEnrollment().catch(() => {});
    });
    if (closeBtn) {
      closeBtn.addEventListener("click", () => cancelPendingEnrollment().catch(() => {}));
    }
    cancelBtn?.addEventListener("click", () => cancelPendingEnrollment().catch(() => {}));

    confirmBtn.addEventListener("click", async () => {
      const cin = document.getElementById("managerTotpConfirmInput");
      const code = normalizeTotp(cin ? cin.value : "");
      if (!code) {
        window.alert(ts("managerTotpCodeRequired"));
        return;
      }
      const res = await window.StaffAuth.authFetch("/auth/manager-totp/enroll/confirm", {
        method: "POST",
        headers: headersWithTotpJson(code),
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const msg = await readHttpErrorMessage(res);
        window.alert(msg || ts("managerTotpEnrollFail"));
        return;
      }
      closeEnrollModal();
      await refreshTotpStatus().catch(() => {});
      window.alert(ts("managerTotpEnrollOk"));
    });
  }

  function setupUiOnce() {
    if (uiBound) return;
    const trig = document.getElementById("adminSettingsTrigger");
    const menu = document.getElementById("adminSettingsMenu");
    const wrap = document.querySelector(".admin-settings-wrap");
    if (!trig || !menu) return;
    uiBound = true;
    setupEnrollUiOnce();

    document.addEventListener("click", (ev) => {
      if (!wrap || !menu.classList.contains("show")) return;
      if (!wrap.contains(ev.target)) closeSettingsMenu();
    });

    trig.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const nextOpen = !menu.classList.contains("show");
      if (nextOpen) {
        menu.classList.add("show");
        trig.setAttribute("aria-expanded", "true");
      } else {
        closeSettingsMenu();
      }
    });

    document.getElementById("adminSettingsMenuTotpBtn")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openTotpFlow().catch(() => {});
    });
    document.getElementById("adminSettingsMenuTokenBtn")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      closeSettingsMenu();
      renderLabels();
      openModal("adminTokenHelpModal");
    });
    document.getElementById("adminSettingsMenuAboutBtn")?.addEventListener("click", (ev) => {
      ev.stopPropagation();
      closeSettingsMenu();
      renderLabels();
      openModal("adminAboutModal");
    });

    bindModalBackdrop("adminTokenHelpModal", () => closeModal("adminTokenHelpModal"));
    bindModalBackdrop("adminAboutModal", () => closeModal("adminAboutModal"));
    bindModalBackdrop("adminTotpRotateModal", () => closeModal("adminTotpRotateModal"));

    document.getElementById("adminTokenHelpCloseBtn")?.addEventListener("click", () => closeModal("adminTokenHelpModal"));
    document.getElementById("adminAboutCloseBtn")?.addEventListener("click", () => closeModal("adminAboutModal"));
    document.getElementById("adminAboutOkBtn")?.addEventListener("click", () => closeModal("adminAboutModal"));
    document.getElementById("adminTotpRotateCloseBtn")?.addEventListener("click", () => closeModal("adminTotpRotateModal"));
    document.getElementById("adminTotpRotateCancelBtn")?.addEventListener("click", () => closeModal("adminTotpRotateModal"));
    document.getElementById("adminTotpRotateNextBtn")?.addEventListener("click", () => {
      submitRotateAndQr().catch(() => {});
    });

    document.getElementById("adminTokenHelpReloginBtn")?.addEventListener("click", () => {
      confirmRelogin().catch(() => {});
    });
  }

  function renderLabels() {
    const trig = document.getElementById("adminSettingsTrigger");
    if (!trig) return;
    const tip = ts("adminSettingsTriggerTitle");
    trig.title = tip;
    trig.setAttribute("aria-label", tip);

    document.getElementById("adminSettingsMenuTotpBtn").textContent = ts("adminSettingsMenuTotp");
    document.getElementById("adminSettingsMenuTokenBtn").textContent = ts("adminSettingsMenuToken");
    document.getElementById("adminSettingsMenuAboutBtn").textContent = ts("adminSettingsMenuAbout");

    const thTitle = document.getElementById("adminTokenHelpTitle");
    if (thTitle) thTitle.textContent = ts("adminTokenHelpTitle");
    const thBody = document.getElementById("adminTokenHelpBody");
    if (thBody) thBody.textContent = ts("adminTokenHelpBody");
    const thRel = document.getElementById("adminTokenHelpReloginBtn");
    if (thRel) thRel.textContent = ts("adminTokenHelpRelogin");

    const abTitle = document.getElementById("adminAboutTitle");
    if (abTitle) abTitle.textContent = ts("adminAboutTitle");
    const abVer = document.getElementById("adminAboutVersion");
    if (abVer) abVer.textContent = `${ts("adminAboutVersionPrefix")}${getAppVersion()}`;
    const abBody = document.getElementById("adminAboutBody");
    if (abBody) abBody.textContent = ts("adminAboutBody");
    const abOk = document.getElementById("adminAboutOkBtn");
    if (abOk) abOk.textContent = ts("adminAboutOk");

    const rtTitle = document.getElementById("adminTotpRotateTitle");
    if (rtTitle) rtTitle.textContent = ts("adminTotpRotateTitle");
    const rtHint = document.getElementById("adminTotpRotateHint");
    if (rtHint) rtHint.textContent = ts("adminTotpRotateHint");
    const rtLab = document.getElementById("adminTotpRotateLabel");
    if (rtLab) rtLab.textContent = ts("adminTotpRotateLabel");
    const rtNext = document.getElementById("adminTotpRotateNextBtn");
    if (rtNext) rtNext.textContent = ts("adminTotpRotateNextBtn");
    const rtCx = document.getElementById("adminTotpRotateCancelBtn");
    if (rtCx) rtCx.textContent = ts("adminTotpRotateCancel");

    renderTotpModalLabels();
  }

  window.StaffSettingsUi = {
    setup() {
      if (!window.StaffAuth) return;
      setupUiOnce();
      renderLabels();
    },
    renderLabels() {
      if (!document.getElementById("adminSettingsTrigger")) return;
      renderLabels();
    },
  };
})();
