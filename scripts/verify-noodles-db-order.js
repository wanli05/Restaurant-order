const sqlite3 = require("sqlite3").verbose();

const expected = [
  "麻辣烫",
  "麻辣香锅",
  "麻辣米线",
  "麻辣方便面",
  "麻辣拌面",
  "麻辣乌冬面",
  "土豆粉",
  "牛筋面",
  "大盘鸡拌面",
  "酸辣粉",
  "板面",
  "酸辣小面",
  "麻辣小面",
  "卤煮",
  "牛肉面",
  "牛肉乌冬",
  "牛肉米线",
  "𰻝𰻝面",
  "鸡汤米线",
  "鸭血粉丝汤",
  "担担面",
  "海鲜汤面",
  "鸡肉面",
  "肥肠面",
  "排骨面",
  "蔬菜汤面",
  "豚骨拉面",
];

const db = new sqlite3.Database("./orders.db");
db.all(
  "SELECT id, name_zh, image FROM menu WHERE category = ? ORDER BY id ASC",
  ["noodles"],
  (err, rows) => {
    if (err) {
      console.error(err.message);
      process.exit(1);
    }
    const actual = rows.map((r) => r.name_zh);
    let ok = actual.length === expected.length;
    const mismatches = [];
    for (let i = 0; i < Math.max(actual.length, expected.length); i++) {
      if (actual[i] !== expected[i]) {
        ok = false;
        mismatches.push({
          index: i + 1,
          expected: expected[i] ?? "(无)",
          actual: actual[i] ?? "(无)",
          id: rows[i]?.id,
        });
      }
    }
    console.log("面类条数:", rows.length, "期望:", expected.length);
    console.log(ok ? "✓ 顺序与 scripts/update-noodles-from-brochure.js 完全一致" : "✗ 顺序不一致");
    if (!ok) {
      console.log("差异明细:");
      mismatches.slice(0, 30).forEach((m) => {
        console.log(`  #${m.index} id=${m.id ?? "-"} 期望=${m.expected} 实际=${m.actual}`);
      });
    }
    console.log("\n当前库中顺序 (id | name_zh):");
    rows.forEach((r) => console.log(`  ${r.id}\t${r.name_zh}`));
    db.close();
    process.exit(ok ? 0 : 1);
  },
);
