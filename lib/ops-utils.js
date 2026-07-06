function createOpsUtils({ dbGet, dbRun }) {
  function getRequestKey(req) {
    const headerKey = req.get("x-idempotency-key");
    const bodyKey =
      typeof req.body?.idempotencyKey === "string" ? req.body.idempotencyKey : "";
    const key = String(headerKey || bodyKey || "").trim();
    return key || null;
  }

  async function tryBeginIdempotent(scope, req) {
    const key = getRequestKey(req);
    if (!key) return { enabled: false, key: null };
    try {
      await dbRun(
        "INSERT INTO idempotency_keys (key, scope, status_code, body) VALUES (?, ?, NULL, NULL)",
        [key, scope],
      );
      return { enabled: true, key };
    } catch (err) {
      if (!String(err.message || "").includes("UNIQUE")) throw err;
      const row = await dbGet(
        "SELECT status_code, body FROM idempotency_keys WHERE key = ? AND scope = ?",
        [key, scope],
      );
      if (row && row.status_code) {
        return {
          enabled: true,
          key,
          replay: true,
          statusCode: Number(row.status_code) || 200,
          body: row.body || "",
        };
      }
      return { enabled: true, key, inFlight: true };
    }
  }

  async function finishIdempotent(scope, key, statusCode, body) {
    if (!key) return;
    await dbRun(
      "UPDATE idempotency_keys SET status_code = ?, body = ? WHERE key = ? AND scope = ?",
      [statusCode, String(body || ""), key, scope],
    );
  }

  async function writeOperationLog({
    action,
    actor = "staff",
    tableId = null,
    orderId = null,
    requestKey = null,
    payload = null,
    result = null,
  }) {
    try {
      await dbRun(
        `INSERT INTO operation_logs
         (action, actor, table_id, order_id, request_key, payload, result)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          action,
          actor,
          tableId,
          orderId,
          requestKey,
          payload ? JSON.stringify(payload) : null,
          result ? JSON.stringify(result) : null,
        ],
      );
    } catch (err) {
      console.error("写入操作日志失败:", err.message);
    }
  }

  return {
    getRequestKey,
    tryBeginIdempotent,
    finishIdempotent,
    writeOperationLog,
  };
}

module.exports = {
  createOpsUtils,
};
