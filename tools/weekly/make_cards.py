"""Daily Aliyah image cards (1080x1350), two designs x two languages.
Usage: python3 -I make_cards.py OUTDIR LOGO week.json
Writes <parashah>-aliyah-N-design-{A,B}[-af].jpg
A = dark night-and-gold card (also used as the website/Telegram/Facebook preview), B = light paper card."""
import sys, json, re, random, datetime
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT, LOGO, DATA = sys.argv[1:4]
G = "/usr/share/fonts/truetype/google-fonts/"
HEBF = "/usr/share/fonts/truetype/freefont/FreeSerif.ttf"
HEBFB = "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf"
W, H = 1080, 1350

def font(path, size, var=None):
    f = ImageFont.truetype(path, size)
    if var: f.set_variation_by_name(var)
    return f

HEB = re.compile(r"[֐-׿]+")

def runs(word):
    """split a word into (text, is_hebrew) runs"""
    out, i = [], 0
    for m in HEB.finditer(word):
        if m.start() > i: out.append((word[i:m.start()], False))
        out.append((m.group(0), True)); i = m.end()
    if i < len(word): out.append((word[i:], False))
    return out

def word_w(word, f, hf):
    return sum((hf if h else f).getlength(t, direction="rtl" if h else None) for t, h in runs(word))

def wrap(text, f, hf, maxw):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if cur and line_w(t, f, hf) > maxw: lines.append(cur); cur = w
        else: cur = t
    if cur: lines.append(cur)
    return lines

def line_w(line, f, hf):
    sp = f.getlength(" ")
    ws = line.split(" ")
    return sum(word_w(w, f, hf) for w in ws) + sp * (len(ws) - 1)

def draw_line(d, line, f, hf, y, fill, hoff=0):
    x = (W - line_w(line, f, hf)) / 2
    sp = f.getlength(" ")
    for w in line.split(" "):
        for t, h in runs(w):
            if h:
                d.text((x, y + hoff), t, font=hf, fill=fill, direction="rtl")
                x += hf.getlength(t, direction="rtl")
            else:
                d.text((x, y), t, font=f, fill=fill); x += f.getlength(t)
        x += sp

def block(d, text, f, hf, y, maxw, lh, fill, hoff=0):
    for ln in wrap(text, f, hf, maxw):
        draw_line(d, ln, f, hf, y, fill, hoff); y += lh
    return y

def spaced(d, text, f, y, fill, track):
    w = sum(f.getlength(c) for c in text) + track * (len(text) - 1)
    x = (W - w) / 2
    for c in text:
        d.text((x, y), c, font=f, fill=fill); x += f.getlength(c) + track

def noise(im, amt):
    random.seed(7)
    n = Image.effect_noise((W, H), 40).convert("L")
    return Image.blend(im, Image.merge("RGB", (n, n, n)), amt)

def bg_dark():
    im = Image.new("RGB", (W, H), "#17120e"); px = im.load()
    for y in range(H):
        for x in range(0, W):
            dx, dy = (x - W / 2) / W, (y - 330) / H
            t = min(1, (dx * dx * 1.6 + dy * dy * 1.9) ** .5 * 1.25)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip((100, 72, 40), (24, 19, 14)))
    return noise(im, .05)

def bg_light():
    im = Image.new("RGB", (W, H), "#f4efe6"); px = im.load()
    for y in range(H):
        for x in range(W):
            dx, dy = (x - W / 2) / W, (y - H / 2) / H
            t = min(1, (dx * dx + dy * dy) ** .5 * 1.1)
            px[x, y] = tuple(int(a + (b - a) * t) for a, b in zip((248, 244, 236), (232, 224, 210)))
    return noise(im, .04)

DAYS = {"en": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SHABBAT", "SUNDAY"],
        "af": ["MAANDAG", "DINSDAG", "WOENSDAG", "DONDERDAG", "VRYDAG", "SHABBAT", "SONDAG"]}
MONTHS = {"en": "JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER".split(),
          "af": "JANUARIE FEBRUARIE MAART APRIL MEI JUNIE JULIE AUGUSTUS SEPTEMBER OKTOBER NOVEMBER DESEMBER".split()}
ORD = {"en": ["1ST", "2ND", "3RD", "4TH", "5TH", "6TH", "7TH"], "af": ["1STE", "2DE", "3DE", "4DE", "5DE", "6DE", "7DE"]}

def datestr(d, L):
    dt = datetime.date.fromisoformat(d)
    return f"{DAYS[L][dt.weekday()]} {dt.day} {MONTHS[L][dt.month - 1]} {dt.year}"

logo = Image.open(LOGO).convert("RGBA")
BGA, BGB = bg_dark(), bg_light()

def fit_hook(text, path, var, hpath, maxw, maxh, start):
    s = start
    while True:
        f = font(path, s, var); hf = font(hpath, int(s * 1.05))
        n = len(wrap(text, f, hf, maxw))
        if n * s * 1.42 <= maxh or s <= 34: return f, hf, s
        s -= 2

def card_a(a, L):
    c = a[L]; im = BGA.copy(); d = ImageDraw.Draw(im)
    lg = logo.copy(); lg.thumbnail((340, 290)); im.paste(lg, ((W - lg.width) // 2, 100), lg)
    gold, cream = (217, 180, 106), (243, 234, 217)
    d.line([(380, 452), (700, 452)], fill=gold, width=2)
    spaced(d, f"ALIYAH {a['aliyah']}", font(G + "Poppins-Medium.ttf", 54), 490, gold, 10)
    spaced(d, f"PARASHAT {a['parashah'].upper()}  ·  {a['ref'].upper()}", font(G + "Poppins-Regular.ttf", 23), 568, (207, 195, 176), 2)
    f, hf, s = fit_hook(c["hook"], G + "Lora-Italic-Variable.ttf", "Medium Italic", HEBF, 820, 300, 46)
    y = block(d, c["hook"], f, hf, 650, 820, int(s * 1.38), cream, hoff=int(s * .08))
    y += 28; d.line([(380, y), (700, y)], fill=gold, width=2); y += 42
    bf = font(G + "Lora-Italic-Variable.ttf", 31, "Italic"); bhf = font(HEBF, 32)
    block(d, c["blessing"], bf, bhf, y, 560, 46, (191, 178, 158), hoff=2)
    spaced(d, f"{datestr(a['date'], L)}  ·  THEWAYDERECH.CO.ZA", font(G + "Poppins-Regular.ttf", 22), 1258, (183, 170, 149), 2)
    return im

def card_b(a, L):
    c = a[L]; im = BGB.copy(); d = ImageDraw.Draw(im)
    lg = logo.copy(); lg.thumbnail((200, 200)); im.paste(lg, ((W - lg.width) // 2, 84), lg)
    red, ink, grey, gold = (166, 30, 28), (29, 26, 23), (92, 84, 76), (176, 138, 62)
    spaced(d, f"{ORD[L][a['aliyah'] - 1]} ALIYAH", font(G + "Poppins-Bold.ttf", 36), 330, red, 8)
    spaced(d, f"PARASHAT {a['parashah'].upper()}  ·  {a['ref'].upper()}", font(G + "Poppins-Regular.ttf", 23), 390, grey, 2)
    f, hf, s = fit_hook(c["hook"], G + "Lora-Variable.ttf", "Bold", HEBFB, 860, 460, 56)
    y = block(d, c["hook"], f, hf, 470, 860, int(s * 1.32), ink, hoff=int(s * .06))
    y += 30; d.line([(470, y), (610, y)], fill=gold, width=3); y += 40
    bf = font(G + "Lora-Italic-Variable.ttf", 32, "Italic"); bhf = font(HEBF, 33)
    block(d, c["blessing"], bf, bhf, y, 640, 48, grey, hoff=2)
    d.line([(90, 1220), (990, 1220)], fill=(214, 204, 188), width=1)
    spaced(d, f"{datestr(a['date'], L)}  ·  THEWAYDERECH.CO.ZA", font(G + "Poppins-Medium.ttf", 22), 1250, grey, 2)
    return im

week = json.load(open(DATA))
slug = week[0]["parashah"].lower()
for a in week:
    for L in ("en", "af"):
        sfx = "-af" if L == "af" else ""
        card_a(a, L).save(f"{OUT}/{slug}-aliyah-{a['aliyah']}-design-A{sfx}.jpg", quality=90)
        card_b(a, L).save(f"{OUT}/{slug}-aliyah-{a['aliyah']}-design-B{sfx}.jpg", quality=90)
    print("cards", a["aliyah"])
