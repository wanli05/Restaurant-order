from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-39c01339-26fd-4bbc-b9fd-c19befb93d5d.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\dim_sum_rice_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"


# 仅右半区（点心・饭类）12 道菜
DISHES = [
    "dumplings",
    "potstickers",
    "fried_chinese_leek_dumplings",
    "hot_sour_dumpling_soup",
    "wonton",
    "marinated_wonton",
    "scallion_pancake",
    "chinese_flaky_pancake",
    "beef_fried_rice",
    "crispy_chicken_chop_rice",
    "mapo_tofu_rice",
    "fried_rice",
]

# 来源图为 6 列 x 4 行网格，右 3 列对应点心饭类。
COL_RANGES_RIGHT = [
    (519, 676),
    (689, 846),
    (859, 1016),
]
ROW_RANGES = [
    (8, 114),
    (146, 252),
    (284, 390),
    (422, 528),
]

GLOBAL_X_OFFSET = 5
GLOBAL_TOP_TRIM = 6
GLOBAL_BOTTOM_TRIM = 6

X_OFFSET_BY_INDEX = {
    1: 4,
    2: 4,
    4: 4,
    5: 4,
    7: 3,
    8: 3,
    10: 3,
    11: 3,
}

Y_OFFSET_BY_INDEX = {
    1: -18,
    2: -18,
    3: -18,
    4: -11,
    5: -11,
    6: -11,
    7: -7,
    8: -7,
    9: -7,
    10: 0,
    11: 0,
    12: 0,
}

TOP_TRIM_DELTA_BY_INDEX = {
    1: 3,
    2: 3,
    3: 3,
    7: 2,
    8: 2,
    9: 2,
    10: 3,
    11: 3,
    12: 3,
}

BOTTOM_TRIM_DELTA_BY_INDEX = {
    7: -3,
    8: -3,
    9: -3,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    crops = []
    idx = 1
    for row_idx, (y1, y2) in enumerate(ROW_RANGES):
        for col_idx, (x1, x2) in enumerate(COL_RANGES_RIGHT):
            dish_name = DISHES[(row_idx * len(COL_RANGES_RIGHT)) + col_idx]
            x_offset = GLOBAL_X_OFFSET + X_OFFSET_BY_INDEX.get(idx, 0)
            y_offset = Y_OFFSET_BY_INDEX.get(idx, 0)
            top_trim = GLOBAL_TOP_TRIM + TOP_TRIM_DELTA_BY_INDEX.get(idx, 0)
            bottom_trim = GLOBAL_BOTTOM_TRIM + BOTTOM_TRIM_DELTA_BY_INDEX.get(idx, 0)

            crop = image.crop(
                (
                    x1 + 2 + x_offset,
                    y1 + 2 + top_trim + y_offset,
                    x2 - 2 + x_offset,
                    y2 - 2 - bottom_trim + y_offset,
                )
            )
            crop_name = f"{idx:02d}_{dish_name}.png"
            crop.save(OUTPUT_DIR / crop_name, optimize=True)
            crops.append((idx, dish_name, crop))
            idx += 1

    thumb_w = 230
    thumb_h = 170
    gap = 10
    cols = 3
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
        fitted = crop.resize((thumb_w, 128))
        sheet.paste(fitted, (px, py))
        draw.rectangle((px, py, px + thumb_w, py + thumb_h), outline="#94a3b8", width=1)
        draw.rectangle((px, py + 128, px + thumb_w, py + thumb_h), fill="#ffffff")
        draw.text((px + 8, py + 136), f"{num:02d}. {dish_name}", fill="#0f172a")

    sheet.save(SHEET_PATH, optimize=True)
    print(f"Generated {len(crops)} crops")
    print(f"Preview sheet: {SHEET_PATH}")


if __name__ == "__main__":
    main()
