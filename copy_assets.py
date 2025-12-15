import shutil
import os

src_m = r"C:/Users/pc/.gemini/antigravity/brain/651450d1-0847-4225-8d4e-996b16b937e5/male_team_avatar_1765822060148.png"
dst_m = r"C:/Users/pc/.gemini/antigravity/scratch/partner/assets/avatar_m.png"

src_f = r"C:/Users/pc/.gemini/antigravity/brain/651450d1-0847-4225-8d4e-996b16b937e5/female_team_avatar_1765822075480.png"
dst_f = r"C:/Users/pc/.gemini/antigravity/scratch/partner/assets/avatar_f.png"

try:
    shutil.copy(src_m, dst_m)
    print("Copied male avatar")
except Exception as e:
    print(f"Error copying male: {e}")

try:
    shutil.copy(src_f, dst_f)
    print("Copied female avatar")
except Exception as e:
    print(f"Error copying female: {e}")
