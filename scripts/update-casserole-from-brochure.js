const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./orders.db");

const casseroleItems = [
  ["毛血旺", "毛血旺", "Chongqing style boiled Blood Curd", 1000, "casserole", "casserole_spicy_blood_curd.png"],
  ["砂锅小龙虾", "ザリガニ鍋", "Crayfish Casserole", 1000, "casserole", "casserole_crayfish.png"],
  ["砂锅鸭血", "鴨の血鍋", "Duck Blood Jelly Casserole", 1000, "casserole", "casserole_duck_blood_jelly.png"],
  ["砂锅鸡肉", "鶏肉鍋", "Chicken Casserole", 1000, "casserole", "casserole_chicken.png"],
  ["砂锅牡蛎", "カキ鍋", "Oyster Casserole", 1200, "casserole", "casserole_oyster.png"],
  ["砂锅肥肠", "ホルモン鍋", "Large Intestines Casserole", 1000, "casserole", "casserole_large_intestines.png"],
  ["砂锅豆腐", "豆腐鍋", "Tofu Casserole", 800, "casserole", "casserole_tofu.png"],
  ["砂锅牛肚", "ハチノス鍋", "Honeycomb Tripe Casserole", 1000, "casserole", "casserole_honeycomb_tripe.png"],
  ["砂锅排骨", "パイコツ鍋", "Pork Ribs Casserole", 1000, "casserole", "casserole_pork_ribs.png"],
  ["砂锅红烧肉", "豚角煮鍋", "Braised Pork Belly Casserole", 1000, "casserole", "casserole_braised_pork_belly.png"],
  ["砂锅牛肉", "牛肉鍋", "Beef Casserole", 1000, "casserole", "casserole_beef.png"],
  ["砂锅蛤蜊", "アサリ鍋", "Clams Casserole", 800, "casserole", "casserole_clams.png"],
  ["砂锅猪蹄", "豚足鍋", "Pork Feet Casserole", 800, "casserole", "casserole_pork_feet.png"],
  ["砂锅粉丝", "春雨鍋", "Vermicelli Casserole", 800, "casserole", "casserole_vermicelli.png"],
  ["砂锅大虾", "大海老鍋", "Prawn Casserole", 1200, "casserole", "casserole_prawn.png"],
  ["砂锅鸡爪", "もみじ鍋", "Chicken Feet Casserole", 1000, "casserole", "casserole_chicken_feet.png"],
  ["砂锅牛筋", "牛足すじ鍋", "Beef Tendon Casserole", 1000, "casserole", "casserole_beef_tendon.png"],
  ["砂锅金针菇", "エノキ鍋", "Enoki Casserole", 800, "casserole", "casserole_enoki.png"],
  ["砂锅牛肉金针菇", "牛肉エノキ鍋", "Beef Enoki Casserole", 1000, "casserole", "casserole_beef_enoki.png"],
];

db.serialize(() => {
  db.run("BEGIN TRANSACTION");
  db.run("DELETE FROM menu WHERE category = ?", ["casserole"]);

  const stmt = db.prepare(
    "INSERT INTO menu (name_zh, name_ja, name_en, price, category, image, is_available) VALUES (?, ?, ?, ?, ?, ?, 1)",
  );

  casseroleItems.forEach((item) => stmt.run(item));
  stmt.finalize((insertErr) => {
    if (insertErr) {
      console.error("写入锅类菜单失败:", insertErr.message);
      db.run("ROLLBACK");
      db.close();
      process.exit(1);
      return;
    }
    db.run("COMMIT", (commitErr) => {
      if (commitErr) {
        console.error("提交锅类菜单失败:", commitErr.message);
        db.run("ROLLBACK");
        db.close();
        process.exit(1);
        return;
      }
      db.get(
        "SELECT COUNT(*) AS count FROM menu WHERE category = ?",
        ["casserole"],
        (countErr, row) => {
          if (countErr) {
            console.error("统计锅类菜单失败:", countErr.message);
            db.close();
            process.exit(1);
            return;
          }
          console.log(`锅类菜单更新完成，共 ${row.count} 条`);
          db.close();
        },
      );
    });
  });
});

