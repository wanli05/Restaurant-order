# 餐饮点单系统测试方案（Node.js）

本方案覆盖以下要求：

1. Jest 单元测试  
2. Supertest 接口测试  
3. Playwright 端到端测试  
4. k6 并发测试（100 人同时点单）  
5. 核心流程 + 异常场景

---

## 一、测试目录结构

```text
tests/
  setup/
    jest.setup.js
  helpers/
    reset-runtime-data.js
  unit/
    order-math.test.js
    table-ids.test.js
  api/
    core-flow.api.test.js
    pre-shop-contract.api.test.js
  e2e/
    core-flow.spec.js
    exception.spec.js
    staff-portal-smoke.spec.js
  load/
    k6-shared.json
    k6-env.js
    k6-staff-session.js
    k6-order-100vu.js
    k6-mixed-flow-100vu.js
    ...
```

---

## 二、覆盖范围

### 1) 单元测试（Jest）

- `lib/order-math.js`
  - 菜品状态归一化
  - 已出菜判定
  - 金额累计边界处理
- `lib/table-ids.js`
  - 桌号白名单校验

### 2) 接口测试（Supertest）

- 核心流程：
  - 登录
  - 开始营业
  - 下单
  - 厨房拉单
  - 结账请求
  - 收款
- 异常流程：
  - 重复提交（`x-idempotency-key` replay）
  - 非法桌号
  - 停止营业后下单被拒绝

### 3) 端到端测试（Playwright）

- 核心流程：
  - 顾客端点单
  - 厨房接单可见
  - 后台收款成功
- 异常流程：
  - 重复点击提交
  - 网络断开（offline）反馈

### 4) 并发测试（k6）

- `tests/load/k6-order-100vu.js`
  - 100 VU 并发持续 30s
  - 模拟多桌同时点单
  - 目标阈值：
    - 失败率 `< 2%`
    - P95 `< 1200ms`

---

## 三、执行方式

## 0. 安装依赖

```bash
npm install
npx playwright install
```

## 1. 运行单元测试

```bash
npm run test:unit
```

## 2. 运行接口测试

```bash
npm run test:api
```

## 3. 运行端到端测试

```bash
npm run test:e2e
```

## 4. 一键跑全套（不含 k6）

```bash
npm run test:all
```

## 5. 运行 k6 负载测试（请在仓库根目录执行）

系统依赖单独安装的 **k6**。请先启动服务（`npm run start`），再在项目根目录执行：

```bash
npm run test:load
```

等价于 `k6 run ./tests/load/k6-order-100vu.js`（100 VU × 30s，失败率 & P95 见脚本内 thresholds）。

其它场景：

```bash
npm run test:load:mixed
npm run test:load:staged
npm run test:load:tiered
```

指定地址与管理员令牌示例：

```bash
k6 run -e BASE_URL=http://127.0.0.1:3001 -e ADMIN_TOKEN=your-token ./tests/load/k6-order-100vu.js
```

混合脚本支持 `-e STAFF_USER` / `-e STAFF_PASS`（默认与测试账号一致）。压测所用桌号白名单与后端默认一致，见 `tests/load/k6-shared.json`（修改时请同步 `lib/table-ids.js`）。

---

## 6. （可选）Node 脚本跑通 HTTP 主流程

```bash
npm run test:http-flow
```

用于无浏览器的接口串测（需本机服务已监听 `localhost:3001`）。

## 四、店铺进场前清单

本地或 CI 在到店验收前建议执行 `npm run test:pre-shop`（与 `npm run test:all` 相同：单元 + 接口 + Playwright）。  
手工抽检项与本轮契约测试说明见 **[PRE_SHOP_TEST_CHECKLIST.md](./PRE_SHOP_TEST_CHECKLIST.md)**。

---

## 五、注意事项

- 当前测试使用真实 `orders.db`，每次测试前会调用 `scripts/reset-runtime-data.js` 清理运行态数据。
- k6 压测前建议只保留一个 Node 服务实例，避免端口冲突和数据干扰。
- 端到端测试默认使用 headless 浏览器，如需可视化可改 Playwright 配置。
