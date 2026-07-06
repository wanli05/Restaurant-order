/**
 * 清除店长 Authenticator（TOTP）在数据库中的绑定状态。
 * 适用于：界面显示「已绑定」但从未在手机 App 完成配对、或残留测试数据。
 *
 * 用法（在项目根目录）：
 *   npm run clear-manager-totp
 *   或：node scripts/clear-manager-totp-binding.js
 *
 * 注意：请先停止正在运行的 node server（避免与 WAL 并发写入冲突）。
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "orders.db");

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this.changes);
    });
  });
}

async function main() {
  const db = new sqlite3.Database(dbPath);
  try {
    await run(
      db,
      `DELETE FROM app_settings WHERE key IN ('manager_totp_secret', 'manager_totp_pending')`,
    );
    try {
      await run(
        db,
        `INSERT INTO manager_audit_log (action, order_id, detail) VALUES (?, NULL, ?)`,
        [
          "manager-totp-clear-script",
          JSON.stringify({
            at: new Date().toISOString(),
            note: "npm run clear-manager-totp",
          }),
        ],
      );
    } catch {
      // 旧库可能没有 manager_audit_log
    }
    console.log("OK: cleared manager_totp_secret / manager_totp_pending in orders.db");
    console.log("Restart the server and refresh admin.html — binding section should show「未绑定」.");
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
