const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./orders.db");

const coldDishItems = [
  ["盐味包菜", "塩キャベツ", "Salted Cabbage", 600, "cold_dish", "cold_salted_cabbage.png"],
  ["毛豆", "枝豆", "Edamame", 400, "cold_dish", "cold_edamame.png"],
  ["拌鸡胗", "砂肝和え", "Marinated Chicken Gizzard", 600, "cold_dish", "cold_marinated_chicken_gizzard.png"],
  ["烧鸡(整只)", "鶏の丸焼き(一羽)", "Red Cooked Chicken (Whole)", 1200, "cold_dish", "cold_red_cooked_chicken.png"],
  ["烧鸡(半只)", "鶏の丸焼き(半羽)", "Red Cooked Chicken (Half)", 600, "cold_dish", "cold_red_cooked_chicken.png"],
  ["辣白菜", "キムチ", "Kimchi", 400, "cold_dish", "cold_kimchi.png"],
  ["皮蛋豆腐", "ピータン豆腐", "Century Egg Tofu", 600, "cold_dish", "cold_century_egg_tofu.png"],
  ["拌木耳", "キクラゲ和え", "Black Fungus Salad", 500, "cold_dish", "cold_black_fungus_salad.png"],
  ["酱牛腱", "牛スネ醤油煮", "Soy-braised Beef Shank", 1000, "cold_dish", "cold_soy_braised_beef_shank.png"],
  ["拌牛肚", "ハチノス和え", "Marinated Beef Tripe", 800, "cold_dish", "cold_marinated_beef_tripe.png"],
  ["拌牛肉", "牛肉和え", "Marinated Beef", 1000, "cold_dish", "cold_marinated_beef.png"],
  ["炸花生米", "揚げピーナッツ", "Fried Peanuts", 400, "cold_dish", "cold_fried_peanuts.png"],
  ["拌豆干丝", "干し豆腐和え", "Shredded Dried Tofu Salad", 550, "cold_dish", "cold_shredded_dried_tofu_salad.png"],
  ["春卷", "春巻き", "Spring Rolls", 400, "cold_dish", "cold_spring_rolls.png"],
  ["酱猪蹄", "豚足", "Soy-braised Pig Trotters", 300, "cold_dish", "cold_soy_braised_pig_trotters.png"],
  ["拌猪蹄", "豚足和え", "Marinated Pork Feet", 600, "cold_dish", "cold_marinated_pork_feet.png"],
  ["拌猪耳", "豚ミミ和え", "Marinated Pork Ear", 600, "cold_dish", "cold_marinated_pork_ear.png"],
  ["炸薯条", "ポテトフライ", "French Fries", 500, "cold_dish", "cold_french_fries.png"],
  ["台湾香肠", "台湾腸詰め", "Taiwan Sausage", 300, "cold_dish", "cold_taiwan_sausage.png"],
  ["日式鸡蛋卷", "玉子焼き", "Japanese Rolled Omelette", 500, "cold_dish", "cold_japanese_rolled_omelette.png"],
  ["酱鸡爪", "鶏もみじ", "Soy-braised Chicken Feet", 800, "cold_dish", "cold_soy_braised_chicken_feet.png"],
  ["拌脱骨鸡爪", "骨なし鶏もみじ和え", "Marinated Boneless Chicken Feet", 800, "cold_dish", "cold_marinated_boneless_chicken_feet.png"],
  ["蒜泥白肉", "豚肉のニンニクソースかけ", "Sichuan Garlic Pork Slices", 600, "cold_dish", "cold_sichuan_garlic_pork_slices.png"],
];

db.serialize(() => {
  db.run("DELETE FROM menu", [], (deleteErr) => {
    if (deleteErr) {
      console.error("删除旧菜单失败:", deleteErr.message);
      process.exit(1);
    }

    const stmt = db.prepare(
      "INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)",
    );
    coldDishItems.forEach((item) => stmt.run(item));
    stmt.finalize((insertErr) => {
      if (insertErr) {
        console.error("导入前菜菜单失败:", insertErr.message);
        process.exit(1);
      }
      db.get("SELECT COUNT(*) AS count FROM menu", [], (countErr, row) => {
        if (countErr) {
          console.error("查询菜单数量失败:", countErr.message);
          process.exit(1);
        }
        console.log(`已导入前菜菜单 ${row.count} 条`);
        db.close();
      });
    });
  });
});
