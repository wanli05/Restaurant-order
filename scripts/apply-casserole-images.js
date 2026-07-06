const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "artifacts", "casserole_preview");
const EXTRA_SRC_DIR = path.join(ROOT, "artifacts", "casserole_extra_preview");
const DST_DIR = path.join(ROOT, "public", "images");

const KEEP_FILES = [
  "casserole_large_intestines.png",
  "casserole_crayfish.png",
  "casserole_tofu.png",
  "casserole_honeycomb_tripe.png",
  "casserole_pork_ribs.png",
  "casserole_braised_pork_belly.png",
  "casserole_duck_blood_jelly.png",
  "casserole_beef.png",
  "casserole_chicken.png",
  "casserole_oyster.png",
  "casserole_clams.png",
  "casserole_pork_feet.png",
  "casserole_vermicelli.png",
  "casserole_prawn.png",
  "casserole_spicy_blood_curd.png",
  "casserole_chicken_feet.png",
  "casserole_beef_tendon.png",
  "casserole_enoki.png",
  "casserole_beef_enoki.png",
];

function copyApprovedImages() {
  const groups = [
    {
      dir: EXTRA_SRC_DIR,
      files: [
        "casserole_large_intestines.png",
        "casserole_crayfish.png",
        "casserole_tofu.png",
      ],
    },
    {
      dir: SRC_DIR,
      files: [
        "casserole_honeycomb_tripe.png",
        "casserole_pork_ribs.png",
        "casserole_braised_pork_belly.png",
        "casserole_duck_blood_jelly.png",
        "casserole_beef.png",
        "casserole_chicken.png",
        "casserole_oyster.png",
        "casserole_clams.png",
        "casserole_pork_feet.png",
        "casserole_vermicelli.png",
        "casserole_prawn.png",
        "casserole_spicy_blood_curd.png",
        "casserole_chicken_feet.png",
        "casserole_beef_tendon.png",
        "casserole_enoki.png",
        "casserole_beef_enoki.png",
      ],
    },
  ];
  groups.forEach((group) => {
    group.files.forEach((filename, idx) => {
      const src = path.join(group.dir, `${String(idx + 1).padStart(2, "0")}_${filename}`);
      const dst = path.join(DST_DIR, filename);
      if (!fs.existsSync(src)) {
        throw new Error(`missing preview crop: ${src}`);
      }
      fs.copyFileSync(src, dst);
    });
  });
}

function cleanupExtraCasseroleImages() {
  const keep = new Set(KEEP_FILES);
  const files = fs.readdirSync(DST_DIR);
  files.forEach((file) => {
    if (!file.startsWith("casserole_")) return;
    if (keep.has(file)) return;
    fs.unlinkSync(path.join(DST_DIR, file));
  });
}

function main() {
  copyApprovedImages();
  cleanupExtraCasseroleImages();
  console.log("Applied casserole images and cleaned extras.");
}

main();

