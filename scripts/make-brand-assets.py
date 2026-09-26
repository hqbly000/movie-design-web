# -*- coding: utf-8 -*-
"""交点影视品牌资产加工：
原始 logo（14285x3309 透明底，深色文字+红色点缀）→
1. logo-on-dark.png   反白版（暖白文字 + 保留红色），用于暗色官网
2. logo-on-light.png  原色版（深色文字 + 红色），用于明亮管理后台
3. favicon.png        左侧光圈图标裁出，反白后放在深色圆角方块上
"""
from PIL import Image, ImageDraw
from collections import Counter

SRC = r"C:\Users\admin\xwechat_files\hqbly000_f86a\temp\RWTemp\2026-09\d68c54527cafcfdf923ac70a5f6b6411.png"
FE_PUB = r"D:\Dev\DevCode_wornary\jiaodian\frontend\public"
AD_PUB = r"D:\Dev\DevCode_wornary\jiaodian\admin\public"

WARM_WHITE = (244, 240, 232)  # 官网相纸暖白 #F4F0E8

im = Image.open(SRC).convert("RGBA")
im = im.crop(im.getchannel("A").getbbox())
print("cropped:", im.size)

# ---- 颜色分布（确定文字色/红色阈值）----
cnt = Counter()
px = im.load()
for y in range(0, im.size[1], 24):
    for x in range(0, im.size[0], 24):
        r, g, b, a = px[x, y]
        if a > 200:
            cnt[(r // 32 * 32, g // 32 * 32, b // 32 * 32)] += 1
print("top colors:", cnt.most_common(6))

def recolor_light(img):
    """深色文字 → 暖白；红色点缀保留。边缘半透明像素颜色同步替换。"""
    out = img.copy()
    p = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = p[x, y]
            if a == 0:
                continue
            is_red = r > 110 and r > g * 1.6 and r > b * 1.6
            if not is_red:
                p[x, y] = (WARM_WHITE[0], WARM_WHITE[1], WARM_WHITE[2], a)
    return out

# ---- 1/2. 横版 logo（宽 1200）----
light = recolor_light(im)
logo_w = 1200
logo_h = round(im.size[1] * logo_w / im.size[0])
light.resize((logo_w, logo_h), Image.LANCZOS).save(
    FE_PUB + r"\images\logo-on-dark.png", optimize=True)
im.resize((logo_w, logo_h), Image.LANCZOS).save(
    AD_PUB + r"\logo-on-light.png", optimize=True)
print("logo:", logo_w, "x", logo_h)

# ---- 3. favicon：取最左侧第一块连续内容（光圈图标）----
alpha = im.getchannel("A")
w, h = im.size
step = max(1, w // 3000)
col_has = [False] * w
ap = alpha.load()
for x in range(0, w, step):
    for y in range(0, h, 8):
        if ap[x, y] > 30:
            col_has[x] = True
            break
runs, start = [], None
for x in range(w):
    if col_has[x] and start is None:
        start = x
    elif not col_has[x] and start is not None:
        runs.append((start, x))
        start = None
if start is not None:
    runs.append((start, w))
# 光圈图标由多条细环组成，环间小空隙会把列段切碎；把间隙 < 3% 宽度的段合并成簇
merged = [list(runs[0])]
for s, e in runs[1:]:
    if s - merged[-1][1] < w * 0.03:
        merged[-1][1] = e
    else:
        merged.append([s, e])
print("clusters:", merged[:4])
icon = im.crop((merged[0][0], 0, merged[0][1], h))
icon = icon.crop(icon.getchannel("A").getbbox())
print("icon:", icon.size)

icon_l = recolor_light(icon)
side = 512
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
mask = Image.new("L", (side, side), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, side - 1, side - 1], radius=112, fill=255)
bg = Image.new("RGBA", (side, side), (18, 18, 18, 255))
canvas.paste(bg, (0, 0), mask)
inner = round(side * 0.74)
icon_sq = Image.new("RGBA", (inner, inner), (0, 0, 0, 0))
iw, ih = icon_l.size
scale = min(inner / iw, inner / ih)
icon_rs = icon_l.resize((round(iw * scale), round(ih * scale)), Image.LANCZOS)
icon_sq.paste(icon_rs, ((inner - icon_rs.size[0]) // 2, (inner - icon_rs.size[1]) // 2), icon_rs)
canvas.alpha_composite(icon_sq, ((side - inner) // 2, (side - inner) // 2))
canvas.save(FE_PUB + r"\favicon.png", optimize=True)
canvas.save(AD_PUB + r"\favicon.png", optimize=True)
print("favicon 512 saved")

# ---- 预览图（自检用）：暗底反白 logo + 亮底原色 logo ----
prev = Image.new("RGB", (1240, 620), (10, 10, 10))
prev.paste(light.resize((1200, logo_h), Image.LANCZOS), (20, 20), light.resize((1200, logo_h), Image.LANCZOS))
dark_on_light = im.resize((1200, logo_h), Image.LANCZOS)
light_bg = Image.new("RGB", (1240, logo_h + 40), (245, 245, 247))
prev2 = Image.new("RGB", (1240, 620 + logo_h + 40), (255, 255, 255))
prev2.paste(prev, (0, 0))
prev2.paste(light_bg, (0, 620))
prev2.paste(dark_on_light, (20, 640), dark_on_light)
prev2.save(r"D:\Dev\DevCode_wornary\jiaodian\scripts\_brand_preview.png")
print("preview saved")
