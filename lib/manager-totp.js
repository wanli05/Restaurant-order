const speakeasy = require("speakeasy");

/**
 * 允许的时间步偏移（speakeasy：当前 counter ±W）。
 * 默认约 ±6×30s；可通过 MANAGER_TOTP_WINDOW 覆盖（1–30）。
 */
function resolveWindowSteps() {
  const fromEnv = parseInt(process.env.MANAGER_TOTP_WINDOW || "", 10);
  const n = Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 6;
  return Math.min(30, Math.max(1, n));
}

const WINDOW_STEPS = resolveWindowSteps();

function normalizeTotpInput(raw) {
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

function normalizeTotpSecret(raw) {
  if (raw == null) return "";
  if (Buffer.isBuffer(raw)) raw = raw.toString("utf8");
  else if (typeof raw !== "string") raw = String(raw);
  let t = raw.trim();
  // 防止手工/SQL 导出时在首尾加了引号，导致 Base32 永远无法匹配 Authenticator
  if (
    (t.startsWith('"') && t.endsWith('"') && t.length >= 2) ||
    (t.startsWith("'") && t.endsWith("'") && t.length >= 2)
  ) {
    t = t.slice(1, -1).trim();
  }
  return t
    .replace(/\s/g, "")
    .replace(/-/g, "")
    .replace(/=+$/u, "")
    .toUpperCase();
}

/**
 * 从 HTTP 读取店长验证码：优先 JSON body（managerTotp / totp / code），其次 x-manager-totp。
 * body 优先可避免代理/插件遗留的错误请求头覆盖正确表单。
 */
function extractTotpFromHttp(req) {
  if (!req || typeof req.get !== "function") return "";
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const bodyCandidate =
    body.managerTotp !== undefined && body.managerTotp !== null
      ? body.managerTotp
      : body.totp !== undefined && body.totp !== null
        ? body.totp
        : body.code !== undefined && body.code !== null
          ? body.code
          : "";
  const bodyToken = normalizeTotpInput(bodyCandidate);
  const headerCode = req.get("x-manager-totp");
  const headerToken =
    typeof headerCode === "string" && headerCode.trim()
      ? normalizeTotpInput(headerCode.trim())
      : "";
  return bodyToken || headerToken;
}

/**
 * enroll/start 已绑定需轮换密钥时：优先 rotateTotp / rotateCode，再通用字段与请求头。
 */
function extractTotpForRotateStart(req) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const orderedRaw = [
    body.rotateTotp,
    body.rotateCode,
    body.managerTotp,
    body.totp,
    body.code,
  ];
  let bodyToken = "";
  for (const raw of orderedRaw) {
    if (raw !== undefined && raw !== null) {
      bodyToken = normalizeTotpInput(raw);
      if (bodyToken) break;
    }
  }
  const headerCode = req.get("x-manager-totp");
  const headerToken =
    typeof headerCode === "string" && headerCode.trim()
      ? normalizeTotpInput(headerCode.trim())
      : "";
  return bodyToken || headerToken;
}

function verifyTotpDelta(secret, rawToken) {
  const token = normalizeTotpInput(rawToken);
  const sec = normalizeTotpSecret(secret);
  if (!sec || !token) return null;
  return speakeasy.totp.verifyDelta({
    secret: sec,
    encoding: "base32",
    token,
    window: WINDOW_STEPS,
    algorithm: "sha1",
    step: 30,
    digits: 6,
  });
}

function verifyTotp(secret, rawToken) {
  return verifyTotpDelta(secret, rawToken) != null;
}

function createEnrollmentSecret() {
  return speakeasy.generateSecret({ length: 20 }).base32;
}

function buildAuthenticatorUri({ issuer, accountLabel, secret }) {
  return speakeasy.otpauthURL({
    secret: normalizeTotpSecret(secret) || String(secret).trim().replace(/\s/g, "").replace(/-/g, ""),
    label: `${issuer}:${accountLabel}`,
    issuer,
    encoding: "base32",
    algorithm: "sha1",
    period: 30,
    digits: 6,
  });
}

module.exports = {
  verifyTotp,
  verifyTotpDelta,
  extractTotpFromHttp,
  extractTotpForRotateStart,
  normalizeTotpInput,
  normalizeTotpSecret,
  createEnrollmentSecret,
  buildAuthenticatorUri,
};
