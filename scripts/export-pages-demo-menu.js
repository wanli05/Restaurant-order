const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "orders.db");
const outPath = path.join(__dirname, "..", "public", "demo", "menu.full.json");

const db = new sqlite3.Database(dbPath);

db.all(
  "SELECT id, name_zh, name_ja, name_en, price, category, image, drink_section FROM menu WHERE is_available = 1 ORDER BY id",
  [],
  (err, rows) => {
    if (err) {
      console.error("导出失败:", err.message || err);
      db.close();
      process.exit(1);
    }
    const result = (rows || []).map((row) => ({
      id: row.id,
      name: {
        zh: row.name_zh || "",
        ja: row.name_ja || "",
        en: row.name_en || "",
      },
      price: Number(row.price) || 0,
      category: row.category || "other",
      image: row.image || "",
      drinkSection: row.drink_section || "",
    }));
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(`导出完成: ${outPath} (${result.length} 项)`);
    db.close();
  },
);
