const express = require("express");
const { isItemDoneForBilling, sumLineTotal } = require("../lib/order-math");
const { isValidTableId } = require("../lib/table-ids");

function createOrdersRouter({
  requireStaffAuth,
  requireManagerTotp,
  getBusinessOpenStatus,
  allocateDailyOrderNo,
  emitRealtimeUpdate,
  db,
  dbGet,
  dbAll,
  dbRun,
  tryBeginIdempotent,
  finishIdempotent,
  writeOperationLog,
  getRequestKey,
}) {
  const router = express.Router();

  function classifyOrderFailure(err) {
    const msg = err?.message || String(err || "");
    if (msg === "门店未营业，暂不接受下单") {
      return { status: 403, code: "ORDER_STORE_CLOSED", message: msg };
    }
    if (msg === "无效桌号") return { status: 400, code: "ORDER_INVALID_TABLE", message: msg };
    if (msg === "无效人数") return { status: 400, code: "ORDER_INVALID_GUEST", message: msg };
    if (msg === "订单不能为空") return { status: 400, code: "ORDER_EMPTY", message: msg };
    if (msg === "订单数据无效") return { status: 400, code: "ORDER_INVALID_ITEMS", message: msg };
    if (msg === "部分菜品不存在或已下架") {
      return { status: 400, code: "ORDER_MENU_STALE", message: msg };
    }

    const lower = msg.toLowerCase();
    if (lower.includes("sqlite_error") && lower.includes("returning")) {
      return {
        status: 500,
        code: "ORDER_SQLITE_VERSION",
        message: "数据库版本不兼容，请联系店员处理",
      };
    }
    if (lower.includes("sqlite_busy") || lower.includes("database is locked")) {
      return {
        status: 503,
        code: "ORDER_DB_BUSY",
        message: "系统繁忙，请稍后重试",
      };
    }
    if (lower.includes("sqlite_error")) {
      return {
        status: 500,
        code: "ORDER_DB_ERROR",
        message: "数据库异常，请联系店员处理",
      };
    }
    return { status: 500, code: "ORDER_INTERNAL", message: "下单失败" };
  }
  const payQueue = [];
  let payQueueRunning = false;

  function runPayQueue() {
    if (payQueueRunning) return;
    const job = payQueue.shift();
    if (!job) return;
    payQueueRunning = true;
    Promise.resolve()
      .then(job.task)
      .then(job.resolve)
      .catch(job.reject)
      .finally(() => {
        payQueueRunning = false;
        setImmediate(runPayQueue);
      });
  }

  function enqueuePay(task) {
    return new Promise((resolve, reject) => {
      payQueue.push({ task, resolve, reject });
      runPayQueue();
    });
  }

  function createSessionId(tableId) {
    return `${tableId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async function getActiveSessionId(tableId) {
    const row = await dbGet(
      "SELECT session_id FROM table_sessions WHERE tableId = ? AND is_active = 1 ORDER BY id DESC LIMIT 1",
      [tableId],
    );
    return row?.session_id ? String(row.session_id) : "";
  }

  async function getOrCreateActiveSessionId(tableId) {
    const existing = await getActiveSessionId(tableId);
    if (existing) return existing;
    const sessionId = createSessionId(tableId);
    await dbRun("UPDATE table_sessions SET is_active = 0 WHERE tableId = ? AND is_active = 1", [
      tableId,
    ]);
    await dbRun("INSERT INTO table_sessions (tableId, session_id, is_active) VALUES (?, ?, 1)", [
      tableId,
      sessionId,
    ]);
    return sessionId;
  }

  async function createOrder({
    tableId,
    items,
    guestCount,
    actor,
    requestKey,
  }) {
    const tid = typeof tableId === "string" ? tableId.trim() : "";
    if (!isValidTableId(tid)) throw new Error("无效桌号");
    if (!Array.isArray(items) || items.length === 0) throw new Error("订单不能为空");
    if (!Number.isInteger(guestCount) || guestCount <= 0) throw new Error("无效人数");

    const quantityById = new Map();
    items.forEach((item) => {
      const id = Number(item && item.id);
      const quantity = Number(item && item.quantity);
      if (Number.isInteger(id) && Number.isFinite(quantity) && quantity > 0) {
        quantityById.set(id, (quantityById.get(id) || 0) + Math.floor(quantity));
      }
    });
    const menuIds = Array.from(quantityById.keys());
    if (menuIds.length === 0) throw new Error("订单数据无效");

    const placeholders = menuIds.map(() => "?").join(",");
    const menuRows = await dbAll(
      `SELECT id, name_zh, name_ja, name_en, price FROM menu WHERE is_available = 1 AND id IN (${placeholders})`,
      menuIds,
    );
    if (!menuRows || menuRows.length !== menuIds.length) {
      throw new Error("部分菜品不存在或已下架");
    }

    const menuById = new Map(menuRows.map((row) => [row.id, row]));
    const trustedItems = menuIds.map((id) => {
      const menuItem = menuById.get(id);
      const quantity = quantityById.get(id);
      return {
        id: menuItem.id,
        name: {
          zh: menuItem.name_zh,
          ja: menuItem.name_ja,
          en: menuItem.name_en,
        },
        price: menuItem.price,
        quantity,
        status: "pending",
      };
    });
    const trustedTotal = sumLineTotal(trustedItems);
    const now = new Date().toISOString();
    const sessionId = await getOrCreateActiveSessionId(tid);

    const existingOrder = await dbGet(
      "SELECT order_no FROM orders WHERE tableId = ? AND session_id = ? AND status IN ('pending', 'done') ORDER BY id DESC LIMIT 1",
      [tid, sessionId],
    );
    let orderNo = existingOrder?.order_no || "";
    if (!orderNo) {
      await dbRun("DELETE FROM checkout_requests WHERE tableId = ?", [tid]);
      orderNo = await allocateDailyOrderNo();
    }

    await dbRun(
      "INSERT INTO orders (order_no, tableId, session_id, source, items, total, status, created_at, guest_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        orderNo,
        tid,
        sessionId,
        actor,
        JSON.stringify(trustedItems),
        trustedTotal,
        "pending",
        now,
        guestCount,
      ],
    );

    await writeOperationLog({
      action: "order-create",
      actor,
      tableId: tid,
      requestKey,
      payload: { orderNo, itemCount: trustedItems.length, total: trustedTotal, sessionId },
      result: { status: "pending" },
    });
    emitRealtimeUpdate({ type: "order-created", tableId: tid });
    return { message: "下单成功", orderNo, sessionId };
  }

  router.post("/order", async (req, res) => {
    try {
      const isOpen = await getBusinessOpenStatus();
      if (!isOpen) return res.status(403).send("门店未营业，暂不接受下单");
      const guestCountRaw = Number(req.body?.guestCount);
      const guestCount = Number.isInteger(guestCountRaw) ? guestCountRaw : 0;
      await createOrder({
        tableId: req.body?.tableId,
        items: req.body?.items,
        guestCount,
        actor: "guest",
        requestKey: getRequestKey(req),
      });
      return res.send("下单成功");
    } catch (err) {
      const failure = classifyOrderFailure(err);
      res.set("x-order-error-code", failure.code);
      if (failure.status < 500) {
        return res.status(failure.status).send(failure.message);
      }
      console.error(
        "[POST /order] 未处理异常:",
        JSON.stringify({
          code: failure.code,
          raw: err?.message || String(err || ""),
          tableId: req.body?.tableId || "",
          itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
          ts: new Date().toISOString(),
        }),
        err?.stack || "",
      );
      return res.status(failure.status).send(failure.message);
    }
  });

  router.post("/staff/order", requireStaffAuth, async (req, res) => {
    try {
      const isOpen = await getBusinessOpenStatus();
      if (!isOpen) return res.status(403).send("门店未营业，暂不接受下单");
      const guestCountRaw = Number(req.body?.guestCount);
      const guestCount =
        Number.isInteger(guestCountRaw) && guestCountRaw > 0 ? guestCountRaw : 1;
      const result = await createOrder({
        tableId: req.body?.tableId,
        items: req.body?.items,
        guestCount,
        actor: "staff",
        requestKey: getRequestKey(req),
      });
      return res.json(result);
    } catch (err) {
      const failure = classifyOrderFailure(err);
      res.set("x-order-error-code", failure.code);
      if (failure.status < 500) {
        return res.status(failure.status).send(failure.message);
      }
      console.error(
        "[POST /staff/order] 未处理异常:",
        JSON.stringify({
          code: failure.code,
          raw: err?.message || String(err || ""),
          tableId: req.body?.tableId || "",
          itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
          ts: new Date().toISOString(),
        }),
        err?.stack || "",
      );
      return res.status(failure.status).send(failure.message);
    }
  });

  router.post("/tables/:tableId/new-session", requireStaffAuth, async (req, res) => {
    try {
      const tableId = typeof req.params.tableId === "string" ? req.params.tableId.trim() : "";
      if (!isValidTableId(tableId)) return res.status(400).send("无效桌号");

      const activeCountRow = await dbGet(
        "SELECT COUNT(*) AS count FROM orders WHERE tableId = ? AND status IN ('pending', 'done')",
        [tableId],
      );
      const activeCount = Number(activeCountRow?.count) || 0;
      if (activeCount > 0) {
        return res.status(409).send("当前桌台仍有未结账订单，无法开新台");
      }

      const sessionId = createSessionId(tableId);
      await dbRun("UPDATE table_sessions SET is_active = 0 WHERE tableId = ? AND is_active = 1", [
        tableId,
      ]);
      await dbRun(
        "INSERT INTO table_sessions (tableId, session_id, is_active) VALUES (?, ?, 1)",
        [tableId, sessionId],
      );
      emitRealtimeUpdate({ type: "table-session-new", tableId });
      return res.json({ tableId, sessionId });
    } catch (err) {
      return res.status(500).send(err.message || "开新台失败");
    }
  });

  router.get("/tables/:tableId/active-orders", requireStaffAuth, async (req, res) => {
    try {
      const tableId = typeof req.params.tableId === "string" ? req.params.tableId.trim() : "";
      if (!isValidTableId(tableId)) return res.status(400).send("无效桌号");
      const sessionId = await getOrCreateActiveSessionId(tableId);
      const rows = await dbAll(
        "SELECT id, order_no, tableId, session_id, source, items, total, status, created_at, guest_count FROM orders WHERE tableId = ? AND session_id = ? AND status IN ('pending', 'done') ORDER BY id DESC",
        [tableId, sessionId],
      );
      return res.json({ tableId, sessionId, rows: rows || [] });
    } catch (err) {
      return res.status(500).send(err.message || "查询桌台订单失败");
    }
  });

  router.get("/orders", requireStaffAuth, (req, res) => {
    db.all(
      "SELECT id, order_no, tableId, items, total, status, created_at, guest_count FROM orders WHERE status != 'archived'",
      [],
      (err, rows) => {
        if (err) return res.status(500).send(err);
        return res.json(rows);
      },
    );
  });

  router.get("/orders/history", requireStaffAuth, (req, res) => {
    const tableId = typeof req.query.tableId === "string" ? req.query.tableId.trim() : "";
    if (tableId && !isValidTableId(tableId)) {
      return res.status(400).send("无效桌号");
    }
    const orderNo = typeof req.query.orderNo === "string" ? req.query.orderNo.trim() : "";
    const statusRaw = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const statusList = statusRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const paidHistoryStatuses = ["paid", "archived"];
    const filteredStatuses = statusList.filter((s) => paidHistoryStatuses.includes(s));
    const historyStatuses =
      filteredStatuses.length > 0 ? filteredStatuses : [...paidHistoryStatuses];
    const startDate =
      typeof req.query.startDate === "string" ? req.query.startDate.trim() : "";
    const endDate = typeof req.query.endDate === "string" ? req.query.endDate.trim() : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));

    const where = [];
    const params = [];

    if (tableId) {
      where.push("tableId = ?");
      params.push(tableId);
    }
    if (orderNo) {
      where.push("order_no LIKE ?");
      params.push(`%${orderNo}%`);
    }
    where.push(`status IN (${historyStatuses.map(() => "?").join(",")})`);
    params.push(...historyStatuses);
    if (startDate) {
      where.push("datetime(created_at) >= datetime(?)");
      params.push(startDate);
    }
    if (endDate) {
      where.push("datetime(created_at) <= datetime(?)");
      params.push(endDate);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const listSql = `
      SELECT id, order_no, tableId, items, total, status, created_at, payment_method, guest_count
      FROM orders
      ${whereSql}
      ORDER BY datetime(created_at) DESC, id DESC
    `;

    db.all(listSql, params, (listErr, rows) => {
      if (listErr) return res.status(500).send(listErr);

      const groupedMap = new Map();
      rows.forEach((row) => {
        const key = `${row.order_no}__${row.tableId}`;
        let grouped = groupedMap.get(key);
        if (!grouped) {
          grouped = {
            id: row.id,
            order_no: row.order_no,
            tableId: row.tableId,
            status: row.status,
            created_at: row.created_at,
            payment_method: row.payment_method || "",
            guest_count: Number(row.guest_count) || 0,
            total: 0,
            _itemsMap: new Map(),
          };
          groupedMap.set(key, grouped);
        }

        grouped.total += Number(row.total) || 0;
        if (new Date(row.created_at).getTime() > new Date(grouped.created_at).getTime()) {
          grouped.created_at = row.created_at;
        }
        if (row.payment_method) grouped.payment_method = row.payment_method;
        grouped.guest_count = Math.max(grouped.guest_count, Number(row.guest_count) || 0);
        grouped.status = pickDominantStatus(grouped.status, row.status);

        let parsedItems = [];
        try {
          parsedItems = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
        } catch (e) {
          parsedItems = [];
        }
        if (!Array.isArray(parsedItems)) parsedItems = [];
        parsedItems.forEach((item) => {
          const itemId = Number(item && item.id);
          if (!Number.isInteger(itemId)) return;
          const qty = Number(item && item.quantity) || 0;
          if (qty <= 0) return;
          const prev = grouped._itemsMap.get(itemId);
          if (prev) {
            prev.quantity += qty;
          } else {
            grouped._itemsMap.set(itemId, {
              id: itemId,
              name: item.name || {},
              price: Number(item.price) || 0,
              quantity: qty,
              status: item.status || "pending",
            });
          }
        });
      });

      const groupedRows = Array.from(groupedMap.values())
        .map((grouped) => {
          const items = Array.from(grouped._itemsMap.values());
          delete grouped._itemsMap;
          return {
            ...grouped,
            items: JSON.stringify(items),
          };
        })
        .sort((a, b) => {
          const timeDiff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (timeDiff !== 0) return timeDiff;
          return b.id - a.id;
        });

      const total = groupedRows.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;
      const pagedRows = groupedRows.slice(offset, offset + pageSize);
      return res.json({
        page,
        pageSize,
        total,
        totalPages,
        rows: pagedRows,
      });
    });
  });

  router.post("/checkout", (req, res) => {
    const { tableId } = req.body;
    const tid = typeof tableId === "string" ? tableId.trim() : "";
    if (!isValidTableId(tid)) {
      return res.status(400).send("无效桌号");
    }
    console.log("结账请求:", tid);

    getBusinessOpenStatus()
      .then((isOpen) => {
        if (!isOpen) {
          return res.status(403).send("门店未营业，暂不接受结账请求");
        }

        db.run(
          "DELETE FROM checkout_requests WHERE tableId = ?",
          [tid],
          (err) => {
            if (err) {
              console.error("删除旧结账请求失败:", err);
              return res.status(500).send(err);
            }

            db.run(
              "INSERT INTO checkout_requests (tableId) VALUES (?)",
              [tid],
              (insertErr) => {
                if (insertErr) {
                  console.error("插入结账请求失败:", insertErr);
                  return res.status(500).send(insertErr);
                }
                emitRealtimeUpdate({ type: "checkout-request", tableId: tid });
                return res.send("OK");
              },
            );
          },
        );
      })
      .catch((err) => res.status(500).send(err.message || "营业状态检查失败"));
  });

  router.get("/checkout", requireStaffAuth, (req, res) => {
    db.all(
      "SELECT * FROM checkout_requests ORDER BY id DESC",
      [],
      (err, rows) => {
        if (err) {
          console.error("获取结账请求失败:", err);
          return res.status(500).send(err);
        }
        return res.json(rows);
      },
    );
  });

  router.get("/summary", requireStaffAuth, (req, res) => {
    db.all(
      `
      SELECT tableId, SUM(total) as totalAmount
      FROM orders
      WHERE status = 'done'
      GROUP BY tableId
      `,
      [],
      (err, rows) => {
        if (err) {
          console.error("汇总失败:", err);
          return res.status(500).send(err);
        }
        return res.json(rows);
      },
    );
  });

  router.post("/pay", requireStaffAuth, async (req, res) => {
    const { tableId, excludeUnfinished } = req.body;
    const paymentMethodRaw =
      typeof req.body?.paymentMethod === "string" ? req.body.paymentMethod.trim().toLowerCase() : "";
    const paymentMethod = paymentMethodRaw || "cash";
    const allowedPaymentMethods = new Set(["cash", "paypay", "alipay", "wechat"]);
    const tidPay = typeof tableId === "string" ? tableId.trim() : "";
    if (!isValidTableId(tidPay)) {
      return res.status(400).send("无效桌号");
    }
    if (!allowedPaymentMethods.has(paymentMethod)) {
      return res.status(400).send("无效支付方式");
    }
    const idem = await tryBeginIdempotent("pay", req).catch((err) => {
      res.status(500).send(err.message || "幂等校验失败");
      return null;
    });
    if (!idem) {
      return;
    }
    if (idem.replay) {
      res.set("x-idempotent-replay", "1");
      return res.status(idem.statusCode).send(idem.body);
    }
    if (idem.inFlight) {
      return res.status(409).send("相同请求正在处理中");
    }

    const startedAt = Date.now();
    const marks = {
      queueWaitMs: 0,
      queryRowsMs: 0,
      prepareMs: 0,
      updateRowsMs: 0,
      cleanupMs: 0,
      totalMs: 0,
    };

    try {
      let responsePayload = null;
      await enqueuePay(async () => {
        marks.queueWaitMs = Date.now() - startedAt;
        let paidCount = 0;
        let archivedPendingCount = 0;

        const queryStart = Date.now();
        const rows = await dbAll(
          "SELECT id, items, status, total FROM orders WHERE tableId = ? AND status IN ('pending', 'done')",
          [tidPay],
        );
        marks.queryRowsMs = Date.now() - queryStart;

        const prepareStart = Date.now();
        const pendingPlans = [];
        let payableTotal = 0;
        if (!excludeUnfinished) {
          payableTotal = (rows || []).reduce((sum, row) => sum + (Number(row?.total) || 0), 0);
        }
        if (excludeUnfinished) {
          for (const row of rows || []) {
            if (row.status === "done") {
              payableTotal += Number(row?.total) || 0;
              continue;
            }
            if (row.status !== "pending") continue;
            let items = [];
            try {
              items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
            } catch (e) {
              items = [];
            }
            if (!Array.isArray(items)) items = [];
            const doneItems = items.filter((item) => isItemDoneForBilling(item, row.status));
            if (doneItems.length > 0) {
              payableTotal += sumLineTotal(doneItems);
              pendingPlans.push({
                sql: "UPDATE orders SET status = 'paid', items = ?, total = ?, payment_method = ? WHERE id = ?",
                params: [JSON.stringify(doneItems), sumLineTotal(doneItems), paymentMethod, row.id],
                type: "paid",
              });
            } else {
              pendingPlans.push({
                sql: "UPDATE orders SET status = 'archived' WHERE id = ?",
                params: [row.id],
                type: "archived",
              });
            }
          }
        }
        marks.prepareMs = Date.now() - prepareStart;

        if (payableTotal <= 0) {
          await dbRun("BEGIN IMMEDIATE TRANSACTION");
          const updateStart = Date.now();
          const deleted = await dbRun(
            "DELETE FROM orders WHERE tableId = ? AND status IN ('pending', 'done')",
            [tidPay],
          );
          marks.updateRowsMs = Date.now() - updateStart;
          const cleanupStart = Date.now();
          await dbRun("DELETE FROM checkout_requests WHERE tableId = ?", [tidPay]);
          marks.cleanupMs = Date.now() - cleanupStart;
          await dbRun("COMMIT");

          marks.totalMs = Date.now() - startedAt;
          const deletedCount = Number(deleted?.changes) || 0;
          responsePayload = {
            message: "NO_PAYABLE_ITEMS_CLEANED",
            paidCount: 0,
            archivedPendingCount: 0,
            deletedCount,
          };
          await finishIdempotent("pay", idem.key, 200, JSON.stringify(responsePayload));
          const timingTags = {
            rows: (rows || []).length,
            excludeUnfinished: !!excludeUnfinished,
            payableTotal,
          };
          await writeOperationLog({
            action: "pay-zero-clean",
            tableId: tidPay,
            requestKey: idem.key,
            payload: { excludeUnfinished: !!excludeUnfinished, paymentMethod, rowCount: (rows || []).length },
            result: { ...responsePayload, timings: { ...marks, tags: timingTags } },
          });
          console.info(
            `[pay-zero-clean] table=${tidPay} rows=${timingTags.rows} excludeUnfinished=${timingTags.excludeUnfinished} ` +
              `deleted=${deletedCount} payable=${payableTotal} queue=${marks.queueWaitMs}ms ` +
              `query=${marks.queryRowsMs}ms prepare=${marks.prepareMs}ms update=${marks.updateRowsMs}ms ` +
              `cleanup=${marks.cleanupMs}ms total=${marks.totalMs}ms`,
          );
          emitRealtimeUpdate({ type: "pay-zero-clean", tableId: tidPay });
          return;
        }

        await dbRun("BEGIN IMMEDIATE TRANSACTION");
        const updateStart = Date.now();
        if (!excludeUnfinished) {
          const bulkPaid = await dbRun(
            "UPDATE orders SET status = 'paid', payment_method = ? WHERE tableId = ? AND status IN ('pending', 'done')",
            [paymentMethod, tidPay],
          );
          paidCount += Number(bulkPaid?.changes) || 0;
        } else {
          const doneBulk = await dbRun(
            "UPDATE orders SET status = 'paid', payment_method = ? WHERE tableId = ? AND status = 'done'",
            [paymentMethod, tidPay],
          );
          paidCount += Number(doneBulk?.changes) || 0;
          for (const plan of pendingPlans) {
            await dbRun(plan.sql, plan.params);
            if (plan.type === "paid") paidCount += 1;
            else archivedPendingCount += 1;
          }
        }
        marks.updateRowsMs = Date.now() - updateStart;

        const cleanupStart = Date.now();
        await dbRun("DELETE FROM checkout_requests WHERE tableId = ?", [tidPay]);
        marks.cleanupMs = Date.now() - cleanupStart;
        await dbRun("COMMIT");

        marks.totalMs = Date.now() - startedAt;
        responsePayload = { message: "OK", paidCount, archivedPendingCount };
        await finishIdempotent("pay", idem.key, 200, JSON.stringify(responsePayload));
        const timingTags = {
          rows: (rows || []).length,
          excludeUnfinished: !!excludeUnfinished,
        };
        await writeOperationLog({
          action: "pay",
          tableId: tidPay,
          requestKey: idem.key,
          payload: { excludeUnfinished: !!excludeUnfinished, paymentMethod, rowCount: (rows || []).length },
          result: { ...responsePayload, timings: { ...marks, tags: timingTags } },
        });
        console.info(
          `[pay] table=${tidPay} rows=${timingTags.rows} excludeUnfinished=${timingTags.excludeUnfinished} ` +
            `paid=${paidCount} archived=${archivedPendingCount} queue=${marks.queueWaitMs}ms ` +
            `query=${marks.queryRowsMs}ms prepare=${marks.prepareMs}ms update=${marks.updateRowsMs}ms ` +
            `cleanup=${marks.cleanupMs}ms total=${marks.totalMs}ms`,
        );
        console.info(
          JSON.stringify({
            event: "pay",
            tableId: tidPay,
            requestKey: idem.key || null,
            paymentMethod,
            excludeUnfinished: timingTags.excludeUnfinished,
            rows: timingTags.rows,
            paidCount,
            archivedPendingCount,
            timings: marks,
            ok: true,
            ts: new Date().toISOString(),
          }),
        );
        emitRealtimeUpdate({ type: "pay", tableId: tidPay });
      });
      return res.json(responsePayload || { message: "OK", paidCount: 0, archivedPendingCount: 0 });
    } catch (err) {
      await dbRun("ROLLBACK").catch(() => {});
      console.error("支付失败:", err);
      if (idem.key) {
        await finishIdempotent("pay", idem.key, 500, "支付失败").catch(() => {});
      }
      await writeOperationLog({
        action: "pay-failed",
        tableId: tidPay,
        requestKey: idem.key,
        payload: { excludeUnfinished: !!excludeUnfinished, paymentMethod },
        result: {
          error: err.message || String(err),
          timings: {
            ...marks,
            tags: {
              rows: 0,
              excludeUnfinished: !!excludeUnfinished,
            },
          },
        },
      }).catch(() => {});
      console.error(
        JSON.stringify({
          event: "pay",
          tableId: tidPay,
          requestKey: idem.key || null,
          paymentMethod,
          excludeUnfinished: !!excludeUnfinished,
          rows: 0,
          error: err.message || String(err),
          timings: marks,
          ok: false,
          ts: new Date().toISOString(),
        }),
      );
      return res.status(500).send("支付失败");
    }
  });

  router.get("/kitchen", requireStaffAuth, (req, res) => {
    db.all(
      "SELECT * FROM orders WHERE status IN ('pending', 'done') ORDER BY id DESC",
      [],
      (err, rows) => {
        if (err) return res.status(500).send(err);
        return res.json(rows);
      },
    );
  });

  router.post("/order/status", requireStaffAuth, (req, res) => {
    const id = parseInt(req.body.id, 10);
    const status = req.body.status;

    const allowedStatuses = ["pending", "done", "paid", "archived"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).send(`错误：不支持的目标状态: ${status}`);
    }

    db.get("SELECT tableId FROM orders WHERE id = ?", [id], (findErr, orderRow) => {
      if (findErr) return res.status(500).send(findErr);
      if (!orderRow) return res.status(404).send("找不到该订单");
      db.run(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, id],
        function onUpdate(err) {
          if (err) return res.status(500).send(err);
          if (this.changes === 0) return res.status(404).send("找不到该订单");
          emitRealtimeUpdate({ type: "order-status", tableId: orderRow.tableId });
          return res.send("OK");
        },
      );
    });
  });

  router.post("/order/item/status", requireStaffAuth, (req, res) => {
    const orderId = parseInt(req.body.orderId, 10);
    const itemId = Number(req.body.itemId);
    const lineIndexRaw = req.body.lineIndex;
    const lineIndex = Number.isInteger(lineIndexRaw)
      ? lineIndexRaw
      : Number.isInteger(Number(lineIndexRaw))
        ? Number(lineIndexRaw)
        : -1;
    const nextStatus = req.body.status;
    if (!Number.isInteger(orderId)) {
      return res.status(400).send("无效参数");
    }
    if (lineIndex < 0 && !Number.isInteger(itemId)) {
      return res.status(400).send("无效参数");
    }
    if (!["pending", "done"].includes(nextStatus)) {
      return res.status(400).send("无效状态");
    }

    db.get(
      "SELECT id, tableId, items, status FROM orders WHERE id = ?",
      [orderId],
      (findErr, row) => {
        if (findErr) return res.status(500).send(findErr);
        if (!row) return res.status(404).send("找不到该订单");
        if (!["pending", "done"].includes(row.status)) {
          return res.status(400).send("该订单已结账，不能再改出菜状态");
        }

        let items = [];
        try {
          items = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
        } catch (e) {
          return res.status(500).send("订单菜品数据损坏");
        }
        if (!Array.isArray(items)) return res.status(500).send("订单菜品数据异常");

        const targetIndex =
          lineIndex >= 0
            ? lineIndex < items.length
              ? lineIndex
              : -1
            : items.findIndex((item) => Number(item && item.id) === itemId);
        if (targetIndex < 0) return res.status(404).send("找不到该菜品");

        items[targetIndex] = {
          ...items[targetIndex],
          status: nextStatus,
        };

        const allDone = items.length > 0 && items.every((item) => item.status === "done");
        const orderStatus = allDone ? "done" : "pending";

        db.run(
          "UPDATE orders SET items = ?, status = ? WHERE id = ?",
          [JSON.stringify(items), orderStatus, orderId],
          function onUpdate(updateErr) {
            if (updateErr) return res.status(500).send(updateErr);
            emitRealtimeUpdate({ type: "order-item-status", tableId: row.tableId });
            return res.send("OK");
          },
        );
      },
    );
  });

  router.put("/orders/:id/items", requireStaffAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const items = req.body && req.body.items;
    if (!Number.isInteger(id)) return res.status(400).send("无效订单ID");
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).send("菜品不能为空");
    }

    db.get("SELECT id, tableId, status FROM orders WHERE id = ?", [id], (findErr, row) => {
      if (findErr) return res.status(500).send(findErr);
      if (!row) return res.status(404).send("找不到该订单");
      if (!["pending", "done"].includes(row.status)) {
        return res.status(400).send("仅可修改未结账订单");
      }

      db.get("SELECT items FROM orders WHERE id = ?", [id], (itemsErr, itemsRow) => {
        if (itemsErr) return res.status(500).send(itemsErr);
        let existingItems = [];
        try {
          existingItems =
            typeof itemsRow?.items === "string" ? JSON.parse(itemsRow.items) : itemsRow?.items;
        } catch (e) {
          existingItems = [];
        }
        if (!Array.isArray(existingItems)) existingItems = [];

        const existingById = new Map();
        existingItems.forEach((item) => {
          const itemId = Number(item && item.id);
          if (!Number.isInteger(itemId)) return;
          const prev = existingById.get(itemId) || { doneQty: 0, pendingQty: 0 };
          const qty = Math.max(0, Number(item.quantity) || 0);
          if (item.status === "done") prev.doneQty += qty;
          else prev.pendingQty += qty;
          existingById.set(itemId, prev);
        });

        const quantityById = new Map();
        items.forEach((item) => {
          const menuId = Number(item && item.id);
          const quantity = Number(item && item.quantity);
          if (Number.isInteger(menuId) && Number.isFinite(quantity) && quantity > 0) {
            quantityById.set(menuId, (quantityById.get(menuId) || 0) + Math.floor(quantity));
          }
        });
        const menuIds = Array.from(quantityById.keys());
        if (menuIds.length === 0) return res.status(400).send("无效菜品内容");

        for (const [menuId, existing] of existingById.entries()) {
          const doneQty = Number(existing?.doneQty) || 0;
          if (doneQty <= 0) continue;
          const nextQty = quantityById.get(menuId) || 0;
          if (nextQty < doneQty) {
            return res
              .status(400)
              .send("已出菜项目不允许减少或删除，请走退款/补差流程");
          }
        }

        const placeholders = menuIds.map(() => "?").join(",");
        db.all(
          `SELECT id, name_zh, name_ja, name_en, price FROM menu WHERE is_available = 1 AND id IN (${placeholders})`,
          menuIds,
          (menuErr, menuRows) => {
            if (menuErr) return res.status(500).send(menuErr);
            if (!menuRows || menuRows.length !== menuIds.length) {
              return res.status(400).send("部分菜品不存在或已下架");
            }

            const menuById = new Map(menuRows.map((menuItem) => [menuItem.id, menuItem]));
            const trustedItems = menuIds.flatMap((menuId) => {
              const menuItem = menuById.get(menuId);
              const existing = existingById.get(menuId) || { doneQty: 0, pendingQty: 0 };
              const doneQty = Math.max(0, Number(existing.doneQty) || 0);
              const nextQty = Math.max(0, Number(quantityById.get(menuId)) || 0);
              const pendingQty = Math.max(0, nextQty - doneQty);
              const base = {
                id: menuItem.id,
                name: {
                  zh: menuItem.name_zh,
                  ja: menuItem.name_ja,
                  en: menuItem.name_en,
                },
                price: menuItem.price,
              };
              const lines = [];
              if (doneQty > 0) lines.push({ ...base, quantity: doneQty, status: "done" });
              if (pendingQty > 0) lines.push({ ...base, quantity: pendingQty, status: "pending" });
              return lines;
            });
            const trustedTotal = sumLineTotal(trustedItems);
            const orderStatus =
              trustedItems.length > 0 && trustedItems.every((item) => item.status === "done")
                ? "done"
                : "pending";

            db.run(
              "UPDATE orders SET items = ?, total = ?, status = ? WHERE id = ?",
              [JSON.stringify(trustedItems), trustedTotal, orderStatus, id],
              function onUpdate(updateErr) {
                if (updateErr) return res.status(500).send(updateErr);
                emitRealtimeUpdate({ type: "order-edited", tableId: row.tableId });
                return res.json({ message: "OK", total: trustedTotal });
              },
            );
          },
        );
      });
    });
  });

  router.delete("/orders/:id", requireStaffAuth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(400).send("无效订单ID");

    db.get("SELECT tableId, status FROM orders WHERE id = ?", [id], (findErr, row) => {
      if (findErr) return res.status(500).send(findErr);
      if (!row) return res.status(404).send("找不到该订单");
      if (!["pending", "done"].includes(row.status)) {
        return res.status(400).send("仅可删除未结账订单");
      }

      db.run("DELETE FROM orders WHERE id = ?", [id], (delErr) => {
        if (delErr) return res.status(500).send(delErr);
        emitRealtimeUpdate({ type: "order-deleted", tableId: row.tableId });
        return res.json({ message: "OK" });
      });
    });
  });

  router.post(
    "/orders/:id/manager-delete-paid",
    requireStaffAuth,
    requireManagerTotp,
    async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) return res.status(400).send("无效订单ID");
      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";

      try {
        const row = await dbGet(
          "SELECT id, tableId, status, order_no, total, payment_method, items FROM orders WHERE id = ?",
          [id],
        );
        if (!row) return res.status(404).send("找不到该订单");
        if (!["paid", "archived"].includes(row.status)) {
          return res.status(400).send("仅可纠错删除已结账或归档订单");
        }

        const snapshot = {
          order_no: row.order_no,
          status: row.status,
          total: row.total,
          payment_method: row.payment_method,
        };

        await dbRun("DELETE FROM orders WHERE id = ?", [id]);
        try {
          await dbRun(`INSERT INTO manager_audit_log (action, order_id, detail) VALUES (?, ?, ?)`, [
            "delete-paid-order",
            id,
            JSON.stringify({ reason, snapshot }),
          ]);
        } catch (auditErr) {
          console.error("manager_audit_log insert failed:", auditErr);
        }
        emitRealtimeUpdate({ type: "order-deleted", tableId: row.tableId });
        return res.json({ message: "OK" });
      } catch (err) {
        return res.status(500).send(err.message || String(err));
      }
    },
  );

  /** 店长纠错：修改已结账订单的交易金额 / 付款方式 / 用餐人数 / 桌号（不含菜品明细） */
  router.post(
    "/orders/:id/manager-edit-paid-meta",
    requireStaffAuth,
    requireManagerTotp,
    async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) return res.status(400).send("无效订单ID");
      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
      const changes = req.body && req.body.changes;
      if (!changes || typeof changes !== "object" || Array.isArray(changes)) {
        return res.status(400).send("修改内容无效");
      }
      const allowedKeys = new Set(["total", "payment_method", "guest_count", "tableId"]);
      const keys = Object.keys(changes).filter((k) => allowedKeys.has(k));
      if (keys.length === 0) return res.status(400).send("未指定修改项");

      const allowedPaymentMethods = new Set(["cash", "paypay", "alipay", "wechat"]);

      try {
        const row = await dbGet(
          "SELECT id, tableId, status, order_no, total, payment_method, guest_count, items FROM orders WHERE id = ?",
          [id],
        );
        if (!row) return res.status(404).send("找不到该订单");
        if (!["paid", "archived"].includes(row.status)) {
          return res.status(400).send("仅可纠错修改已结账或归档订单");
        }

        const snapshotBefore = {
          order_no: row.order_no,
          total: row.total,
          payment_method: row.payment_method,
          guest_count: row.guest_count,
          tableId: row.tableId,
        };

        let nextTotal = Number(row.total) || 0;
        if (!Number.isInteger(nextTotal) || nextTotal < 0) nextTotal = 0;

        let nextPay = String(row.payment_method || "cash").trim().toLowerCase() || "cash";
        if (!allowedPaymentMethods.has(nextPay)) nextPay = "cash";

        let nextGuests = Number(row.guest_count);
        if (!Number.isInteger(nextGuests) || nextGuests < 0) nextGuests = 0;

        let nextTable = row.tableId;

        if ("total" in changes) {
          const t = Number(changes.total);
          if (!Number.isInteger(t) || t < 0) return res.status(400).send("交易金额无效");
          nextTotal = t;
        }
        if ("payment_method" in changes) {
          const p = String(changes.payment_method || "").trim().toLowerCase();
          if (!allowedPaymentMethods.has(p)) return res.status(400).send("无效支付方式");
          nextPay = p;
        }
        if ("guest_count" in changes) {
          const g = Number(changes.guest_count);
          if (!Number.isInteger(g) || g < 0 || g > 999) return res.status(400).send("用餐人数无效");
          nextGuests = g;
        }
        if ("tableId" in changes) {
          const tid = String(changes.tableId || "").trim();
          if (!isValidTableId(tid)) return res.status(400).send("无效桌号");
          nextTable = tid;
        }

        await dbRun(
          "UPDATE orders SET total = ?, payment_method = ?, guest_count = ?, tableId = ? WHERE id = ?",
          [nextTotal, nextPay, nextGuests, nextTable, id],
        );

        try {
          await dbRun(`INSERT INTO manager_audit_log (action, order_id, detail) VALUES (?, ?, ?)`, [
            "edit-paid-order-meta",
            id,
            JSON.stringify({
              reason,
              before: snapshotBefore,
              after: {
                total: nextTotal,
                payment_method: nextPay,
                guest_count: nextGuests,
                tableId: nextTable,
              },
              keys,
            }),
          ]);
        } catch (auditErr) {
          console.error("manager_audit_log insert failed:", auditErr);
        }

        emitRealtimeUpdate({ type: "order-edited", tableId: row.tableId });
        if (nextTable !== row.tableId) {
          emitRealtimeUpdate({ type: "order-edited", tableId: nextTable });
        }

        return res.json({
          message: "OK",
          total: nextTotal,
          payment_method: nextPay,
          guest_count: nextGuests,
          tableId: nextTable,
        });
      } catch (err) {
        return res.status(500).send(err.message || String(err));
      }
    },
  );

  router.post(
    "/orders/:id/manager-edit-paid-items",
    requireStaffAuth,
    requireManagerTotp,
    async (req, res) => {
      const id = parseInt(req.params.id, 10);
      if (!Number.isInteger(id)) return res.status(400).send("无效订单ID");

      const itemsPayload = req.body && req.body.items;
      const reason =
        typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";

      if (!Array.isArray(itemsPayload)) {
        return res.status(400).send("菜品数据无效");
      }

      const quantityById = new Map();
      itemsPayload.forEach((item) => {
        const menuId = Number(item && item.id);
        const quantity = Number(item && item.quantity);
        if (Number.isInteger(menuId) && Number.isFinite(quantity) && quantity > 0) {
          quantityById.set(menuId, (quantityById.get(menuId) || 0) + Math.floor(quantity));
        }
      });
      const menuIds = Array.from(quantityById.keys()).sort((a, b) => a - b);
      if (menuIds.length === 0) return res.status(400).send("菜品不能为空");

      try {
        const row = await dbGet(
          "SELECT id, tableId, status, order_no, total, payment_method, items FROM orders WHERE id = ?",
          [id],
        );
        if (!row) return res.status(404).send("找不到该订单");
        if (!["paid", "archived"].includes(row.status)) {
          return res.status(400).send("仅可纠错修改已结账或归档订单");
        }

        let prevItems = [];
        try {
          prevItems =
            typeof row.items === "string" ? JSON.parse(row.items) : row.items;
        } catch {
          prevItems = [];
        }
        const snapshotBefore = {
          order_no: row.order_no,
          total: row.total,
          itemsSummary: Array.isArray(prevItems)
            ? prevItems.map((it) => ({
                id: it.id,
                qty: it.quantity,
                price: it.price,
              }))
            : [],
        };

        const placeholders = menuIds.map(() => "?").join(",");
        const menuRows = await dbAll(
          `SELECT id, name_zh, name_ja, name_en, price FROM menu WHERE is_available = 1 AND id IN (${placeholders})`,
          menuIds,
        );
        if (!menuRows || menuRows.length !== menuIds.length) {
          return res.status(400).send("部分菜品不存在或已下架");
        }

        const menuById = new Map(menuRows.map((m) => [m.id, m]));
        const trustedItems = menuIds.map((menuId) => {
          const menuItem = menuById.get(menuId);
          const qty = quantityById.get(menuId) || 0;
          return {
            id: menuItem.id,
            name: {
              zh: menuItem.name_zh,
              ja: menuItem.name_ja,
              en: menuItem.name_en,
            },
            price: menuItem.price,
            quantity: qty,
            status: "done",
          };
        });
        const trustedTotal = sumLineTotal(trustedItems);

        await dbRun("UPDATE orders SET items = ?, total = ? WHERE id = ?", [
          JSON.stringify(trustedItems),
          trustedTotal,
          id,
        ]);

        try {
          await dbRun(`INSERT INTO manager_audit_log (action, order_id, detail) VALUES (?, ?, ?)`, [
            "edit-paid-order-items",
            id,
            JSON.stringify({
              reason,
              before: snapshotBefore,
              afterTotal: trustedTotal,
            }),
          ]);
        } catch (auditErr) {
          console.error("manager_audit_log insert failed:", auditErr);
        }

        emitRealtimeUpdate({ type: "order-edited", tableId: row.tableId });
        return res.json({ message: "OK", total: trustedTotal });
      } catch (err) {
        return res.status(500).send(err.message || String(err));
      }
    },
  );

  router.post("/tables/:tableId/items/quantity", requireStaffAuth, (req, res) => {
    const tableId = typeof req.params.tableId === "string" ? req.params.tableId.trim() : "";
    const menuId = Number(req.body && req.body.menuId);
    const targetQuantity = Number(req.body && req.body.quantity);
    if (!tableId) return res.status(400).send("无效桌号");
    if (!isValidTableId(tableId)) return res.status(400).send("无效桌号");
    if (!Number.isInteger(menuId)) return res.status(400).send("无效菜品ID");
    if (!Number.isInteger(targetQuantity) || targetQuantity < 0) {
      return res.status(400).send("数量必须是0或正整数");
    }

    db.all(
      "SELECT id, items, status, created_at FROM orders WHERE tableId = ? AND status IN ('pending', 'done') ORDER BY datetime(created_at) ASC, id ASC",
      [tableId],
      (findErr, rows) => {
        if (findErr) return res.status(500).send(findErr);
        if (!rows || rows.length === 0) return res.status(404).send("该桌无可编辑订单");

        const orders = rows.map((row) => {
          let parsed = [];
          try {
            parsed = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
          } catch (e) {
            parsed = [];
          }
          return {
            id: row.id,
            status: row.status,
            created_at: row.created_at,
            items: Array.isArray(parsed) ? parsed : [],
          };
        });

        let currentTotal = 0;
        const refs = [];
        orders.forEach((order) => {
          order.items.forEach((item, index) => {
            if (Number(item && item.id) === menuId) {
              const qty = Number(item.quantity) || 0;
              currentTotal += qty;
              refs.push({ order, index, qty });
            }
          });
        });

        const delta = targetQuantity - currentTotal;
        if (delta === 0) {
          return res.json({ message: "OK", quantity: targetQuantity });
        }

        const applyAndPersist = () => {
          const changedOrders = orders.filter((order) => order.__changed);
          if (changedOrders.length === 0) {
            emitRealtimeUpdate({ type: "order-edited", tableId });
            return res.json({ message: "OK", quantity: targetQuantity });
          }

          const updateOne = (idx) => {
            if (idx >= changedOrders.length) {
              emitRealtimeUpdate({ type: "order-edited", tableId });
              return res.json({ message: "OK", quantity: targetQuantity });
            }
            const order = changedOrders[idx];
            const total = sumLineTotal(order.items);
            db.run(
              "UPDATE orders SET items = ?, total = ? WHERE id = ?",
              [JSON.stringify(order.items), total, order.id],
              (updateErr) => {
                if (updateErr) return res.status(500).send(updateErr);
                return updateOne(idx + 1);
              },
            );
          };
          return updateOne(0);
        };

        if (delta < 0) {
          let needReduce = -delta;
          const reduceRefs = [...refs].sort(
            (a, b) =>
              new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime(),
          );
          for (const ref of reduceRefs) {
            if (needReduce <= 0) break;
            const item = ref.order.items[ref.index];
            const canReduce = Math.min(needReduce, Number(item.quantity) || 0);
            item.quantity = (Number(item.quantity) || 0) - canReduce;
            if (item.quantity <= 0) {
              ref.order.items.splice(ref.index, 1);
            }
            ref.order.__changed = true;
            needReduce -= canReduce;
          }
          return applyAndPersist();
        }

        db.get(
          "SELECT id, name_zh, name_ja, name_en, price FROM menu WHERE id = ? AND is_available = 1",
          [menuId],
          (menuErr, menuRow) => {
            if (menuErr) return res.status(500).send(menuErr);
            if (!menuRow) return res.status(400).send("菜品不存在或已下架");

            const needAdd = delta;
            const targetOrder = orders[orders.length - 1];
            const existingIndex = targetOrder.items.findIndex(
              (item) => Number(item && item.id) === menuId,
            );
            if (existingIndex >= 0) {
              targetOrder.items[existingIndex].quantity =
                (Number(targetOrder.items[existingIndex].quantity) || 0) + needAdd;
            } else {
              targetOrder.items.push({
                id: menuRow.id,
                name: { zh: menuRow.name_zh, ja: menuRow.name_ja, en: menuRow.name_en },
                price: menuRow.price,
                quantity: needAdd,
                status: "pending",
              });
            }
            targetOrder.__changed = true;
            return applyAndPersist();
          },
        );
      },
    );
  });

  router.get("/order", async (req, res) => {
    try {
      const { tableId } = req.query;
      const tid = typeof tableId === "string" ? tableId.trim() : "";
      if (!isValidTableId(tid)) {
        return res.status(400).send("无效桌号");
      }
      const sessionId = await getActiveSessionId(tid);
      if (!sessionId) return res.json([]);
      const rows = await dbAll(
        "SELECT * FROM orders WHERE tableId = ? AND session_id = ? AND status != 'archived'",
        [tid, sessionId],
      );
      return res.json(rows || []);
    } catch (err) {
      return res.status(500).send(err.message || "查询订单失败");
    }
  });

  return router;
}

function pickDominantStatus(currentStatus, nextStatus) {
  const rank = {
    pending: 4,
    done: 3,
    paid: 2,
    archived: 1,
  };
  const currentRank = rank[currentStatus] || 0;
  const nextRank = rank[nextStatus] || 0;
  return nextRank > currentRank ? nextStatus : currentStatus;
}

module.exports = {
  createOrdersRouter,
};
