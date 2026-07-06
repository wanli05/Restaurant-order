/**
 * 测试专用：从登录页以默认测试账号登录，期望跳转 finance。
 * @param {import("@playwright/test").Page} page
 * @param {import("@playwright/test").expect} expectFn
 */
async function loginStaffExpectFinance(page, expectFn) {
  await page.goto("/login.html");
  await page.fill("#username", "Test12345");
  await page.fill("#password", "Test12345");
  await page.click("#loginBtn");
  await expectFn(page).toHaveURL(/finance\.html/);
}

module.exports = { loginStaffExpectFinance };
