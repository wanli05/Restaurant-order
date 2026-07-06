from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-7844f142-1949-4722-b9f7-6435b1a0f32b.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\noodles_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"


# 6 列 x 4 行（仅切图片区域，不含文字）
COL_RANGES = [
    (0, 171),
    (171, 341),
    (341, 512),
    (512, 683),
    (683, 853),
    (853, 1024),
]
ROW_RANGES = [
    (0, 96),
    (145, 241),
    (289, 385),
    (434, 530),
]

DISHES = [
    "noodles_beef_udon",
    "noodles_beef_soup_rice_noodles",
    "noodles_biang_biang_noodles",
    "spicy_instant_noodles",
    "spicy_hot_pot",
    "spicy_mixed_noodles",
    "noodles_chicken_soup_rice_noodles",
    "noodles_duck_blood_vermicelli_soup",
    "noodles_tantanmen",
    "spicy_udon_noodles",
    "spicy_potato_starch_noodles",
    "spicy_chewy_noodles",
    "noodles_seafood_noodles",
    "noodles_chicken_noodles",
    "noodles_large_intestine_noodles",
    "spicy_chicken_noodles",
    "spicy_hot_sour_glass_noodles",
    "spicy_sword_shaved_noodles",
    "noodles_pork_ribs_noodles",
    "noodles_vegetable_noodle_soup",
    "noodles_pork_bone_ramen",
    "spicy_hot_sour_noodles",
    "spicy_mala_noodles",
    "spicy_braised_pork_offal_stew_noodles",
]

BASE_TRIM = 3
X_OFFSET_BY_INDEX = {
    1: -10,
    2: -10,
    3: -10,
    7: -10,
    8: -10,
    13: -10,
    14: -10,
    15: -10,
    19: -10,
    21: -10,
    29: -10,
    4: 10,
    5: 10,
    6: 10,
    10: 10,
    11: 10,
    12: 10,
    16: 10,
    17: 10,
    18: 10,
    22: 10,
    23: 10,
    24: 10,
    9: -4,
    20: -4,
}
LEFT_TRIM_BY_INDEX = {
    1: 7,
    4: 5,
    7: 7,
    19: 7,
    22: 5,
    2: 5,
    3: 3,
    5: 4,
    8: 5,
    10: 5,
    11: 4,
    14: 4,
    15: 3,
    16: 5,
    17: 3,
    21: 3,
    23: 3,
    6: 3,
    12: 2,
    13: 6,
}
RIGHT_TRIM_BY_INDEX = {
    1: 2,
    2: 3,
    3: 5,
    4: 3,
    5: 5,
    8: 3,
    10: 3,
    11: 3,
    14: 3,
    15: 5,
    16: 3,
    17: 5,
    21: 5,
    22: 3,
    23: 5,
    9: 12,
    20: 10,
    6: 7,
    7: 2,
    12: 8,
    13: 2,
    19: 2,
    18: 8,
    24: 8,
}
Y_OFFSET_BY_INDEX = {i: -3 for i in range(1, 25)}
TOP_EXPAND_BY_INDEX = {
    4: 1,
}

Y_DELTA_BY_INDEX = {
    4: 1,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    crops = []
    idx = 1
    for row_idx, (y1, y2) in enumerate(ROW_RANGES):
        for col_idx, (x1, x2) in enumerate(COL_RANGES):
            dish_name = DISHES[(row_idx * len(COL_RANGES)) + col_idx]
            x_offset = X_OFFSET_BY_INDEX.get(idx, 0)
            crop = image.crop(
                (
                    x1 + BASE_TRIM + x_offset + LEFT_TRIM_BY_INDEX.get(idx, 0),
                    y1 + BASE_TRIM + Y_OFFSET_BY_INDEX.get(idx, 0) + Y_DELTA_BY_INDEX.get(idx, 0) - TOP_EXPAND_BY_INDEX.get(idx, 0),
                    x2 - BASE_TRIM + x_offset - RIGHT_TRIM_BY_INDEX.get(idx, 0),
                    y2 - BASE_TRIM + Y_OFFSET_BY_INDEX.get(idx, 0) + Y_DELTA_BY_INDEX.get(idx, 0),
                )
            )
            crop_name = f"{idx:02d}_{dish_name}.png"
            crop.save(OUTPUT_DIR / crop_name, optimize=True)
            crops.append((idx, dish_name, crop))
            idx += 1

    thumb_w = 190
    thumb_h = 155
    gap = 8
    cols = 4
    rows = (len(crops) + cols - 1) // cols
    sheet = Image.new(
        "RGB",
        (cols * (thumb_w + gap) + gap, rows * (thumb_h + gap) + gap),
        "#f1f5f9",
    )
    draw = ImageDraw.Draw(sheet)

    for i, (num, dish_name, crop) in enumerate(crops):
        r = i // cols
        c = i % cols
        px = gap + c * (thumb_w + gap)
        py = gap + r * (thumb_h + gap)
        fitted = crop.resize((thumb_w, 112))
        sheet.paste(fitted, (px, py))
        draw.rectangle((px, py, px + thumb_w, py + thumb_h), outline="#94a3b8", width=1)
        draw.rectangle((px, py + 112, px + thumb_w, py + thumb_h), fill="#ffffff")
        draw.text((px + 6, py + 120), f"{num:02d}. {dish_name}", fill="#0f172a")

    sheet.save(SHEET_PATH, optimize=True)
    print(f"Generated {len(crops)} crops")
    print(f"Preview sheet: {SHEET_PATH}")


if __name__ == "__main__":
    main()

