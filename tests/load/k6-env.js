/** k6 初始化阶段加载；open() 路径相对于执行 `k6 run` 时的当前工作目录（请从项目根目录运行 npm run test:load*）。 */
export const TABLES = JSON.parse(open("./tests/load/k6-shared.json")).allowedTableIds;
