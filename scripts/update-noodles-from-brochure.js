const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./orders.db");

const noodlesItems = [
  ["麻辣烫", "マーラータン", "Malatang", 900, "noodles", "spicy_malatang.png"],
  ["麻辣香锅", "マーラージャンゴオ", "Spicy Hot Pot", 1000, "noodles", "spicy_hot_pot.png"],
  ["麻辣米线", "マーラー米ヌードル", "Spicy Rice Noodles", 900, "noodles", "spicy_rice_noodles.png"],
  ["麻辣方便面", "マーラインスタントラーメン", "Spicy Instant Noodles", 900, "noodles", "spicy_instant_noodles.png"],
  ["麻辣拌面", "マーラーまぜ麺", "Spicy Mixed Noodles", 1000, "noodles", "spicy_mixed_noodles.png"],
  ["麻辣乌冬面", "マーラーうどん", "Spicy Udon Noodles", 900, "noodles", "spicy_udon_noodles.png"],
  ["土豆粉", "ジャガイモ麺", "Potato Starch Noodles", 900, "noodles", "spicy_potato_starch_noodles.png"],
  ["牛筋面", "まぜもちもち麺", "Chewy Noodles", 900, "noodles", "spicy_chewy_noodles.png"],
  ["大盘鸡拌面", "鶏肉と野菜あんかけ麺", "Spicy Chicken with Noodles", 1000, "noodles", "spicy_chicken_noodles.png"],
  ["酸辣粉", "サンラー春雨", "Hot and Sour Glass Noodles", 900, "noodles", "spicy_hot_sour_glass_noodles.png"],
  ["板面", "板麺", "Sword Shaved Noodles", 1000, "noodles", "spicy_sword_shaved_noodles.png"],
  ["酸辣小面", "重慶サンラー麺", "Hot and Sour Noodles", 1000, "noodles", "spicy_hot_sour_noodles.png"],
  ["麻辣小面", "重慶マーラー麺", "Mala Noodles", 1000, "noodles", "spicy_mala_noodles.png"],
  ["卤煮", "煮物麺", "Braised Pork Offal Stew Noodles", 1000, "noodles", "spicy_braised_pork_offal_stew_noodles.png"],
  ["牛肉面", "牛肉麺", "Beef Noodles", 900, "noodles", "noodles_beef_noodles.png"],
  ["牛肉乌冬", "牛肉うどん", "Beef Udon", 900, "noodles", "noodles_beef_udon.png"],
  ["牛肉米线", "牛肉米ヌードル", "Beef Soup Rice Noodles", 900, "noodles", "noodles_beef_soup_rice_noodles.png"],
  ["𰻝𰻝面", "ビャンビャン麺", "Biang Biang Noodles", 900, "noodles", "noodles_biang_biang_noodles.png"],
  ["鸡汤米线", "鶏スープ米ヌードル", "Chicken Soup Rice Noodles", 900, "noodles", "noodles_chicken_soup_rice_noodles.png"],
  ["鸭血粉丝汤", "鴨の血と春雨スープ", "Duck Blood Vermicelli Soup", 1000, "noodles", "noodles_duck_blood_vermicelli_soup.png"],
  ["担担面", "担々麺", "Tantanmen", 1000, "noodles", "noodles_tantanmen.png"],
  ["海鲜汤面", "海鮮タンメン", "Seafood Noodles", 1000, "noodles", "noodles_seafood_noodles.png"],
  ["鸡肉面", "鶏肉麺", "Chicken Noodles", 1000, "noodles", "noodles_chicken_noodles.png"],
  ["肥肠面", "豚ホルモン麺", "Large Intestine Noodles", 900, "noodles", "noodles_large_intestine_noodles.png"],
  ["排骨面", "パイコウ麺", "Pork Ribs Noodles", 1000, "noodles", "noodles_pork_ribs_noodles.png"],
  ["蔬菜汤面", "野菜タンメン", "Vegetable Noodle Soup", 1000, "noodles", "noodles_vegetable_noodle_soup.png"],
  ["豚骨拉面", "豚骨ラーメン", "Pork Bone Ramen", 1000, "noodles", "noodles_pork_bone_ramen.png"],
];

db.serialize(() => {
  db.run("BEGIN TRANSACTION");
  db.run("DELETE FROM menu WHERE category = ?", ["noodles"]);

  const stmt = db.prepare(
    "INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)",
  );

  noodlesItems.forEach((item) => stmt.run(item));
  stmt.finalize((insertErr) => {
    if (insertErr) {
      console.error("写入面类菜单失败:", insertErr.message);
      db.run("ROLLBACK");
      db.close();
      process.exit(1);
      return;
    }
    db.run("COMMIT", (commitErr) => {
      if (commitErr) {
        console.error("提交面类菜单失败:", commitErr.message);
        db.run("ROLLBACK");
        db.close();
        process.exit(1);
        return;
      }
      db.get(
        "SELECT COUNT(*) AS count FROM menu WHERE category = ?",
        ["noodles"],
        (countErr, row) => {
          if (countErr) {
            console.error("统计面类菜单失败:", countErr.message);
            db.close();
            process.exit(1);
            return;
          }
          console.log(`面类菜单更新完成，共 ${row.count} 条`);
          db.close();
        },
      );
    });
  });
});

