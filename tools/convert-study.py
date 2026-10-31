"""Convert one study PDF (made in Word) into structured blocks + extracted images.
Usage: python3 convert.py in.pdf out_dir slug
Writes out_dir/<slug>.json (blocks) and out_dir/img-N.<ext>."""
import sys, os, re, json, html
import pymupdf as fitz

pdf, out, slug = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
doc = fitz.open(pdf)

BOOKS = r"(Bereshit|Bereishit|Shemoth|Shemot|Vayiqra|Wayyiqra|Bemidbar|Bamidbar|Devarim|Debarim|Yehoshua|Shophetim|Shofetim|Shemu|Melakim|Melachim|Yeshayahu|Yirmeyahu|Yehezqel|Yeḥezqěl|Hoshea|Yo|Amos|Ovadyah|Yonah|Mikah|Nahum|Habaqquq|Tsephanyah|Haggai|Zekaryah|Malachi|Malakhi|Tehillim|Mishle|Iyov|Iyob|Shir|Ruth|Eikah|Qoheleth|Ester|Daniel|Ezra|Nehemyah|Dibre|Mattithyahu|Mattityahu|Marqos|Mark|Luqas|Luke|Yochanan|Yohanan|Ma|Romiyim|Romans|Qorintiyim|Galatiyim|Eph|Pilipiyim|Qolasiyim|Tas|Timotiyos|Titos|Pilemon|Ivrim|Ib|Hebrews|Ya|Kepha|Kěpha|Yehudah|Hazon|Ḥazon|Revelation|Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Isaiah|Jeremiah|Ezekiel|Psalm|Psalms|Proverbs|Matthew|John|Acts|Colossians|1|2|3)"
REF_RE = re.compile(r"^(" + BOOKS + r")[^\n]{0,60}?\d+(:\d+[\d\-–,: ]*)?\s*$")

HEB = re.compile(r"[\u0590-\u05FF\uFB1D-\uFB4F]+")
def fixheb(t): return HEB.sub(lambda m: m.group(0)[::-1], t)

def span_html(s):
    t = html.escape(fixheb(s["text"]))
    if not t.strip(): return t
    bold = "Bold" in s["font"] or (s["flags"] & 16)
    ital = "Italic" in s["font"] or (s["flags"] & 2)
    red = s["color"] in (0xff0000, 0xc00000, 0xee0000)
    if ital: t = f"<em>{t}</em>"
    if bold: t = f"<strong>{t}</strong>"
    if red: t = f'<span class="hl">{t}</span>'
    return t

items = []  # (page, y, kind, payload)
img_no = 0
for pno, page in enumerate(doc):
    d = page.get_text("dict")
    for b in d["blocks"]:
        y = b["bbox"][1]
        if b["type"] == 1:  # image
            w, h = b["width"], b["height"]
            if w < 40 or h < 40: continue
            img_no += 1
            ext = b.get("ext", "png")
            fn = f"img-{img_no}.{ext}"
            open(os.path.join(out, fn), "wb").write(b["image"])
            items.append((pno, y, "img", {"src": fn, "w": w, "h": h}))
            continue
        lines = []
        for l in b["lines"]:
            spans = [s for s in l["spans"]]
            txt = fixheb("".join(s["text"] for s in spans))
            if not txt.strip(): continue
            lines.append({"text": txt, "html": "".join(span_html(s) for s in spans),
                          "size": max(s["size"] for s in spans if s["text"].strip()),
                          "big": sum(len(s["text"]) for s in spans if s["size"] >= 19),
                          "n": sum(len(s["text"]) for s in spans),
                          "bold": all(("Bold" in s["font"] or s["flags"] & 16) for s in spans if s["text"].strip()),
                          "x": l["bbox"][0]})
        if not lines: continue
        items.append((pno, y, "text", lines))
    # images drawn as page XObjects but not in text dict (rare): ignore

items.sort(key=lambda t: (t[0], t[1]))

def join_lines(ls, key):
    out = ""
    for l in ls:
        piece = l[key].rstrip()
        if not out: out = piece; continue
        if out.endswith("-") and not out.endswith(" -"): out += piece.lstrip()
        else: out += " " + piece.lstrip()
    return out.strip()

blocks = []
for pno, y, kind, payload in items:
    if kind == "img":
        blocks.append({"t": "img", **payload}); continue
    lines = payload
    text = join_lines(lines, "text").strip()
    h = join_lines(lines, "html")
    size = max(l["size"] for l in lines)
    allbold = all(l["bold"] for l in lines)
    big = sum(l["big"] for l in lines); n = sum(l["n"] for l in lines) or 1
    if size >= 19 and big / n >= 0.6 and len(text) < 160:
        blocks.append({"t": "h1" if size >= 23 else "h2", "text": text}); continue
    if text in ("•", "") : continue
    if re.match(r"^[•●▪\-–]\s*", text) or lines[0]["text"].strip() in ("•", "●"):
        blocks.append({"t": "li", "html": re.sub(r"^(\s*(<[^>]+>)*)\s*[•●▪]\s*", r"\1", h)}); continue
    if allbold and len(text) < 90 and REF_RE.match(text):
        blocks.append({"t": "ref", "text": text}); continue
    if allbold and len(text) < 120 and not text.endswith((".", ",", ";")):
        blocks.append({"t": "h3", "text": text}); continue
    blocks.append({"t": "p", "html": h, "text": text})

# merge paragraphs split across a page break (previous p does not end a sentence)
merged = []
for b in blocks:
    if (b["t"] == "p" and merged and merged[-1]["t"] == "p"
            and not re.search(r"[.!?:”\"’)\]]\s*$", merged[-1]["text"])
            and b["text"][:1].islower()):
        merged[-1]["html"] += " " + b["html"]; merged[-1]["text"] += " " + b["text"]
    else:
        merged.append(b)

# scripture passages: paragraphs right after a reference heading become quotes until the next heading/ref
in_q = False
for b in merged:
    if b["t"] == "ref": in_q = True; continue
    if b["t"] in ("h1", "h2", "h3", "img", "li"): in_q = False; continue
    if b["t"] == "p" and in_q:
        if re.match(r"^\s*(\d+([\-–]\d+)?\s|“|\")", b["text"]):
            b["t"] = "q"
        else:
            in_q = False

json.dump({"slug": slug, "pages": len(doc), "blocks": merged}, open(os.path.join(out, f"{slug}.json"), "w"), ensure_ascii=False, indent=1)
from collections import Counter
print(slug, len(doc), "pages", Counter(b["t"] for b in merged), "images", img_no)
