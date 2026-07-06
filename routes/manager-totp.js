const express = require("express");
const QRCode = require("qrcode");
const {
  verifyTotp,
  verifyTotpDelta,
  extractTotpFromHttp,
  extractTotpForRotateStart,
  createEnrollmentSecret,
  buildAuthenticatorUri,
} = require("../lib/manager-totp");

const KEYS = {
  secret: "manager_totp_secret",
  pending: "manager_totp_pending",
};

function createManagerTotpRouter({ requireStaffAuth, dbGet, dbRun }) {
  const router = express.Router();
  const issuer = process.env.MANAGER_TOTP_ISSUER || "Restaurant Checkout";
  const label = process.env.MANAGER_TOTP_LABEL || "manager";

  router.get("/auth/manager-totp/status", requireStaffAuth, async (req, res) => {
    try {
      const row = await dbGet("SELECT value FROM app_settings WHERE key = ? LIMIT 1", [
        KEYS.secret,
      ]);
      const pendingRow = await dbGet("SELECT value FROM app_settings WHERE key = ? LIMIT 1", [
        KEYS.pending,
      ]);
      const enrolled = Boolean(row?.value && String(row.value).trim());
      const pendingEnrollment = Boolean(pendingRow?.value && String(pendingRow.value).trim());
      return res.json({ enrolled, pendingEnrollment });
    } catch {
      return res.status(500).json({ error: "totp_status_failed" });
    }
  });

  router.post("/auth/manager-totp/enroll/start", requireStaffAuth, async (req, res) => {
    try {
      const enrolledRow = await dbGet("SELECT value FROM app_settings WHERE key = ? LIMIT 1", [
        KEYS.secret,
      ]);
      const enrolledSecret = enrolledRow?.value ? String(enrolledRow.value).trim() : "";
      if (enrolledSecret) {
        const rotateTok = extractTotpForRotateStart(req);
        if (!verifyTotp(enrolledSecret, rotateTok)) {
          // 403：员工 token 仍有效，勿让前端把 TOTP 错当成登录失效（401 会触发清除 token）
          return res.status(403).json({ error: "invalid_rotate_totp" });
        }
      }

      const secret = createEnrollmentSecret();
      await dbRun(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [
        KEYS.pending,
        secret,
      ]);

      const otpauthUrl = buildAuthenticatorUri({
        issuer,
        accountLabel: label,
        secret,
      });
      let qrDataUrl = "";
      try {
        qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        });
      } catch {
        qrDataUrl = "";
      }

      return res.json({
        otpauthUrl,
        secretBase32: secret,
        qrDataUrl,
        issuer,
        label,
      });
    } catch (err) {
      console.error("manager-totp enroll/start:", err);
      return res.status(500).json({ error: "totp_enroll_start_failed" });
    }
  });

  router.post("/auth/manager-totp/enroll/confirm", requireStaffAuth, async (req, res) => {
    try {
      const code = extractTotpFromHttp(req);

      const pendingRow = await dbGet("SELECT value FROM app_settings WHERE key = ? LIMIT 1", [
        KEYS.pending,
      ]);
      const pending = pendingRow?.value ? String(pendingRow.value).trim() : "";
      if (!pending) {
        return res.status(400).json({ error: "no_pending_enrollment" });
      }
      if (!verifyTotp(pending, code)) {
        return res.status(403).json({ error: "invalid_totp" });
      }

      await dbRun(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [
        KEYS.secret,
        pending,
      ]);
      await dbRun(`DELETE FROM app_settings WHERE key = ?`, [KEYS.pending]);

      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "totp_enroll_confirm_failed" });
    }
  });

  router.post("/auth/manager-totp/enroll/cancel", requireStaffAuth, async (req, res) => {
    try {
      await dbRun(`DELETE FROM app_settings WHERE key = ?`, [KEYS.pending]);
      return res.json({ ok: true });
    } catch {
      return res.status(500).json({ error: "totp_enroll_cancel_failed" });
    }
  });

  /** 清除服务端绑定（手机从未配对或密钥孤儿数据）。需在环境变量配置 MANAGER_TOTP_RESET_SECRET */
  router.post("/auth/manager-totp/reset-binding", requireStaffAuth, async (req, res) => {
    try {
      const configured = process.env.MANAGER_TOTP_RESET_SECRET;
      if (!configured || !String(configured).trim()) {
        return res.status(403).json({ error: "manager_totp_reset_disabled" });
      }
      const headerSecret = req.get("x-manager-totp-reset-secret");
      const bodySecret =
        typeof req.body?.resetSecret === "string" ? req.body.resetSecret : "";
      const submitted = String(headerSecret || bodySecret || "").trim();
      if (!submitted || submitted !== String(configured).trim()) {
        return res.status(403).json({ error: "invalid_reset_secret" });
      }
      await dbRun(`DELETE FROM app_settings WHERE key = ? OR key = ?`, [
        KEYS.secret,
        KEYS.pending,
      ]);
      try {
        await dbRun(`INSERT INTO manager_audit_log (action, order_id, detail) VALUES (?, NULL, ?)`, [
          "manager-totp-reset-binding",
          JSON.stringify({ at: new Date().toISOString() }),
        ]);
      } catch (auditErr) {
        console.warn("manager_audit_log (reset-binding):", auditErr.message || auditErr);
      }
      return res.json({ ok: true });
    } catch (err) {
      console.error("manager-totp reset-binding:", err);
      return res.status(500).json({ error: "totp_reset_binding_failed" });
    }
  });

  /** 已登录员工自检：当前动态码是否与库里密钥匹配（不执行敏感操作）。 */
  router.post("/auth/manager-totp/check-code", requireStaffAuth, async (req, res) => {
    try {
      const token = extractTotpFromHttp(req);
      if (!token) {
        return res.status(400).json({ ok: false, error: "missing_totp_code" });
      }
      const row = await dbGet("SELECT value FROM app_settings WHERE key = ? LIMIT 1", [
        KEYS.secret,
      ]);
      const secret = row?.value ? String(row.value).trim() : "";
      if (!secret) {
        return res.json({ ok: false, error: "manager_totp_not_configured" });
      }
      const delta = verifyTotpDelta(secret, token);
      if (delta != null) {
        return res.json({ ok: true, skewSteps: delta.delta });
      }
      return res.json({ ok: false, error: "invalid_manager_totp" });
    } catch (err) {
      console.error("manager-totp check-code:", err);
      return res.status(500).json({ error: "totp_check_code_failed" });
    }
  });

  return router;
}

function createRequireManagerTotp({ dbGet }) {
  return async function requireManagerTotp(req, res, next) {
    try {
      const token = extractTotpFromHttp(req);

      const row = await dbGet("SELECT value FROM app_settings WHERE key = ? LIMIT 1", [
        KEYS.secret,
      ]);
      const secret = row?.value ? String(row.value).trim() : "";
      if (!secret) {
        return res.status(403).json({ error: "manager_totp_not_configured" });
      }
      if (!verifyTotp(secret, token)) {
        return res.status(403).json({ error: "invalid_manager_totp" });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  createManagerTotpRouter,
  createRequireManagerTotp,
  KEYS,
};
