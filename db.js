// db.js — 使用 __dirname，避免从其它工作目录启动 Node 时读到错误的 orders.db。
// 启动时启用 WAL，默认 synchronous=FULL（可用环境变量 SQLITE_SYNCHRONOUS 覆盖，见 sqliteSynchronousFromEnv）。
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const dbPath = path.join(__dirname, "orders.db");
const db = new sqlite3.Database(dbPath);

/** 断电耐久倾向：默认 FULL；可用 SQLITE_SYNCHRONOUS=normal|full|extra|off 覆盖（不推荐 off）。 */
function sqliteSynchronousFromEnv() {
  const raw = String(process.env.SQLITE_SYNCHRONOUS || "full").toLowerCase();
  const map = { off: 0, normal: 1, full: 2, extra: 3 };
  return map[raw] !== undefined ? map[raw] : 2;
}

db.serialize(() => {
  db.run("PRAGMA journal_mode=WAL;", (walErr) => {
    if (walErr) console.error("SQLite PRAGMA journal_mode:", walErr.message || walErr);
  });
  db.run(`PRAGMA synchronous=${sqliteSynchronousFromEnv()};`, (syncErr) => {
    if (syncErr) console.error("SQLite PRAGMA synchronous:", syncErr.message || syncErr);
  });
  db.run("PRAGMA foreign_keys=ON;", () => {});

  // 1. 🍽 菜单表 (新增)
  db.run(`
  CREATE TABLE IF NOT EXISTS menu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_zh TEXT,
    name_ja TEXT,
    name_en TEXT,
    price INTEGER,
    category TEXT,
    image TEXT,        -- 📸 新增：存储图片文件名或路径，如 "yakitori.jpg"
    is_available BOOLEAN DEFAULT 1
  )
`);

  // 初始化一些菜品数据（如果菜单表是空的）
  db.get("SELECT count(*) as count FROM menu", (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare(
        "INSERT INTO menu (name_zh, name_ja, name_en, price, category) VALUES (?, ?, ?, ?, ?)",
      );
      stmt.run("烧烤串", "焼き鳥", "Yakitori", 200, "food");
      stmt.run("拉面", "ラーメン", "Ramen", 800, "food");
      stmt.run("啤酒", "ビール", "Beer", 500, "drink_liquor");
      stmt.run("毛豆", "枝豆", "Edamame", 300, "snack");
      stmt.finalize();
      console.log("✅ 初始菜单已插入");
    }
  });

  // 2. 🍽 订单表
  db.run(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT,          -- 📸 新增：订单编号 (YYYYMMDD-序号)
    tableId TEXT,
    items TEXT,
    total INTEGER,
    payment_method TEXT,
    guest_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- 📸 新增：下单时间
  );
`);

  // 3. 💰 结账请求表 (保持不变)
  db.run(`
    CREATE TABLE IF NOT EXISTS checkout_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      tableId TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. 🪑 桌次会话表（当前活跃桌次）
  db.run(`
    CREATE TABLE IF NOT EXISTS table_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tableId TEXT NOT NULL,
      session_id TEXT NOT NULL UNIQUE,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. ⚙️ 全局设置（营业状态、店长 TOTP 等）
  db.run(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  db.run(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES ('business_open', '0')
  `);

  // 6. 📒 店长纠错审计（配合 Authenticator 高风险操作）
  db.run(`
    CREATE TABLE IF NOT EXISTS manager_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      action TEXT NOT NULL,
      order_id INTEGER,
      detail TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS order_no_counters (
      date_key TEXT PRIMARY KEY,
      last_seq INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT NOT NULL,
      scope TEXT NOT NULL,
      status_code INTEGER,
      body TEXT,
      PRIMARY KEY (key, scope)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      action TEXT NOT NULL,
      actor TEXT,
      table_id TEXT,
      order_id INTEGER,
      request_key TEXT,
      payload TEXT,
      result TEXT
    );
  `);

  function ensureIndexIfTableExists(tableName, indexSql) {
    db.get(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      [tableName],
      (err, row) => {
        if (err) {
          console.error(`索引自检失败(${tableName}):`, err.message || err);
          return;
        }
        if (!row) return;
        db.run(indexSql, (indexErr) => {
          if (indexErr) {
            console.error(`创建索引失败(${tableName}):`, indexErr.message || indexErr);
          }
        });
      },
    );
  }

  function ensureColumnIfTableExists(tableName, columnName, columnSql) {
    db.get(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
      [tableName],
      (tableErr, tableRow) => {
        if (tableErr || !tableRow) return;
        db.all(`PRAGMA table_info(${tableName})`, [], (pragmaErr, cols) => {
          if (pragmaErr) return;
          const hasColumn = Array.isArray(cols) && cols.some((col) => col.name === columnName);
          if (hasColumn) return;
          db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnSql}`, (alterErr) => {
            if (alterErr) {
              console.error(`补齐列失败(${tableName}.${columnName}):`, alterErr.message || alterErr);
            }
          });
        });
      },
    );
  }

  ensureColumnIfTableExists("orders", "payment_method", "payment_method TEXT");
  ensureColumnIfTableExists("orders", "guest_count", "guest_count INTEGER DEFAULT 0");
  ensureColumnIfTableExists("orders", "session_id", "session_id TEXT");
  ensureColumnIfTableExists("orders", "source", "source TEXT DEFAULT 'guest'");
  /** 酒水大类下的小类（ハイボール / 焼酎 等），仅 drink_liquor 使用 */
  ensureColumnIfTableExists("menu", "drink_section", "drink_section TEXT");

  // 关键表索引自检（存在才创建，避免旧库/新库差异导致启动失败）
  ensureIndexIfTableExists(
    "orders",
    "CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(tableId, status)",
  );
  ensureIndexIfTableExists(
    "checkout_requests",
    "CREATE INDEX IF NOT EXISTS idx_checkout_requests_tableId ON checkout_requests(tableId)",
  );
  ensureIndexIfTableExists(
    "table_sessions",
    "CREATE INDEX IF NOT EXISTS idx_table_sessions_table_active ON table_sessions(tableId, is_active)",
  );
  ensureIndexIfTableExists(
    "idempotency_keys",
    "CREATE INDEX IF NOT EXISTS idx_idempotency_key_scope ON idempotency_keys(key, scope)",
  );
});

module.exports = db;
