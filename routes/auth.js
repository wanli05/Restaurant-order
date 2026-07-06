const express = require("express");

function createAuthRouter({
  ADMIN_TOKEN,
  STAFF_LOGIN_USERNAME,
  STAFF_LOGIN_PASSWORD,
}) {
  const router = express.Router();

  router.post("/auth/login", (req, res) => {
    const username =
      typeof req.body?.username === "string" ? req.body.username.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (
      username !== STAFF_LOGIN_USERNAME ||
      password !== STAFF_LOGIN_PASSWORD
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    return res.json({
      token: ADMIN_TOKEN,
      username: STAFF_LOGIN_USERNAME,
    });
  });

  return router;
}

module.exports = {
  createAuthRouter,
};
