const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./orders.db");

const coldDishItems = [
  ["盐味包菜", "塩キャベツ", "Salted Cabbage", 600, "cold_dish", "cold_salted_cabbage.png"],
  ["毛豆", "枝豆", "Edamame", 400, "cold_dish", "cold_edamame.png"],
  ["辣白菜", "キムチ", "Kimchi", 400, "cold_dish", "cold_kimchi.png"],
  ["皮蛋豆腐", "ピータン豆腐", "Century egg tofu", 600, "cold_dish", "cold_century_egg_tofu.png"],
  ["拌木耳", "キクラゲ和え", "Black Fungus Salad", 500, "cold_dish", "cold_black_fungus_salad.png"],
  ["炸花生米", "揚げピーナッツ", "Peanut Fried", 400, "cold_dish", "cold_fried_peanuts.png"],
  [
    "拌豆干丝",
    "干し豆腐和え",
    "Shredded Dried Tofu Salad",
    550,
    "cold_dish",
    "cold_shredded_dried_tofu_salad.png",
  ],
  ["春卷", "春巻き", "Spring rolls", 400, "cold_dish", "cold_spring_rolls.png"],
  ["炸薯条", "ポテトフライ", "French fries", 500, "cold_dish", "cold_french_fries.png"],
  ["台湾香肠", "台湾腸詰め", "Taiwan Sausage", 300, "cold_dish", "cold_taiwan_sausage.png"],
  [
    "日式鸡蛋卷",
    "玉子焼き",
    "Japanese rolled omelette",
    500,
    "cold_dish",
    "cold_japanese_rolled_omelette.png",
  ],
  [
    "拌鸡胗",
    "砂肝和え",
    "Marinated Chicken Gizzard",
    600,
    "cold_dish",
    "cold_marinated_chicken_gizzard.png",
  ],
  ["烧鸡(整只)", "鶏の丸焼き(一羽)", "Red-Cooked Chicken (Whole)", 1200, "cold_dish", "cold_red_cooked_chicken.png"],
  ["烧鸡(半只)", "鶏の丸焼き(半羽)", "Red-Cooked Chicken (Half)", 600, "cold_dish", "cold_red_cooked_chicken.png"],
  ["酱牛肉", "牛スネ醤油煮", "Soy-braised Beef shank", 1000, "cold_dish", "cold_soy_braised_beef_shank.png"],
  ["拌牛肚", "ハチノス和え", "Marinated Beef Tripe", 800, "cold_dish", "cold_marinated_beef_tripe.png"],
  ["拌牛肉", "牛肉和え", "Marinated Beef", 1000, "cold_dish", "cold_marinated_beef.png"],
  ["酱猪蹄", "豚足", "Soy-braised pig trotters", 300, "cold_dish", "cold_soy_braised_pig_trotters.png"],
  ["拌猪蹄", "豚足和え", "Marinated Pork feet", 600, "cold_dish", "cold_marinated_pork_feet.png"],
  ["拌猪耳", "豚ミミ和え", "Marinated Pork ear", 600, "cold_dish", "cold_marinated_pork_ear.png"],
  ["酱鸡爪", "鶏もみじ", "Soy-braised Chicken feet", 800, "cold_dish", "cold_soy_braised_chicken_feet.png"],
  [
    "拌脱骨鸡爪",
    "骨なし鶏もみじ和え",
    "Marinated Boneless chicken feet",
    800,
    "cold_dish",
    "cold_marinated_boneless_chicken_feet.png",
  ],
  [
    "蒜泥白肉",
    "豚肉のニンニクソースかけ",
    "Sichuan Garlic Pork Slices",
    600,
    "cold_dish",
    "cold_sichuan_garlic_pork_slices.png",
  ],
];

db.serialize(() => {
  db.run("BEGIN TRANSACTION");
  db.run("DELETE FROM menu WHERE category = ?", ["cold_dish"]);

  const stmt = db.prepare(
    "INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)",
  );
  coldDishItems.forEach((item) => stmt.run(item));
  stmt.finalize((insertErr) => {
    if (insertErr) {
      console.error("写入前菜菜单失败:", insertErr.message);
      db.run("ROLLBACK");
      db.close();
      process.exit(1);
      return;
    }
    db.run("COMMIT", (commitErr) => {
      if (commitErr) {
        console.error("提交前菜菜单失败:", commitErr.message);
        db.run("ROLLBACK");
        db.close();
        process.exit(1);
        return;
      }
      db.get(
        "SELECT COUNT(*) AS count FROM menu WHERE category = ?",
        ["cold_dish"],
        (countErr, row) => {
          if (countErr) {
            console.error("统计前菜菜单失败:", countErr.message);
            db.close();
            process.exit(1);
            return;
          }
          console.log(`前菜菜单更新完成，共 ${row.count} 条`);
          db.close();
        },
      );
    });
  });
});
