from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-2d00b94b-f305-4166-90db-4fa0c16b8950.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\grilled_fried_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"


# 图片区域（仅裁图，不含文字）
# 该页版式：第 1 行 3 个；第 2~4 行各 4 个，共 15 个
COL_RANGES = [
    (0, 188),
    (190, 380),
    (382, 571),
    (573, 763),
]
ROW_RANGES = [
    (0, 132),
    (223, 355),
    (446, 578),
    (670, 802),
]

DISHES = [
    "grilled_stinky_tofu_black",
    "grilled_stinky_tofu_white",
    "grilled_lamb_skewer",
    "grilled_pork_feet",
    "grilled_prawn_skewer",
    "grilled_chicken_thigh_skewer",
    "grilled_chicken_skin_skewer",
    "grilled_chicken_gizzard_skewer",
    "grilled_squid_skewer",
    "grilled_gluten_skewer",
    "grilled_seitan_egg_skewer",
    "fried_sausage",
    "fried_prawn",
    "fried_chicken",
    "fried_squid_legs",
]

BASE_TRIM = 3
LEFT_TRIM_BY_INDEX = {
    7: 5,
    10: 5,
    11: 5,
    14: 5,
    15: 5,
    6: 3,
}
RIGHT_TRIM_BY_INDEX = {
    4: 5,
    5: 5,
    8: 5,
    9: 5,
    12: 5,
    13: 5,
}
BOTTOM_EXTEND_BY_INDEX = {
    4: 4,
    5: 4,
    6: 4,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    slots = []
    # 第 1 行 3 个
    for col in [0, 1, 2]:
        slots.append((0, col))
    # 后 3 行各 4 个
    for row in [1, 2, 3]:
        for col in [0, 1, 2, 3]:
            slots.append((row, col))

    crops = []
    for idx, dish_name in enumerate(DISHES, start=1):
        row_idx, col_idx = slots[idx - 1]
        x1, x2 = COL_RANGES[col_idx]
        y1, y2 = ROW_RANGES[row_idx]
        left = x1 + BASE_TRIM + LEFT_TRIM_BY_INDEX.get(idx, 0)
        top = y1 + BASE_TRIM
        right = x2 - BASE_TRIM - RIGHT_TRIM_BY_INDEX.get(idx, 0)
        bottom = y2 - BASE_TRIM + BOTTOM_EXTEND_BY_INDEX.get(idx, 0)
        crop = image.crop((left, top, right, bottom))
        crop_name = f"{idx:02d}_{dish_name}.png"
        crop.save(OUTPUT_DIR / crop_name, optimize=True)
        crops.append((idx, dish_name, crop))

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

