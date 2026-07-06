// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
  },
  webServer: {
    command: "npm run start",
    url: "http://127.0.0.1:3001/health",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
