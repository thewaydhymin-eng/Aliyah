import json, sys
w = json.load(open(sys.argv[1]))
ORD = {"en": ["1st","2nd","3rd","4th","5th","6th","7th"], "af": ["1ste","2de","3de","4de","5de","6de","7de"]}
LAB = {"en": ("*Action Step of the Day:*", "Full Aliyah: https://thewayderech.co.za/aliyah-a-day"),
       "af": ("*Aksie van die Dag:*", "Volledige Aliyah: https://thewayderech.co.za/aliyah-a-day")}
def bless(b):
    g, rest = b.split("!", 1)
    return f"*{g}!*{rest}"
out = []
for a in w:
    for L in ("en", "af"):
        c = a[L]
        def make(summ, fullbless=True, q5=True):
            parts = [f"*{c['title'].upper()}*\nParashat {a['parashah']}, {ORD[L][a['aliyah']-1]} Aliyah · {a['ref']}",
                     (bless(c["blessing"]) if fullbless else '*' + c['blessing'].split('!')[0] + '!*'), f"*{c['hook']}*"]
            if summ: parts.append(c["waSummary"])
            parts.append(f"• {c['questions'][0]['q']}" + (f"\n• {c['questions'][4]['q']}" if q5 else ''))
            parts.append(f"{LAB[L][0]} {c['actionOfDay']}")
            parts.append(LAB[L][1])
            return "\n\n".join(parts)
        for args in ((True,), (False,), (False, False), (False, False, False)):
            t = make(*args)
            if len(t) <= 700: break
        out.append({"n": a["aliyah"], "lang": L, "date": a["date"], "title": c["title"], "text": t})
        print(a["aliyah"], L, len(t), "summary" if c["waSummary"] in t else "no summary")
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
