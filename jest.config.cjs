module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  clearMocks: true,
  verbose: true,
  setupFilesAfterEnv: ["<rootDir>/tests/setup/jest.setup.js"],
};
