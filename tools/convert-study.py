"""Convert one study PDF (made in Word) into structured blocks + extracted images.
Usage: python3 convert.py in.pdf out_dir slug
Writes out_dir/<slug>.json (blocks) and out_dir/img-N.<ext>."""
import sys, os, re, json, html
import pymupdf as fitz

pdf, out, slug = sys.argv[1:4]
os.makedirs(out, exist_ok=True)
doc = fitz.open(pdf)

BOOKS = r"(Bereshit|Bereishit|Shemoth|Shemot|Vayiqra|Wayyiqra|Bemidbar|Bamidbar|Devarim|Debarim|Yehoshua|Shophetim|Shofetim|Shemu|Melakim|Melachim|Yeshayahu|Yirmeyahu|Yehezqel|Yeḥezqěl|Hoshea|Yo|Amos|Ovadyah|Yonah|Mikah|Nahum|Habaqquq|Tsephanyah|Haggai|Zekaryah|Malachi|Malakhi|Tehillim|Mishle|Iyov|Iyob|Shir|Ruth|Eikah|Qoheleth|Ester|Daniel|Ezra|Nehemyah|Dibre|Mattithyahu|Mattityahu|Marqos|Mark|Luqas|Luke|Yochanan|Yohanan|Ma|Romiyim|Romans|Qorintiyim|Galatiyim|Eph|Pilipiyim|Qolasiyim|Tas|Timotiyos|Titos|Pilemon|Ivrim|Ib|Hebrews|Ya|Kepha|Kěpha|Yehudah|Hazon|Ḥazon|Revelation|Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Isaiah|Jeremiah|Ezekiel|Psalm|Psalms|Proverbs|Matthew|John|Acts|Colossians|1|2|3)"
BOOK_ANY = re.compile(r"(Gen|Exod|Lev|Num|Deut|Josh|Judg|Ruth|Sam|Kings|Chron|Ezra|Nehem|Esther|Job|Psalm|Prov|Eccl|Song|Isa|Iaiah|Jer|Lam|Ezek|Eze|Dan|Hos|Joel|Amos|Obad|Jonah|Mic|Nah|Hab|Zeph|Hag|Zech|Mal|Matt|Mark|Luke|John|Acts|Rom|Cor|Gal|Eph|Phil|Col|Thess|Tim|Titus|Philem|Heb|James|Pet|Jude|Rev|Bere|Shem|Vayiq|Wayyiq|Bemi|Bami|Devar|Debar|Yehosh|Shoph|Shof|Melak|Melach|Yesha|Yirme|Yeḥez|Yehez|Yechez|Hosh|Yo’el|Yo'el|Ovad|Yonah|Mik|Tsephan|Zekar|Zeḵar|Teh|Mishl|Iyov|Iyob|Qohel|Dani|Dibre|Matti|Marq|Luq|Yoch|Yoh|Ma’as|Ma'as|Romi|Qori|Qorit|Gali|Ephes|Pilip|Philip|Qola|Qolo|Tas|Timot|Pilem|Ivri|Iv’ri|Iḇ|I'br|I’br|Ya’aqov|Ya'aqov|Kep|Kĕp|Yehud|Hazon|Ḥazon|Chazon|Maccabees|Shemu)", re.I)
REF_RE = re.compile(r"^[^!?]{2,70}?\b\d{1,3}(\s*[:v]\s*\d+[\d\-–,: ]*)?(\s*\(?(KJV|NKJV|NASB|ESV|TLV|NIV|ISR|CJB|English Standard Version|AOV[^)]*)\)?)?\s*$")
def is_ref(t): return bool(REF_RE.match(t)) and bool(BOOK_ANY.search(t))

HEB = re.compile(r"[\u0590-\u05FF\uFB1D-\uFB4F]+")
import unicodedata
MATH = re.compile(r"[\U0001D400-\U0001D7FF]")
def mathfix(t): return MATH.sub(lambda m: unicodedata.normalize("NFKC", m.group(0)), t)

# Hebrew direction: some PDFs store Hebrew in visual (reversed) order, others correctly,
# sometimes per font. Vote per font using known words and final-letter positions.
KNOWN = {"יהוה", "יהושע", "ישוע", "אלהים", "אלוהים", "תורה", "שבת", "משיח", "אהבה", "אחד", "יחד", "דבר", "ישראל", "חנכה", "שלום", "אל", "יה"}
FINALS = set("םןץףך")
def vote(run):
    if run in KNOWN: return 1
    if run[::-1] in KNOWN: return -1
    if len(run) > 1 and run[0] in FINALS: return -1
    if len(run) > 1 and run[-1] in FINALS: return 1
    return 0
from collections import defaultdict
FONT_VOTES = defaultdict(int)
for page in doc:
    for b in page.get_text("dict")["blocks"]:
        if b["type"]: continue
        for l in b["lines"]:
            for sp in l["spans"]:
                for m in HEB.finditer(sp["text"]): FONT_VOTES[sp["font"]] += vote(m.group(0))
DOC_VOTE = sum(FONT_VOTES.values())
def reversed_font(font):
    v = FONT_VOTES.get(font, 0) or DOC_VOTE
    return v < 0
def fixheb(t, font=None):
    t = mathfix(t)
    rev = reversed_font(font) if font is not None else DOC_VOTE < 0
    def one(m):
        r = m.group(0); v = vote(r)
        if v < 0 or (v == 0 and rev): r = r[::-1]
        return {"הושעי": "יהושע"}.get(r, r)
    return HEB.sub(one, t)

def span_html(s):
    t = html.escape(fixheb(s["text"], s["font"]))
    if not t.strip(): return t
    bold = "Bold" in s["font"] or (s["flags"] & 16) or bool(MATH.search(s["text"]))
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
            if b.get("ext") == "png" and len(b["image"]) < 8000: continue  # Word shadow/frame layers
            img_no += 1
            ext = b.get("ext", "png")
            fn = f"img-{img_no}.{ext}"
            open(os.path.join(out, fn), "wb").write(b["image"])
            items.append((pno, y, "img", {"src": fn, "w": w, "h": h}))
            continue
        lines, groups = [], []
        for l in b["lines"]:
            spans = [s for s in l["spans"]]
            txt = "".join(fixheb(s["text"], s["font"]) for s in spans)
            if not txt.strip():
                if lines: groups.append(lines); lines = []
                continue
            lines.append({"text": txt, "html": "".join(span_html(s) for s in spans),
                          "size": max(s["size"] for s in spans if s["text"].strip()),
                          "bold": all(("Bold" in s["font"] or s["flags"] & 16 or MATH.search(s["text"])) for s in spans if s["text"].strip()),
                          "big": sum(len(s["text"]) for s in spans if s["size"] >= 19),
                          "n": sum(len(s["text"]) for s in spans),
                          "x": l["bbox"][0], "y": l["bbox"][1]})
        if lines: groups.append(lines)
        for g in groups: items.append((pno, g[0]["y"], "text", g))
        continue
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
    if allbold and len(text) < 90 and is_ref(text):
        blocks.append({"t": "ref", "text": text}); continue
    if allbold and len(text) < 120 and not text.endswith((".", ",", ";")) and len(text) >= 4 and not re.match(r"^[HG]\d{2,5}$", text):
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
