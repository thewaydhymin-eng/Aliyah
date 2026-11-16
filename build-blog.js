// Build the Blog from blog/_posts/.
// Run: node build-blog.js   (then node build.js, which adds the posts to the sitemap)
// New post: save the text as blog/_posts/<slug>.txt and add {slug, date, lang, image, summary} to blog/_posts/posts.json.
// Text format: line 1 = title, line 2 = subtitle (Parashah · Aliyah · reference), then one paragraph per line.
// A short line without closing punctuation is a section heading; a line that starts with a quotation mark
// and ends with (Reference) is set apart as Scripture. Ministry name and website lines are left to the page footer.
const fs = require('fs');
const { BASE, esc, FONT, shell } = require('./lib/site');

const meta = JSON.parse(fs.readFileSync('blog/_posts/posts.json', 'utf8'));
const MINISTRY = /^(The WAY Derech Ha Yashar Ministries|www\.thewayderech\.co\.za)$/i;
const slugId = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const fmtDate = (d, lang) => new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'af' ? 'af-ZA' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

const posts = meta.map(m => {
  const lines = fs.readFileSync(`blog/_posts/${m.slug}.txt`, 'utf8').split(/\r?\n/).map(l => l.trim().replace(/\s{2,}/g, ' ')).filter(Boolean);
  const [title, subtitle, ...rest] = lines;
  const body = rest.filter(l => !MINISTRY.test(l));
  const blocks = body.map(l => {
    const q = l.match(/^[“"](.+)[”"]\s*\(([^)]+)\)\s*$/);
    if (q) return { t: 'q', text: q[1], ref: q[2] };
    if (l.length < 70 && !/[.!?:;,”"’)]$/.test(l)) return { t: 'h2', text: l, id: slugId(l) };
    return { t: 'p', text: l };
  });
  const words = body.join(' ').split(/\s+/).length;
  return { ...m, title, subtitle, blocks, minutes: Math.max(1, Math.round(words / 220)), url: `${BASE}/blog/${m.slug}/` };
}).sort((a, b) => b.date.localeCompare(a.date));

const L = lang => lang === 'af' ? { min: 'min leestyd', toc: 'Inhoud', more: 'Meer uit die blog' } : { min: 'min read', toc: 'Contents', more: 'More from the blog' };
const card = p => `<a class="card" href="${p.url}"><span class="thumb" style="background-image:url('${BASE}/${p.image}')"></span><span class="in"><span class="k">${esc(fmtDate(p.date, p.lang))}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p><small>${p.minutes} ${L(p.lang).min}</small></span></a>`;

posts.forEach(p => {
  const l = L(p.lang);
  let html = '';
  p.blocks.forEach(b => {
    if (b.t === 'h2') html += `<h2 id="${b.id}">${esc(b.text)}</h2>`;
    else if (b.t === 'q') html += `<blockquote class="scripture"><cite>${esc(b.ref)}</cite><p>“${esc(b.text)}”</p></blockquote>`;
    else html += `<p>${esc(b.text)}</p>`;
  });
  const toc = p.blocks.filter(b => b.t === 'h2');
  const links = toc.map(b => `<a href="#${b.id}">${esc(b.text)}</a>`).join('');
  const hasToc = toc.length >= 3;
  const hero = `<header class="hero"><div class="eyebrow"><span><a href="${BASE}/blog/">Blog</a></span><span>${esc(fmtDate(p.date, p.lang))}</span></div>
<h1>${esc(p.title)}</h1><p class="dek">${esc(p.subtitle)}</p><div class="meta"><span>${p.minutes} ${l.min}</span><span>The WAY Derech Ha Yashar Ministries</span></div></header>`;
  const others = posts.filter(o => o.slug !== p.slug).slice(0, 3);
  const main = `<div class="w"><div class="layout"><article>
${hasToc ? `<details class="toc-m"><summary>${l.toc}</summary><nav class="toc">${links}</nav></details>` : ''}
${html}
<div class="endnote"><span>${esc(p.title)} · The Way Derech Ha Yashar</span><a class="btn" href="${BASE}/blog/">All posts</a></div></article>
${hasToc ? `<aside class="rail" aria-label="${l.toc}"><nav><b>${l.toc}</b><div class="toc" id="toc">${links}</div></nav></aside>` : '<aside class="rail"></aside>'}</div></div>
${others.length ? `<section class="more"><div class="w"><h2>${l.more}</h2><div class="cards">${others.map(card).join('')}</div></div></section>` : ''}
<script>(function(){var l=[].slice.call(document.querySelectorAll('#toc a'));if(!l.length)return;var h=l.map(function(a){return document.getElementById(a.getAttribute('href').slice(1))});
function s(){var c=0;for(var i=0;i<h.length;i++){if(h[i]&&h[i].getBoundingClientRect().top<120)c=i}l.forEach(function(a,i){a.classList.toggle('on',i===c)})}addEventListener('scroll',s,{passive:true});s();
document.querySelectorAll('.toc-m a').forEach(function(a){a.addEventListener('click',function(){a.closest('details').open=false})})})();</script>`;
  fs.mkdirSync(`blog/${p.slug}`, { recursive: true });
  fs.writeFileSync(`blog/${p.slug}/index.html`, shell({ title: `${p.title} · The Way Derech Ha Yashar`, desc: p.summary, url: p.url, image: `${BASE}/${p.image}`, hero, body: main, nav: 'blog' }));
});

const idxHero = `<header class="hero"><div class="eyebrow"><span>The Way Derech Ha Yashar</span></div><h1>Blog</h1>
<p class="dek">Reflections on the weekly Parashah and on walking out Torah as followers of Yeshua.</p></header>`;
fs.writeFileSync('blog/index.html', shell({ title: 'Blog · The Way Derech Ha Yashar', desc: 'Reflections on the weekly Parashah and on walking out Torah as followers of Yeshua, from The Way Derech Ha Yashar Ministries.',
  url: `${BASE}/blog/`, image: `${BASE}/assets/logo.png`, hero: idxHero, body: `<main class="w idx"><div class="cards">${posts.map(card).join('')}</div></main>`, nav: 'blog' }));

// blog.js – newest-first post cards for the GoDaddy Blog page
const ecss = `#tw-blog{font:17px/1.55 Newsreader,Georgia,serif;color:#2b2621;max-width:1100px;margin:0 auto;padding:24px 16px}
#tw-blog .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:22px}
#tw-blog a.card{display:flex;flex-direction:column;background:#fff;border:1px solid #e7e0d6;border-radius:14px;overflow:hidden;text-decoration:none;color:#2b2621}#tw-blog a.card:hover{box-shadow:0 14px 30px -20px rgba(34,28,23,.5)}
#tw-blog .thumb{display:block;aspect-ratio:4/5;max-height:340px;background:#1d1814 center/cover no-repeat}#tw-blog .in{display:grid;gap:6px;padding:16px 18px 18px}
#tw-blog .k{font:600 11px "IBM Plex Sans",Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#a67c2e}
#tw-blog h3{font:700 22px/1.25 "Frank Ruhl Libre",Georgia,serif;color:#221c17;margin:0}#tw-blog p{font-size:15.5px;margin:0;color:#6b625a}#tw-blog small{font:500 12px "IBM Plex Sans",Arial,sans-serif;color:#6b625a}`;
const P = posts.map(p => ({ t: p.title, d: p.summary, k: fmtDate(p.date, p.lang), m: `${p.minutes} ${L(p.lang).min}`, u: p.url, img: `${BASE}/${p.image}` }));
fs.writeFileSync('blog.js', `/* The Way Derech · Blog cards. Generated by build-blog.js.
   GoDaddy code: <div id="tw-blog-root"></div><script src="${BASE}/blog.js"></script> */
(function(){var cur=document.currentScript,root=document.getElementById('tw-blog-root');
if(!root){root=document.createElement('div');root.id='tw-blog-root';cur.parentNode.insertBefore(root,cur);}
var st=document.createElement('style');st.textContent=${JSON.stringify(ecss)};document.head.appendChild(st);
var l=document.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(FONT)};document.head.appendChild(l);
var P=${JSON.stringify(P)};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
root.innerHTML='<section id="tw-blog"><div class="cards">'+P.map(function(p){return '<a class="card" href="'+p.u+'" target="_blank" rel="noopener"><span class="thumb" style="background-image:url(\\''+p.img+'\\')"></span><span class="in"><span class="k">'+esc(p.k)+'</span><h3>'+esc(p.t)+'</h3><p>'+esc(p.d)+'</p><small>'+esc(p.m)+'</small></span></a>'}).join('')+'</div></section>';})();
`);
fs.writeFileSync('blog/_posts/urls.json', JSON.stringify([`${BASE}/blog/`].concat(posts.map(p => p.url))));
console.log(`Built ${posts.length} blog post(s), blog index and blog.js`);
