const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "artifacts", "noodles_preview");
const DST_DIR = path.join(ROOT, "public", "images");

const KEEP_FILES = [
  "spicy_malatang.png",
  "spicy_hot_pot.png",
  "spicy_rice_noodles.png",
  "spicy_instant_noodles.png",
  "spicy_mixed_noodles.png",
  "spicy_udon_noodles.png",
  "spicy_potato_starch_noodles.png",
  "spicy_chewy_noodles.png",
  "spicy_chicken_noodles.png",
  "spicy_hot_sour_glass_noodles.png",
  "spicy_sword_shaved_noodles.png",
  "spicy_hot_sour_noodles.png",
  "spicy_mala_noodles.png",
  "spicy_braised_pork_offal_stew_noodles.png",
  "noodles_beef_noodles.png",
  "noodles_beef_udon.png",
  "noodles_beef_soup_rice_noodles.png",
  "noodles_biang_biang_noodles.png",
  "noodles_chicken_soup_rice_noodles.png",
  "noodles_duck_blood_vermicelli_soup.png",
  "noodles_tantanmen.png",
  "noodles_seafood_noodles.png",
  "noodles_chicken_noodles.png",
  "noodles_large_intestine_noodles.png",
  "noodles_pork_ribs_noodles.png",
  "noodles_vegetable_noodle_soup.png",
  "noodles_pork_bone_ramen.png",
];

const EXTRA_SOURCE_BY_FILENAME = {
  "noodles_beef_noodles.png":
    "c:\\Users\\Yang\\.cursor\\projects\\c-Users-Yang-Desktop-Restaurant-order\\assets\\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-b135c271-5883-41c3-9b50-bd1207c315f2.png",
  "spicy_rice_noodles.png":
    "c:\\Users\\Yang\\.cursor\\projects\\c-Users-Yang-Desktop-Restaurant-order\\assets\\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-152d42b4-983b-4957-a320-5bd3d1be6e81.png",
  "spicy_malatang.png":
    "c:\\Users\\Yang\\.cursor\\projects\\c-Users-Yang-Desktop-Restaurant-order\\assets\\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-4c6c000b-b479-4c9e-a1a8-612721597070.png",
};

function copyApprovedImages() {
  const previewFiles = fs.existsSync(SRC_DIR) ? fs.readdirSync(SRC_DIR) : [];
  KEEP_FILES.forEach((filename, idx) => {
    const numberedSrc = path.join(SRC_DIR, `${String(idx + 1).padStart(2, "0")}_${filename}`);
    const matchedPreview = previewFiles.find((file) => file.endsWith(`_${filename}`));
    const matchedPreviewSrc = matchedPreview ? path.join(SRC_DIR, matchedPreview) : null;
    const fallbackSrc = EXTRA_SOURCE_BY_FILENAME[filename];
    const src = fs.existsSync(numberedSrc)
      ? numberedSrc
      : matchedPreviewSrc && fs.existsSync(matchedPreviewSrc)
        ? matchedPreviewSrc
        : fallbackSrc;
    const dst = path.join(DST_DIR, filename);
    if (!src || !fs.existsSync(src)) {
      throw new Error(`missing source image: ${numberedSrc}`);
    }
    fs.copyFileSync(src, dst);
  });
}

function cleanupExtraNoodleImages() {
  const keep = new Set(KEEP_FILES);
  const files = fs.readdirSync(DST_DIR);
  files.forEach((file) => {
    const isNoodleImage = file.startsWith("noodles_") || file.startsWith("spicy_");
    if (!isNoodleImage) return;
    if (keep.has(file)) return;
    fs.unlinkSync(path.join(DST_DIR, file));
  });
}

function main() {
  copyApprovedImages();
  cleanupExtraNoodleImages();
  console.log("Applied noodles images and cleaned extras.");
}

main();

