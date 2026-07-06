from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-39c01339-26fd-4bbc-b9fd-c19befb93d5d.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\street_food_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"


# 左半区（街头小吃）12 道菜
DISHES = [
    "soy_milk",
    "douhua",
    "liangpi",
    "grilled_northeastern_cold_noodles",
    "meat_pie",
    "fried_sesame_balls",
    "korean_cold_noodles",
    "yakisoba",
    "chinese_tea_egg",
    "lamb_offal_soup",
    "beef_soup",
    "century_egg_congee",
]

# 来源图是 6 列 x 4 行网格，左 3 列对应街头小吃。
COL_RANGES_LEFT = [
    (5, 161),
    (174, 331),
    (344, 499),
]
ROW_RANGES = [
    (8, 114),
    (146, 252),
    (284, 390),
    (422, 528),
]

# 默认全局参数，可按编号逐步微调。
GLOBAL_X_OFFSET = 0
GLOBAL_TOP_TRIM = 0
GLOBAL_BOTTOM_TRIM = 0

X_OFFSET_BY_INDEX = {
    1: -4,
    2: -4,
    3: -4,
    4: -4,
    5: -4,
    6: -4,
    7: -3,
    8: -3,
    9: -3,
    10: -3,
    11: -3,
    12: -3,
}
Y_OFFSET_BY_INDEX = {
    1: -12,
    2: -12,
    3: -12,
    4: -6,
    5: -6,
    6: -6,
}
TOP_TRIM_DELTA_BY_INDEX = {
    1: 2,
    2: 2,
    3: 2,
    4: 3,
    5: 3,
    6: 3,
    7: 2,
    8: 2,
    9: 2,
    10: 10,
    11: 10,
    12: 10,
}
BOTTOM_TRIM_DELTA_BY_INDEX = {
    1: 12,
    2: 12,
    3: 12,
    4: 12,
    5: 12,
    6: 12,
    7: 11,
    8: 11,
    9: 11,
    10: 6,
    11: 6,
    12: 6,
}

RIGHT_TRIM_BY_INDEX = {
    10: 3,
    11: 3,
    12: 3,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    crops = []
    idx = 1
    for row_idx, (y1, y2) in enumerate(ROW_RANGES):
        for col_idx, (x1, x2) in enumerate(COL_RANGES_LEFT):
            dish_name = DISHES[(row_idx * len(COL_RANGES_LEFT)) + col_idx]
            x_offset = GLOBAL_X_OFFSET + X_OFFSET_BY_INDEX.get(idx, 0)
            y_offset = Y_OFFSET_BY_INDEX.get(idx, 0)
            top_trim = GLOBAL_TOP_TRIM + TOP_TRIM_DELTA_BY_INDEX.get(idx, 0)
            bottom_trim = GLOBAL_BOTTOM_TRIM + BOTTOM_TRIM_DELTA_BY_INDEX.get(idx, 0)
            right_trim = RIGHT_TRIM_BY_INDEX.get(idx, 0)
            crop = image.crop(
                (
                    x1 + 2 + x_offset,
                    y1 + 2 + top_trim + y_offset,
                    x2 - 2 - right_trim + x_offset,
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
