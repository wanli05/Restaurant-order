# Restaurant-order 结构重构计划

当前系统已进入“功能基本完成，准备运营维护”阶段。为降低后续维护风险，采用分阶段重构。

## 阶段 1（已完成）

- 建立目录：
  - `public/js/shared/`
  - `public/js/recovery/`
  - `docs/`
- 把 `recovery` 页内联脚本外置：
  - `public/recovery.html` -> `public/js/recovery/main.js`
- 抽离 staff 通用鉴权工具：
  - `public/js/shared/staff-auth.js`

## 阶段 2（已完成）

- 已把 `admin/kitchen/finance/index/recovery` 的脚本外置到：
  - `public/js/admin/main.js`
  - `public/js/kitchen/main.js`
  - `public/js/finance/main.js`
  - `public/js/index/main.js`
- 已统一 staff 鉴权与语言存取到：
  - `public/js/shared/staff-auth.js`

## 阶段 3（已完成）

- `server.js` 已拆分为路由模块：
  - `routes/auth.js`
  - `routes/business.js`
  - `routes/finance.js`
  - `routes/ops.js`
  - `routes/orders.js`
- 通用能力已抽到 `lib`：
  - `lib/db-utils.js`
  - `lib/ops-utils.js`
- 路由路径保持兼容，降低回归风险。

## 重构原则

- URL 与 API 保持兼容，不影响当前店员操作。
- 每阶段完成后做一次完整回归：
  - 下单 -> 出菜 -> 结账 -> 封账 -> 自检。
- 不做跨阶段大改，避免“重构和新功能混在一起”。
