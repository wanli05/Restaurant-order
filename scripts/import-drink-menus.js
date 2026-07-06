/**
 * 导入「饮料汽水 + 酒水」菜单（对应店内印刷单）。
 * 会先删除 category 为 drink_soft / drink_liquor 的现有行，再插入下列数据（不影响其它大类）。
 *
 * 用法（项目根目录，建议先停 server）：
 *   node scripts/import-drink-menus.js
 */

const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "orders.db");

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this.changes);
    });
  });
}

/** [name_zh, name_ja, name_en, price] */
const SOFT_DRINKS = [
  ["豆浆", "豆乳", "Soymilk", 200],
  ["矿泉水", "ミネラルウォーター", "Mineral water", 150],
  ["绿茶（瓶装）", "緑茶（ペット）", "Green tea (bottled)", 200],
  ["乌龙茶（瓶装）", "烏龍茶（ペット）", "Oolong tea (bottled)", 200],
  ["冰红茶", "レモンティー", "Iced tea", 200],
  ["酸梅汤", "梅ジュース", "Plum juice", 200],
  ["（凉茶）王老吉 310ml 罐", "（リャンチャ）ワンラオジー 310ml 缶", "Wanglaoji herbal tea (310ml can)", 200],
  ["弹珠汽水", "ラムネ", "Ramune", 350],
  ["柚子汁", "グレープフルーツジュース", "Grapefruit juice", 350],
  ["姜汁汽水", "ジンジャエール", "Ginger ale", 350],
  ["橙汁", "オレンジジュース", "Orange juice", 350],
  ["初恋（巨峰葡萄+卡尔皮斯）", "初恋（巨峰＋カルピス）", "Kyoho grape & Calpis mix", 400],
  ["卡尔皮斯苏打", "カルピスソーダ", "Calpis soda", 350],
];

/** section key 须与 public/index.html 中 DRINK_LIQUOR_SECTION_ORDER 一致 */
const LIQUOR = [
  {
    section: "highball",
    rows: [
      ["威士忌嗨棒", "ハイボール", "Whiskey highball", 400],
      ["可乐威士忌嗨棒", "コークハイボール", "Coke highball", 450],
      ["梅子威士忌嗨棒", "男梅ハイボール", "Plum whisky highball", 450],
      ["青苹果威士忌嗨棒", "青リンゴハイボール", "Green apple whisky highball", 450],
      ["柠檬威士忌嗨棒", "レモンハイボール", "Lemon whisky highball", 450],
      ["姜汁威士忌嗨棒", "ジンジャーハイボール", "Ginger whisky highball", 450],
    ],
  },
  {
    section: "shochu",
    rows: [
      ["乌龙茶嗨（烧酒）", "烏龍ハイ", "Oolong tea shochu highball", 400],
      ["绿茶嗨（烧酒）", "緑茶ハイ", "Green tea shochu highball", 400],
      ["烧酒加冰", "焼酎ロック", "Shochu on the rocks", 400],
      ["烧酒水割", "焼酎水割り", "Shochu & water", 400],
      ["烧酒热水割", "焼酎お湯割", "Shochu & hot water", 400],
    ],
  },
  {
    section: "nihonshu",
    rows: [
      ["菊正宗（冷）", "菊正宗（冷）", "Kiku-Masamune (cold)", 600],
      ["菊正宗（热）", "菊正宗（ホット）", "Kiku-Masamune (hot)", 600],
    ],
  },
  {
    section: "sour",
    rows: [
      ["姜汁沙哇", "ジンジャサワー", "Ginger sour", 400],
      ["橙汁沙哇", "オレンジサワー", "Orange sour", 400],
      ["卡尔皮斯沙哇", "カルピスサワー", "Calpis sour", 400],
      ["弹珠汽水沙哇", "ラムネサワー", "Ramune sour", 400],
      ["柠檬沙哇", "レモンサワー", "Lemon sour", 400],
      ["梅子沙哇", "男梅サワー", "Plum sour", 400],
      ["白桃沙哇", "白桃サワー", "White peach sour", 400],
      ["青苹果沙哇", "青リンゴサワー", "Green apple sour", 400],
      ["西柚沙哇", "グレープフルーツサワー", "Grapefruit sour", 400],
      ["巨峰沙哇", "巨峰サワー", "Kyoho grape sour", 400],
    ],
  },
  {
    section: "beer",
    rows: [
      ["朝日 Super Dry（生啤）", "スーパードライ生ビール", "Asahi Super Dry (draft)", 450],
      ["朝日 Super Dry（瓶装）", "スーパードライ瓶ビール", "Asahi Super Dry (bottle)", 500],
      ["青岛啤酒（小瓶）", "チンタオビール（小瓶）", "Tsingtao beer (small bottle)", 450],
    ],
  },
  {
    section: "shaoxing",
    rows: [["绍兴酒", "紹興酒", "Shaoxing wine", 400]],
  },
];

async function main() {
  const db = new sqlite3.Database(dbPath);
  try {
    const cols = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(menu)", [], (err, rows) => (err ? reject(err) : resolve(rows)));
    });
    const hasSection = Array.isArray(cols) && cols.some((c) => c.name === "drink_section");
    if (!hasSection) {
      await run(db, "ALTER TABLE menu ADD COLUMN drink_section TEXT");
      console.log("已补齐 menu.drink_section 列");
    }

    await run(db, "BEGIN IMMEDIATE");
    await run(db, "DELETE FROM menu WHERE category IN ('drink_soft', 'drink_liquor')");

    const sqlSoft = `INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available, drink_section)
      VALUES (?, ?, ?, ?, 'drink_soft', '', 1, NULL)`;
    for (const [zh, ja, en, price] of SOFT_DRINKS) {
      await run(db, sqlSoft, [zh, ja, en, price]);
    }

    const sqlLiq = `INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available, drink_section)
      VALUES (?, ?, ?, ?, 'drink_liquor', '', 1, ?)`;
    for (const group of LIQUOR) {
      for (const [zh, ja, en, price] of group.rows) {
        await run(db, sqlLiq, [zh, ja, en, price, group.section]);
      }
    }

    await run(db, "COMMIT");

    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT SUM(CASE WHEN category='drink_soft' THEN 1 ELSE 0 END) AS soft, SUM(CASE WHEN category='drink_liquor' THEN 1 ELSE 0 END) AS liq FROM menu",
        [],
        (err, r) => (err ? reject(err) : resolve(r)),
      );
    });
    console.log(`OK: drink_soft=${row.soft}, drink_liquor=${row.liq}（税込价格已写入 price）`);
    console.log("重启 Node 后刷新点菜页即可。");
  } catch (e) {
    await run(db, "ROLLBACK").catch(() => {});
    console.error(e.message || e);
    process.exitCode = 1;
  } finally {
    await new Promise((resolve, reject) => {
      db.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

main();
