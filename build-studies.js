// Build the Studies section (Diverse Studies) from studies/_data/.
// Run: node build-studies.js   (then node build.js, which adds the studies to the sitemap)
// New study: python3 tools/convert-study.py in.pdf <out-dir> <slug>, copy its images and the PDF
// into studies/<slug>/, its JSON into studies/_data/<slug>.json, and add it to studies/_data/catalog.json.
const fs = require('fs');
const path = require('path');

const cfg = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const BASE = cfg.base.replace(/\/$/, '');
const cat = JSON.parse(fs.readFileSync('studies/_data/catalog.json', 'utf8'));
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const FONT = 'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Cantarell:ital,wght@0,400;0,700;1,400&display=swap';
const topicName = id => (cat.topics.find(t => t.id === id) || { en: '' }).en;
const slugId = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const CSS = `:root{--red:#c70c0f;--ink:#1c1c1c;--muted:#615b59;--rule:#e6e1df;--tint:#f8f6f5;--soft:#fbeaea;--gold:#a8792a}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:#fff;color:var(--ink);font:18px/1.7 Cantarell,Arial,sans-serif}
a{color:var(--red)}h1,h2,h3,.e,nav,.btn,.meta,.toc,.chip{font-family:Poppins,Arial,sans-serif}
.w{max-width:760px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
header.site{border-bottom:1px solid var(--rule)}header.site .w{display:flex;align-items:center;gap:14px;padding-block:12px;flex-wrap:wrap}
header.site img{height:56px;width:auto}header.site nav{margin-left:auto;display:flex;gap:14px;font-size:14px;flex-wrap:wrap}header.site nav a{color:var(--muted);text-decoration:none;font-weight:500}
.crumb{font:500 13px Poppins,Arial,sans-serif;color:var(--muted);margin:22px 0 4px;letter-spacing:.04em;text-transform:uppercase}.crumb a{color:var(--muted)}
h1{font-size:clamp(28px,6vw,40px);line-height:1.15;margin:6px 0 12px;text-wrap:balance}
.meta{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:13px;color:var(--muted);border-bottom:4px solid var(--red);padding-bottom:14px;margin-bottom:8px}
.chip{display:inline-block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--red);background:var(--soft);padding:4px 10px;border-radius:99px;text-decoration:none}
.btn{display:inline-block;font-size:14px;font-weight:600;text-decoration:none;padding:9px 16px;border-radius:99px;background:var(--red);color:#fff;margin-left:auto}
.toc{background:var(--tint);border-radius:10px;padding:14px 18px;margin:22px 0;font-size:14px}.toc b{display:block;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
.toc ol{margin:0;padding-left:18px}.toc li{margin:3px 0}.toc a{color:var(--ink);text-decoration:none}.toc a:hover{color:var(--red)}
article h2{font-size:26px;line-height:1.25;margin:38px 0 10px;scroll-margin-top:16px}article h2::before{content:"";display:block;width:40px;height:3px;background:var(--red);margin-bottom:12px}
article h3{font-size:20px;line-height:1.35;margin:30px 0 8px;scroll-margin-top:16px}
article p{margin:0 0 14px}article .lead{font-size:20px;color:var(--muted)}
.ref{font:600 13px Poppins,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin:22px 0 4px}
blockquote{margin:0 0 14px;padding:12px 18px;border-left:4px solid var(--gold);background:#fbf8f2;border-radius:0 8px 8px 0}blockquote p{margin:0 0 8px}blockquote p:last-child{margin:0}
article ul{padding-left:22px;margin:0 0 14px}article li{margin:4px 0}
figure{margin:20px 0;text-align:center}figure img{max-width:100%;height:auto;border-radius:8px;border:1px solid var(--rule)}
.hl{color:var(--red)}
.end{display:flex;flex-wrap:wrap;gap:10px;margin:36px 0;padding-top:20px;border-top:1px solid var(--rule)}.end a{font:600 14px Poppins,Arial,sans-serif;text-decoration:none;padding:10px 16px;border-radius:99px;border:1px solid var(--ink);color:var(--ink)}
footer{border-top:1px solid var(--rule);color:var(--muted);font-size:13px;padding:18px 0 30px}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:16px 0 30px}@media (max-width:620px){.grid{grid-template-columns:1fr}}
.card{display:block;border:1px solid var(--rule);border-radius:12px;padding:16px;text-decoration:none;color:var(--ink);min-width:0}.card:hover{border-color:var(--red)}
.card h3{font:600 18px/1.3 Poppins,Arial,sans-serif;margin:8px 0 6px}.card p{font-size:15px;color:var(--muted);margin:0}.card small{display:block;margin-top:8px;color:var(--muted);font:500 12px Poppins,Arial,sans-serif}
.search{width:100%;font:inherit;font-size:16px;padding:10px 14px;border:1px solid #ddd;border-radius:10px;margin:8px 0 6px}
.tabs{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}.tabs button{font:600 12px Poppins,Arial,sans-serif;border:1px solid #ddd;background:#fff;color:#555;padding:7px 12px;border-radius:99px;cursor:pointer}.tabs button.on{background:var(--ink);color:#fff;border-color:var(--ink)}`;

const shell = ({ title, desc, url, image, body }) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:site_name" content="The Way Derech Ha Yashar">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="${BASE}/assets/logo.png"><link rel="stylesheet" href="${FONT}"><style>${CSS}</style></head><body>
<header class="site"><div class="w"><a href="https://www.thewayderech.co.za"><img src="${BASE}/assets/logo.png" alt="The Way Derech Ha Yashar Ministries"></a>
<nav><a href="${BASE}/studies/">Studies</a><a href="${BASE}/">Today’s Aliyah</a><a href="${BASE}/archive/">Aliyah archive</a><a href="https://www.thewayderech.co.za">thewayderech.co.za</a></nav></div></header>
<main class="w">${body}</main>
<footer><div class="w">© ${new Date().getFullYear()} The Way Derech Ha Yashar Ministries · Stilbaai, South Africa · <a href="https://t.me/+VG6F0CBWsCKG2KgI">Telegram</a></div></footer></body></html>
`;

const catalog = [];
cat.studies.forEach(st => {
  const data = JSON.parse(fs.readFileSync(`studies/_data/${st.slug}.json`, 'utf8'));
  const blocks = data.blocks;
  const url = `${BASE}/studies/${st.slug}/`;
  const words = blocks.map(b => b.text || '').join(' ').split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  const firstP = (blocks.find(b => b.t === 'p') || { text: '' }).text;
  const desc = (st.summary || firstP).slice(0, 155).replace(/\s+\S*$/, '') + '…';
  const toc = [];
  let body = '', inQuote = false, inList = false, firstLead = true, firstImg = null;
  const close = () => { if (inQuote) { body += '</blockquote>'; inQuote = false; } if (inList) { body += '</ul>'; inList = false; } };
  blocks.forEach((b, i) => {
    if (b.t === 'h1') return; // the title is rendered once from the catalog
    if (b.t !== 'q' && inQuote) { body += '</blockquote>'; inQuote = false; }
    if (b.t !== 'li' && inList) { body += '</ul>'; inList = false; }
    if (b.t === 'h2' || b.t === 'h3') { const id = slugId(b.text) || `s${i}`; toc.push({ id, text: b.text, lvl: b.t }); body += `<${b.t} id="${id}">${esc(b.text)}</${b.t}>`; }
    else if (b.t === 'ref') body += `<p class="ref">${esc(b.text)}</p>`;
    else if (b.t === 'q') { if (!inQuote) { body += '<blockquote>'; inQuote = true; } body += `<p>${b.html}</p>`; }
    else if (b.t === 'li') { if (!inList) { body += '<ul>'; inList = true; } body += `<li>${b.html}</li>`; }
    else if (b.t === 'img') { if (!firstImg) firstImg = b.src; body += `<figure><img src="${b.src}" alt="" loading="lazy" width="${Math.round(b.w)}" height="${Math.round(b.h)}"></figure>`; }
    else if (b.t === 'p') { body += `<p${firstLead ? ' class="lead"' : ''}>${b.html}</p>`; firstLead = false; }
  });
  close();
  const tocList = toc.filter(t => t.lvl === 'h2').length >= 3 ? toc.filter(t => t.lvl === 'h2') : toc;
  const tocHtml = tocList.length >= 3 ? `<nav class="toc" aria-label="Contents"><b>Contents</b><ol>${tocList.map(t => `<li><a href="#${t.id}">${esc(t.text)}</a></li>`).join('')}</ol></nav>` : '';
  const page = `<p class="crumb"><a href="${BASE}/studies/">Studies</a> · ${esc(topicName(st.topic))}</p>
<h1>${esc(st.title)}</h1>
<div class="meta"><a class="chip" href="${BASE}/studies/#${st.topic}">${esc(topicName(st.topic))}</a><span>${minutes} min read</span><span>${data.pages}-page study</span><a class="btn" href="${st.slug}.pdf" download>Download PDF</a></div>
${tocHtml}<article>${body}</article>
<div class="end"><a href="${BASE}/studies/">← All studies</a><a href="${st.slug}.pdf" download>Download PDF</a><a href="https://t.me/+VG6F0CBWsCKG2KgI">Join us on Telegram</a></div>`;
  fs.writeFileSync(`studies/${st.slug}/index.html`, shell({ title: `${st.title} · The Way Derech Ha Yashar`, desc, url,
    image: firstImg ? `${url}${firstImg}` : `${BASE}/assets/logo.png`, body: page }));
  catalog.push({ s: st.slug, t: st.title, tp: st.topic, d: desc, m: minutes, u: url, img: firstImg ? `${url}${firstImg}` : '' });
});

// studies index page
const idx = `<p class="crumb">Studies</p><h1>Diverse Studies</h1><p class="lead" style="font-size:19px;color:var(--muted)">Teachings on Shabbat, the Appointed Times, Yeshua, Israel and the roots of our traditions. Open a study to read it here, or download the PDF.</p>
<input class="search" id="q" type="search" placeholder="Search the studies…" aria-label="Search the studies">
<div class="tabs" id="tabs"><button class="on" data-t="">All</button>${cat.topics.map(t => `<button data-t="${t.id}">${esc(t.en)}</button>`).join('')}</div>
<div class="grid" id="grid">${catalog.map(c => `<a class="card" href="${c.u}" data-t="${c.tp}" data-s="${esc((c.t + ' ' + c.d).toLowerCase())}"><span class="chip">${esc(topicName(c.tp))}</span><h3>${esc(c.t)}</h3><p>${esc(c.d)}</p><small>${c.m} min read</small></a>`).join('')}</div>
<p id="none" hidden>No studies match your search.</p>
<script>(function(){var t='',q=document.getElementById('q');function f(){var n=0;document.querySelectorAll('#grid .card').forEach(function(c){var ok=(!t||c.dataset.t===t)&&(!q.value||c.dataset.s.indexOf(q.value.toLowerCase())>-1);c.hidden=!ok;if(ok)n++});document.getElementById('none').hidden=n>0}
document.querySelectorAll('#tabs button').forEach(function(b){b.onclick=function(){t=b.dataset.t;document.querySelectorAll('#tabs button').forEach(function(x){x.className=x===b?'on':''});f()}});q.oninput=f;
var h=location.hash.slice(1);if(h){var b=document.querySelector('#tabs button[data-t="'+h+'"]');if(b)b.click()}})();</script>`;
fs.writeFileSync('studies/index.html', shell({ title: 'Diverse Studies · The Way Derech Ha Yashar', desc: 'Torah studies on Shabbat, the Appointed Times, Yeshua, Israel and the roots of our traditions, from The Way Derech Ha Yashar.',
  url: `${BASE}/studies/`, image: `${BASE}/assets/logo.png`, body: idx }));

// studies.js – embeddable list for the GoDaddy Diverse Studies page
const ecss = `#tw-studies{font:16px/1.55 Cantarell,Arial,sans-serif;color:#1c1c1c;max-width:900px;margin:0 auto;padding:20px 16px}
#tw-studies h2{font:700 28px/1.2 Poppins,Arial,sans-serif;margin:0 0 6px}#tw-studies .sub{color:#615b59;margin:0 0 12px}
#tw-studies input{width:100%;box-sizing:border-box;font:inherit;padding:10px 14px;border:1px solid #ddd;border-radius:10px}
#tw-studies .tabs{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}#tw-studies .tabs button{font:600 12px Poppins,Arial,sans-serif;border:1px solid #ddd;background:#fff;color:#555;padding:7px 12px;border-radius:99px;cursor:pointer}#tw-studies .tabs button.on{background:#1c1c1c;color:#fff;border-color:#1c1c1c}
#tw-studies .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}
#tw-studies a.card{display:block;border:1px solid #e6e1df;border-radius:12px;padding:16px;text-decoration:none;color:#1c1c1c;background:#fff}#tw-studies a.card:hover{border-color:#c70c0f}
#tw-studies .chip{display:inline-block;font:600 11px Poppins,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#c70c0f;background:#fbeaea;padding:3px 9px;border-radius:99px}
#tw-studies h3{font:600 17px/1.3 Poppins,Arial,sans-serif;margin:8px 0 6px}#tw-studies p.d{font-size:14.5px;color:#615b59;margin:0}#tw-studies small{display:block;margin-top:8px;color:#776f6c;font:500 12px Poppins,Arial,sans-serif}`;
const js = `/* The Way Derech · Studies list. Generated by build-studies.js.
   GoDaddy code: <div id="tw-studies-root"></div><script src="${BASE}/studies.js"></script> */
(function(){var cur=document.currentScript,root=document.getElementById('tw-studies-root');
if(!root){root=document.createElement('div');root.id='tw-studies-root';cur.parentNode.insertBefore(root,cur);}
var st=document.createElement('style');st.textContent=${JSON.stringify(ecss)};document.head.appendChild(st);
var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONT)};document.head.appendChild(l);
var S=${JSON.stringify(catalog)},T=${JSON.stringify(cat.topics.map(t => ({ id: t.id, en: t.en })))};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function name(id){for(var i=0;i<T.length;i++)if(T[i].id===id)return T[i].en;return ''}
var topic='';root.innerHTML='<section id="tw-studies"><h2>Diverse Studies</h2><p class="sub">Open a study to read it straight away, on any device.</p><input id="tws-q" type="search" placeholder="Search the studies…" aria-label="Search the studies"><div class="tabs" id="tws-tabs"><button class="on" data-t="">All</button>'+T.map(function(t){return '<button data-t="'+t.id+'">'+esc(t.en)+'</button>'}).join('')+'</div><div class="grid" id="tws-grid"></div></section>';
function render(){var q=document.getElementById('tws-q').value.toLowerCase();document.getElementById('tws-grid').innerHTML=S.filter(function(s){return(!topic||s.tp===topic)&&(!q||(s.t+' '+s.d).toLowerCase().indexOf(q)>-1)}).map(function(s){return '<a class="card" href="'+s.u+'" target="_blank" rel="noopener"><span class="chip">'+esc(name(s.tp))+'</span><h3>'+esc(s.t)+'</h3><p class="d">'+esc(s.d)+'</p><small>'+s.m+' min read</small></a>'}).join('')||'<p>No studies match your search.</p>'}
document.getElementById('tws-q').oninput=render;[].forEach.call(document.querySelectorAll('#tws-tabs button'),function(b){b.onclick=function(){topic=b.getAttribute('data-t');[].forEach.call(document.querySelectorAll('#tws-tabs button'),function(x){x.className=x===b?'on':''});render()}});render();})();
`;
fs.writeFileSync('studies.js', js);
fs.writeFileSync('studies/_data/urls.json', JSON.stringify([`${BASE}/studies/`].concat(catalog.map(c => c.u))));
console.log(`Built ${catalog.length} studies, studies index and studies.js`);
