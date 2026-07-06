from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-19a480f0-d390-4306-b8ab-ffadf87d59ef.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\cold_dish_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"


DISHES = [
    "kimchi",
    "century_egg_tofu",
    "black_fungus_salad",
    "soy_braised_beef_shank",
    "marinated_beef_tripe",
    "marinated_beef",
    "fried_peanuts",
    "shredded_dried_tofu_salad",
    "spring_rolls",
    "soy_braised_pig_trotters",
    "marinated_pork_feet",
    "marinated_pork_ear",
    "french_fries",
    "taiwan_sausage",
    "japanese_rolled_omelette",
    "soy_braised_chicken_feet",
    "marinated_boneless_chicken_feet",
    "sichuan_garlic_pork_slices",
]

# 该图为 6x3 的规则网格。此前 y2 取值偏大，带入了文字区域；
# 这里将每行高度收紧到“仅菜图”范围。
COL_RANGES = [
    (5, 161),
    (174, 331),
    (344, 499),
    (519, 676),
    (689, 846),
    (859, 1016),
]
ROW_RANGES = [
    (8, 110),
    (172, 274),
    (335, 437),
]

# 每个编号的底部额外收紧像素（仅向上收，避免带入文字）
# 规则来自人工校准：
# 1/2/6 不变；3/4/5 收紧 2px；其余收紧 4px。
BOTTOM_TRIM_BY_INDEX = {
    1: 0,
    2: 0,
    3: 2,
    4: 2,
    5: 2,
    6: 0,
    7: 4,
    8: 4,
    9: 4,
    10: 4,
    11: 4,
    12: 4,
    13: 4,
    14: 4,
    15: 4,
    16: 4,
    17: 4,
    18: 4,
}

# 横向微调：负数表示往左偏移。
X_OFFSET_BY_INDEX = {
    3: -2,
    4: 7,
    5: 4,
    9: -1,
    10: 6,
    11: 4,
    16: 7,
    17: 4,
}

# 纵向微调：正数表示往下偏移（顶部向下，底部同向下）。
Y_OFFSET_BY_INDEX = {
    9: -1,
    10: -2,
    13: -4,
    14: -4,
    15: -4,
    16: -5,
    17: -5,
    18: -5,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    crops = []
    idx = 1
    for row_idx, (y1, y2) in enumerate(ROW_RANGES):
        for col_idx, (x1, x2) in enumerate(COL_RANGES):
            dish_name = DISHES[(row_idx * len(COL_RANGES)) + col_idx]
            extra_bottom_trim = BOTTOM_TRIM_BY_INDEX.get(idx, 0)
            x_offset = X_OFFSET_BY_INDEX.get(idx, 0)
            y_offset = Y_OFFSET_BY_INDEX.get(idx, 0)
            # 内缩边框 + 按编号做底部精细收紧，避免文字残留。
            crop = image.crop(
                (
                    x1 + 2 + x_offset,
                    y1 + 2 + y_offset,
                    x2 - 2 + x_offset,
                    y2 - 2 - extra_bottom_trim + y_offset,
                )
            )
            crop_name = f"{idx:02d}_{dish_name}.png"
            crop.save(OUTPUT_DIR / crop_name, optimize=True)
            crops.append((idx, dish_name, crop))
            idx += 1

    # 输出编号预览总图，便于人工校验与微调。
    thumb_w = 220
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
