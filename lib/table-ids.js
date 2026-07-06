/**
 * 合法桌号白名单。可通过环境变量覆盖（逗号分隔），例如：
 * ALLOWED_TABLE_IDS=1A,1B,1C,2A,2B,2C,3A,3B,3C,T
 *
 * 压测脚本默认桌号与之对齐：`tests/load/k6-shared.json`（勿单独改一处）。
 */
const DEFAULT_TABLE_IDS = ["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C", "T"];
const REQUIRED_TABLE_IDS = ["3A", "3B", "1C", "2C", "3C", "T"];

function parseAllowedFromEnv() {
  const raw = process.env.ALLOWED_TABLE_IDS;
  if (typeof raw !== "string" || !raw.trim()) return [...DEFAULT_TABLE_IDS];
  const parsed = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parsed.length === 0) return [...DEFAULT_TABLE_IDS];
  const merged = [...parsed];
  REQUIRED_TABLE_IDS.forEach((id) => {
    if (!merged.includes(id)) merged.push(id);
  });
  return merged;
}

let cachedList = null;

function getAllowedTableIds() {
  if (!cachedList) {
    cachedList = Object.freeze(parseAllowedFromEnv());
  }
  return cachedList;
}

function isValidTableId(raw) {
  if (typeof raw !== "string") return false;
  const id = raw.trim();
  return getAllowedTableIds().includes(id);
}

module.exports = {
  getAllowedTableIds,
  isValidTableId,
};
