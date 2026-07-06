const express = require("express");

function createBusinessRouter({
  requireStaffAuth,
  getBusinessOpenStatus,
  dbRun,
  writeOperationLog,
  getRequestKey,
  emitRealtimeUpdate,
}) {
  const router = express.Router();

  router.get("/business/status", async (req, res) => {
    try {
      const isOpen = await getBusinessOpenStatus();
      return res.json({ isOpen });
    } catch (err) {
      return res.status(500).json({ error: "Failed to get business status" });
    }
  });

  router.post("/business/start", requireStaffAuth, async (req, res) => {
    try {
      const isOpen = await getBusinessOpenStatus();
      if (isOpen) {
        return res.status(409).json({ error: "already-open" });
      }
      await dbRun("UPDATE app_settings SET value = '1' WHERE key = 'business_open'");
      await writeOperationLog({
        action: "business-start",
        requestKey: getRequestKey(req),
        result: { businessOpen: true },
      });
      emitRealtimeUpdate({ type: "business-status" });
      return res.send("OK");
    } catch (err) {
      return res.status(500).json({ error: "Failed to start business" });
    }
  });

  return router;
}

module.exports = {
  createBusinessRouter,
};
