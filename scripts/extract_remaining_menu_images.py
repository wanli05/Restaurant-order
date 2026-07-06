from pathlib import Path
from PIL import Image


BASE = Path(
    r"C:\Users\Yang\.cursor\projects\c-Users-Yang-Desktop-Restaurant-order\assets"
)
OUT_DIR = Path(r"C:\Users\Yang\Desktop\Restaurant-order\public\images")

IMG1 = BASE / "c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_0092d289d17a06858a11ac60d7e184e8-4d06529f-0484-4481-929d-d1d6e2a80ce8.png"
IMG2 = BASE / "c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_f1401c50c78874bf20644184ea5491c5-d23f709e-69ca-4a3e-a70f-d827daea51f3.png"
IMG3 = BASE / "c__Users_Yang_AppData_Roaming_Cursor_User_workspaceStorage_f46eea198009bc4fe9d053e8525c45bf_images_6a61ab6b1a4ab94ed4ebde100fc3dbac-7d174c44-dcc0-4916-a10b-ff7994d87dc0.png"

# (filename, image_path, (left, top, right, bottom))
CROPS = [
    # street_food
    ("street_chinese_hamburger.png", IMG1, (304, 46, 501, 146)),
    ("street_soy_milk.png", IMG1, (26, 182, 180, 265)),
    ("street_douhua.png", IMG1, (186, 182, 340, 265)),
    ("street_liangpi.png", IMG1, (345, 182, 500, 265)),
    ("street_grilled_northeastern_cold_noodles.png", IMG1, (26, 271, 180, 354)),
    ("street_meat_pie.png", IMG1, (186, 271, 340, 354)),
    ("street_fried_sesame_balls.png", IMG1, (345, 271, 500, 354)),
    ("street_korean_cold_noodles.png", IMG1, (26, 360, 180, 444)),
    ("street_yakisoba.png", IMG1, (186, 360, 340, 444)),
    ("street_chinese_tea_egg.png", IMG1, (345, 360, 500, 444)),
    ("street_lamb_offal_soup.png", IMG1, (26, 450, 180, 533)),
    ("street_beef_soup.png", IMG1, (186, 450, 340, 533)),
    ("street_century_egg_congee.png", IMG1, (345, 450, 500, 533)),
    # dim_sum_rice
    ("dim_braised_pork_on_rice.png", IMG1, (680, 46, 834, 145)),
    ("dim_pan_fried_soup_dumplings.png", IMG1, (840, 46, 992, 145)),
    ("dim_dumplings.png", IMG1, (520, 182, 674, 265)),
    ("dim_potstickers.png", IMG1, (680, 182, 834, 265)),
    ("dim_fried_chinese_leek_dumplings.png", IMG1, (840, 182, 992, 265)),
    ("dim_hot_sour_dumpling_soup.png", IMG1, (520, 271, 674, 354)),
    ("dim_wonton.png", IMG1, (680, 271, 834, 354)),
    ("dim_marinated_wonton.png", IMG1, (840, 271, 992, 354)),
    ("dim_scallion_pancake.png", IMG1, (520, 360, 674, 444)),
    ("dim_chinese_flaky_pancake.png", IMG1, (680, 360, 834, 444)),
    ("dim_beef_fried_rice.png", IMG1, (840, 360, 992, 444)),
    ("dim_crispy_chicken_chop_rice.png", IMG1, (520, 450, 674, 533)),
    ("dim_mapo_tofu_rice.png", IMG1, (680, 450, 834, 533)),
    ("dim_fried_rice.png", IMG1, (840, 450, 992, 533)),
    # grilled_fried
    ("grilled_oyster.png", IMG2, (345, 45, 500, 145)),
    ("grilled_stinky_tofu_black.png", IMG2, (26, 183, 180, 265)),
    ("grilled_stinky_tofu_white.png", IMG2, (186, 183, 340, 265)),
    ("grilled_lamb_skewer.png", IMG2, (345, 183, 500, 265)),
    ("grilled_pork_feet.png", IMG2, (26, 271, 140, 354)),
    ("grilled_prawn_skewer.png", IMG2, (146, 271, 260, 354)),
    ("grilled_chicken_thigh_skewer.png", IMG2, (266, 271, 380, 354)),
    ("grilled_chicken_skin_skewer.png", IMG2, (386, 271, 500, 354)),
    ("grilled_chicken_gizzard_skewer.png", IMG2, (26, 360, 140, 443)),
    ("grilled_squid_skewer.png", IMG2, (146, 360, 260, 443)),
    ("grilled_gluten_skewer.png", IMG2, (266, 360, 380, 443)),
    ("grilled_seitan_egg_skewer.png", IMG2, (386, 360, 500, 443)),
    ("fried_sausage.png", IMG2, (26, 449, 140, 533)),
    ("fried_prawn.png", IMG2, (146, 449, 260, 533)),
    ("fried_chicken.png", IMG2, (266, 449, 380, 533)),
    ("fried_squid_legs.png", IMG2, (386, 449, 500, 533)),
    # casserole
    ("casserole_large_intestines.png", IMG2, (520, 46, 634, 145)),
    ("casserole_crayfish.png", IMG2, (640, 46, 754, 145)),
    ("casserole_tofu.png", IMG2, (840, 46, 992, 145)),
    ("casserole_honeycomb_tripe.png", IMG2, (520, 182, 634, 265)),
    ("casserole_pork_ribs.png", IMG2, (640, 182, 754, 265)),
    ("casserole_braised_pork_belly.png", IMG2, (760, 182, 874, 265)),
    ("casserole_duck_blood_jelly.png", IMG2, (878, 182, 992, 265)),
    ("casserole_beef.png", IMG2, (520, 271, 634, 354)),
    ("casserole_chicken.png", IMG2, (640, 271, 754, 354)),
    ("casserole_oyster.png", IMG2, (760, 271, 874, 354)),
    ("casserole_clams.png", IMG2, (878, 271, 992, 354)),
    ("casserole_pork_feet.png", IMG2, (520, 360, 634, 443)),
    ("casserole_vermicelli.png", IMG2, (640, 360, 754, 443)),
    ("casserole_prawn.png", IMG2, (760, 360, 874, 443)),
    ("casserole_spicy_blood_curd.png", IMG2, (878, 360, 992, 443)),
    ("casserole_chicken_feet.png", IMG2, (520, 449, 634, 533)),
    ("casserole_beef_tendon.png", IMG2, (640, 449, 754, 533)),
    ("casserole_enoki.png", IMG2, (760, 449, 874, 533)),
    ("casserole_beef_enoki.png", IMG2, (878, 449, 992, 533)),
    # noodles (not spicy)
    ("noodles_beef_udon.png", IMG3, (26, 182, 180, 265)),
    ("noodles_beef_soup_rice_noodles.png", IMG3, (186, 182, 340, 265)),
    ("noodles_biang_biang_noodles.png", IMG3, (345, 182, 500, 265)),
    ("noodles_chicken_soup_rice_noodles.png", IMG3, (26, 271, 180, 354)),
    ("noodles_duck_blood_vermicelli_soup.png", IMG3, (186, 271, 340, 354)),
    ("noodles_tantanmen.png", IMG3, (345, 271, 500, 354)),
    ("noodles_seafood_noodles.png", IMG3, (26, 360, 180, 444)),
    ("noodles_chicken_noodles.png", IMG3, (186, 360, 340, 444)),
    ("noodles_large_intestine_noodles.png", IMG3, (345, 360, 500, 444)),
    ("noodles_pork_ribs_noodles.png", IMG3, (26, 450, 180, 533)),
    ("noodles_vegetable_noodle_soup.png", IMG3, (186, 450, 340, 533)),
    ("noodles_pork_bone_ramen.png", IMG3, (345, 450, 500, 533)),
    # noodles (spicy)
    ("spicy_instant_noodles.png", IMG3, (520, 182, 674, 265)),
    ("spicy_hot_pot.png", IMG3, (680, 182, 834, 265)),
    ("spicy_mixed_noodles.png", IMG3, (840, 182, 992, 265)),
    ("spicy_udon_noodles.png", IMG3, (520, 271, 674, 354)),
    ("spicy_potato_starch_noodles.png", IMG3, (680, 271, 834, 354)),
    ("spicy_chewy_noodles.png", IMG3, (840, 271, 992, 354)),
    ("spicy_chicken_noodles.png", IMG3, (520, 360, 674, 444)),
    ("spicy_hot_sour_glass_noodles.png", IMG3, (680, 360, 834, 444)),
    ("spicy_sword_shaved_noodles.png", IMG3, (840, 360, 992, 444)),
    ("spicy_hot_sour_noodles.png", IMG3, (520, 450, 674, 533)),
    ("spicy_mala_noodles.png", IMG3, (680, 450, 834, 533)),
    ("spicy_braised_pork_offal_stew_noodles.png", IMG3, (840, 450, 992, 533)),
]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for filename, image_path, box in CROPS:
        img = Image.open(image_path)
        img.crop(box).save(OUT_DIR / filename)
    print(f"Saved {len(CROPS)} images to {OUT_DIR}")


if __name__ == "__main__":
    main()
