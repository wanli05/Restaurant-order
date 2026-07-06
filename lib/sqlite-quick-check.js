/**
 * 执行 PRAGMA quick_check（较 integrity_check 更快，适合开机自检）。
 * @param {(sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>} dbAll
 */
async function sqliteQuickCheck(dbAll) {
  const rows = await dbAll("PRAGMA quick_check");
  const messages = rows.map((r) => {
    const v =
      r.quick_check ??
      r.integrity_check ??
      (typeof r === "object" && r !== null ? Object.values(r)[0] : null);
    return v != null ? String(v) : "";
  }).filter(Boolean);
  const ok = messages.length === 1 && messages[0] === "ok";
  return { ok, messages };
}

module.exports = { sqliteQuickCheck };
