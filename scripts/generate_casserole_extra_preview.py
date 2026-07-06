from pathlib import Path
from PIL import Image, ImageDraw


SOURCE_IMAGE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_image-192aaf45-4616-4da1-9eee-03fc6e1f60d1.png"
)
OUTPUT_DIR = Path(r"c:\Users\Yang\Desktop\Restaurant-order\artifacts\casserole_extra_preview")
SHEET_PATH = OUTPUT_DIR / "preview_sheet.png"

DISHES = [
    "casserole_large_intestines",
    "casserole_crayfish",
    "casserole_tofu",
]

COL_RANGES = [
    (0, 191),
    (191, 382),
    (382, 574),
]
ROW_RANGE = (0, 132)
BASE_TRIM = 3
LEFT_TRIM_BY_INDEX = {
    2: 2,
    3: 6,
}
RIGHT_TRIM_BY_INDEX = {
    1: 6,
    2: 2,
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE_IMAGE).convert("RGB")

    crops = []
    for idx, dish_name in enumerate(DISHES, start=1):
        x1, x2 = COL_RANGES[idx - 1]
        y1, y2 = ROW_RANGE
        left = x1 + BASE_TRIM + LEFT_TRIM_BY_INDEX.get(idx, 0)
        top = y1 + BASE_TRIM
        right = x2 - BASE_TRIM - RIGHT_TRIM_BY_INDEX.get(idx, 0)
        bottom = y2 - BASE_TRIM
        crop = image.crop((left, top, right, bottom))
        crop_name = f"{idx:02d}_{dish_name}.png"
        crop.save(OUTPUT_DIR / crop_name, optimize=True)
        crops.append((idx, dish_name, crop))

    thumb_w = 230
    thumb_h = 170
    gap = 10
    cols = 3
    rows = 1
    sheet = Image.new(
        "RGB",
        (cols * (thumb_w + gap) + gap, rows * (thumb_h + gap) + gap),
        "#f1f5f9",
    )
    draw = ImageDraw.Draw(sheet)

    for i, (num, dish_name, crop) in enumerate(crops):
        c = i % cols
        px = gap + c * (thumb_w + gap)
        py = gap
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

