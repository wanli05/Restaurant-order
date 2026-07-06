function installStyledAlert() {
  const modal = document.getElementById("uiAlertModal");
  const messageEl = document.getElementById("uiAlertMessage");
  const okBtn = document.getElementById("uiAlertOkBtn");
  const cancelBtn = document.getElementById("uiAlertCancelBtn");
  if (!modal || !messageEl || !okBtn || !cancelBtn) return;
  let resolver = null;
  let confirmMode = false;
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
    messageEl.textContent = String(message ?? "");
    cancelBtn.classList.remove("show");
    modal.classList.add("show");
    okBtn.focus();
  };
  window.uiConfirm = (message) =>
    new Promise((resolve) => {
      resolver = resolve;  
      confirmMode = true;
      messageEl.textContent = String(message ?? ""); 
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

let checkoutQueue = [];
let menuOptions = [];
const expandedSummaryTables = new Set();
let businessOpen = false;
let managerTotpUiBound = false;
let adminSettingsUiBound = false;
let managerTotpEnrolled = false;
let managerTotpPending = false;
let pendingPaidDeleteOrder = null;
let managerPaidEditOrder = null;
let managerPaidEditPendingPayload = null;
let managerPaidDeleteSubmitting = false;
let managerPaidEditSubmitting = false;
/** 绑定完成后回到的场景：纠错修改第二步 / 删除订单填验证码 */
let managerTotpResumeContext = null;
let currentLang = window.StaffAuth.getLang("ja");
const text = {
  ja: {
    pageTitle: "📊 店舗管理",
    ordersTitle: "📦 全注文",
    summaryTitle: "💰 会計管理（テーブル別）",
    checkoutReqTitle: "📢 会計リクエスト",
    historyTitle: "🧾 注文履歴検索",
    labelOrderNo: "注文番号",
    labelTable: "テーブル",
    labelStatus: "状態",
    historyColOrderNo: "注文番号",
    historyColTradeTime: "取引時間",
    historyColTradeAmount: "取引金額",
    historyColPaymentMethod: "支払い方法",
    historyColGuestCount: "人数",
    historyColTable: "テーブル",
    labelStart: "開始日時",
    labelEnd: "終了日時",
    search: "検索",
    navAdmin: "レジ",
    navKitchen: "厨房",
    navFinance: "財務",
    navRecovery: "点検",
    statusAll: "全部",
    tokenPrompt: "管理画面アクセス用トークンを入力してください",
    authFailed: "認証に失敗しました。トークンを再入力してください",
    editOrderTitle: "注文編集",
    editOrderHint: "この注文内の料理のみ数量を +/- で調整できます。",
    editOrderCancel: "キャンセル",
    editOrderSave: "保存",
    editOrderSaved: "注文を更新しました",
    editOrderEmpty: "料理が0件になったため、更新していません",
    editOrderFailed: "変更失敗",
    editOrderTablePrefix: "テーブル",
    editOrderTotalPrefix: "更新後合計",
    openStatusOpen: "営業中",
    openStatusClosed: "停止営業",
    uiOk: "確定",
    uiCancel: "キャンセル",
    payMethodTitle: "支払い方法を選択",
    payMethodCash: "現金",
    payMethodPayPay: "PayPay",
    payMethodWeChat: "Alipay",
    payMethodCancel: "キャンセル",
    commonActionFailed: "操作に失敗しました。再試行してください",
    historySearchFailed: "履歴検索に失敗しました。条件を確認してください",
    historyPagerPrev: "前へ",
    historyPagerNext: "次へ",
    historySummary: "合計 {total} 件、{page}/{pages} ページ",
    historyEmptyList: "条件に一致する履歴注文はありません",
    staffOrderCartPanelTitle: "カート",
    parsePendingFailed: "未提供料理の解析に失敗しました",
    parseItemsFailed: "注文明細の解析に失敗しました",
    zeroPayableAutoCleaned: "会計対象金額が 0 円のため、未提供注文を自動削除しました。",
    guestCountLabel: "人数",
    guestCountUnit: "名",
    deleteFailed: "削除に失敗しました",
    updateFailed: "更新に失敗しました",
    staffOrderBtn: "追加注文",
    staffOrderTitle: "追加注文",
    staffOrderCurrent: "当前桌台未结账订单",
    staffOrderNewSession: "新客开台",
    staffOrderSubmit: "提交代点",
    staffOrderClose: "关闭",
    staffOrderEmpty: "暂无未结账菜品",
    staffOrderCartEmpty: "请先添加菜品",
    staffOrderSuccess: "代客下单成功",
    staffOrderSessionInfo: "当前桌次：{session}",
    staffOrderNewSessionSuccess: "新客开台成功，已切换新桌次",
    staffOrderNewSessionBlocked: "当前桌台有未结账订单，无法开新台",
    staffOrderOpenPage: "注文ページ",
    staffOrderMenuTitle: "メニュー",
    staffOrderCategoryAll: "すべて",
    emptyTableTitle: "空席",
    emptyTableHint: "空席を選択すると、人数入力後に注文ページへ移動します",
    emptyTableNone: "現在、空席はありません",
    quickSeatTitle: "新規来店受付",
    quickSeatTableLabel: "テーブル: {table}",
    quickSeatGuestLabel: "ご利用人数",
    quickSeatGuestPlaceholder: "例: 2",
    quickSeatConfirm: "注文ページへ",
    quickSeatCancel: "キャンセル",
    quickSeatInvalidGuest: "人数を入力してください（1以上）",
    quickSeatConflict: "このテーブルは既に使用中です。最新状態に更新してください",
    quickOrderTitle: "代客注文ページ（{table}）",
    quickOrderClose: "閉じる",
    managerTotpBindModalTitle: "🔐 Authenticator を登録",
    managerTotpBindModalIntro:
      "決済済み注文の訂正・削除には Authenticator が必要です。アプリで QR を読み取り、表示された 6 桁コードで確定してください。",
    managerTotpSecretCaption: "手入力用キー（Base32）",
    managerTotpConfirmLabel: "アプリに表示される6桁コード",
    managerTotpConfirmBtn: "登録を確定",
    managerTotpCancelBtn: "キャンセル",
    managerPaidHistoryDeleteBtn: "削除",
    managerPaidDeleteOrderHint: "",
    managerPaidDeleteReasonLabel: "理由",
    managerPaidDeleteReasonRequired: "理由を入力してください",
    managerPaidDeleteTotpLabel: "Authenticator 6桁コード",
    managerTotpCodeRequired: "6桁の数字コードを入力してください",
    managerPaidDeleteConfirmBtn: "削除実行",
    managerPaidDeleteCancelBtn: "キャンセル",
    managerTotpEnrollOk: "Authenticator の登録が完了しました",
    managerTotpEnrollFail: "登録に失敗しました",
    managerPaidDeleteOk: "削除しました",
    managerPaidDeleteFail: "削除に失敗しました",
    managerTotpNotConfigured: "この操作には Authenticator が必要です。バインド画面で登録してください。",
    managerPaidEditBtn: "修正",
    managerPaidEditTitle: "決済済み注文の訂正（金額・支払・人数・テーブル）",
    managerPaidEditHint: "修正対象にチェックし、変更後を入力してください。",
    managerPaidEditReasonLabel: "修正理由",
    managerPaidEditReasonRequired: "修正理由を入力してください",
    managerPaidEditTargetsCaption: "修正する項目（複数選択可）",
    managerPaidEditFieldTotal: "取引金額（円）",
    managerPaidEditFieldPayment: "支払い方法",
    managerPaidEditFieldGuests: "人数",
    managerPaidEditFieldTable: "テーブル番号",
    managerPaidEditBefore: "変更前",
    managerPaidEditAfter: "変更後",
    managerPaidEditConfirmBtn: "確認",
    managerPaidEditTotpPromptLabel: "Authenticator の 6 桁コードを入力してください",
    managerPaidEditSubmitBtn: "送信",
    managerPaidEditTotpCancelBtn: "戻る",
    managerPaidEditCancelBtn: "キャンセル",
    managerPaidEditOk: "保存しました",
    managerPaidEditFail: "保存に失敗しました",
    managerPaidEditNeedSelection: "修正項目を 1 つ以上選択してください",
    managerPaidEditNeedActualChange: "変更後が実際に変わっている項目が必要です",
    adminSettingsTriggerTitle: "設定",
    adminSettingsMenuTotp: "Authenticator（TOTP）の登録・変更",
    adminSettingsMenuToken: "ログインとトークンについて",
    adminSettingsMenuAbout: "バージョンとヘルプ",
    adminSettingsTotpPendingBlocked:
      "Authenticator の登録手続きが進行中です。登録モーダルを完了するか、背景をタップしてキャンセルしてから再度お試しください。",
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
  },
  zh: {
    pageTitle: "📊 店铺后台",
    ordersTitle: "📦 所有订单",
    summaryTitle: "💰 结账管理（按桌汇总）",
    checkoutReqTitle: "📢 结账请求",
    historyTitle: "🧾 历史订单查询",
    labelOrderNo: "订单编号",
    labelTable: "桌号",
    labelStatus: "状态",
    historyColOrderNo: "订单编号",
    historyColTradeTime: "交易时间",
    historyColTradeAmount: "交易金额",
    historyColPaymentMethod: "付款方式",
    historyColGuestCount: "用餐人数",
    historyColTable: "桌号",
    labelStart: "开始时间",
    labelEnd: "结束时间",
    search: "查询",
    navAdmin: "收银台",
    navKitchen: "厨房",
    navFinance: "财务",
    navRecovery: "自检",
    statusAll: "全部",
    tokenPrompt: "请输入后台访问令牌",
    authFailed: "鉴权失败，请重新输入令牌",
    editOrderTitle: "编辑订单",
    editOrderHint: "仅可对本单菜品通过 +/- 调整数量。",
    editOrderCancel: "取消",
    editOrderSave: "保存",
    editOrderSaved: "订单修改成功",
    editOrderEmpty: "菜品数量为 0，未执行修改",
    editOrderFailed: "修改失败",
    editOrderTablePrefix: "桌号",
    editOrderTotalPrefix: "修改后合计",
    openStatusOpen: "正在营业",
    openStatusClosed: "停止营业",
    uiOk: "确定",
    uiCancel: "取消",
    payMethodTitle: "请选择支付方式",
    payMethodCash: "现金",
    payMethodPayPay: "PayPay",
    payMethodWeChat: "支付宝",
    payMethodCancel: "取消",
    commonActionFailed: "操作失败，请重试",
    historySearchFailed: "历史查询失败，请检查筛选条件",
    historyPagerPrev: "上一页",
    historyPagerNext: "下一页",
    historySummary: "共 {total} 条，当前第 {page} / {pages} 页",
    historyEmptyList: "暂无符合条件的历史订单",
    staffOrderCartPanelTitle: "购物车",
    parsePendingFailed: "解析未上菜项目失败",
    parseItemsFailed: "订单详情解析失败",
    zeroPayableAutoCleaned: "可结账金额为 0，系统已自动删除未出菜订单。",
    guestCountLabel: "人数",
    guestCountUnit: "人",
    deleteFailed: "删除失败",
    updateFailed: "更新失败",
    staffOrderBtn: "追加订单",
    staffOrderTitle: "追加订单",
    staffOrderCurrent: "当前桌台未结账订单",
    staffOrderNewSession: "新客开台",
    staffOrderSubmit: "提交代点",
    staffOrderClose: "关闭",
    staffOrderEmpty: "暂无未结账菜品",
    staffOrderCartEmpty: "请先添加菜品",
    staffOrderSuccess: "代客下单成功",
    staffOrderSessionInfo: "当前桌次：{session}",
    staffOrderNewSessionSuccess: "新客开台成功，已切换新桌次",
    staffOrderNewSessionBlocked: "当前桌台有未结账订单，无法开新台",
    staffOrderOpenPage: "点单页",
    staffOrderMenuTitle: "菜单",
    staffOrderCategoryAll: "全部",
    emptyTableTitle: "空桌",
    emptyTableHint: "点击空桌后输入人数，即可直接进入点单页",
    emptyTableNone: "当前没有空桌",
    quickSeatTitle: "新客开台",
    quickSeatTableLabel: "桌号：{table}",
    quickSeatGuestLabel: "用餐人数",
    quickSeatGuestPlaceholder: "例如 2",
    quickSeatConfirm: "进入点单页",
    quickSeatCancel: "取消",
    quickSeatInvalidGuest: "请输入人数（至少为 1）",
    quickSeatConflict: "该桌已被占用，请刷新后重试",
    quickOrderTitle: "代客点单页面（{table}）",
    quickOrderClose: "关闭",
    managerTotpBindModalTitle: "🔐 绑定动态口令",
    managerTotpBindModalIntro:
      "纠错修改或删除已结账订单需要使用 Authenticator。请用手机应用扫描下方二维码，输入应用中显示的 6 位码完成首次绑定。",
    managerTotpSecretCaption: "手动输入密钥（Base32）",
    managerTotpConfirmLabel: "应用中显示的 6 位验证码",
    managerTotpConfirmBtn: "确认完成绑定",
    managerTotpCancelBtn: "取消",
    managerPaidHistoryDeleteBtn: "删除",
    managerPaidDeleteOrderHint: "",
    managerPaidDeleteReasonLabel: "原因",
    managerPaidDeleteReasonRequired: "请填写原因",
    managerPaidDeleteTotpLabel: "Authenticator 6 位验证码",
    managerTotpCodeRequired: "请填写 6 位数字验证码",
    managerPaidDeleteConfirmBtn: "确认删除",
    managerPaidDeleteCancelBtn: "取消",
    managerTotpEnrollOk: "Authenticator 已绑定成功",
    managerTotpEnrollFail: "绑定失败",
    managerPaidDeleteOk: "已删除",
    managerPaidDeleteFail: "删除失败",
    managerTotpNotConfigured: "该操作需要 Authenticator，请按提示在弹出窗口中完成绑定。",
    managerPaidEditBtn: "修改",
    managerPaidEditTitle: "详细修改内容",
    managerPaidEditHint: "勾选要修改的项并填写修改后内容。",
    managerPaidEditReasonLabel: "修改理由",
    managerPaidEditReasonRequired: "请填写修改理由",
    managerPaidEditTargetsCaption: "修改内容（可多选）",
    managerPaidEditFieldTotal: "交易金额（日元）",
    managerPaidEditFieldPayment: "付款方式",
    managerPaidEditFieldGuests: "用餐人数",
    managerPaidEditFieldTable: "桌号",
    managerPaidEditBefore: "修改前",
    managerPaidEditAfter: "修改后",
    managerPaidEditConfirmBtn: "确认",
    managerPaidEditTotpPromptLabel: "请输入 Authenticator 6 位验证码",
    managerPaidEditSubmitBtn: "提交",
    managerPaidEditTotpCancelBtn: "返回",
    managerPaidEditCancelBtn: "取消",
    managerPaidEditOk: "已保存",
    managerPaidEditFail: "保存失败",
    managerPaidEditNeedSelection: "请至少选择一项要修改的内容",
    managerPaidEditNeedActualChange: "请至少有一项「修改后」与账单原值不同",
    adminSettingsTriggerTitle: "设置",
    adminSettingsMenuTotp: "绑定 / 管理动态口令（TOTP）",
    adminSettingsMenuToken: "当前登录 / 令牌说明",
    adminSettingsMenuAbout: "关于 / 版本与帮助",
    adminSettingsTotpPendingBlocked:
      "动态口令绑定尚未完成。请先完成绑定弹窗，或点击遮罩关闭以取消后再试。",
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
  },
};
function t(key) {
  return text[currentLang][key];
}

/** 与服务器 lib/manager-totp.normalizeTotpInput 对齐，避免粘贴夹带不可见字符导致校验失败 */
function normalizeManagerTotpForPost(raw) {
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

/** 与店长 TOTP 中间件一致：除 JSON body 外同时走请求头，避免 body 未解析时取不到码 */
function headersWithManagerTotpJson(managerTotp) {
  return {
    "Content-Type": "application/json",
    "x-manager-totp": String(managerTotp),
  };
}

function toLocalizedAdminError(message, fallbackKey = "commonActionFailed", context = {}) {
  const msg = String(message || "");
  const code = String(context.errorCode || "").trim();
  const status = Number(context.status) || 0;
  if (code === "ORDER_DB_BUSY") {
    return currentLang === "ja"
      ? "システムが混み合っています。少し待ってから再試行してください。"
      : "系统繁忙，请稍后重试。";
  }
  if (code === "ORDER_SQLITE_VERSION" || code === "ORDER_DB_ERROR") {
    return currentLang === "ja"
      ? "システム設定に問題があります。担当者へ連絡してください。"
      : "系统配置异常，请联系负责人处理。";
  }
  if (code === "ORDER_INTERNAL") {
    return currentLang === "ja" ? "システム異常です。担当者へ連絡してください。" : "系统异常，请联系负责人处理。";
  }
  if (code === "ORDER_MENU_STALE") {
    return currentLang === "ja"
      ? "一部メニューが更新または提供停止です。メニューを再読み込みして再注文してください。"
      : "部分菜品已变更或下架，请刷新菜单后重试。";
  }
  if (msg.includes("无效桌号")) return currentLang === "ja" ? "無効なテーブル番号です" : "无效桌号";
  if (msg.includes("门店未营业")) return currentLang === "ja" ? "現在は停止営業中です" : "当前门店未营业";
  if (msg.includes("系统繁忙")) {
    return currentLang === "ja"
      ? "システムが混み合っています。少し待ってから再試行してください。"
      : "系统繁忙，请稍后重试。";
  }
  if (msg.includes("数据库异常") || msg.includes("数据库版本不兼容")) {
    return currentLang === "ja"
      ? "システム設定に問題があります。担当者へ連絡してください。"
      : "系统配置异常，请联系负责人处理。";
  }
  if (msg.includes("invalid_manager_totp") || msg.includes("invalid_totp")) {
    return currentLang === "ja"
      ? "認証コードが一致しません。端末時刻・別フォルダの DB で起動していないか確認し、必要なら Authenticator をペアリングし直してください。"
      : "验证码与服务器不一致。请核对电脑时间；重启服务后看控制台里的 SQLite 路径是否为当前项目的 orders.db；仍不行请在后台清除店长绑定并重新扫码。";
  }
  if (msg.includes("missing_totp_code")) {
    return t("managerTotpCodeRequired");
  }
  if (msg.includes("invalid_rotate_totp")) {
    return currentLang === "ja" ? "現在の認証コードが正しくありません" : "当前验证码不正确";
  }
  if (msg.includes("manager_totp_not_configured")) {
    return currentLang === "ja"
      ? "Authenticator が未登録です。先に登録してください。"
      : "尚未绑定 Authenticator，请先在后台完成绑定。";
  }
  if (msg.includes("no_pending_enrollment")) {
    return currentLang === "ja"
      ? "進行中のペアリングがありません。最初からやり直してください。"
      : "没有进行中的配对，请重新开始绑定。";
  }
  if (msg.includes("invalid_reset_secret")) {
    return currentLang === "ja" ? "リセット用パスフレーズが一致しません" : "紧急重置口令不正确";
  }
  if (msg.includes("manager_totp_reset_disabled")) {
    return currentLang === "ja"
      ? "サーバー側で MANAGER_TOTP_RESET_SECRET が未設定です。設定して再起動してください。"
      : "服务器未配置 MANAGER_TOTP_RESET_SECRET，无法在网页清除绑定。";
  }
  if (msg.includes("修改内容无效")) return currentLang === "ja" ? "修正内容が無効です" : msg;
  if (msg.includes("未指定修改项")) return currentLang === "ja" ? "修正項目がありません" : msg;
  if (msg.includes("用餐人数无效")) return currentLang === "ja" ? "人数が無効です" : msg;
  if (msg.includes("交易金额无效")) return currentLang === "ja" ? "取引金額が無効です" : msg;
  if (msg.includes("无效支付方式")) return currentLang === "ja" ? "支払い方法が無効です" : msg;
  if (msg.includes("部分菜品不存在") || msg.includes("菜品不能为空") || msg.includes("菜品数据无效")) {
    return msg;
  }
  if (status >= 500) {
    return currentLang === "ja" ? "システム異常です。担当者へ連絡してください。" : "系统异常，请联系负责人处理。";
  }
  return t(fallbackKey);
}
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function setLang(lang) {
  currentLang = lang;
  window.StaffAuth.setLang(lang);
  renderText();
  syncAdminData();
  searchHistory(historyPage).catch((err) => console.error(err.message));
}
function openModule(path) {
  window.open(path, "_blank", "noopener");
}
function renderText() {
  document.documentElement.lang = currentLang === "ja" ? "ja" : "zh";
  document.getElementById("pageTitle").innerText = t("pageTitle");
  document.getElementById("navAdminBtn").innerText = t("navAdmin");
  document.getElementById("navKitchenBtn").innerText = t("navKitchen");
  document.getElementById("navFinanceBtn").innerText = t("navFinance");
  document.getElementById("navRecoveryBtn").innerText = t("navRecovery");
  document.getElementById("ordersTitle").innerText = t("ordersTitle");
  document.getElementById("summaryTitle").innerText = t("summaryTitle");
  document.getElementById("historyTitle").innerText = t("historyTitle");
  document.getElementById("labelOrderNo").innerText = t("labelOrderNo");
  document.getElementById("labelTable").innerText = t("labelTable");
  document.getElementById("labelStart").innerText = t("labelStart");
  document.getElementById("labelEnd").innerText = t("labelEnd");
  document.getElementById("searchBtn").innerText = t("search");
  const histPrev = document.getElementById("historyPrevBtn");
  if (histPrev) histPrev.innerText = t("historyPagerPrev");
  const histNext = document.getElementById("historyNextBtn");
  if (histNext) histNext.innerText = t("historyPagerNext");
  document.getElementById("history-order-no").placeholder =
    currentLang === "ja" ? "例: 20260426-001" : "例如 20260426-001";
  document.getElementById("history-table").placeholder = currentLang === "ja" ? "例: T12" : "例如 T12";
  document.getElementById("uiAlertOkBtn").innerText = t("uiOk");
  document.getElementById("uiAlertCancelBtn").innerText = t("uiCancel");
  document.getElementById("editOrderTitle").innerText = t("editOrderTitle");
  document.getElementById("editOrderSub").innerText = t("editOrderHint");
  document.getElementById("editOrderCancelBtn").innerText = t("editOrderCancel");
  document.getElementById("editOrderSaveBtn").innerText = t("editOrderSave");
  const payMethodTitle = document.getElementById("payMethodTitle");
  if (payMethodTitle) payMethodTitle.innerText = t("payMethodTitle");
  const payMethodCashBtn = document.getElementById("payMethodCashBtn");
  if (payMethodCashBtn) payMethodCashBtn.innerText = t("payMethodCash");
  const payMethodWechatBtn = document.getElementById("payMethodWechatBtn");
  if (payMethodWechatBtn) payMethodWechatBtn.innerText = t("payMethodWeChat");
  const payMethodPaypayBtn = document.getElementById("payMethodPaypayBtn");
  if (payMethodPaypayBtn) payMethodPaypayBtn.innerText = t("payMethodPayPay");
  const payMethodCancelBtn = document.getElementById("payMethodCancelBtn");
  if (payMethodCancelBtn) payMethodCancelBtn.innerText = t("payMethodCancel");
  const staffOrderTitle = document.getElementById("staffOrderTitle");
  if (staffOrderTitle) staffOrderTitle.innerText = t("staffOrderTitle");
  const staffOrderCurrentTitle = document.getElementById("staffOrderCurrentTitle");
  if (staffOrderCurrentTitle) staffOrderCurrentTitle.innerText = t("staffOrderCurrent");
  const staffOrderSubmitBtn = document.getElementById("staffOrderSubmitBtn");
  if (staffOrderSubmitBtn) staffOrderSubmitBtn.innerText = t("staffOrderSubmit");
  const staffOrderCloseBtn = document.getElementById("staffOrderCloseBtn");
  if (staffOrderCloseBtn) staffOrderCloseBtn.innerText = t("staffOrderClose");
  const staffOrderMenuTitle = document.getElementById("staffOrderMenuTitle");
  if (staffOrderMenuTitle) staffOrderMenuTitle.innerText = t("staffOrderMenuTitle");
  const staffOrderCartPanelTitle = document.getElementById("staffOrderCartPanelTitle");
  if (staffOrderCartPanelTitle) staffOrderCartPanelTitle.innerText = t("staffOrderCartPanelTitle");
  const emptyTableTitle = document.getElementById("emptyTableTitle");
  if (emptyTableTitle) emptyTableTitle.innerText = t("emptyTableTitle");
  const emptyTableHint = document.getElementById("emptyTableHint");
  if (emptyTableHint) emptyTableHint.innerText = t("emptyTableHint");
  const quickSeatTitle = document.getElementById("quickSeatTitle");
  if (quickSeatTitle) quickSeatTitle.innerText = t("quickSeatTitle");
  const quickSeatGuestLabel = document.getElementById("quickSeatGuestLabel");
  if (quickSeatGuestLabel) quickSeatGuestLabel.innerText = t("quickSeatGuestLabel");
  const quickSeatGuestInput = document.getElementById("quickSeatGuestInput");
  if (quickSeatGuestInput) quickSeatGuestInput.placeholder = t("quickSeatGuestPlaceholder");
  const quickSeatConfirmBtn = document.getElementById("quickSeatConfirmBtn");
  if (quickSeatConfirmBtn) quickSeatConfirmBtn.innerText = t("quickSeatConfirm");
  const quickSeatCancelBtn = document.getElementById("quickSeatCancelBtn");
  if (quickSeatCancelBtn) quickSeatCancelBtn.innerText = t("quickSeatCancel");
  const quickOrderTitle = document.getElementById("quickOrderTitle");
  if (quickOrderTitle) {
    quickOrderTitle.innerText = t("quickOrderTitle").replace("{table}", quickOrderActiveTableId || "-");
  }
  const quickOrderCloseBtn = document.getElementById("quickOrderCloseBtn");
  if (quickOrderCloseBtn) quickOrderCloseBtn.innerText = t("quickOrderClose");
  renderManagerTotpStaticLabels();
  renderAdminSettingsLabels();
  refreshManagerTotpStatus().catch(() => {});
  renderBusinessWarning();
  if (editingOrder) renderEditOrderRows();
  renderStaffOrderSection();
  renderEmptyTableQuickStart();
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

function renderManagerTotpStaticLabels() {
  const mtt = document.getElementById("managerTotpEnrollModalTitle");
  if (mtt) mtt.textContent = t("managerTotpBindModalTitle");
  const mti = document.getElementById("managerTotpEnrollModalIntro");
  if (mti) mti.textContent = t("managerTotpBindModalIntro");
  const sc = document.getElementById("managerTotpSecretCaption");
  if (sc) sc.textContent = t("managerTotpSecretCaption");
  const cl = document.getElementById("managerTotpConfirmLabel");
  if (cl) cl.textContent = t("managerTotpConfirmLabel");
  const cb = document.getElementById("managerTotpConfirmBtn");
  if (cb) cb.textContent = t("managerTotpConfirmBtn");
  const cx = document.getElementById("managerTotpCancelBtn");
  if (cx) cx.textContent = t("managerTotpCancelBtn");
  const pdr = document.getElementById("managerPaidDeleteReasonLabel");
  if (pdr) pdr.textContent = t("managerPaidDeleteReasonLabel");
  const pdtp = document.getElementById("managerPaidDeleteTotpLabel");
  if (pdtp) pdtp.textContent = t("managerPaidDeleteTotpLabel");
  const pdc = document.getElementById("managerPaidDeleteConfirmBtn");
  if (pdc) pdc.textContent = t("managerPaidDeleteConfirmBtn");
  const pdx = document.getElementById("managerPaidDeleteCancelBtn");
  if (pdx) pdx.textContent = t("managerPaidDeleteCancelBtn");
  const mpet = document.getElementById("managerPaidEditTitle");
  if (mpet) mpet.textContent = t("managerPaidEditTitle");
  const mper = document.getElementById("managerPaidEditReasonLabel");
  if (mper) mper.textContent = t("managerPaidEditReasonLabel");
  const mpetcap = document.getElementById("managerPaidEditTargetsCaption");
  if (mpetcap) mpetcap.textContent = t("managerPaidEditTargetsCaption");
  const mpeconf = document.getElementById("managerPaidEditConfirmBtn");
  if (mpeconf) mpeconf.textContent = t("managerPaidEditConfirmBtn");
  const mpetp2 = document.getElementById("managerPaidEditTotpPromptLabel");
  if (mpetp2) mpetp2.textContent = t("managerPaidEditTotpPromptLabel");
  const mpesub = document.getElementById("managerPaidEditSubmitBtn");
  if (mpesub) mpesub.textContent = t("managerPaidEditSubmitBtn");
  const mpetcan = document.getElementById("managerPaidEditTotpCancelBtn");
  if (mpetcan) mpetcan.textContent = t("managerPaidEditTotpCancelBtn");
  const mpec = document.getElementById("managerPaidEditCancelBtn");
  if (mpec) mpec.textContent = t("managerPaidEditCancelBtn");
}

function getAdminAppVersion() {
  const meta = document.querySelector('meta[name="app-version"]');
  const raw = meta?.getAttribute("content");
  const v = raw != null ? String(raw).trim() : "";
  return v || "1.0.0";
}

function renderAdminSettingsLabels() {
  const trig = document.getElementById("adminSettingsTrigger");
  if (trig) {
    const tip = t("adminSettingsTriggerTitle");
    trig.title = tip;
    trig.setAttribute("aria-label", tip);
  }
  const menuTotp = document.getElementById("adminSettingsMenuTotpBtn");
  if (menuTotp) menuTotp.textContent = t("adminSettingsMenuTotp");
  const menuTok = document.getElementById("adminSettingsMenuTokenBtn");
  if (menuTok) menuTok.textContent = t("adminSettingsMenuToken");
  const menuAbout = document.getElementById("adminSettingsMenuAboutBtn");
  if (menuAbout) menuAbout.textContent = t("adminSettingsMenuAbout");

  const thTitle = document.getElementById("adminTokenHelpTitle");
  if (thTitle) thTitle.textContent = t("adminTokenHelpTitle");
  const thBody = document.getElementById("adminTokenHelpBody");
  if (thBody) thBody.textContent = t("adminTokenHelpBody");
  const thRel = document.getElementById("adminTokenHelpReloginBtn");
  if (thRel) thRel.textContent = t("adminTokenHelpRelogin");

  const abTitle = document.getElementById("adminAboutTitle");
  if (abTitle) abTitle.textContent = t("adminAboutTitle");
  const abVer = document.getElementById("adminAboutVersion");
  if (abVer) abVer.textContent = `${t("adminAboutVersionPrefix")}${getAdminAppVersion()}`;
  const abBody = document.getElementById("adminAboutBody");
  if (abBody) abBody.textContent = t("adminAboutBody");
  const abOk = document.getElementById("adminAboutOkBtn");
  if (abOk) abOk.textContent = t("adminAboutOk");

  const rtTitle = document.getElementById("adminTotpRotateTitle");
  if (rtTitle) rtTitle.textContent = t("adminTotpRotateTitle");
  const rtHint = document.getElementById("adminTotpRotateHint");
  if (rtHint) rtHint.textContent = t("adminTotpRotateHint");
  const rtLab = document.getElementById("adminTotpRotateLabel");
  if (rtLab) rtLab.textContent = t("adminTotpRotateLabel");
  const rtNext = document.getElementById("adminTotpRotateNextBtn");
  if (rtNext) rtNext.textContent = t("adminTotpRotateNextBtn");
  const rtCx = document.getElementById("adminTotpRotateCancelBtn");
  if (rtCx) rtCx.textContent = t("adminTotpRotateCancel");
}

async function refreshManagerTotpStatus() {
  try {
    const res = await authFetch("/auth/manager-totp/status");
    if (!res.ok) {
      managerTotpEnrolled = false;
      managerTotpPending = false;
      return;
    }
    const data = await res.json();
    managerTotpEnrolled = !!data.enrolled;
    managerTotpPending = !!data.pendingEnrollment;
  } catch {
    managerTotpEnrolled = false;
    managerTotpPending = false;
  }
}

function closeManagerTotpEnrollModal() {
  const modal = document.getElementById("managerTotpEnrollModal");
  if (modal) modal.classList.remove("show");
}

function showManagerTotpEnrollModal(data) {
  renderManagerTotpStaticLabels();
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

async function cancelManagerTotpPendingEnrollment() {
  await authFetch("/auth/manager-totp/enroll/cancel", { method: "POST" }).catch(() => {});
  managerTotpResumeContext = null;
  closeManagerTotpEnrollModal();
  await refreshManagerTotpStatus().catch(() => {});
}

async function postManagerTotpEnrollStart(body) {
  const payload = body || {};
  const headers = { "Content-Type": "application/json" };
  if (payload.rotateTotp !== undefined && payload.rotateTotp !== null && `${payload.rotateTotp}`.trim()) {
    const norm = normalizeManagerTotpForPost(payload.rotateTotp);
    if (norm) headers["x-manager-totp"] = norm;
  }
  const res = await authFetch("/auth/manager-totp/enroll/start", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await readHttpErrorMessage(res);
    alert(msg || t("managerTotpEnrollFail"));
    return null;
  }
  return res.json();
}

function setupManagerTotpUi() {
  if (managerTotpUiBound) return;
  managerTotpUiBound = true;

  const enrollModal = document.getElementById("managerTotpEnrollModal");
  const enrollCloseBtn = document.getElementById("managerTotpEnrollModalCloseBtn");
  const confirmBtn = document.getElementById("managerTotpConfirmBtn");
  const cancelBtn = document.getElementById("managerTotpCancelBtn");

  if (enrollModal) {
    enrollModal.addEventListener("click", (ev) => {
      if (ev.target === enrollModal) cancelManagerTotpPendingEnrollment().catch(() => {});
    });
  }
  if (enrollCloseBtn) {
    enrollCloseBtn.addEventListener("click", () => cancelManagerTotpPendingEnrollment().catch(() => {}));
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      const cin = document.getElementById("managerTotpConfirmInput");
      const code = normalizeManagerTotpForPost(cin ? cin.value : "");
      if (!code) {
        alert(t("managerTotpCodeRequired"));
        return;
      }
      const res = await authFetch("/auth/manager-totp/enroll/confirm", {
        method: "POST",
        headers: headersWithManagerTotpJson(code),
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const msg = await readHttpErrorMessage(res);
        alert(msg || t("managerTotpEnrollFail"));
        return;
      }
      const ctx = managerTotpResumeContext;
      managerTotpResumeContext = null;
      closeManagerTotpEnrollModal();
      await refreshManagerTotpStatus().catch(() => {});

      let msg = t("managerTotpEnrollOk");
      if (ctx === "delete") {
        msg +=
          currentLang === "ja"
            ? "\n続けて下部に 6 桁コードを入力し、「削除実行」を押してください。"
            : "\n请在下方填写 6 位验证码并点击「确认删除」。";
        const totpEl = document.getElementById("managerPaidDeleteTotp");
        if (totpEl) totpEl.focus();
      } else if (ctx === "edit") {
        msg +=
          currentLang === "ja"
            ? "\n続けて認証コードを入力して送信してください。"
            : "\n请在下一步输入验证码并提交。";
        showPaidMetaStep(2);
        const totpEl = document.getElementById("managerPaidEditTotp");
        if (totpEl) {
          totpEl.value = "";
          totpEl.focus();
        }
      }
      alert(msg);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => cancelManagerTotpPendingEnrollment().catch(() => {}));
  }

  const pdModal = document.getElementById("managerPaidDeleteModal");
  const pdCancel = document.getElementById("managerPaidDeleteCancelBtn");
  const pdConfirm = document.getElementById("managerPaidDeleteConfirmBtn");

  function closePaidDeleteModal() {
    if (managerTotpResumeContext === "delete") {
      cancelManagerTotpPendingEnrollment().catch(() => {});
    }
    pendingPaidDeleteOrder = null;
    if (pdModal) pdModal.classList.remove("show");
    const reasonEl = document.getElementById("managerPaidDeleteReason");
    const totpEl = document.getElementById("managerPaidDeleteTotp");
    if (reasonEl) reasonEl.value = "";
    if (totpEl) totpEl.value = "";
  }

  if (pdCancel) pdCancel.addEventListener("click", closePaidDeleteModal);
  if (pdModal) {
    pdModal.addEventListener("click", (ev) => {
      if (ev.target === pdModal) closePaidDeleteModal();
    });
  }
  if (pdConfirm) {
    pdConfirm.addEventListener("click", async () => {
      if (managerPaidDeleteSubmitting) return;
      const order = pendingPaidDeleteOrder;
      if (!order) return;
      const reasonEl = document.getElementById("managerPaidDeleteReason");
      const totpEl = document.getElementById("managerPaidDeleteTotp");
      const reason = reasonEl ? reasonEl.value.trim().slice(0, 500) : "";
      if (!reason) {
        alert(t("managerPaidDeleteReasonRequired"));
        return;
      }
      await refreshManagerTotpStatus().catch(() => {});
      if (!managerTotpEnrolled) {
        managerTotpResumeContext = "delete";
        const data = await postManagerTotpEnrollStart({});
        if (!data) {
          managerTotpResumeContext = null;
          return;
        }
        showManagerTotpEnrollModal(data);
        return;
      }
      const managerTotp = normalizeManagerTotpForPost(totpEl ? totpEl.value : "");
      if (!managerTotp) {
        alert(t("managerTotpCodeRequired"));
        return;
      }
      managerPaidDeleteSubmitting = true;
      pdConfirm.disabled = true;
      try {
        const res = await authFetch(`/orders/${order.id}/manager-delete-paid`, {
          method: "POST",
          headers: headersWithManagerTotpJson(managerTotp),
          body: JSON.stringify({ reason, managerTotp }),
        });
        if (!res.ok) {
          const msg = await readHttpErrorMessage(res);
          alert(toLocalizedAdminError(msg, "managerPaidDeleteFail"));
          return;
        }
        closePaidDeleteModal();
        alert(t("managerPaidDeleteOk"));
        searchHistory(historyPage).catch((err) => console.error(err.message));
        scheduleAdminRefresh();
      } finally {
        managerPaidDeleteSubmitting = false;
        pdConfirm.disabled = false;
      }
    });
  }
}

function closeAdminSettingsMenu() {
  const menu = document.getElementById("adminSettingsMenu");
  const trig = document.getElementById("adminSettingsTrigger");
  if (menu) menu.classList.remove("show");
  if (trig) trig.setAttribute("aria-expanded", "false");
}

function openAdminSettingsModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("show");
}

function closeAdminSettingsModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("show");
}

async function adminSettingsOpenTotpFlow() {
  closeAdminSettingsMenu();
  await refreshManagerTotpStatus().catch(() => {});
  if (managerTotpPending) {
    alert(t("adminSettingsTotpPendingBlocked"));
    return;
  }
  managerTotpResumeContext = null;
  if (managerTotpEnrolled) {
    const rin = document.getElementById("adminTotpRotateInput");
    if (rin) rin.value = "";
    renderAdminSettingsLabels();
    openAdminSettingsModal("adminTotpRotateModal");
    rin?.focus();
    return;
  }
  const data = await postManagerTotpEnrollStart({});
  if (!data) return;
  showManagerTotpEnrollModal(data);
}

async function submitAdminTotpRotateAndShowQr() {
  const rin = document.getElementById("adminTotpRotateInput");
  const code = normalizeManagerTotpForPost(rin ? rin.value : "");
  if (!code) {
    alert(t("managerTotpCodeRequired"));
    return;
  }
  managerTotpResumeContext = null;
  const data = await postManagerTotpEnrollStart({ rotateTotp: code });
  if (!data) return;
  closeAdminSettingsModal("adminTotpRotateModal");
  showManagerTotpEnrollModal(data);
}

function setupAdminSettingsUi() {
  if (adminSettingsUiBound) return;
  adminSettingsUiBound = true;

  const wrap = document.querySelector(".admin-settings-wrap");
  const trig = document.getElementById("adminSettingsTrigger");
  const menu = document.getElementById("adminSettingsMenu");

  document.addEventListener("click", (ev) => {
    if (!wrap || !menu?.classList.contains("show")) return;
    if (!wrap.contains(ev.target)) closeAdminSettingsMenu();
  });

  if (trig && menu) {
    trig.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const nextOpen = !menu.classList.contains("show");
      if (nextOpen) {
        menu.classList.add("show");
        trig.setAttribute("aria-expanded", "true");
      } else {
        closeAdminSettingsMenu();
      }
    });
  }

  document.getElementById("adminSettingsMenuTotpBtn")?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    adminSettingsOpenTotpFlow().catch(() => {});
  });
  document.getElementById("adminSettingsMenuTokenBtn")?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeAdminSettingsMenu();
    renderAdminSettingsLabels();
    openAdminSettingsModal("adminTokenHelpModal");
  });
  document.getElementById("adminSettingsMenuAboutBtn")?.addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeAdminSettingsMenu();
    renderAdminSettingsLabels();
    openAdminSettingsModal("adminAboutModal");
  });

  const bindModalBackdrop = (id, onBackdrop) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("click", (ev) => {
      if (ev.target === el) onBackdrop();
    });
  };

  bindModalBackdrop("adminTokenHelpModal", () => closeAdminSettingsModal("adminTokenHelpModal"));
  bindModalBackdrop("adminAboutModal", () => closeAdminSettingsModal("adminAboutModal"));
  bindModalBackdrop("adminTotpRotateModal", () => closeAdminSettingsModal("adminTotpRotateModal"));

  document.getElementById("adminTokenHelpCloseBtn")?.addEventListener("click", () => {
    closeAdminSettingsModal("adminTokenHelpModal");
  });
  document.getElementById("adminAboutCloseBtn")?.addEventListener("click", () => {
    closeAdminSettingsModal("adminAboutModal");
  });
  document.getElementById("adminAboutOkBtn")?.addEventListener("click", () => {
    closeAdminSettingsModal("adminAboutModal");
  });
  document.getElementById("adminTotpRotateCloseBtn")?.addEventListener("click", () => {
    closeAdminSettingsModal("adminTotpRotateModal");
  });
  document.getElementById("adminTotpRotateCancelBtn")?.addEventListener("click", () => {
    closeAdminSettingsModal("adminTotpRotateModal");
  });
  document.getElementById("adminTotpRotateNextBtn")?.addEventListener("click", () => {
    submitAdminTotpRotateAndShowQr().catch(() => {});
  });

  document.getElementById("adminTokenHelpReloginBtn")?.addEventListener("click", async () => {
    const ok = await uiConfirm(t("adminTokenHelpReloginConfirm"));
    if (!ok) return;
    window.StaffAuth.clearToken();
    window.StaffAuth.redirectToLogin();
  });
}

function openManagerPaidDeleteModal(orderRow) {
  pendingPaidDeleteOrder = orderRow;
  const modal = document.getElementById("managerPaidDeleteModal");
  const hint = document.getElementById("managerPaidDeleteOrderHint");
  if (hint) {
    hint.textContent =
      currentLang === "ja"
        ? `注文 #${orderRow.order_no || orderRow.id} · ${orderRow.tableId} · ${Number(orderRow.total) || 0}円`
        : `订单 #${orderRow.order_no || orderRow.id} · ${orderRow.tableId} · ${Number(orderRow.total) || 0} 円`;
  }
  renderManagerTotpStaticLabels();
  const totpEl = document.getElementById("managerPaidDeleteTotp");
  if (totpEl) totpEl.value = "";
  if (modal) modal.classList.add("show");
  if (totpEl) totpEl.focus();
}

const MANAGER_PAID_META_PAYMENT_CODES = ["cash", "paypay", "alipay", "wechat"];
const MANAGER_PAID_META_FIELD_KEYS = ["total", "payment_method", "guest_count", "tableId"];

function managerPaidMetaFieldTitle(fieldKey) {
  switch (fieldKey) {
    case "total":
      return t("managerPaidEditFieldTotal");
    case "payment_method":
      return t("managerPaidEditFieldPayment");
    case "guest_count":
      return t("managerPaidEditFieldGuests");
    case "tableId":
      return t("managerPaidEditFieldTable");
    default:
      return fieldKey;
  }
}

function showPaidMetaStep(which) {
  const s1 = document.getElementById("managerPaidEditStep1");
  const s2 = document.getElementById("managerPaidEditStep2");
  const titleEl = document.getElementById("managerPaidEditTitle");
  const headEl = titleEl?.closest(".edit-order-head");
  if (s1) s1.style.display = which === 1 ? "block" : "none";
  if (s2) s2.style.display = which === 2 ? "block" : "none";
  if (titleEl) titleEl.style.display = which === 1 ? "" : "none";
  if (headEl) headEl.style.justifyContent = which === 1 ? "" : "flex-end";
}

function resetPaidMetaDynamicUi() {
  const dyn = document.getElementById("managerPaidEditDynamicRows");
  if (dyn) dyn.innerHTML = "";
  const wrap = document.getElementById("managerPaidEditFieldsChecks");
  if (wrap) {
    wrap.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
    });
  }
}

function removePaidMetaRow(fieldKey) {
  const dyn = document.getElementById("managerPaidEditDynamicRows");
  const row = dyn?.querySelector(`[data-paid-meta="${fieldKey}"]`);
  if (row) row.remove();
}

function createPaidMetaRow(fieldKey, orderRow) {
  const wrap = document.createElement("div");
  wrap.dataset.paidMeta = fieldKey;
  wrap.className = "manager-paid-meta-card";

  const title = document.createElement("div");
  title.className = "manager-paid-meta-card-title";
  title.textContent = managerPaidMetaFieldTitle(fieldKey);
  wrap.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "manager-paid-meta-grid";

  const lblB = document.createElement("label");
  lblB.className = "manager-paid-meta-field";
  const spanB = document.createElement("span");
  spanB.textContent = t("managerPaidEditBefore");
  const beforeEl = document.createElement("input");
  beforeEl.type = "text";
  beforeEl.readOnly = true;
  beforeEl.className = "manager-paid-meta-control manager-paid-meta-control--readonly";

  const lblA = document.createElement("label");
  lblA.className = "manager-paid-meta-field";
  const spanA = document.createElement("span");
  spanA.textContent = t("managerPaidEditAfter");

  let afterEl;

  if (fieldKey === "total") {
    beforeEl.value = String(Number(orderRow.total) || 0);
    afterEl = document.createElement("input");
    afterEl.type = "number";
    afterEl.min = "0";
    afterEl.step = "1";
    afterEl.value = beforeEl.value;
    afterEl.dataset.paidMetaInput = "total";
    afterEl.className = "manager-paid-meta-control";
  } else if (fieldKey === "payment_method") {
    const pm = String(orderRow.payment_method || "cash").toLowerCase() || "cash";
    beforeEl.value = getPaymentMethodLabel(pm);
    afterEl = document.createElement("select");
    afterEl.dataset.paidMetaInput = "payment_method";
    afterEl.className = "manager-paid-meta-control";
    MANAGER_PAID_META_PAYMENT_CODES.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = getPaymentMethodLabel(code);
      afterEl.appendChild(opt);
    });
    afterEl.value = MANAGER_PAID_META_PAYMENT_CODES.includes(pm) ? pm : "cash";
  } else if (fieldKey === "guest_count") {
    const gc = Number(orderRow.guest_count);
    const g = Number.isFinite(gc) && gc >= 0 ? Math.floor(gc) : 0;
    beforeEl.value = String(g);
    afterEl = document.createElement("input");
    afterEl.type = "number";
    afterEl.min = "0";
    afterEl.max = "999";
    afterEl.step = "1";
    afterEl.value = String(g);
    afterEl.dataset.paidMetaInput = "guest_count";
    afterEl.className = "manager-paid-meta-control";
  } else if (fieldKey === "tableId") {
    beforeEl.value = orderRow.tableId || "";
    afterEl = document.createElement("select");
    afterEl.dataset.paidMetaInput = "tableId";
    afterEl.className = "manager-paid-meta-control";
    const tables =
      adminAllowedTableIds.length > 0
        ? adminAllowedTableIds
        : [orderRow.tableId].filter(Boolean);
    [...new Set(tables)].sort((a, b) =>
      String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }),
    ).forEach((tid) => {
      const opt = document.createElement("option");
      opt.value = tid;
      opt.textContent = tid;
      afterEl.appendChild(opt);
    });
    afterEl.value = orderRow.tableId || tables[0] || "";
  }

  lblB.appendChild(spanB);
  lblB.appendChild(beforeEl);
  lblA.appendChild(spanA);
  lblA.appendChild(afterEl);
  grid.appendChild(lblB);
  grid.appendChild(lblA);
  wrap.appendChild(grid);
  return wrap;
}

function bindPaidMetaCheckboxes(orderRow) {
  const wrap = document.getElementById("managerPaidEditFieldsChecks");
  if (!wrap) return;
  wrap.innerHTML = "";
  MANAGER_PAID_META_FIELD_KEYS.forEach((fieldKey) => {
    const label = document.createElement("label");
    label.className = "manager-paid-edit-check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.dataset.fieldKey = fieldKey;
    cb.addEventListener("change", () => {
      if (cb.checked) {
        const dyn = document.getElementById("managerPaidEditDynamicRows");
        if (dyn && !dyn.querySelector(`[data-paid-meta="${fieldKey}"]`)) {
          dyn.appendChild(createPaidMetaRow(fieldKey, orderRow));
        }
      } else {
        removePaidMetaRow(fieldKey);
      }
    });
    const span = document.createElement("span");
    span.textContent = managerPaidMetaFieldTitle(fieldKey);
    label.appendChild(cb);
    label.appendChild(span);
    wrap.appendChild(label);
  });
}

function collectPaidMetaChanges(orderRow) {
  const changes = {};
  const dyn = document.getElementById("managerPaidEditDynamicRows");
  if (!dyn) return { changes, error: null };

  const rowTotal = Number(orderRow.total) || 0;
  const rowPm = String(orderRow.payment_method || "cash").toLowerCase() || "cash";
  const rowGcRaw = Number(orderRow.guest_count);
  const rowGc = Number.isFinite(rowGcRaw) && rowGcRaw >= 0 ? Math.floor(rowGcRaw) : 0;
  const rowTable = orderRow.tableId || "";

  const blocks = dyn.querySelectorAll("[data-paid-meta]");
  for (const block of blocks) {
    const fieldKey = block.dataset.paidMeta;
    const afterInput = block.querySelector("[data-paid-meta-input]");
    if (!(afterInput instanceof HTMLElement)) continue;

    if (fieldKey === "total") {
      const v = Number(afterInput.value);
      if (!Number.isInteger(v) || v < 0) {
        return {
          changes: {},
          error: currentLang === "ja" ? "取引金額が無効です" : "交易金额须为非负整数",
        };
      }
      if (v !== rowTotal) changes.total = v;
    } else if (fieldKey === "payment_method") {
      const v = String(afterInput.value || "").toLowerCase();
      if (v !== rowPm) changes.payment_method = v;
    } else if (fieldKey === "guest_count") {
      const v = Number(afterInput.value);
      if (!Number.isInteger(v) || v < 0 || v > 999) {
        return {
          changes: {},
          error: currentLang === "ja" ? "人数が無効です" : "用餐人数须为 0～999 的整数",
        };
      }
      if (v !== rowGc) changes.guest_count = v;
    } else if (fieldKey === "tableId") {
      const v = String(afterInput.value || "").trim();
      if (v && v !== rowTable) changes.tableId = v;
    }
  }
  return { changes, error: null };
}

async function openManagerPaidEditModal(row) {
  await loadAllowedTablesForAdmin();
  managerPaidEditOrder = row;
  managerPaidEditPendingPayload = null;
  renderManagerTotpStaticLabels();
  const reasonEl = document.getElementById("managerPaidEditReason");
  const totpEl = document.getElementById("managerPaidEditTotp");
  if (reasonEl) reasonEl.value = "";
  if (totpEl) totpEl.value = "";
  resetPaidMetaDynamicUi();
  bindPaidMetaCheckboxes(row);
  const sub = document.getElementById("managerPaidEditSub");
  if (sub) {
    sub.textContent = `${t("managerPaidEditHint")} （#${row.order_no || row.id}）`;
  }
  showPaidMetaStep(1);
  const modal = document.getElementById("managerPaidEditModal");
  if (modal) modal.classList.add("show");
}

function closeManagerPaidEditModal() {
  if (managerTotpResumeContext === "edit") {
    cancelManagerTotpPendingEnrollment().catch(() => {});
  }
  managerPaidEditOrder = null;
  managerPaidEditPendingPayload = null;
  resetPaidMetaDynamicUi();
  const wrap = document.getElementById("managerPaidEditFieldsChecks");
  if (wrap) wrap.innerHTML = "";
  showPaidMetaStep(1);
  const modal = document.getElementById("managerPaidEditModal");
  if (modal) modal.classList.remove("show");
}

async function onManagerPaidEditConfirmStep() {
  const orderRow = managerPaidEditOrder;
  if (!orderRow) return;
  const checked = document.querySelectorAll(
    '#managerPaidEditFieldsChecks input[type="checkbox"]:checked',
  );
  if (!checked.length) {
    alert(t("managerPaidEditNeedSelection"));
    return;
  }
  const { changes, error } = collectPaidMetaChanges(orderRow);
  if (error) {
    alert(error);
    return;
  }
  if (!Object.keys(changes).length) {
    alert(t("managerPaidEditNeedActualChange"));
    return;
  }
  const reasonEl = document.getElementById("managerPaidEditReason");
  const reason = reasonEl ? reasonEl.value.trim().slice(0, 500) : "";
  if (!reason) {
    alert(t("managerPaidEditReasonRequired"));
    return;
  }
  managerPaidEditPendingPayload = { reason, changes };
  await refreshManagerTotpStatus().catch(() => {});
  if (!managerTotpEnrolled) {
    managerTotpResumeContext = "edit";
    const data = await postManagerTotpEnrollStart({});
    if (!data) {
      managerTotpResumeContext = null;
      managerPaidEditPendingPayload = null;
      return;
    }
    showManagerTotpEnrollModal(data);
    return;
  }
  showPaidMetaStep(2);
  const totpEl = document.getElementById("managerPaidEditTotp");
  if (totpEl) {
    totpEl.value = "";
    totpEl.focus();
  }
}

function onManagerPaidEditTotpBack() {
  managerPaidEditPendingPayload = null;
  showPaidMetaStep(1);
}

async function submitManagerPaidMetaEdit() {
  if (managerPaidEditSubmitting || !managerPaidEditOrder || !managerPaidEditPendingPayload) return;
  const totpEl = document.getElementById("managerPaidEditTotp");
  const managerTotp = normalizeManagerTotpForPost(totpEl ? totpEl.value : "");
  if (!managerTotp) {
    alert(t("managerTotpCodeRequired"));
    return;
  }
  const submitBtn = document.getElementById("managerPaidEditSubmitBtn");
  managerPaidEditSubmitting = true;
  if (submitBtn) submitBtn.disabled = true;
  try {
    const { reason, changes } = managerPaidEditPendingPayload;
    const res = await authFetch(`/orders/${managerPaidEditOrder.id}/manager-edit-paid-meta`, {
      method: "POST",
      headers: headersWithManagerTotpJson(managerTotp),
      body: JSON.stringify({ reason, changes, managerTotp }),
    });
    if (!res.ok) {
      const msg = await readHttpErrorMessage(res);
      alert(toLocalizedAdminError(msg, "managerPaidEditFail"));
      return;
    }
    closeManagerPaidEditModal();
    alert(t("managerPaidEditOk"));
    searchHistory(historyPage).catch((err) => console.error(err.message));
    scheduleAdminRefresh();
  } finally {
    managerPaidEditSubmitting = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function loadMenuOptions() {
  try {
    const res = await fetch("/api/menu", { cache: "no-store" });
    if (!res.ok) return;
    menuOptions = await res.json();
  } catch (e) {
    console.error("加载菜单失败", e);
  }
}

function normalizeGuestCountInput(raw) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  const num = Number(digits);
  if (!Number.isFinite(num) || num <= 0) return "";
  return String(Math.floor(num));
}

async function loadAllowedTablesForAdmin() {
  try {
    const res = await fetch("/api/tables");
    if (!res.ok) return;
    const data = await res.json();
    const tables = Array.isArray(data?.tables) ? data.tables : [];
    adminAllowedTableIds = tables
      .map((id) => String(id || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  } catch (err) {
    console.error("加载桌号列表失败", err);
  }
}

function renderEmptyTableQuickStart(occupiedSet = null) {
  const listEl = document.getElementById("emptyTableList");
  if (!listEl) return;
  const occupied = occupiedSet || new Set();
  listEl.innerHTML = "";
  if (!adminAllowedTableIds.length) {
    const empty = document.createElement("div");
    empty.style.color = "#64748b";
    empty.style.fontSize = "13px";
    empty.textContent = t("emptyTableNone");
    listEl.appendChild(empty);
    return;
  }
  const emptyTables = adminAllowedTableIds.filter((tableId) => !occupied.has(tableId));
  if (!emptyTables.length) {
    const empty = document.createElement("div");
    empty.style.color = "#64748b";
    empty.style.fontSize = "13px";
    empty.textContent = t("emptyTableNone");
    listEl.appendChild(empty);
    return;
  }
  emptyTables.forEach((tableId) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "empty-table-chip";
    btn.setAttribute("data-table", tableId);
    btn.textContent = tableId;
    listEl.appendChild(btn);
  });
}

function closeQuickSeatModal() {
  quickSeatTableId = "";
  const modal = document.getElementById("quickSeatModal");
  const input = document.getElementById("quickSeatGuestInput");
  if (input) input.value = "";
  if (modal) modal.classList.remove("show");
}

function openQuickOrderDialog(tableId, guestCount, mode = "new") {
  quickOrderActiveTableId = tableId;
  const modal = document.getElementById("quickOrderModal");
  const title = document.getElementById("quickOrderTitle");
  const frame = document.getElementById("quickOrderFrame");
  if (title) title.innerText = t("quickOrderTitle").replace("{table}", tableId || "-");
  if (frame) {
    frame.src = `/index.html?tableId=${encodeURIComponent(tableId)}&guestCount=${encodeURIComponent(guestCount)}&autostart=1&mode=${encodeURIComponent(mode)}`;
  }
  if (modal) modal.classList.add("show");
}

function closeQuickOrderDialog() {
  quickOrderActiveTableId = "";
  const modal = document.getElementById("quickOrderModal");
  const frame = document.getElementById("quickOrderFrame");
  if (modal) modal.classList.remove("show");
  if (frame) frame.src = "about:blank";
}

function openQuickSeatModal(tableId) {
  quickSeatTableId = tableId;
  const modal = document.getElementById("quickSeatModal");
  const tableText = document.getElementById("quickSeatTableText");
  const input = document.getElementById("quickSeatGuestInput");
  if (tableText) tableText.textContent = t("quickSeatTableLabel").replace("{table}", tableId);
  if (input) input.value = "";
  if (modal) modal.classList.add("show");
  if (input) input.focus();
}

async function submitQuickSeat() {
  if (!quickSeatTableId) return;
  const input = document.getElementById("quickSeatGuestInput");
  const guestCount = normalizeGuestCountInput(input?.value || "");
  if (!guestCount) {
    alert(t("quickSeatInvalidGuest"));
    if (input) input.focus();
    return;
  }
  const res = await authFetch(`/tables/${encodeURIComponent(quickSeatTableId)}/new-session`, {
    method: "POST",
  });
  if (res.status === 409) {
    alert(t("quickSeatConflict"));
    scheduleAdminRefresh();
    return;
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || t("commonActionFailed"));
  }
  const readyTableId = quickSeatTableId;
  closeQuickSeatModal();
  openQuickOrderDialog(readyTableId, guestCount, "new");
}

async function openAppendOrderDialog(tableId) {
  const res = await authFetch(`/tables/${encodeURIComponent(tableId)}/active-orders`);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || t("commonActionFailed"));
  }
  const data = await res.json();
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const guestCount = String(
    Math.max(
      1,
      ...rows.map((row) => {
        const n = Number(row?.guest_count);
        return Number.isInteger(n) && n > 0 ? n : 0;
      }),
    ),
  );
  openQuickOrderDialog(tableId, guestCount, "append");
}

let historyPage = 1;
let historyTotalPages = 1;
let refreshTimer = null;
let isRefreshing = false;
let editingOrder = null;
let editingDraft = [];
let editingMenuOptions = [];
let staffOrderTableId = "";
let staffOrderSessionId = "";
let staffOrderCart = [];
let adminAllowedTableIds = [];
let quickSeatTableId = "";
let quickOrderActiveTableId = "";
let staffOrderCategory = "all";
const STAFF_MENU_CATEGORY_ORDER = [
  "cold_dish",
  "street_food",
  "dim_sum_rice",
  "grilled_fried",
  "casserole",
  "noodles",
  "drink_soft",
  "drink_liquor",
];

async function syncAdminData() {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    if (!adminAllowedTableIds.length) {
      await loadAllowedTablesForAdmin();
    }
    const [reqRes, orderRes] = await Promise.all([authFetch("/checkout"), authFetch("/orders")]);
    checkoutQueue = await reqRes.json();
    const allOrders = await orderRes.json();
    updateSummaryView(allOrders, checkoutQueue);
    updateRawOrderList(allOrders);
  } catch (err) {
    console.error(
      currentLang === "ja"
        ? "同期に失敗しました。サーバー状態を確認してください"
        : "同步失败，请检查服务器是否开启",
      err,
    );
  } finally {
    isRefreshing = false;
  }
}

function scheduleAdminRefresh() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    syncAdminData();
    searchHistory(historyPage).catch((err) => console.error(err.message));
  }, 120);
}

function updateSummaryView(orders, requests) {
  const container = document.getElementById("summary");
  container.innerHTML = "";
  const unpaidOrders = orders.filter((o) => o.status !== "archived" && o.status !== "paid");

  if (unpaidOrders.length === 0) {
    container.innerHTML = `<div style='color:#999; padding:10px;'>${currentLang === "ja" ? "☕ 処理待ちの会計リクエストはありません" : "☕ 当前没有待处理的结账请求"}</div>`;
    renderEmptyTableQuickStart(new Set());
    return;
  }

  const groups = {};
  unpaidOrders.forEach((o) => {
    if (!groups[o.tableId]) groups[o.tableId] = [];
    groups[o.tableId].push(o);
  });
  const visibleTables = new Set(Object.keys(groups));
  renderEmptyTableQuickStart(visibleTables);
  for (const tableId of Array.from(expandedSummaryTables)) {
    if (!visibleTables.has(tableId)) expandedSummaryTables.delete(tableId);
  }

  for (const tableId in groups) {
    const tableOrders = groups[tableId];
    const { doneTotal, pendingTotal } = getTableAmountsByItemStatus(tableOrders);
    const hasPending = pendingTotal > 0;
    const isRequesting = requests.some((r) => r.tableId === tableId);

    const row = document.createElement("div");
    row.className = isRequesting ? "row highlight" : "row";

    const header = document.createElement("div");
    header.className = "summary-header";

    const mainInfo = document.createElement("div");
    mainInfo.className = "summary-main";

    mainInfo.appendChild(document.createTextNode("🪑 "));
    const tableLabel = document.createElement("b");
    tableLabel.textContent = tableId;
    mainInfo.appendChild(tableLabel);
    mainInfo.appendChild(document.createTextNode(currentLang === "ja" ? "  回収予定額: " : "  待收金额: "));

    const totalLabel = document.createElement("span");
    totalLabel.className = "summary-amount";
    totalLabel.textContent = `${doneTotal}円`;
    mainInfo.appendChild(totalLabel);
    if (hasPending) {
      const pendingHint = document.createElement("span");
      pendingHint.className = "summary-pending";
      pendingHint.textContent = currentLang === "ja" ? `(未提供 ${pendingTotal}円)` : `(未上菜 ${pendingTotal}円)`;
      mainInfo.appendChild(pendingHint);
    }

    if (isRequesting) {
      const warn = document.createElement("span");
      warn.className = "summary-warning";
      warn.textContent = currentLang === "ja" ? " ⚠️ 会計リクエスト中" : " ⚠️ 正在请求结账";
      mainInfo.appendChild(warn);
    }

    const payBtn = document.createElement("button");
    payBtn.className = "pay-btn";
    payBtn.textContent = currentLang === "ja" ? "入金確認" : "确认收款";
    payBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      pay(tableId);
    });
    const staffOrderBtn = document.createElement("button");
    staffOrderBtn.className = "pay-btn";
    staffOrderBtn.textContent = t("staffOrderBtn");
    staffOrderBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      openAppendOrderDialog(tableId).catch((err) => alert(err.message || t("commonActionFailed")));
    });
    const actionWrap = document.createElement("div");
    actionWrap.style.display = "flex";
    actionWrap.style.gap = "6px";
    actionWrap.appendChild(staffOrderBtn);
    actionWrap.appendChild(payBtn);
    header.appendChild(mainInfo);
    header.appendChild(actionWrap);

    const detail = document.createElement("div");
    detail.className = "detail summary-detail";
    detail.style.display = expandedSummaryTables.has(tableId) ? "block" : "none";
    detail.appendChild(generateItemHtml(tableOrders));
    header.addEventListener("click", () => toggleTableDetail(tableId, detail));

    row.appendChild(header);
    row.appendChild(detail);
    container.appendChild(row);
  }
}

function generateItemHtml(orders) {
  const wrapper = document.createElement("div");
  const aggregate = {};
  orders.forEach((order) => {
    parseOrderItems(order).forEach((item) => {
      const id = Number(item?.id);
      if (!Number.isInteger(id)) return;
      const qty = Number(item?.quantity) || 0;
      if (!aggregate[id]) {
        aggregate[id] = {
          id,
          name: item?.name?.ja || item?.name?.zh || item?.name?.en || "未知菜品",
          quantity: 0,
        };
      }
      aggregate[id].quantity += qty;
    });
  });

  Object.values(aggregate)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((entry) => {
      const line = document.createElement("div");
      line.style.margin = "6px 0";
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.gap = "8px";

      const nameLabel = document.createElement("span");
      nameLabel.style.minWidth = "140px";
      nameLabel.textContent = entry.name;
      line.appendChild(nameLabel);

      const qtyLabel = document.createElement("span");
      qtyLabel.style.minWidth = "42px";
      qtyLabel.style.textAlign = "center";
      qtyLabel.style.fontWeight = "700";
      qtyLabel.style.color = "#334155";
      qtyLabel.textContent = `x ${entry.quantity}`;
      line.appendChild(qtyLabel);
      wrapper.appendChild(line);
    });

  if (wrapper.childNodes.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = currentLang === "ja" ? "明細なし" : "暂无明细";
    wrapper.appendChild(empty);
  }
  return wrapper;
}

function updateRawOrderList(data) {
  const ul = document.getElementById("orders");
  ul.innerHTML = "";
  const activeData = data.filter((o) => o.status === "pending" || o.status === "done");

  const activeTableSet = new Set(activeData.map((o) => o.tableId));
  const activeOrderCount = activeData.length;
  const activeTotal = activeData.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const summary = document.createElement("div");
  summary.className = "orders-live-summary";
  summary.textContent =
    currentLang === "ja"
      ? `リアルタイム: ${activeTableSet.size} テーブル / ${activeOrderCount} 件 / ${activeTotal}円`
      : `实时: ${activeTableSet.size} 桌 / ${activeOrderCount} 单 / ${activeTotal}円`;
  ul.appendChild(summary);

  if (activeData.length === 0) {
    const empty = document.createElement("div");
    empty.style.color = "#64748b";
    empty.style.padding = "6px 2px";
    empty.textContent = currentLang === "ja" ? "現在進行中の注文はありません" : "当前没有进行中的订单";
    ul.appendChild(empty);
    return;
  }

  const grouped = {};
  activeData.forEach((o) => {
    if (!grouped[o.tableId]) grouped[o.tableId] = [];
    grouped[o.tableId].push(o);
  });

  Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .forEach((tableId) => {
      const tableOrders = grouped[tableId];
      const tableTotal = tableOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const li = document.createElement("li");
      li.className = "raw-table-card";

      const header = document.createElement("div");
      header.className = "raw-table-header";
      const headerText = document.createElement("span");
      headerText.className = "raw-table-title";
      headerText.textContent =
        currentLang === "ja"
          ? `${tableId} - ${tableTotal}円（${tableOrders.length}件）`
          : `${tableId} - ${tableTotal}円（${tableOrders.length}单）`;
      header.appendChild(headerText);

      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = currentLang === "ja" ? "展開" : "展开";
      header.appendChild(toggleBtn);
      li.appendChild(header);

      const detail = document.createElement("div");
      detail.style.display = "none";
      detail.style.marginTop = "4px";

      tableOrders.forEach((o) => {
        const row = document.createElement("div");
        row.className = "raw-order-row";
        row.style.flexDirection = "column";
        row.style.alignItems = "stretch";
        row.style.gap = "6px";
        row.style.border = "1px solid #e2e8f0";
        row.style.borderRadius = "10px";
        row.style.padding = "8px";
        row.style.background = "#fff";

        const main = document.createElement("div");
        main.className = "raw-order-main";
        main.style.display = "flex";
        main.style.alignItems = "center";
        main.style.justifyContent = "space-between";
        main.style.gap = "8px";
        const rowText = document.createElement("span");
        rowText.textContent = `#${o.order_no || o.id} - ${o.total}円`;
        rowText.style.fontWeight = "700";
        main.appendChild(rowText);

        const statusBadge = document.createElement("span");
        statusBadge.className = `status-badge ${o.status || ""}`;
        statusBadge.textContent = getStatusLabel(o.status);
        main.appendChild(statusBadge);
        row.appendChild(main);

        const itemsBox = document.createElement("div");
        itemsBox.style.display = "grid";
        itemsBox.style.gap = "4px";
        itemsBox.style.fontSize = "13px";
        const items = parseOrderItems(o);
        if (!items.length) {
          const emptyText = document.createElement("div");
          emptyText.style.color = "#64748b";
          emptyText.textContent = currentLang === "ja" ? "明細なし" : "暂无明细";
          itemsBox.appendChild(emptyText);
        } else {
          items.forEach((item) => {
            const line = document.createElement("div");
            line.style.display = "flex";
            line.style.alignItems = "center";
            line.style.justifyContent = "space-between";
            line.style.gap = "8px";
            const itemName = item?.name?.[currentLang] || item?.name?.ja || item?.name?.zh || item?.name?.en || "未知菜品";
            const qty = Number(item?.quantity) || 0;
            const itemStatus = normalizeItemStatus(item, o.status);
            const statusText =
              itemStatus === "done"
                ? currentLang === "ja"
                  ? "提供済み"
                  : "已出菜"
                : currentLang === "ja"
                  ? "未提供"
                  : "未上菜";
            const statusColor = itemStatus === "done" ? "#15803d" : "#ea580c";
            line.innerHTML = `
              <span>${escapeHtml(itemName)} x ${qty}</span>
              <span style="color:${statusColor}; font-weight:700;">${statusText}</span>
            `;
            itemsBox.appendChild(line);
          });
        }
        row.appendChild(itemsBox);

        const actionWrap = document.createElement("div");
        actionWrap.style.display = "flex";
        actionWrap.style.justifyContent = "flex-end";
        if (o.status === "pending" || o.status === "done") {
          const delBtn = document.createElement("button");
          delBtn.textContent = currentLang === "ja" ? "注文削除" : "删除订单";
          delBtn.addEventListener("click", () => deleteOrder(o));
          actionWrap.appendChild(delBtn);
        }
        row.appendChild(actionWrap);
        detail.appendChild(row);
      });

      toggleBtn.addEventListener("click", () => {
        const show = detail.style.display === "none";
        detail.style.display = show ? "block" : "none";
        toggleBtn.textContent = show
          ? currentLang === "ja"
            ? "折りたたむ"
            : "收起"
          : currentLang === "ja"
            ? "展開"
            : "展开";
      });

      li.appendChild(detail);
      ul.appendChild(li);
    });
}

function getStatusLabel(status) {
  if (currentLang === "ja") {
    if (status === "pending") return "進行中";
    if (status === "done") return "提供完了";
    if (status === "paid") return "会計済み";
    if (status === "archived") return "締め済み";
  } else {
    if (status === "pending") return "进行中";
    if (status === "done") return "已出菜";
    if (status === "paid") return "已结账";
    if (status === "archived") return "已归档";
  }
  return String(status || "-");
}

function getPaymentMethodLabel(method) {
  const value = String(method || "").toLowerCase();
  if (currentLang === "ja") {
    if (value === "cash") return "現金";
    if (value === "paypay") return "PayPay";
    if (value === "alipay" || value === "wechat") return "Alipay";
    return "-";
  }
  if (value === "cash") return "现金";
  if (value === "paypay") return "PayPay";
  if (value === "alipay" || value === "wechat") return "支付宝";
  return "-";
}

function parseOrderItems(order) {
  try {
    const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
    return Array.isArray(items) ? items : [];
  } catch (e) {
    return [];
  }
}

function normalizeItemStatus(item, orderStatus) {
  if (item?.status === "done" || item?.status === "pending") return item.status;
  return orderStatus === "done" ? "done" : "pending";
}

function getTableAmountsByItemStatus(tableOrders) {
  let doneTotal = 0;
  let pendingTotal = 0;
  tableOrders.forEach((order) => {
    parseOrderItems(order).forEach((item) => {
      const qty = Number(item?.quantity) || 0;
      const price = Number(item?.price) || 0;
      if (qty <= 0 || price < 0) return;
      const amount = qty * price;
      const itemStatus = normalizeItemStatus(item, order.status);
      if (itemStatus === "done") doneTotal += amount;
      else pendingTotal += amount;
    });
  });
  return { doneTotal, pendingTotal };
}

async function editOrder(order) {
  if (!menuOptions.length) {
    await loadMenuOptions();
  }
  const currentItems = parseOrderItems(order);
  const qtyById = new Map();
  const fallbackInfoById = new Map();
  currentItems.forEach((item) => {
    const id = Number(item?.id);
    const qty = Number(item?.quantity) || 0;
    if (!Number.isInteger(id) || qty <= 0) return;
    qtyById.set(id, (qtyById.get(id) || 0) + qty);
    if (!fallbackInfoById.has(id)) {
      fallbackInfoById.set(id, {
        price: Number(item?.price) || 0,
        name: item?.name || {},
      });
    }
  });
  const menuById = new Map(menuOptions.map((m) => [Number(m.id), m]));
  editingMenuOptions = Array.from(qtyById.keys()).map((id) => {
    const menuItem = menuById.get(id);
    const fallback = fallbackInfoById.get(id) || {};
    return {
      id,
      price: Number(menuItem?.price ?? fallback.price) || 0,
      name: menuItem?.name || fallback.name || {},
    };
  });
  editingOrder = order;
  editingDraft = editingMenuOptions.map((menuItem) => ({
    id: Number(menuItem.id),
    quantity: qtyById.get(Number(menuItem.id)) || 0,
  }));
  openEditOrderModal();
}

function getMenuName(menuItem) {
  return menuItem?.name?.[currentLang] || menuItem?.name?.ja || menuItem?.name?.zh || menuItem?.name?.en || "未知菜品";
}

function openEditOrderModal() {
  const modal = document.getElementById("editOrderModal");
  const sub = document.getElementById("editOrderSub");
  const orderLabel = editingOrder ? `#${editingOrder.order_no || editingOrder.id}` : "-";
  const tableLabel = editingOrder ? editingOrder.tableId : "-";
  sub.innerText = `${t("editOrderHint")} ${t("editOrderTablePrefix")}: ${tableLabel} / ${orderLabel}`;
  renderEditOrderRows();
  modal.classList.add("show");
}

function closeEditOrderModal() {
  editingOrder = null;
  editingDraft = [];
  editingMenuOptions = [];
  document.getElementById("editOrderModal").classList.remove("show");
}

function renderEditOrderRows() {
  const list = document.getElementById("editOrderList");
  list.innerHTML = "";
  let total = 0;
  editingMenuOptions.forEach((menuItem) => {
    const id = Number(menuItem.id);
    const draft = editingDraft.find((i) => i.id === id);
    const qty = draft ? draft.quantity : 0;
    total += (Number(menuItem.price) || 0) * qty;

    const row = document.createElement("div");
    row.className = "edit-item-row";
    row.innerHTML = `
      <div>
        <div class="edit-item-name">${escapeHtml(getMenuName(menuItem))}</div>
        <div style="color:#6b7280; font-size:12px;">${Number(menuItem.price) || 0}円</div>
      </div>
      <div class="edit-item-controls">
        <button type="button" data-action="minus" data-id="${id}">-</button>
        <span class="edit-item-qty">${qty}</span>
        <button type="button" data-action="plus" data-id="${id}">+</button>
      </div>
    `;
    list.appendChild(row);
  });
  document.getElementById("editOrderTotal").innerText = `${t("editOrderTotalPrefix")}: ${total}円`;
}

function changeDraftQuantity(menuId, delta) {
  const target = editingDraft.find((i) => i.id === menuId);
  if (!target) return;
  target.quantity = Math.max(0, target.quantity + delta);
  renderEditOrderRows();
}

async function saveEditedOrder() {
  if (!editingOrder) return;
  const parsedItems = editingDraft
    .filter((i) => Number.isInteger(i.id) && i.quantity > 0)
    .map((i) => ({ id: i.id, quantity: i.quantity }));
  if (parsedItems.length === 0) {
    alert(t("editOrderEmpty"));
    return;
  }
  const res = await authFetch(`/orders/${editingOrder.id}/items`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: parsedItems }),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    alert(toLocalizedAdminError(msg, "updateFailed"));
    return;
  }
  alert(t("editOrderSaved"));
  closeEditOrderModal();
  scheduleAdminRefresh();
}

async function deleteOrder(order) {
  const confirmed = await window.uiConfirm(
    currentLang === "ja"
      ? `注文 #${order.order_no || order.id} を削除しますか？この操作は取り消せません。`
      : `确认删除订单 #${order.order_no || order.id} 吗？此操作不可恢复。`,
  );
  if (!confirmed) return;
  const res = await authFetch(`/orders/${order.id}`, { method: "DELETE" });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    alert(toLocalizedAdminError(msg, "deleteFailed"));
    return;
  }
  alert(currentLang === "ja" ? "注文を削除しました" : "订单已删除");
}

function updateCheckoutTextList(data) {
  const ul = document.getElementById("checkoutList");
  ul.innerHTML = "";
  data.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = currentLang === "ja" ? `🪑 ${item.tableId} が会計をリクエスト` : `🪑 ${item.tableId} 请求结账`;
    ul.appendChild(li);
  });
}

function toggleTableDetail(tableId, detailEl) {
  const isOpen = detailEl.style.display !== "none";
  if (isOpen) {
    detailEl.style.display = "none";
    expandedSummaryTables.delete(tableId);
  } else {
    detailEl.style.display = "block";
    expandedSummaryTables.add(tableId);
  }
}

async function pay(tableId) {
  const ordersRes = await authFetch("/orders");
  const allOrders = await ordersRes.json();
  const tableOrders = allOrders.filter((o) => o.tableId === tableId && o.status !== "archived" && o.status !== "paid");
  const { doneTotal } = getTableAmountsByItemStatus(tableOrders);
  const pendingItems = summarizePendingItems(tableOrders);
  const hasPendingItems = pendingItems.length > 0;

  let excludeUnfinished = false;
  if (hasPendingItems) {
    const detail = pendingItems.map((i) => `- ${i.name} x ${i.quantity}`).join("\n");
    const confirmSkipPending = await window.uiConfirm(
      currentLang === "ja"
        ? `テーブル ${tableId} は未提供料理があります:\n\n${detail}\n\n提供済み金額 ${doneTotal}円のみ回収し、未提供分を除外します。続行しますか？`
        : `桌号 ${tableId} 仍有未上菜项目：\n\n${detail}\n\n若确认收款，将只收已上菜金额 ${doneTotal}円，并自动扣除以上未出菜项目。是否继续？`,
    );
    if (!confirmSkipPending) return;
    excludeUnfinished = true;
  } else if (
    !(await window.uiConfirm(currentLang === "ja" ? `テーブル ${tableId} を会計して入金確認しますか？` : `确认桌号 ${tableId} 结账并收款吗？`))
  ) {
    return;
  }

  const paymentMethod = await pickPaymentMethod();
  if (!paymentMethod) return;

  const res = await authFetch("/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tableId, excludeUnfinished, paymentMethod }),
  });
  if (res.ok) {
    const result = await res.json();
    if (result?.message === "NO_PAYABLE_ITEMS_CLEANED") {
      alert(t("zeroPayableAutoCleaned"));
      scheduleAdminRefresh();
      return;
    }
    if (excludeUnfinished) {
      alert(
        currentLang === "ja"
          ? `会計完了。入金 ${result.paidCount} 件、未提供分除外 ${result.archivedPendingCount} 件。`
          : `结账成功！已收款订单 ${result.paidCount} 条，已扣除未上菜订单 ${result.archivedPendingCount} 条。`,
      );
    } else {
      alert(currentLang === "ja" ? "会計完了" : "结账成功！");
    }
    scheduleAdminRefresh();
  }
}

async function pickPaymentMethod() {
  const modal = document.getElementById("payMethodModal");
  const cashBtn = document.getElementById("payMethodCashBtn");
  const wechatBtn = document.getElementById("payMethodWechatBtn");
  const paypayBtn = document.getElementById("payMethodPaypayBtn");
  const cancelBtn = document.getElementById("payMethodCancelBtn");
  if (!modal || !cashBtn || !wechatBtn || !paypayBtn || !cancelBtn) return null;
  return new Promise((resolve) => {
    const close = (value) => {
      modal.classList.remove("show");
      cashBtn.removeEventListener("click", onCash);
      wechatBtn.removeEventListener("click", onWechat);
      paypayBtn.removeEventListener("click", onPaypay);
      cancelBtn.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onOverlay);
      resolve(value);
    };
    const onCash = () => close("cash");
    const onWechat = () => close("alipay");
    const onPaypay = () => close("paypay");
    const onCancel = () => close(null);
    const onOverlay = (event) => {
      if (event.target === modal) close(null);
    };
    cashBtn.addEventListener("click", onCash);
    wechatBtn.addEventListener("click", onWechat);
    paypayBtn.addEventListener("click", onPaypay);
    cancelBtn.addEventListener("click", onCancel);
    modal.addEventListener("click", onOverlay);
    modal.classList.add("show");
  });
}

function summarizePendingItems(orders) {
  const map = {};
  orders.forEach((order) => {
    try {
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      if (!Array.isArray(items)) return;
      items.forEach((item) => {
        const itemStatus = normalizeItemStatus(item, order.status);
        if (itemStatus === "done") return;
        const name = item?.name?.ja || item?.name?.zh || item?.name?.en || "未知菜品";
        const quantity = Number(item?.quantity) || 0;
        if (!quantity) return;
        map[name] = (map[name] || 0) + quantity;
      });
    } catch (e) {
      console.error(t("parsePendingFailed"), e);
    }
  });
  return Object.entries(map).map(([name, quantity]) => ({ name, quantity }));
}

function closeStaffOrderModal() {
  staffOrderTableId = "";
  staffOrderSessionId = "";
  staffOrderCart = [];
  const modal = document.getElementById("staffOrderModal");
  if (modal) modal.classList.remove("show");
}

function getStaffOrderName(item) {
  return item?.name?.[currentLang] || item?.name?.ja || item?.name?.zh || item?.name?.en || "未知菜品";
}

function getStaffCategoryLabel(category) {
  const mapJa = {
    cold_dish: "前菜",
    street_food: "屋台",
    dim_sum_rice: "点心・飯類",
    grilled_fried: "串焼き&揚げ物",
    casserole: "鍋類",
    noodles: "麺類",
    drink_soft: "ソフトドリンク",
    drink_liquor: "お酒",
  };
  const mapZh = {
    cold_dish: "前菜",
    street_food: "屋台",
    dim_sum_rice: "点心・饭类",
    grilled_fried: "串烧&炸物",
    casserole: "锅类",
    noodles: "面类",
    drink_soft: "饮料・汽水",
    drink_liquor: "酒水",
  };
  const mapEn = {
    cold_dish: "Cold Dish",
    street_food: "Street Food",
    dim_sum_rice: "Dim Sum & Rice",
    grilled_fried: "Grilled & Fried",
    casserole: "Casserole",
    noodles: "Noodles",
    drink_soft: "Soft Drinks",
    drink_liquor: "Alcohol",
  };
  if (category === "all") return t("staffOrderCategoryAll");
  if (currentLang === "ja") return mapJa[category] || category;
  if (currentLang === "en") return mapEn[category] || category;
  return mapZh[category] || category;
}

function getStaffOrderCategories() {
  const set = new Set(
    (menuOptions || [])
      .map((m) => String(m.category || "").trim())
      .filter(Boolean),
  );
  const ordered = STAFF_MENU_CATEGORY_ORDER.filter((key) => set.has(key));
  const rest = Array.from(set).filter((key) => !STAFF_MENU_CATEGORY_ORDER.includes(key));
  return [...ordered, ...rest];
}

function changeStaffOrderQty(menuId, delta) {
  const idx = staffOrderCart.findIndex((i) => i.id === menuId);
  if (idx < 0 && delta > 0) {
    const menuItem = menuOptions.find((m) => Number(m.id) === menuId);
    if (!menuItem) return;
    staffOrderCart.push({
      id: menuId,
      quantity: 1,
      name: menuItem.name,
      price: Number(menuItem.price) || 0,
    });
  } else if (idx >= 0) {
    staffOrderCart[idx].quantity = Math.max(0, staffOrderCart[idx].quantity + delta);
    if (staffOrderCart[idx].quantity === 0) staffOrderCart.splice(idx, 1);
  }
  renderStaffOrderSection();
}

function renderStaffOrderSection(activeOrders = null) {
  const currentBox = document.getElementById("staffOrderCurrentList");
  const menuBox = document.getElementById("staffOrderMenuList");
  const categoryBar = document.getElementById("staffOrderCategoryBar");
  const cartBox = document.getElementById("staffOrderCartList");
  const infoEl = document.getElementById("staffOrderSessionInfo");
  if (!currentBox || !menuBox || !cartBox || !infoEl || !categoryBar) return;

  if (activeOrders) {
    currentBox.innerHTML = "";
    if (!activeOrders.length) {
      currentBox.textContent = t("staffOrderEmpty");
    } else {
      const agg = {};
      activeOrders.forEach((order) => {
        parseOrderItems(order).forEach((item) => {
          const id = Number(item?.id);
          const qty = Number(item?.quantity) || 0;
          if (!Number.isInteger(id) || qty <= 0) return;
          const key = String(id);
          if (!agg[key]) {
            agg[key] = {
              name: item?.name || {},
              quantity: 0,
            };
          }
          agg[key].quantity += qty;
        });
      });
      Object.values(agg).forEach((item) => {
        const line = document.createElement("div");
        line.textContent = `${getStaffOrderName(item)} x ${item.quantity}`;
        currentBox.appendChild(line);
      });
    }
  }

  if (!menuOptions.length) {
    categoryBar.innerHTML = "";
    menuBox.innerHTML = "";
    return;
  }
  const categories = getStaffOrderCategories();
  if (staffOrderCategory !== "all" && !categories.includes(staffOrderCategory)) {
    staffOrderCategory = categories[0] || "all";
  }
  categoryBar.innerHTML = "";
  [{ key: "all" }, ...categories.map((key) => ({ key }))].forEach((entry) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "staff-order-category-btn";
    if (entry.key === staffOrderCategory) btn.classList.add("active");
    btn.setAttribute("data-cat", entry.key);
    btn.textContent = getStaffCategoryLabel(entry.key);
    categoryBar.appendChild(btn);
  });

  menuBox.innerHTML = "";
  menuOptions
    .filter((m) => staffOrderCategory === "all" || String(m.category || "") === staffOrderCategory)
    .forEach((m) => {
    const row = document.createElement("div");
    row.className = "staff-order-menu-row";
    const qty = staffOrderCart.find((i) => i.id === Number(m.id))?.quantity || 0;
    row.innerHTML = `
      <span>${escapeHtml(getStaffOrderName(m))} (${Number(m.price) || 0}円)</span>
      <div class="staff-order-controls">
        <button type="button" data-a="minus" data-id="${Number(m.id)}">-</button>
        <span>${qty}</span>
        <button type="button" data-a="plus" data-id="${Number(m.id)}">+</button>
      </div>
    `;
      menuBox.appendChild(row);
    });

  cartBox.innerHTML = "";
  let total = 0;
  staffOrderCart.forEach((item) => {
    const line = document.createElement("div");
    line.textContent = `${getStaffOrderName(item)} x ${item.quantity}`;
    cartBox.appendChild(line);
    total += item.quantity * item.price;
  });
  if (!staffOrderCart.length) cartBox.textContent = t("staffOrderCartEmpty");
  infoEl.textContent = t("staffOrderSessionInfo").replace("{session}", staffOrderSessionId || "-");
  const totalEl = document.getElementById("staffOrderCartTotal");
  if (totalEl) totalEl.textContent = `¥${total}`;
}

async function refreshStaffOrderTableData() {
  if (!staffOrderTableId) return;
  const res = await authFetch(`/tables/${encodeURIComponent(staffOrderTableId)}/active-orders`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  staffOrderSessionId = data.sessionId || "";
  renderStaffOrderSection(Array.isArray(data.rows) ? data.rows : []);
}

async function openStaffOrderModal(tableId) {
  staffOrderTableId = tableId;
  staffOrderCart = [];
  if (!menuOptions.length) await loadMenuOptions();
  staffOrderCategory = getStaffOrderCategories()[0] || "all";
  const modal = document.getElementById("staffOrderModal");
  const tableTitle = document.getElementById("staffOrderTable");
  if (tableTitle) tableTitle.textContent = tableId;
  await refreshStaffOrderTableData();
  if (modal) modal.classList.add("show");
}

function openStaffOrderGuestPage() {
  if (!staffOrderTableId) return;
  window.open(`/index.html?tableId=${encodeURIComponent(staffOrderTableId)}`, "_blank", "noopener");
}

async function createNewTableSession() {
  if (!staffOrderTableId) return;
  const res = await authFetch(`/tables/${encodeURIComponent(staffOrderTableId)}/new-session`, {
    method: "POST",
  });
  if (res.status === 409) {
    alert(t("staffOrderNewSessionBlocked"));
    return;
  }
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || t("commonActionFailed"));
  }
  staffOrderCart = [];
  alert(t("staffOrderNewSessionSuccess"));
  await refreshStaffOrderTableData();
}

async function submitStaffOrder() {
  if (!staffOrderTableId) return;
  if (!staffOrderCart.length) {
    alert(t("staffOrderCartEmpty"));
    return;
  }
  const payload = {
    tableId: staffOrderTableId,
    guestCount: 1,
    items: staffOrderCart.map((item) => ({ id: item.id, quantity: item.quantity })),
  };
  const res = await authFetch("/staff/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    const errorCode = res.headers.get("x-order-error-code") || "";
    throw new Error(toLocalizedAdminError(msg, "commonActionFailed", { errorCode, status: res.status }));
  }
  staffOrderCart = [];
  alert(t("staffOrderSuccess"));
  await refreshStaffOrderTableData();
  scheduleAdminRefresh();
}

if (ensureStaffLogin()) {
  renderText();
  refreshBusinessStatus().catch(() => {});
  setupManagerTotpUi();
  setupAdminSettingsUi();
  syncAdminData();
  loadMenuOptions();
  searchHistory(historyPage).catch((err) => console.error(err.message));
}

let staffSocket = null;
function setupStaffSocket() {
  const token = window.StaffAuth.getToken();
  if (!token) return;
  if (window.StaffAuth.isStaticDemoMode?.()) return;
  if (typeof io !== "function") return;
  staffSocket = io("/staff", {
    auth: { token },
  });
  staffSocket.on("connect_error", (err) => {
    console.error("WebSocket 鉴权失败:", err.message);
  });
  staffSocket.on("data-updated", () => {
    refreshBusinessStatus().catch(() => {});
    scheduleAdminRefresh();
  });
}

async function searchHistory(page = 1) {
  historyPage = page;
  const orderNo = document.getElementById("history-order-no").value.trim();
  const tableId = document.getElementById("history-table").value.trim();
  const startDate = document.getElementById("history-start").value;
  const endDate = document.getElementById("history-end").value;

  const params = new URLSearchParams({
    page: String(historyPage),
    pageSize: "15",
  });
  if (orderNo) params.set("orderNo", orderNo);
  if (tableId) params.set("tableId", tableId);
  params.set("status", "paid,archived");
  if (startDate) params.set("startDate", new Date(startDate).toISOString());
  if (endDate) params.set("endDate", new Date(endDate).toISOString());

  const res = await authFetch(`/orders/history?${params.toString()}`);
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(toLocalizedAdminError(msg, "historySearchFailed"));
  }
  const data = await res.json();
  historyTotalPages = data.totalPages || 1;
  renderHistoryResult(data);
}

function renderHistoryResult(data) {
  const summary = document.getElementById("history-summary");
  const pages = Math.max(1, data.totalPages || 1);
  summary.textContent = t("historySummary")
    .replace("{total}", String(data.total ?? 0))
    .replace("{page}", String(data.page ?? 1))
    .replace("{pages}", String(pages));

  const list = document.getElementById("history-list");
  list.innerHTML = "";

  const headerLi = document.createElement("li");
  headerLi.className = "history-head-row";
  const headerGrid = document.createElement("div");
  headerGrid.className = "history-grid history-head-grid";
  [
    t("historyColOrderNo"),
    t("historyColTradeTime"),
    t("historyColTradeAmount"),
    t("historyColPaymentMethod"),
    t("historyColGuestCount"),
    t("historyColTable"),
  ].forEach((label, idx) => {
    const cell = document.createElement("div");
    cell.textContent = label;
    cell.style.textAlign = idx >= 2 ? "right" : "left";
    headerGrid.appendChild(cell);
  });
  headerLi.appendChild(headerGrid);
  list.appendChild(headerLi);

  if (!data.rows || data.rows.length === 0) {
    const li = document.createElement("li");
    li.textContent = t("historyEmptyList");
    list.appendChild(li);
    return;
  }
  data.rows.forEach((row) => {
    const li = document.createElement("li");
    li.className = "history-order-row";

    const title = document.createElement("div");
    title.className = "history-grid history-order-title";

    const orderNoEl = document.createElement("div");
    orderNoEl.textContent = `#${row.order_no || row.id}`;
    orderNoEl.style.fontWeight = "700";
    title.appendChild(orderNoEl);

    const timeEl = document.createElement("div");
    const dateLocale = currentLang === "ja" ? "ja-JP" : "zh-CN";
    timeEl.textContent = new Date(row.created_at).toLocaleString(dateLocale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    title.appendChild(timeEl);

    const totalEl = document.createElement("div");
    totalEl.textContent = `${Number(row.total) || 0}円`;
    totalEl.style.textAlign = "right";
    totalEl.style.fontWeight = "700";
    totalEl.style.color = "#0f172a";
    title.appendChild(totalEl);

    const paymentEl = document.createElement("div");
    paymentEl.textContent = getPaymentMethodLabel(row.payment_method);
    paymentEl.style.textAlign = "right";
    paymentEl.style.color = "#334155";
    title.appendChild(paymentEl);

    const guestCountEl = document.createElement("div");
    const guestCount = Number(row.guest_count) || 0;
    guestCountEl.textContent = guestCount > 0 ? `${guestCount}${t("guestCountUnit")}` : "-";
    guestCountEl.style.textAlign = "right";
    guestCountEl.style.color = "#334155";
    title.appendChild(guestCountEl);

    const tableEl = document.createElement("div");
    tableEl.textContent = row.tableId;
    tableEl.style.textAlign = "right";
    tableEl.style.color = "#374151";
    title.appendChild(tableEl);

    const detail = document.createElement("div");
    detail.className = "history-order-detail";
    detail.appendChild(renderHistoryItems(row.items));

    const detailFoot = document.createElement("div");
    detailFoot.style.marginTop = "10px";
    detailFoot.style.display = "flex";
    detailFoot.style.justifyContent = "flex-end";
    detailFoot.style.gap = "8px";
    detailFoot.style.flexWrap = "wrap";
    const editPaidBtn = document.createElement("button");
    editPaidBtn.type = "button";
    editPaidBtn.textContent = t("managerPaidEditBtn");
    editPaidBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openManagerPaidEditModal(row).catch((err) =>
        alert(err.message || t("managerPaidEditFail")),
      );
    });
    detailFoot.appendChild(editPaidBtn);

    const delPaidBtn = document.createElement("button");
    delPaidBtn.type = "button";
    delPaidBtn.textContent = t("managerPaidHistoryDeleteBtn");
    delPaidBtn.style.color = "#b91c1c";
    delPaidBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      openManagerPaidDeleteModal(row);
    });
    detailFoot.appendChild(delPaidBtn);

    detail.appendChild(detailFoot);

    title.addEventListener("click", () => {
      const open = detail.classList.toggle("show");
      detail.style.display = open ? "block" : "none";
    });

    li.appendChild(title);
    li.appendChild(detail);
    list.appendChild(li);
  });
}

function renderHistoryItems(itemsRaw) {
  const container = document.createElement("div");
  let items = [];
  try {
    items = typeof itemsRaw === "string" ? JSON.parse(itemsRaw) : itemsRaw;
  } catch (e) {
    const err = document.createElement("div");
    err.textContent = t("parseItemsFailed");
    container.appendChild(err);
    return container;
  }
  if (!Array.isArray(items) || items.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = currentLang === "ja" ? "料理明細なし" : "无菜品详情";
    container.appendChild(empty);
    return container;
  }
  items.forEach((item) => {
    const row = document.createElement("div");
    const name = item?.name?.ja || item?.name?.zh || item?.name?.en || "未知菜品";
    const qty = Number(item?.quantity) || 0;
    const price = Number(item?.price) || 0;
    row.textContent = `- ${name} x ${qty} (${price}円)`;
    container.appendChild(row);
  });
  return container;
}

function prevHistoryPage() {
  if (historyPage <= 1) return;
  searchHistory(historyPage - 1).catch((err) => alert(err.message));
}

function nextHistoryPage() {
  if (historyPage >= historyTotalPages) return;
  searchHistory(historyPage + 1).catch((err) => alert(err.message));
}

document.getElementById("editOrderCloseBtn").addEventListener("click", closeEditOrderModal);
document.getElementById("editOrderCancelBtn").addEventListener("click", closeEditOrderModal);
document.getElementById("editOrderSaveBtn").addEventListener("click", () => {
  saveEditedOrder().catch((err) => alert(err.message));
});
document.getElementById("editOrderModal").addEventListener("click", (event) => {
  if (event.target && event.target.id === "editOrderModal") closeEditOrderModal();
});
document.getElementById("managerPaidEditCloseBtn").addEventListener("click", closeManagerPaidEditModal);
document.getElementById("managerPaidEditCancelBtn").addEventListener("click", closeManagerPaidEditModal);
document.getElementById("managerPaidEditModal").addEventListener("click", (event) => {
  if (event.target && event.target.id === "managerPaidEditModal") closeManagerPaidEditModal();
});
document.getElementById("managerPaidEditConfirmBtn").addEventListener("click", () => {
  onManagerPaidEditConfirmStep().catch((err) => console.error(err));
});
document.getElementById("managerPaidEditSubmitBtn").addEventListener("click", () => {
  submitManagerPaidMetaEdit().catch((err) => alert(err.message || t("managerPaidEditFail")));
});
document.getElementById("managerPaidEditTotpCancelBtn").addEventListener("click", onManagerPaidEditTotpBack);
document.getElementById("editOrderList").addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute("data-action");
  const idText = target.getAttribute("data-id");
  const menuId = Number(idText);
  if (!Number.isInteger(menuId)) return;
  if (action === "plus") changeDraftQuantity(menuId, 1);
  if (action === "minus") changeDraftQuantity(menuId, -1);
});

document.getElementById("staffOrderCloseBtn").addEventListener("click", closeStaffOrderModal);
document.getElementById("staffOrderSubmitBtn").addEventListener("click", () => {
  submitStaffOrder().catch((err) => alert(err.message || t("commonActionFailed")));
});
document.getElementById("staffOrderMenuList").addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.getAttribute("data-a");
  const idText = target.getAttribute("data-id");
  const menuId = Number(idText);
  if (!Number.isInteger(menuId)) return;
  if (action === "plus") changeStaffOrderQty(menuId, 1);
  if (action === "minus") changeStaffOrderQty(menuId, -1);
});
document.getElementById("staffOrderCategoryBar").addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const next = target.getAttribute("data-cat");
  if (!next) return;
  staffOrderCategory = next;
  renderStaffOrderSection();
});
document.getElementById("emptyTableList").addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const tableId = target.getAttribute("data-table");
  if (!tableId) return;
  openQuickSeatModal(tableId);
});
document.getElementById("staffOrderModal").addEventListener("click", (event) => {
  if (event.target && event.target.id === "staffOrderModal") closeStaffOrderModal();
});
document.getElementById("quickSeatCancelBtn").addEventListener("click", closeQuickSeatModal);
document.getElementById("quickSeatConfirmBtn").addEventListener("click", () => {
  submitQuickSeat().catch((err) => alert(err.message || t("commonActionFailed")));
});
document.getElementById("quickSeatModal").addEventListener("click", (event) => {
  if (event.target && event.target.id === "quickSeatModal") closeQuickSeatModal();
});
document.getElementById("quickSeatGuestInput").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  submitQuickSeat().catch((err) => alert(err.message || t("commonActionFailed")));
});
document.getElementById("quickOrderCloseBtn").addEventListener("click", closeQuickOrderDialog);
document.getElementById("quickOrderModal").addEventListener("click", (event) => {
  if (event.target && event.target.id === "quickOrderModal") closeQuickOrderDialog();
});

setupStaffSocket();
