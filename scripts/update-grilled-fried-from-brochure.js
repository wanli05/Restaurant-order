const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./orders.db");

const grilledFriedItems = [
  ["烤牡蛎", "焼き力キ", "Grilled Oyster", 1000, "grilled_fried", "grilled_oyster.png"],
  ["炸臭豆腐(黑)", "揚げ臭い豆腐(黒)", "Deep-Fried Black Stinky Tofu (Black)", 800, "grilled_fried", "grilled_stinky_tofu_black.png"],
  ["炸臭豆腐(白)", "揚げ臭い豆腐(白)", "Deep-Fried Black Stinky Tofu (White)", 800, "grilled_fried", "grilled_stinky_tofu_white.png"],
  ["羊肉串", "ラム肉串焼き", "Grilled Lamb", 200, "grilled_fried", "grilled_lamb_skewer.png"],
  ["烤猪蹄", "焼き豚足", "Grilled Pork Feet", 500, "grilled_fried", "grilled_pork_feet.png"],
  ["烤大虾", "焼き大海老", "Grilled Prawn", 200, "grilled_fried", "grilled_prawn_skewer.png"],
  ["鸡肉串", "鶏肉串焼き", "Grilled Chicken Thigh", 150, "grilled_fried", "grilled_chicken_thigh_skewer.png"],
  ["鸡皮串", "鶏皮串焼き", "Grilled Chicken Skin", 150, "grilled_fried", "grilled_chicken_skin_skewer.png"],
  ["砂肝串", "砂肝串焼き", "Grilled Chicken Gizzard", 150, "grilled_fried", "grilled_chicken_gizzard_skewer.png"],
  ["鱿鱼串", "イカ串焼き", "Grilled Squid Skewers", 200, "grilled_fried", "grilled_squid_skewer.png"],
  ["烤面筋", "面筋串焼き", "Grilled Gluten", 300, "grilled_fried", "grilled_gluten_skewer.png"],
  ["烤实蛋", "シータン串焼き", "Grilled Solid Egg", 300, "grilled_fried", "grilled_seitan_egg_skewer.png"],
  ["炸香肠", "ソーセージ揚げ", "Fried Sausages", 500, "grilled_fried", "fried_sausage.png"],
  ["炸大虾", "海老唐揚げ", "Fried Prawn", 600, "grilled_fried", "fried_prawn.png"],
  ["炸鸡块", "鶏の唐揚げ", "Fried Chicken", 600, "grilled_fried", "fried_chicken.png"],
  ["炸鱿鱼须", "イカゲソ唐揚げ", "Fried Squid legs", 650, "grilled_fried", "fried_squid_legs.png"],
];

db.serialize(() => {
  db.run("BEGIN TRANSACTION");
  db.run("DELETE FROM menu WHERE category = ?", ["grilled_fried"]);

  const stmt = db.prepare(
    "INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)",
  );

  grilledFriedItems.forEach((item) => stmt.run(item));
  stmt.finalize((insertErr) => {
    if (insertErr) {
      console.error("写入串烧&炸物菜单失败:", insertErr.message);
      db.run("ROLLBACK");
      db.close();
      process.exit(1);
      return;
    }
    db.run("COMMIT", (commitErr) => {
      if (commitErr) {
        console.error("提交串烧&炸物菜单失败:", commitErr.message);
        db.run("ROLLBACK");
        db.close();
        process.exit(1);
        return;
      }
      db.get(
        "SELECT COUNT(*) AS count FROM menu WHERE category = ?",
        ["grilled_fried"],
        (countErr, row) => {
          if (countErr) {
            console.error("统计串烧&炸物菜单失败:", countErr.message);
            db.close();
            process.exit(1);
            return;
          }
          console.log(`串烧&炸物菜单更新完成，共 ${row.count} 条`);
          db.close();
        },
      );
    });
  });
});

