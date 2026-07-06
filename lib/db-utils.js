function createDbUtils(db) {
  function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        return resolve(row);
      });
    });
  }

  function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function onRun(err) {
        if (err) return reject(err);
        return resolve(this);
      });
    });
  }

  function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        return resolve(rows);
      });
    });
  }

  async function getBusinessOpenStatus() {
    const row = await dbGet(
      "SELECT value FROM app_settings WHERE key = 'business_open' LIMIT 1",
    );
    return String(row?.value || "0") === "1";
  }

  async function allocateDailyOrderNo() {
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    await dbRun(
      `INSERT INTO order_no_counters (date_key, last_seq)
       VALUES (?, 1)
       ON CONFLICT(date_key)
       DO UPDATE SET last_seq = last_seq + 1`,
      [dateKey],
    );
    const row = await dbGet("SELECT last_seq FROM order_no_counters WHERE date_key = ?", [
      dateKey,
    ]);
    const nextSeq = Number(row?.last_seq) || 1;
    return `${dateKey}-${String(nextSeq).padStart(3, "0")}`;
  }

  return {
    dbGet,
    dbRun,
    dbAll,
    getBusinessOpenStatus,
    allocateDailyOrderNo,
  };
}

module.exports = {
  createDbUtils,
};
