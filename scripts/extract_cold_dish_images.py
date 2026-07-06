from pathlib import Path
from PIL import Image


SOURCE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets\c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_f3b2622c6edfb8d777a3c311ff15ee92-759fb82a-079d-4746-a162-d857b3de11ff.png"
)
TARGET_DIR = Path(r"C:\Users\Yang\Desktop\Restaurant-order\public\images")

# (left, top, right, bottom)
CROPS = [
    ("cold_salted_cabbage.png", (27, 98, 253, 196)),
    ("cold_edamame.png", (271, 98, 495, 196)),
    ("cold_marinated_chicken_gizzard.png", (519, 98, 749, 196)),
    ("cold_red_cooked_chicken.png", (763, 38, 989, 196)),
    ("cold_kimchi.png", (27, 245, 180, 340)),
    ("cold_century_egg_tofu.png", (185, 245, 338, 340)),
    ("cold_black_fungus_salad.png", (343, 245, 495, 340)),
    ("cold_soy_braised_beef_shank.png", (521, 245, 674, 340)),
    ("cold_marinated_beef_tripe.png", (680, 245, 834, 340)),
    ("cold_marinated_beef.png", (839, 245, 992, 340)),
    ("cold_fried_peanuts.png", (27, 399, 180, 492)),
    ("cold_shredded_dried_tofu_salad.png", (185, 399, 338, 492)),
    ("cold_spring_rolls.png", (343, 399, 495, 492)),
    ("cold_soy_braised_pig_trotters.png", (521, 399, 674, 492)),
    ("cold_marinated_pork_feet.png", (680, 399, 834, 492)),
    ("cold_marinated_pork_ear.png", (839, 399, 992, 492)),
    ("cold_french_fries.png", (27, 553, 180, 645)),
    ("cold_taiwan_sausage.png", (185, 553, 338, 645)),
    ("cold_japanese_rolled_omelette.png", (343, 553, 495, 645)),
    ("cold_soy_braised_chicken_feet.png", (521, 553, 674, 645)),
    ("cold_marinated_boneless_chicken_feet.png", (680, 553, 834, 645)),
    ("cold_sichuan_garlic_pork_slices.png", (839, 553, 992, 645)),
]


def main() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    image = Image.open(SOURCE)
    for filename, box in CROPS:
        cropped = image.crop(box)
        cropped.save(TARGET_DIR / filename)
    print(f"Saved {len(CROPS)} images to {TARGET_DIR}")


if __name__ == "__main__":
    main()
