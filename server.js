const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const db = require("./db");
const { createAuthRouter } = require("./routes/auth");
const { createBusinessRouter } = require("./routes/business");
const { createFinanceRouter } = require("./routes/finance");
const {
  createManagerTotpRouter,
  createRequireManagerTotp,
} = require("./routes/manager-totp");
const { createOpsRouter } = require("./routes/ops");
const { createOrdersRouter } = require("./routes/orders");
const { createDbUtils } = require("./lib/db-utils");
const { createOpsUtils } = require("./lib/ops-utils");

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change-me-admin-token";
const STAFF_LOGIN_USERNAME = process.env.STAFF_LOGIN_USERNAME || "Test12345";
const STAFF_LOGIN_PASSWORD = process.env.STAFF_LOGIN_PASSWORD || "Test12345";

function requireStaffAuth(req, res, next) {
  const token = req.get("x-admin-token");
  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

const staffIo = io.of("/staff");
const guestIo = io.of("/guest");

staffIo.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token || token !== ADMIN_TOKEN) {
    return next(new Error("Unauthorized"));
  }
  next();
});

staffIo.on("connection", (socket) => {
  socket.emit("connected", { role: "staff" });
});

guestIo.on("connection", (socket) => {
  const tableIdRaw = socket.handshake.query && socket.handshake.query.tableId;
  const tableId = typeof tableIdRaw === "string" ? tableIdRaw.trim() : "";
  if (tableId) {
    socket.join(`table:${tableId}`);
  }
  socket.emit("connected", { role: "guest", tableId });
});

function emitRealtimeUpdate({ type = "refresh", tableId = null } = {}) {
  staffIo.emit("data-updated", { type, tableId });
  if (tableId) {
    guestIo.to(`table:${tableId}`).emit("data-updated", { type, tableId });
  } else {
    guestIo.emit("data-updated", { type });
  }
}

const {
  dbGet,
  dbRun,
  dbAll,
  getBusinessOpenStatus,
  allocateDailyOrderNo,
} = createDbUtils(db);
const requireManagerTotp = createRequireManagerTotp({ dbGet });
const {
  getRequestKey,
  tryBeginIdempotent,
  finishIdempotent,
  writeOperationLog,
} = createOpsUtils({ dbGet, dbRun });

app.use(
  createAuthRouter({
    ADMIN_TOKEN,
    STAFF_LOGIN_USERNAME,
    STAFF_LOGIN_PASSWORD,
  }),
);

app.use(createManagerTotpRouter({ requireStaffAuth, dbGet, dbRun }));

app.use(
  createBusinessRouter({
    requireStaffAuth,
    getBusinessOpenStatus,
    dbRun,
    writeOperationLog,
    getRequestKey,
    emitRealtimeUpdate,
  }),
);

app.use(
  createOpsRouter({
    requireStaffAuth,
    db,
    dbGet,
    dbAll,
  }),
);

app.use(
  createOrdersRouter({
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
  }),
);

app.use(
  createFinanceRouter({
    requireStaffAuth,
    db,
    dbGet,
    dbRun,
    tryBeginIdempotent,
    finishIdempotent,
    writeOperationLog,
    emitRealtimeUpdate,
  }),
);

app.use(express.static("public"));

function startServer(port = 3001) {
  return httpServer.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`SQLite database: ${db.filename}`);
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3001;
  startServer(port);
}

module.exports = {
  app,
  httpServer,
  startServer,
};
