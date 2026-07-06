# 店铺功能测试（进场）前 — 测试清单

在进入门店现场联调与验收之前，建议在本地或 CI 先完成一轮「预检」，降低带着明显缺陷到现场的概率。

---

## 一、自动化测试（必跑）

| 步骤 | 命令 | 说明 |
|------|------|------|
| 依赖 | `npm install` 且 `npx playwright install` | 首次环境 |
| 单元 | `npm run test:unit` | 订单数学、桌号、TOTP 工具等纯逻辑 |
| 接口 | `npm run test:api` | 登录、营业、下单、厨房、结账、幂等、非法桌号、TOTP/纠错等 |
| 端到端 | `npm run test:e2e` | Playwright：核心流程、异常、快速入座、员工端设置入口冒烟等 |
| **一键预检** | `npm run test:pre-shop` | 等价于单元 + 接口 + E2E 全套 |
| 负载（可选） | `npm run test:load` 等 | 需先 `npm run start`；见 `docs/TESTING_PLAN.md` 第五节 |

接口/E2E 会依赖本地 `orders.db`；Playwright 会通过 `/health` 拉起 `npm run start`（`reuseExistingServer: true`）。

---

## 二、自动化覆盖项对照表（本轮补充）

| 类别 | 覆盖内容 | 测试位置 |
|------|----------|----------|
| 健康检查 | `GET /health` 返回 `ok: true` | `tests/api/pre-shop-contract.api.test.js` |
| 静态页契约 | `login` / `kitchen` / `finance` / `recovery` 含共用设置脚本与 `#adminSettingsTrigger`；`admin` 含收银自带设置入口 | 同上 |
| 公共资源 | `/css/staff-settings.css`、`staff-auth.js`、`staff-settings-ui.js` 可访问 | 同上 |
| 登录契约 | 错误凭据 `401`；正确凭据 `200` 且返回 `token` | 同上 |
| 宾客页隔离 | `index.html` 不包含员工设置按钮（避免误接到顾客页） | 同上 |
| 公开 API | `GET /api/menu`、`GET /api/tables` 可用 | 同上 |
| 员工端 UI | 登录页齿轮 →「关于」弹窗可开闭；持令牌访问厨房/财务/自检/收银时齿轮可见 | `tests/e2e/staff-portal-smoke.spec.js` |

原有套件仍负责：**核心点菜→厨房→收款**、幂等与边界、`manager-totp`、`quick-seat`、`noodles`、`edit-order-kitchen-sync`、`exception` 等（见 `tests/` 各文件）。

---

## 三、进场前建议手工复核（自动化难以替代）

以下建议在浏览器真实操作一遍（可与自动化互补）：

1. **网络与环境**：本机仅跑单实例服务；浏览器无痕或清空本地存储后再测登录。
2. **登录 / 令牌**：错误密码提示；登录成功后跳转目标页；员工令牌与 TOTP 概念是否与培训一致（设置 → 令牌说明）。
3. **语言**：日语 / 中文切换后标题与设置菜单文案一致。
4. **营业开关**：停课后顾客端下单被拒；开课后可下单（与接口测试一致时可抽检）。
5. **收银敏感操作**：已结账订单纠错 / 删除路径是否仍要求 TOTP（依店铺策略）。
6. **厨房 / 财务**：Socket 或刷新后数据一致（现场 Wi‑Fi 下重点看）。
7. **自检页**：`/recovery.html` 在有令牌时能完成约定检查（具体步骤依页面提示）。

---

## 四、可选：并发压测（非每次必跑）

有 k6 环境时，可参考 `docs/TESTING_PLAN.md` 第四节对 `tests/load/k6-order-100vu.js` 的执行说明；上线前或大版本发布前建议至少跑一次。

---

## 五、失败时的处理顺序

1. 先看失败用例文件名与断言信息。  
2. 接口失败：检查 `orders.db`、是否执行过 `npm run test:prepare`（`reset-runtime-data.js`）。  
3. E2E 失败：端口占用、服务未就绪；可单独 `npm run start` 后再 `npx playwright test`。  
4. 静态契约失败：通常是 HTML/路径改名但未同步测试。

---

更完整的框架说明见 [TESTING_PLAN.md](./TESTING_PLAN.md)。
