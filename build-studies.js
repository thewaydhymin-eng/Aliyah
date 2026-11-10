// Build the Studies section (Diverse Studies) from studies/_data/.
// Run: node build-studies.js   (then node build.js, which adds the studies to the sitemap)
// New study: python3 tools/convert-study.py in.pdf <out-dir> <slug>, copy its images and the PDF
// into studies/<slug>/, its JSON into studies/_data/<slug>.json, and add it to studies/_data/catalog.json
// (slug, title, topic, summary).
const fs = require('fs');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const BASE = cfg.base.replace(/\/$/, '');
const cat = JSON.parse(fs.readFileSync('studies/_data/catalog.json', 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@500;700;900&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@400;500;600&display=swap';
const topicName = id => (cat.topics.find(t => t.id === id) || { en: '' }).en;
const slugId = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/* Design: the approved sample article (serif reading column, contents rail, Scripture set apart)
   in the ministry's own colours – charcoal and gold from the logo, techelet blue for links. */
const CSS = `:root{--ink:#221c17;--body:#2b2621;--muted:#6b625a;--rule:#e7e0d6;--paper:#ffffff;--warm:#faf7f2;--gold:#a67c2e;--gold-l:#d9b46a;--night:#1d1814;--techelet:#1f4f7a;
--serif:"Frank Ruhl Libre","Times New Roman",serif;--read:"Newsreader",Georgia,serif;--ui:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",Arial,sans-serif}
*{box-sizing:border-box}html{scroll-behavior:smooth}@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
body{margin:0;background:var(--paper);color:var(--body);font:19px/1.75 var(--read);-webkit-font-smoothing:antialiased}
a{color:var(--techelet)}a:focus-visible,button:focus-visible,summary:focus-visible,input:focus-visible{outline:2px solid var(--gold);outline-offset:3px}
.w{max-width:1100px;margin:0 auto;padding-left:max(18px,env(safe-area-inset-left,0px));padding-right:max(18px,env(safe-area-inset-right,0px))}
/* header + hero share the night band */
.band{background:radial-gradient(120% 140% at 50% -10%,#3a2c1e 0%,#1d1814 55%,#14110e 100%);color:#efe7da}
.top{display:flex;align-items:center;gap:16px;padding-block:14px;border-bottom:1px solid rgba(217,180,106,.18)}
.top img{height:88px;width:auto;display:block}@media (max-width:620px){.top img{height:64px}.top nav{gap:12px;font-size:13px}.top nav a:last-child{display:none}}.top nav{margin-left:auto;display:flex;gap:18px;flex-wrap:wrap;font:500 14px var(--ui)}
.top nav a{color:#cdbfa9;text-decoration:none}.top nav a:hover{color:var(--gold-l)}.top nav a[aria-current]{color:var(--gold-l)}
.hero{padding-block:54px 46px;max-width:820px}
.eyebrow{font:600 12px var(--ui);letter-spacing:.16em;text-transform:uppercase;color:var(--gold-l);display:flex;gap:10px;flex-wrap:wrap}
.eyebrow a{color:inherit;text-decoration:none}.eyebrow span+span::before{content:"·";margin-right:10px;color:#8d7d66}
.hero h1{font:900 clamp(36px,6.4vw,62px)/1.04 var(--serif);color:#fbf6ec;margin:14px 0 16px;letter-spacing:-.01em;text-wrap:balance}
.dek{font:italic 400 clamp(19px,2.4vw,23px)/1.5 var(--read);color:#d9cdb9;margin:0 0 26px;max-width:680px;text-wrap:pretty}
.meta{display:flex;flex-wrap:wrap;gap:10px 22px;align-items:center;font:500 14px var(--ui);color:#b9ab95}
.btn{display:inline-flex;align-items:center;gap:8px;font:600 14px var(--ui);text-decoration:none;padding:10px 18px;border-radius:99px;border:1px solid var(--gold-l);color:var(--gold-l)}
.btn:hover{background:var(--gold-l);color:var(--night)}.btn.solid{background:var(--gold-l);color:var(--night)}
/* reading layout */
.layout{display:grid;grid-template-columns:minmax(0,680px) 240px;gap:72px;justify-content:space-between;padding-block:44px 20px}
@media (max-width:1020px){.layout{grid-template-columns:minmax(0,1fr)}.rail{display:none}}
.rail nav{position:sticky;top:24px;font:14px/1.45 var(--ui);max-height:calc(100vh - 48px);overflow:auto}
.rail b,.toc-m summary{display:block;font:600 11px var(--ui);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 12px}
.toc{list-style:none;margin:0;padding:0;display:grid;gap:9px;counter-reset:t}
.toc a{display:grid;grid-template-columns:22px 1fr;gap:6px;color:var(--muted);text-decoration:none;counter-increment:t}
.toc a::before{content:counter(t,decimal-leading-zero);font:600 11px var(--ui);color:var(--gold);padding-top:2px}
.toc a:hover,.toc a.on{color:var(--ink)}.toc a.on::before{color:var(--techelet)}
.toc-m{display:none;border:1px solid var(--rule);border-radius:10px;padding:14px 16px;margin:0 0 30px;background:var(--warm);font-family:var(--ui)}
.toc-m summary{margin:0;cursor:pointer}.toc-m .toc{margin-top:12px}@media (max-width:1020px){.toc-m{display:block}}
article{min-width:0}
article>p:first-of-type{font-size:22px;line-height:1.6;color:var(--ink)}
article p{margin:0 0 1.05em;text-wrap:pretty}article strong{font-weight:600;color:var(--ink)}
article h2{font:700 clamp(26px,3.4vw,32px)/1.2 var(--serif);color:var(--ink);margin:2.2em 0 .6em;scroll-margin-top:20px;text-wrap:balance}
article h2::before{content:"";display:block;width:44px;height:3px;background:var(--gold);margin-bottom:16px}
article h3{font:700 22px/1.3 var(--serif);color:var(--ink);margin:1.8em 0 .5em;scroll-margin-top:20px;text-wrap:balance}
.hl{color:var(--techelet);font-weight:500}
/* Scripture */
.scripture{margin:1.6em 0;padding:22px 24px 18px;background:var(--warm);border-radius:4px 14px 14px 4px;border-left:3px solid var(--gold)}
.scripture cite{display:block;font:600 12px var(--ui);letter-spacing:.14em;text-transform:uppercase;color:var(--gold);font-style:normal;margin-bottom:8px}
.scripture p{font:400 19px/1.7 var(--read);margin:0 0 .6em;color:var(--body)}.scripture p:last-child{margin:0}
.scripture strong{font-weight:400;color:var(--ink);background:linear-gradient(transparent 60%,rgba(217,180,106,.38) 60%)}
.scripture sup{font:600 11px var(--ui);color:var(--gold);vertical-align:.5em;margin-right:3px}
article ul{padding-left:1.2em;margin:0 0 1.1em}article li{margin:.3em 0}article li::marker{color:var(--gold)}
figure{margin:2em 0;text-align:center}figure img{max-width:100%;height:auto;max-height:620px;object-fit:contain;border-radius:10px;box-shadow:0 1px 0 var(--rule),0 12px 30px -18px rgba(34,28,23,.45)}
/* end of study */
.endnote{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;border-top:1px solid var(--rule);margin-top:48px;padding-top:22px;font:500 14px var(--ui);color:var(--muted)}
.endnote a.btn{border-color:var(--ink);color:var(--ink)}.endnote a.btn:hover{background:var(--ink);color:#fff}
.more{background:var(--warm);border-top:1px solid var(--rule);margin-top:40px}.more .w{padding-block:44px}
.more h2,.idx h2{font:700 28px/1.2 var(--serif);color:var(--ink);margin:0 0 20px}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}
.card{display:flex;flex-direction:column;background:#fff;border:1px solid var(--rule);border-radius:14px;overflow:hidden;text-decoration:none;color:var(--body);transition:transform .15s,box-shadow .15s}
.card:hover{transform:translateY(-2px);box-shadow:0 14px 30px -20px rgba(34,28,23,.5)}
.card .thumb{aspect-ratio:16/9;background:var(--night) center/cover no-repeat;max-width:100%}
.card .in{padding:16px 18px 18px;display:grid;gap:6px}.card .k{font:600 11px var(--ui);letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.card h3{font:700 21px/1.25 var(--serif);color:var(--ink);margin:0}.card p{font-size:16px;line-height:1.55;margin:0;color:var(--muted)}.card small{font:500 12px var(--ui);color:var(--muted)}
.join{background:var(--night);color:#e9e0d1}.join .w{padding-block:38px;display:flex;flex-wrap:wrap;gap:16px 30px;align-items:center;justify-content:space-between}
.join p{margin:0;font:700 24px/1.3 var(--serif);color:#fbf6ec}.join span{display:block;font:400 16px var(--read);color:#cdbfa9;margin-top:4px}
footer{background:#14110e;color:#9d907c;font:13px var(--ui)}footer .w{padding-block:18px}footer a{color:#cdbfa9}
/* index */
.find{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 26px}
.find input{flex:1 1 260px;min-width:0;font:16px var(--ui);padding:12px 16px;border:1px solid var(--rule);border-radius:99px;background:#fff}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips button{font:500 13px var(--ui);border:1px solid var(--rule);background:#fff;color:var(--muted);padding:8px 14px;border-radius:99px;cursor:pointer}
.chips button.on{background:var(--ink);border-color:var(--ink);color:#fff}
.idx{padding-block:40px 60px}`;

const shell = ({ title, desc, url, image, hero, body, nav }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="The Way Derech Ha Yashar">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${BASE}/assets/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${FONT}"><style>${CSS}</style></head><body>
<div class="band"><div class="w"><div class="top"><a href="https://www.thewayderech.co.za" aria-label="The Way Derech Ha Yashar Ministries"><img src="${BASE}/assets/logo.png" alt="The Way Derech Ha Yashar Ministries"></a>
<nav><a href="${BASE}/studies/"${nav === 'studies' ? ' aria-current="page"' : ''}>Studies</a><a href="${BASE}/">Today’s Aliyah</a><a href="${BASE}/archive/">Aliyah archive</a><a href="https://www.thewayderech.co.za">thewayderech.co.za</a></nav></div>
${hero}</div></div>
${body}
<section class="join"><div class="w"><p>Study with us every week<span>Daily Aliyah, teachings and Shabbat gatherings, in English and Afrikaans.</span></p><a class="btn solid" href="https://t.me/+VG6F0CBWsCKG2KgI">Join us on Telegram</a></div></section>
<footer><div class="w">© ${new Date().getFullYear()} The Way Derech Ha Yashar Ministries · Stilbaai, South Africa · <a href="https://www.thewayderech.co.za">thewayderech.co.za</a></div></footer></body></html>
`;

// Scripture text: verse numbers become small superscripts
const verseNums = h => h
  .replace(/(^|[\s>“"(])(\d{1,3}(?:[-–]\d{1,3})?)(\s+)(?=[“"‘'(\[A-Z<])/g, (m, a, n) => `${a}<sup>${n}</sup>`)
  .replace(/([.,;:!?”’"–—]\s+)(\d{1,3})(\s+)(?=[a-z])/g, (m, a, n) => `${a}<sup>${n}</sup>`);

const linkify = h => h.replace(/(^|[\s(>])(https?:\/\/[^\s<"]+)/g, (m, a, u) => `${a}<a href="${u}" rel="noopener">${u.length > 60 ? u.slice(0, 57) + '…' : u}</a>`);
const studies = [];
cat.studies.forEach(st => {
  const data = JSON.parse(fs.readFileSync(`studies/_data/${st.slug}.json`, 'utf8'));
  const blocks = data.blocks;
  const words = blocks.map(b => b.text || '').join(' ').split(/\s+/).filter(Boolean).length;
  const firstImg = (blocks.find(b => b.t === 'img') || {}).src || '';
  const firstP = (blocks.find(b => b.t === 'p') || { text: '' }).text;
  studies.push({ ...st, blocks, pages: data.pages, minutes: Math.max(1, Math.round(words / 200)), firstImg,
    url: `${BASE}/studies/${st.slug}/`, desc: st.summary || (firstP.slice(0, 150).replace(/\s+\S*$/, '') + '…') });
});

const card = s => `<a class="card" href="${s.url}">${s.firstImg ? `<span class="thumb" style="background-image:url('${s.url}${s.firstImg}')"></span>` : `<span class="thumb"></span>`}<span class="in"><span class="k">${esc(topicName(s.topic))}</span><h3>${esc(s.title)}</h3><p>${esc(s.desc)}</p><small>${s.minutes} min read · ${s.pages} pages</small></span></a>`;

studies.forEach(st => {
  const toc = [];
  let body = '', inQuote = false, inList = false, pendingRef = '';
  const flush = () => { if (inQuote) { body += '</blockquote>'; inQuote = false; } if (inList) { body += '</ul>'; inList = false; } };
  const L = st.lang === 'af' ? { min: 'min leestyd', pages: '-bladsy studie', pdf: 'Laai PDF af', toc: 'Inhoud', more: 'Meer studies' } : { min: 'min read', pages: '-page study', pdf: 'Download PDF', toc: 'Contents', more: 'More studies' };
  const norm = x => (x || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9\u0590-\u05ff]+/g, ' ').trim();
  const titleN = norm(st.title);
  const firstBody = st.blocks.findIndex(b => ['p', 'q', 'ref', 'li'].includes(b.t));
  st.blocks.forEach((b, i) => {
    if (/^h[123]$/.test(b.t) && i < firstBody) {
      const n = norm(b.text);
      if (b.t === 'h1' || (n && titleN.includes(n))) return;
    }
    if (i === firstBody && b.t === 'p' && norm(b.text) === titleN) return;
    if (b.t === 'h1') b = { ...b, t: 'h2' };
    if (b.t !== 'q' && inQuote) { body += '</blockquote>'; inQuote = false; }
    if (b.t !== 'li' && inList) { body += '</ul>'; inList = false; }
    if (b.t !== 'q' && b.t !== 'ref' && pendingRef) { body += `<p class="hl" style="font:600 13px var(--ui);letter-spacing:.12em;text-transform:uppercase;color:var(--gold)">${esc(pendingRef)}</p>`; pendingRef = ''; }
    if (b.t === 'h2' || b.t === 'h3') { const id = slugId(b.text) || `s${i}`; toc.push({ id, text: b.text, lvl: b.t }); body += `<${b.t} id="${id}">${esc(b.text)}</${b.t}>`; }
    else if (b.t === 'ref') { if (pendingRef) body += `<p class="hl">${esc(pendingRef)}</p>`; pendingRef = b.text; }
    else if (b.t === 'q') {
      if (!inQuote) { body += `<blockquote class="scripture">${pendingRef ? `<cite>${esc(pendingRef)}</cite>` : ''}`; inQuote = true; pendingRef = ''; }
      body += `<p>${verseNums(b.html)}</p>`;
    }
    else if (b.t === 'li') { if (!inList) { body += '<ul>'; inList = true; } body += `<li>${b.html}</li>`; }
    else if (b.t === 'img') body += `<figure><img src="${b.src}" alt="" loading="lazy" width="${Math.round(b.w)}" height="${Math.round(b.h)}"></figure>`;
    else if (b.t === 'p') body += `<p>${linkify(b.html)}</p>`;
  });
  flush();
  if (pendingRef) body += `<p class="hl">${esc(pendingRef)}</p>`;
  const tocList = toc.filter(t => t.lvl === 'h2').length >= 3 ? toc.filter(t => t.lvl === 'h2') : toc;
  const tocLinks = tocList.map(t => `<a href="#${t.id}">${esc(t.text)}</a>`).join('');
  const hasToc = tocList.length >= 3;
  const others = [...studies.filter(s => s.slug !== st.slug && s.topic === st.topic), ...studies.filter(s => s.topic !== st.topic)].slice(0, 3);
  const hero = `<header class="hero"><div class="eyebrow"><span><a href="${BASE}/studies/">Diverse Studies</a></span><span><a href="${BASE}/studies/#${st.topic}">${esc(topicName(st.topic))}</a></span></div>
<h1>${esc(st.title)}</h1>${st.summary ? `<p class="dek">${esc(st.summary)}</p>` : ''}
<div class="meta"><span>${st.minutes} ${L.min}</span><span>${st.pages}${L.pages}</span><a class="btn" href="${st.slug}.pdf" download>${L.pdf}</a></div></header>`;
  const main = `<div class="w"><div class="layout"><article>
${hasToc ? `<details class="toc-m"><summary>${L.toc}</summary><nav class="toc">${tocLinks}</nav></details>` : ''}
${body}
<div class="endnote"><span>${esc(st.title)} · The Way Derech Ha Yashar</span><a class="btn" href="${st.slug}.pdf" download>Download the PDF</a></div></article>
${hasToc ? `<aside class="rail" aria-label="${L.toc}"><nav><b>${L.toc}</b><div class="toc" id="toc">${tocLinks}</div></nav></aside>` : '<aside class="rail"></aside>'}</div></div>
${others.length ? `<section class="more"><div class="w"><h2>${L.more}</h2><div class="cards">${others.map(card).join('')}</div></div></section>` : ''}
<script>(function(){var l=[].slice.call(document.querySelectorAll('#toc a'));if(!l.length)return;var h=l.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))});
function s(){var c=0;for(var i=0;i<h.length;i++){if(h[i]&&h[i].getBoundingClientRect().top<120)c=i}l.forEach(function(a,i){a.classList.toggle('on',i===c)})}addEventListener('scroll',s,{passive:true});s();
document.querySelectorAll('.toc-m a').forEach(function(a){a.addEventListener('click',function(){a.closest('details').open=false})})})();</script>`;
  fs.writeFileSync(`studies/${st.slug}/index.html`, shell({ title: `${st.title} · The Way Derech Ha Yashar`, desc: st.desc, url: st.url,
    image: st.firstImg ? `${st.url}${st.firstImg}` : `${BASE}/assets/logo.png`, hero, body: main, nav: 'studies' }));
});

// studies index page
const idxHero = `<header class="hero"><div class="eyebrow"><span>The Way Derech Ha Yashar</span></div><h1>Diverse Studies</h1>
<p class="dek">Teachings on Shabbat, the Appointed Times, Yeshua, Israel and the roots of our traditions. Open a study to read it here, on any device, or download the PDF.</p></header>`;
const idxBody = `<main class="w idx"><div class="find"><input id="q" type="search" placeholder="Search the studies…" aria-label="Search the studies">
<div class="chips" id="chips"><button class="on" data-t="">All</button>${cat.topics.filter(t => studies.some(s => s.topic === t.id)).map(t => `<button data-t="${t.id}">${esc(t.en)}</button>`).join('')}</div></div>
<div class="cards" id="grid">${studies.map(s => card(s).replace('<a class="card"', `<a class="card" data-t="${s.topic}" data-s="${esc((s.title + ' ' + s.desc).toLowerCase())}"`)).join('')}</div><p id="none" hidden>No studies match your search.</p></main>
<script>(function(){var t='',q=document.getElementById('q');function f(){var n=0;document.querySelectorAll('#grid .card').forEach(function(c){var ok=(!t||c.dataset.t===t)&&(!q.value||c.dataset.s.indexOf(q.value.toLowerCase())>-1);c.hidden=!ok;if(ok)n++});document.getElementById('none').hidden=n>0}
document.querySelectorAll('#chips button').forEach(function(b){b.onclick=function(){t=b.dataset.t;document.querySelectorAll('#chips button').forEach(function(x){x.className=x===b?'on':''});f()}});q.oninput=f;var h=location.hash.slice(1);if(h){var b=document.querySelector('#chips button[data-t="'+h+'"]');if(b)b.click()}})();</script>`;
fs.writeFileSync('studies/index.html', shell({ title: 'Diverse Studies · The Way Derech Ha Yashar', desc: 'Torah studies on Shabbat, the Appointed Times, Yeshua, Israel and the roots of our traditions, from The Way Derech Ha Yashar.',
  url: `${BASE}/studies/`, image: `${BASE}/assets/logo.png`, hero: idxHero, body: idxBody, nav: 'studies' }));

// studies.js – embeddable cards for the GoDaddy Diverse Studies page
const ecss = `#tw-studies{font:17px/1.55 Newsreader,Georgia,serif;color:#2b2621;max-width:1100px;margin:0 auto;padding:24px 16px}
#tw-studies .head{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:0 0 20px}#tw-studies input{flex:1 1 240px;min-width:0;font:16px "IBM Plex Sans",Arial,sans-serif;padding:11px 16px;border:1px solid #e7e0d6;border-radius:99px}
#tw-studies .chips{display:flex;flex-wrap:wrap;gap:8px}#tw-studies .chips button{font:500 13px "IBM Plex Sans",Arial,sans-serif;border:1px solid #e7e0d6;background:#fff;color:#6b625a;padding:8px 14px;border-radius:99px;cursor:pointer}#tw-studies .chips button.on{background:#221c17;border-color:#221c17;color:#fff}
#tw-studies .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:20px}
#tw-studies a.card{display:flex;flex-direction:column;background:#fff;border:1px solid #e7e0d6;border-radius:14px;overflow:hidden;text-decoration:none;color:#2b2621}#tw-studies a.card:hover{box-shadow:0 14px 30px -20px rgba(34,28,23,.5)}
#tw-studies .thumb{display:block;aspect-ratio:16/9;background:#1d1814 center/cover no-repeat}#tw-studies .in{display:grid;gap:6px;padding:16px 18px 18px}
#tw-studies .k{font:600 11px "IBM Plex Sans",Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a67c2e}
#tw-studies h3{font:700 21px/1.25 "Frank Ruhl Libre",Georgia,serif;color:#221c17;margin:0}#tw-studies p{font-size:15.5px;margin:0;color:#6b625a}#tw-studies small{font:500 12px "IBM Plex Sans",Arial,sans-serif;color:#6b625a}`;
const embed = studies.map(s => ({ t: s.title, tp: s.topic, d: s.desc, m: s.minutes, p: s.pages, u: s.url, img: s.firstImg ? s.url + s.firstImg : '' }));
const js = `/* The Way Derech · Studies cards. Generated by build-studies.js.
   GoDaddy code: <div id="tw-studies-root"></div><script src="${BASE}/studies.js"></script> */
(function(){var cur=document.currentScript,root=document.getElementById('tw-studies-root');
if(!root){root=document.createElement('div');root.id='tw-studies-root';cur.parentNode.insertBefore(root,cur);}
var st=document.createElement('style');st.textContent=${JSON.stringify(ecss)};document.head.appendChild(st);
var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONT)};document.head.appendChild(l);
var S=${JSON.stringify(embed)},T=${JSON.stringify(cat.topics.filter(t => studies.some(s => s.topic === t.id)).map(t => ({ id: t.id, en: t.en })))};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function name(id){for(var i=0;i<T.length;i++)if(T[i].id===id)return T[i].en;return ''}
var topic='';root.innerHTML='<section id="tw-studies"><div class="head"><input id="tws-q" type="search" placeholder="Search the studies…" aria-label="Search the studies"><div class="chips" id="tws-chips"><button class="on" data-t="">All</button>'+T.map(function(t){return '<button data-t="'+t.id+'">'+esc(t.en)+'</button>'}).join('')+'</div></div><div class="cards" id="tws-grid"></div></section>';
function render(){var q=document.getElementById('tws-q').value.toLowerCase();document.getElementById('tws-grid').innerHTML=S.filter(function(s){return(!topic||s.tp===topic)&&(!q||(s.t+' '+s.d).toLowerCase().indexOf(q)>-1)}).map(function(s){return '<a class="card" href="'+s.u+'" target="_blank" rel="noopener"><span class="thumb"'+(s.img?' style="background-image:url(\\''+s.img+'\\')"':'')+'></span><span class="in"><span class="k">'+esc(name(s.tp))+'</span><h3>'+esc(s.t)+'</h3><p>'+esc(s.d)+'</p><small>'+s.m+' min read · '+s.p+' pages</small></span></a>'}).join('')||'<p>No studies match your search.</p>'}
document.getElementById('tws-q').oninput=render;[].forEach.call(document.querySelectorAll('#tws-chips button'),function(b){b.onclick=function(){topic=b.getAttribute('data-t');[].forEach.call(document.querySelectorAll('#tws-chips button'),function(x){x.className=x===b?'on':''});render()}});render();})();
`;
fs.writeFileSync('studies.js', js);
fs.writeFileSync('studies/_data/urls.json', JSON.stringify([`${BASE}/studies/`].concat(studies.map(s => s.url))));
console.log(`Built ${studies.length} studies, studies index and studies.js`);
