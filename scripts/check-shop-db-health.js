#!/usr/bin/env node
/**
 * 在 EC2 上自检 SQLite：必要表是否存在（不下单也可用）。
 * 用法：在项目根目录 node scripts/check-shop-db-health.js
 */
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const required = ["menu", "orders", "order_no_counters", "table_sessions", "app_settings"];

const dbPath = path.join(__dirname, "..", "orders.db");
const db = new sqlite3.Database(dbPath);

db.all(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  [],
  (err, rows) => {
    if (err) {
      console.error("读取失败:", err.message || err);
      db.close();
      process.exit(1);
    }
    const names = new Set((rows || []).map((r) => String(r.name)));
    console.log("数据库文件:", dbPath);
    console.log("已有表:", [...names].join(", "));
    let ok = true;
    for (const t of required) {
      const has = names.has(t);
      console.log(has ? `[OK] ${t}` : `[缺] ${t}`);
      if (!has) ok = false;
    }
    db.close(() => process.exit(ok ? 0 : 2));
  },
);
