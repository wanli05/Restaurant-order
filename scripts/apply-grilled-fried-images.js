const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "artifacts", "grilled_fried_preview");
const DST_DIR = path.join(ROOT, "public", "images");

const KEEP_FILES = [
  "grilled_oyster.png",
  "grilled_stinky_tofu_black.png",
  "grilled_stinky_tofu_white.png",
  "grilled_lamb_skewer.png",
  "grilled_pork_feet.png",
  "grilled_prawn_skewer.png",
  "grilled_chicken_thigh_skewer.png",
  "grilled_chicken_skin_skewer.png",
  "grilled_chicken_gizzard_skewer.png",
  "grilled_squid_skewer.png",
  "grilled_gluten_skewer.png",
  "grilled_seitan_egg_skewer.png",
  "fried_sausage.png",
  "fried_prawn.png",
  "fried_chicken.png",
  "fried_squid_legs.png",
];

function copyApprovedImages() {
  KEEP_FILES.forEach((filename, idx) => {
    const src = path.join(SRC_DIR, `${String(idx + 1).padStart(2, "0")}_${filename}`);
    const dst = path.join(DST_DIR, filename);
    if (!fs.existsSync(src)) {
      return;
    }
    fs.copyFileSync(src, dst);
  });
}

function cleanupExtraSeriesImages() {
  const keep = new Set(KEEP_FILES);
  const files = fs.readdirSync(DST_DIR);
  files.forEach((file) => {
    const isSeriesImage = file.startsWith("grilled_") || file.startsWith("fried_");
    if (!isSeriesImage) return;
    if (keep.has(file)) return;
    fs.unlinkSync(path.join(DST_DIR, file));
  });
}

function main() {
  copyApprovedImages();
  cleanupExtraSeriesImages();
  console.log("Applied grilled_fried images and cleaned extras.");
}

main();

