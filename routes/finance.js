const express = require("express");

function createFinanceRouter({
  requireStaffAuth,
  db,
  dbGet,
  dbRun,
  tryBeginIdempotent,
  finishIdempotent,
  writeOperationLog,
  emitRealtimeUpdate,
}) {
  const router = express.Router();

  function formatTokyoDate(date = new Date()) {
    const shifted = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 10);
  }

  function normalizeDateInput(raw) {
    const value = String(raw || "").trim();
    if (!value) return formatTokyoDate();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return value;
  }

  function csvEscape(value) {
    const str = String(value ?? "");
    if (!/[",\n]/.test(str)) return str;
    return `"${str.replaceAll('"', '""')}"`;
  }

  function summarizeItems(rawItems) {
    let items = [];
    try {
      items = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
    } catch (e) {
      items = [];
    }
    if (!Array.isArray(items)) return "";
    return items
      .map((item) => {
        const name = item?.name?.ja || item?.name?.zh || item?.name?.en || "Unknown";
        const qty = Number(item?.quantity) || 0;
        return `${name} x${qty}`;
      })
      .join(" | ");
  }

  router.get("/finance/summary", requireStaffAuth, (req, res) => {
    const sql = `
      WITH paid_rows AS (
        SELECT id, order_no, tableId, total, payment_method, guest_count
        FROM orders
        WHERE status = 'paid'
      ),
      paid_groups AS (
        SELECT
          COALESCE(NULLIF(order_no, ''), printf('id-%d', id)) AS group_order_no,
          COALESCE(tableId, '') AS group_table_id,
          COALESCE(MAX(guest_count), 0) AS guest_count,
          COALESCE(SUM(total), 0) AS order_total
        FROM paid_rows
        GROUP BY group_order_no, group_table_id
      )
      SELECT
        COALESCE((SELECT SUM(total) FROM paid_rows), 0) AS total_revenue,
        COALESCE((SELECT SUM(CASE WHEN payment_method = 'paypay' THEN total ELSE 0 END) FROM paid_rows), 0) AS paypay_revenue,
        COALESCE((SELECT SUM(CASE WHEN payment_method IN ('alipay', 'wechat') THEN total ELSE 0 END) FROM paid_rows), 0) AS alipay_revenue,
        COALESCE((SELECT SUM(CASE WHEN payment_method = 'cash' OR payment_method IS NULL OR payment_method = '' THEN total ELSE 0 END) FROM paid_rows), 0) AS cash_revenue,
        COALESCE((SELECT SUM(guest_count) FROM paid_groups), 0) AS customer_count,
        COALESCE((SELECT COUNT(*) FROM paid_groups), 0) AS paid_order_count,
        COALESCE((SELECT AVG(order_total) FROM paid_groups), 0) AS avg_ticket_price
    `;
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error("数据库查询失败:", err.message);
        return res.status(500).json({ error: err.message });
      }
      return res.json({
        total_revenue: Number(row?.total_revenue) || 0,
        cash_revenue: Number(row?.cash_revenue) || 0,
        paypay_revenue: Number(row?.paypay_revenue) || 0,
        alipay_revenue: Number(row?.alipay_revenue) || 0,
        wechat_revenue: Number(row?.alipay_revenue) || 0,
        customer_count: Number(row?.customer_count) || 0,
        paid_order_count: Number(row?.paid_order_count) || 0,
        avg_ticket_price: Number(row?.avg_ticket_price) || 0,
      });
    });
  });

  router.get("/finance/export-csv", requireStaffAuth, (req, res) => {
    const hasStartDate = Object.prototype.hasOwnProperty.call(req.query || {}, "startDate");
    const hasEndDate = Object.prototype.hasOwnProperty.call(req.query || {}, "endDate");
    const startDateInput = hasStartDate ? normalizeDateInput(req.query?.startDate) : null;
    const endDateInput = hasEndDate ? normalizeDateInput(req.query?.endDate) : null;
    const legacyDate = normalizeDateInput(req.query?.date);
    if ((hasStartDate && !startDateInput) || (hasEndDate && !endDateInput) || !legacyDate) {
      return res.status(400).json({ error: "invalid-date-format" });
    }
    let startDate = legacyDate;
    let endDate = legacyDate;
    if (startDateInput || endDateInput) {
      startDate = startDateInput || endDateInput;
      endDate = endDateInput || startDateInput;
    }
    if (startDate > endDate) {
      return res.status(400).json({ error: "invalid-date-range" });
    }
    const sql = `
      SELECT
        id,
        order_no,
        tableId,
        total,
        payment_method,
        status,
        created_at,
        items,
        guest_count,
        date(datetime(created_at), '+9 hours') AS business_date
      FROM orders
      WHERE status IN ('paid', 'archived')
        AND date(datetime(created_at), '+9 hours') BETWEEN date(?) AND date(?)
      ORDER BY datetime(created_at) ASC, id ASC
    `;
    db.all(sql, [startDate, endDate], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "export-failed", detail: err.message });
      }
      const groupedOrderMap = new Map();
      (rows || []).forEach((row) => {
        const key = `${row.order_no || `id-${row.id}`}__${row.tableId || ""}`;
        const current = groupedOrderMap.get(key) || {
          orderTotal: 0,
          guestCount: 0,
        };
        current.orderTotal += Number(row.total) || 0;
        current.guestCount = Math.max(current.guestCount, Number(row.guest_count) || 0);
        groupedOrderMap.set(key, current);
      });
      const paidOrderCount = groupedOrderMap.size;
      const customerCountTotal = Array.from(groupedOrderMap.values()).reduce(
        (sum, item) => sum + (Number(item.guestCount) || 0),
        0,
      );
      const avgTicketPrice =
        paidOrderCount > 0
          ? Array.from(groupedOrderMap.values()).reduce(
              (sum, item) => sum + (Number(item.orderTotal) || 0),
              0,
            ) / paidOrderCount
          : 0;
      const header = [
        "date",
        "order_no",
        "table_id",
        "total_jpy",
        "payment_method",
        "status",
        "created_at",
        "items_summary",
        "customer_count_total",
        "avg_ticket_price_jpy",
      ];
      const lines = [header.join(",")];
      (rows || []).forEach((row) => {
        lines.push(
          [
            row.business_date || "",
            row.order_no || "",
            row.tableId || "",
            Number(row.total) || 0,
            row.payment_method || "",
            row.status || "",
            row.created_at || "",
            summarizeItems(row.items),
            customerCountTotal,
            avgTicketPrice,
          ]
            .map(csvEscape)
            .join(","),
        );
      });
      const csv = `\uFEFF${lines.join("\n")}\n`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      const filename =
        startDate === endDate
          ? `finance-${startDate}.csv`
          : `finance-${startDate}_to_${endDate}.csv`;
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    });
  });

  router.post("/finance/close-day", requireStaffAuth, async (req, res) => {
    const { expenses, bank_deposit } = req.body;
    const idem = await tryBeginIdempotent("finance-close-day", req).catch((err) => {
      res.status(500).send(err.message || "幂等校验失败");
      return null;
    });
    if (!idem) return;
    if (idem.replay) {
      res.set("x-idempotent-replay", "1");
      return res.status(idem.statusCode).send(idem.body);
    }
    if (idem.inFlight) return res.status(409).send("相同请求正在处理中");

    try {
      const row = await dbGet(
        "SELECT SUM(total) as day_revenue FROM orders WHERE status = 'paid'",
        [],
      );
      const actual_revenue = Number(row?.day_revenue) || 0;
      await dbRun("UPDATE orders SET status = 'archived' WHERE status = 'paid'", []);
      await dbRun("UPDATE app_settings SET value = '0' WHERE key = 'business_open'", []);

      const okBody = "OK";
      await finishIdempotent("finance-close-day", idem.key, 200, okBody);
      await writeOperationLog({
        action: "finance-close-day",
        requestKey: idem.key,
        payload: { expenses, bank_deposit },
        result: { actual_revenue },
      });
      console.log(`封账成功 | 今日营业额: ¥${actual_revenue}`);
      emitRealtimeUpdate({ type: "finance-close" });
      return res.send(okBody);
    } catch (err) {
      console.error("封账失败:", err.message);
      await finishIdempotent("finance-close-day", idem.key, 500, "封账失败").catch(() => {});
      return res.status(500).send("封账失败");
    }
  });

  return router;
}

module.exports = {
  createFinanceRouter,
};
