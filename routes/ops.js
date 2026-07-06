const express = require("express");
const { getAllowedTableIds } = require("../lib/table-ids");
const { sqliteQuickCheck } = require("../lib/sqlite-quick-check");

function createOpsRouter({ requireStaffAuth, db, dbGet, dbAll }) {
  const router = express.Router();

  router.get("/health", async (req, res) => {
    try {
      await dbGet("SELECT 1 AS ok");
      const isOpenRow = await dbGet(
        "SELECT value FROM app_settings WHERE key = 'business_open' LIMIT 1",
      );
      const isOpen = String(isOpenRow?.value || "0") === "1";
      return res.json({
        ok: true,
        uptimeSec: Math.floor(process.uptime()),
        businessOpen: isOpen,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        error: "health-check-failed",
        timestamp: new Date().toISOString(),
      });
    }
  });

  router.get("/recovery/check", requireStaffAuth, async (req, res) => {
    try {
      await dbGet("SELECT 1 AS ok");

      let integrity;
      try {
        integrity = await sqliteQuickCheck(dbAll);
      } catch (checkErr) {
        return res.status(500).json({
          ok: false,
          timestamp: new Date().toISOString(),
          dbQuickCheckOk: false,
          dbQuickCheckMessages: [String(checkErr.message || checkErr)],
          verdict: {
            level: "danger",
            actionCode: "system_error",
          },
          error: "sqlite-quick-check-failed",
        });
      }

      const journalRow = await dbGet("PRAGMA journal_mode");
      const syncRow = await dbGet("PRAGMA synchronous");
      const dbJournalMode = String(journalRow?.journal_mode || "").toLowerCase() || "?";
      const dbSynchronous = Number(syncRow?.synchronous);

      if (!integrity.ok) {
        return res.json({
          ok: true,
          timestamp: new Date().toISOString(),
          dbQuickCheckOk: false,
          dbQuickCheckMessages: integrity.messages,
          dbJournalMode,
          dbSynchronous,
          businessOpen: false,
          counts: { pending: 0, done: 0, paid: 0, archived: 0 },
          activeOrders: 0,
          checkoutRequests: 0,
          inFlightRequests: 0,
          recentLogs: [],
          verdict: {
            level: "danger",
            actionCode: "db_integrity_fail",
          },
        });
      }

      const openRow = await dbGet(
        "SELECT value FROM app_settings WHERE key = 'business_open' LIMIT 1",
      );
      const isOpen = String(openRow?.value || "0") === "1";
      const statusRows = await dbAll(
        "SELECT status, COUNT(*) AS count FROM orders GROUP BY status",
        [],
      );
      const checkoutRow = await dbGet(
        "SELECT COUNT(*) AS count FROM checkout_requests",
        [],
      );
      const inFlightRow = await dbGet(
        `SELECT COUNT(*) AS count
         FROM idempotency_keys
         WHERE status_code IS NULL
           AND created_at >= datetime('now', '-1 day')`,
        [],
      );
      const recentLogs = await dbAll(
        `SELECT action, table_id, created_at
         FROM operation_logs
         ORDER BY id DESC
         LIMIT 12`,
        [],
      );

      const counts = { pending: 0, done: 0, paid: 0, archived: 0 };
      statusRows.forEach((row) => {
        counts[row.status] = Number(row.count) || 0;
      });
      const activeOrders = counts.pending + counts.done;
      const checkoutRequests = Number(checkoutRow?.count) || 0;
      const inFlightRequests = Number(inFlightRow?.count) || 0;

      let level = "ok";
      let actionCode = "open_ready";
      if (inFlightRequests > 0) {
        level = "warn";
        actionCode = "retry_later";
      } else if (isOpen) {
        actionCode = "running_ok";
      }

      return res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        dbQuickCheckOk: true,
        dbQuickCheckMessages: integrity.messages,
        dbJournalMode,
        dbSynchronous,
        businessOpen: isOpen,
        counts,
        activeOrders,
        checkoutRequests,
        inFlightRequests,
        recentLogs,
        verdict: {
          level,
          actionCode,
        },
      });
    } catch (err) {
      return res.status(500).json({
        ok: false,
        timestamp: new Date().toISOString(),
        verdict: {
          level: "danger",
          actionCode: "system_error",
        },
        error: err.message || "recovery-check-failed",
      });
    }
  });

  router.get("/api/tables", (req, res) => {
    return res.json({ tables: [...getAllowedTableIds()] });
  });

  router.get("/api/menu", (req, res) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate");
    db.all(
      "SELECT * FROM menu WHERE is_available = 1 ORDER BY id ASC",
      [],
      (err, rows) => {
        if (err) return res.status(500).send(err);

        const formattedMenu = rows.map((item) => ({
          id: item.id,
          name: { zh: item.name_zh, ja: item.name_ja, en: item.name_en },
          price: item.price,
          category: item.category,
          image: item.image ? String(item.image).trim() : "",
          drinkSection: item.drink_section ? String(item.drink_section).trim() : "",
        }));
        return res.json(formattedMenu);
      },
    );
  });

  router.get("/debug-db", requireStaffAuth, (req, res) => {
    db.all("SELECT * FROM orders", [], (err, rows) => {
      console.log("数据库全量数据:", rows);
      return res.json(rows);
    });
  });

  return router;
}

module.exports = {
  createOpsRouter,
};
