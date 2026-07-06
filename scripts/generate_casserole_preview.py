from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-0344fc23-9972-4712-86e2-fa817767c631.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\casserole_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"


# 4x4 网格（仅裁图区域，不含下方文字）
COL_RANGES = [
    (0, 190),
    (190, 381),
    (381, 572),
    (572, 763),
]
ROW_RANGES = [
    (0, 132),
    (223, 355),
    (446, 578),
    (670, 802),
]

DISHES = [
    "casserole_honeycomb_tripe",
    "casserole_pork_ribs",
    "casserole_braised_pork_belly",
    "casserole_duck_blood_jelly",
    "casserole_beef",
    "casserole_chicken",
    "casserole_oyster",
    "casserole_clams",
    "casserole_pork_feet",
    "casserole_vermicelli",
    "casserole_prawn",
    "casserole_spicy_blood_curd",
    "casserole_chicken_feet",
    "casserole_beef_tendon",
    "casserole_enoki",
    "casserole_beef_enoki",
]

BASE_TRIM = 3
LEFT_TRIM_BY_INDEX = {
    4: 5,
    8: 5,
    12: 5,
    16: 5,
    3: 2,
    7: 2,
    11: 2,
    15: 2,
}
RIGHT_TRIM_BY_INDEX = {
    1: 7,
    5: 7,
    9: 7,
    13: 7,
    2: 4,
    6: 4,
    10: 4,
    14: 4,
    3: 2,
    7: 2,
    11: 2,
    15: 2,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    crops = []
    idx = 1
    for row_idx, (y1, y2) in enumerate(ROW_RANGES):
        for col_idx, (x1, x2) in enumerate(COL_RANGES):
            dish_name = DISHES[(row_idx * len(COL_RANGES)) + col_idx]
            left = x1 + BASE_TRIM + LEFT_TRIM_BY_INDEX.get(idx, 0)
            top = y1 + BASE_TRIM
            right = x2 - BASE_TRIM - RIGHT_TRIM_BY_INDEX.get(idx, 0)
            bottom = y2 - BASE_TRIM
            crop = image.crop((left, top, right, bottom))
            crop_name = f"{idx:02d}_{dish_name}.png"
            crop.save(OUTPUT_DIR / crop_name, optimize=True)
            crops.append((idx, dish_name, crop))
            idx += 1

    thumb_w = 230
    thumb_h = 170
    gap = 10
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

