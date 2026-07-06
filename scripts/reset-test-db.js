/**
 * @deprecated 请优先使用 `npm run test:prepare` 或 `node scripts/reset-runtime-data.js`。
 * 保留此文件名仅为兼容旧习惯；实际重置逻辑已全部在 reset-runtime-data.js 中维护。
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const script = path.join(__dirname, "reset-runtime-data.js");
const result = spawnSync(process.execPath, [script], {
  stdio: "inherit",
  cwd: path.join(__dirname, ".."),
});
process.exit(result.status === null ? 1 : result.status);
