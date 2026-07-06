const { execSync } = require("node:child_process");
const path = require("node:path");

/** 将 orders.db 运行态重置为可重复测试状态（与 `npm run test:prepare` 相同）。 */
function resetRuntimeDataForTests() {
  const root = path.resolve(__dirname, "..", "..");
  execSync("node scripts/reset-runtime-data.js", { stdio: "ignore", cwd: root });
}

module.exports = { resetRuntimeDataForTests };
