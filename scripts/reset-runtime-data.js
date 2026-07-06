const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./orders.db");

function getCount(table) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT COUNT(*) AS count FROM ${table}`, [], (err, row) => {
      if (err) return reject(err);
      return resolve(Number(row?.count) || 0);
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

async function printCounts(title) {
  const tables = [
    "orders",
    "checkout_requests",
    "order_no_counters",
    "operation_logs",
    "idempotency_keys",
  ];
  console.log(`\n[${title}]`);
  for (const table of tables) {
    const count = await getCount(table);
    console.log(`${table}: ${count}`);
  }
}

async function main() {
  await printCounts("清理前");

  await run("BEGIN IMMEDIATE");
  try {
    await run("DELETE FROM orders");
    await run("DELETE FROM checkout_requests");
    await run("DELETE FROM order_no_counters");
    await run("DELETE FROM operation_logs");
    await run("DELETE FROM idempotency_keys");
    await run("UPDATE app_settings SET value = '0' WHERE key = 'business_open'");
    await run("COMMIT");
  } catch (err) {
    await run("ROLLBACK").catch(() => {});
    throw err;
  }

  try {
    await run("DELETE FROM manager_audit_log");
  } catch {
    /* 旧库无 manager_audit_log 表则忽略 */
  }

  await printCounts("清理后");
  const businessOpen = await new Promise((resolve, reject) => {
    db.get(
      "SELECT value FROM app_settings WHERE key = 'business_open' LIMIT 1",
      [],
      (err, row) => {
        if (err) return reject(err);
        return resolve(String(row?.value || "0"));
      },
    );
  });
  console.log(`business_open: ${businessOpen}`);
}

main()
  .then(() => {
    db.close();
  })
  .catch((err) => {
    console.error("重置失败:", err.message || err);
    db.close();
    process.exit(1);
  });
