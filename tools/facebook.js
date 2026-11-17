// Facebook Page poster for the Aliyah of the Day: the same short post as Telegram,
// as two separate Page posts (English, then Afrikaans), each with the day's image card.
//
//   node tools/facebook.js check     check the Page key and show which Page it posts to (posts nothing)
//   node tools/facebook.js post      post today's Aliyah once per day
//   node tools/facebook.js preview   print today's posts without sending
//
// The Page key comes from the GitHub secret FACEBOOK_PAGE_TOKEN. It is never stored in this repo.
const { todays, build, cardUrl, DATE, FORCE, readJSON, writeJSON } = require('./telegram.js');

const MODE = process.argv[2] || 'preview';
const TOKEN = process.env.FACEBOOK_PAGE_TOKEN;
const GRAPH = 'https://graph.facebook.com/v23.0';
const POSTED_FILE = 'facebook/posted.json';

// Facebook posts are plain text: drop the Telegram formatting tags, turn &amp; etc. back into characters.
const plain = html => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

async function graph(pathname, params, method = 'POST') {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const url = method === 'GET' ? `${GRAPH}/${pathname}?${body}` : `${GRAPH}/${pathname}`;
  const r = await fetch(url, method === 'GET' ? {} : { method, body });
  const j = await r.json();
  if (j.error) throw new Error(`Facebook said: ${j.error.message}`);
  return j;
}

async function check() {
  if (!TOKEN) throw new Error('The secret FACEBOOK_PAGE_TOKEN is missing. Add it under Settings → Secrets and variables → Actions.');
  const me = await graph('me', { fields: 'id,name' }, 'GET');
  console.log(`This key posts to: ${me.name} (id ${me.id})`);
  if (!/derech/i.test(me.name)) throw new Error('This key belongs to a personal profile or another Page. Copy the key for The WAY Derech Ha Yashar Ministries Page.');
  console.log('Facebook is connected. Nothing was posted.');
}

async function post(dry) {
  const a = todays();
  if (!a) { console.log(`No Aliyah in data/ for ${DATE}. Nothing to post.`); return; }
  const posts = ['en', 'af'].map(l => ({ text: plain(build(a, l).join('\n\n')), card: cardUrl(a, l) }));
  if (dry) { posts.forEach((p, i) => console.log(`----- Facebook post ${i + 1} (${p.text.length} characters) · card: ${p.card || 'none'} -----\n${p.text}\n`)); return; }
  if (!TOKEN) { console.log('Facebook is not connected yet (no FACEBOOK_PAGE_TOKEN secret), so nothing was posted.'); return; }
  const posted = readJSON(POSTED_FILE, {});
  if (posted[DATE] && !FORCE) { console.log(`Already posted to Facebook for ${DATE}. Skipping.`); return; }
  for (const { text, card } of posts) {
    const r = card ? await graph('me/photos', { url: card, caption: text }) : await graph('me/feed', { message: text });
    console.log(`Posted: ${r.post_id || r.id}`);
  }
  posted[DATE] = `${a.parashah} ${a.aliyah}`;
  writeJSON(POSTED_FILE, posted);
  console.log(`Posted ${a.parashah} Aliyah ${a.aliyah} to Facebook (English and Afrikaans).`);
}

(async () => {
  if (MODE === 'check') await check();
  else if (MODE === 'post') await post(false);
  else await post(true);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
