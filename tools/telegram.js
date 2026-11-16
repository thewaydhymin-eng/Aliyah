// Telegram poster for the Aliyah of the Day.
// Run by the GitHub workflows in .github/workflows/ — you never need to run it yourself.
//
//   node tools/telegram.js setup     find the group/channel the bot was added to, save it, send a test message
//   node tools/telegram.js post      post today's Aliyah (English, then Afrikaans) once per day
//   node tools/telegram.js preview   print today's posts without sending (no token needed)
//
// The bot token comes from the GitHub secret TELEGRAM_BOT_TOKEN. It is never stored in this repo.
// The channel is saved in telegram/channel.json, and posted days in telegram/posted.json.
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] || 'preview';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FORCE = process.env.FORCE === 'true';
const DATE = process.env.ALIYAH_DATE || new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
const CFG = JSON.parse(fs.readFileSync('config.json', 'utf8'));
const BASE = CFG.base.replace(/\/$/, '');
const SITE = 'https://thewayderech.co.za/aliyah-a-day';
const CHANNEL_FILE = 'telegram/channel.json';
const POSTED_FILE = 'telegram/posted.json';
const LIMIT = 4096;

const L = {
  en: { ord: ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'], act: 'Action', aod: 'Action Step of the Day', full: 'Full Aliyah' },
  af: { ord: ['1ste', '2de', '3de', '4de', '5de', '6de', '7de'], act: 'Aksie', aod: 'Aksie van die Dag', full: 'Volledige Aliyah' },
};

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slugify = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const readJSON = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const writeJSON = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n'); };

async function api(method, body) {
  if (!TOKEN) throw new Error('The secret TELEGRAM_BOT_TOKEN is missing. Add it under Settings → Secrets and variables → Actions.');
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(`Telegram said: ${j.description || r.status}`);
  return j.result;
}

// ---- find today's Aliyah ----------------------------------------------------
function todays() {
  let all = [];
  fs.readdirSync('data').filter(f => f.endsWith('.json')).forEach(f => { all = all.concat(readJSON(path.join('data', f), [])); });
  return all.find(a => a.date === DATE);
}

// ---- build one language's post as Telegram HTML, split into parts if too long --
function build(a, lang) {
  const c = a[lang], t = L[lang];
  const head = [
    `<b>${esc(c.blessing)}</b>`,
    `<b>${esc(c.hook)}</b>`,
    `Parashat ${esc(a.parashah)} · ${t.ord[a.aliyah - 1]} Aliyah\n${esc(a.ref)}`,
    esc(c.summary),
  ].join('\n\n');
  const qs = (c.questions || []).map((q, i) => {
    let s = `<b>${i + 1}. ${esc(q.q)}</b> (${esc(q.ref)})\n${esc(q.answer)}`;
    (q.key || []).forEach(k => { s += `\n<i>${esc(k)}</i>`; });
    if (q.action) s += `\n<b>${t.act}:</b> ${esc(q.action)}${q.detail ? ' ' + esc(q.detail) : ''}`;
    return s;
  });
  let tail = `<b>${t.aod}</b>`;
  if (c.closing) tail += `\n<b>${esc(c.closing)}</b>`;
  if (c.actionOfDay) tail += `\n${esc(c.actionOfDay)}`;
  tail += `\n\n${t.full}: ${SITE}`;

  const blocks = [head, ...qs, tail];
  const parts = [];
  let cur = '';
  for (const b of blocks) {
    const next = cur ? cur + '\n\n' + b : b;
    if (next.length > LIMIT && cur) { parts.push(cur); cur = b; } else cur = next;
  }
  if (cur) parts.push(cur);
  return parts;
}

function cardUrl(a) {
  const f = `assets/cards/${a.year}-${slugify(a.parashah)}-${a.aliyah}.jpg`;
  return fs.existsSync(f) ? `${BASE}/${f}` : null;
}

async function send(chatId, text, card) {
  const body = { chat_id: chatId, text, parse_mode: 'HTML' };
  body.link_preview_options = card
    ? { url: card, prefer_large_media: true, show_above_text: true }
    : { is_disabled: true };
  return api('sendMessage', body);
}

// ---- modes ----------------------------------------------------------------
// Works for a group, supergroup or channel. Two ways to find it:
//  1. automatic: the bot looks at what it saw in the last 24 hours (being added, or "/start@BotName" sent in the group)
//  2. by hand: the workflow's "group" box gets the group's @username or numeric id (e.g. -1001234567890)
async function setup() {
  const me = await api('getMe');
  console.log(`Bot found: @${me.username} (name: ${me.first_name})`);
  // A webhook left over from another tool blocks getUpdates, so clear it (pending updates are kept).
  await api('deleteWebhook', { drop_pending_updates: false });

  let chat = null;
  const manual = (process.env.TELEGRAM_GROUP || '').trim();
  if (manual) {
    console.log(`Looking up the group you typed: ${manual}`);
    chat = await api('getChat', { chat_id: /^-?\d+$/.test(manual) ? Number(manual) : manual });
  } else {
    const ups = await api('getUpdates', { allowed_updates: ['message', 'channel_post', 'my_chat_member'] });
    console.log(`Updates the bot can see from the last 24 hours: ${ups.length}`);
    const chats = new Map();
    const moved = new Map();
    for (const u of ups) {
      const m = u.my_chat_member;
      if (m) {
        console.log(`  - bot status in "${m.chat.title}" changed to: ${m.new_chat_member.status}`);
        if (['administrator', 'member'].includes(m.new_chat_member.status)) chats.set(m.chat.id, m.chat);
        else chats.delete(m.chat.id);
      }
      const p = u.channel_post || u.message;
      if (p && p.chat && p.chat.type !== 'private') {
        if (p.migrate_to_chat_id) moved.set(p.chat.id, p.migrate_to_chat_id);
        chats.set(p.chat.id, p.chat);
        console.log(`  - message seen in "${p.chat.title}" (${p.chat.type})`);
      }
      if (p && p.chat && p.chat.type === 'private') console.log(`  - private message from ${p.from && p.from.first_name} (ignored)`);
    }
    // A small group that became a supergroup gets a new id; use the new one.
    for (const [from, to] of moved) { chats.delete(from); chats.set(to, await api('getChat', { chat_id: to })); }
    if (!chats.size) {
      throw new Error(`The bot can't see your group yet. In the group, check that @${me.username} (exactly this name) is an Administrator, then send the message /start@${me.username} in the group and run this again within 24 hours.`);
    }
    const list = [...chats.values()];
    list.forEach(c => console.log(`Found: "${c.title}" (${c.type}) id ${c.id}`));
    chat = list.find(c => /derech/i.test(c.title || '')) || list[list.length - 1];
  }

  const member = await api('getChatMember', { chat_id: chat.id, user_id: me.id });
  console.log(`Bot's role in "${chat.title}": ${member.status}`);
  if (!['administrator', 'creator', 'member'].includes(member.status)) {
    throw new Error(`@${me.username} is not in "${chat.title}". Add it as an Administrator and run this again.`);
  }
  if (chat.type === 'channel' && !member.can_post_messages) {
    throw new Error(`@${me.username} is an admin of the channel but "Post Messages" is off. Switch it on and run this again.`);
  }
  writeJSON(CHANNEL_FILE, { chat_id: chat.id, title: chat.title, type: chat.type, bot: me.username, saved: DATE });
  await send(chat.id, '✅ <b>The Way Derech</b> bot is connected. The Aliyah of the Day will be posted here every day just after midnight, when it appears on the website.\n\n<i>(You can delete this test message.)</i>');
  console.log(`Saved "${chat.title}" and sent a test message there.`);
}

async function post(dry) {
  const a = todays();
  if (!a) { console.log(`No Aliyah in data/ for ${DATE}. Nothing to post.`); return; }
  const parts = [...build(a, 'en'), ...build(a, 'af')];
  const card = cardUrl(a);
  if (dry) {
    console.log(`Date ${DATE} · card: ${card || 'none'}\n`);
    parts.forEach((p, i) => console.log(`----- message ${i + 1} (${p.length} characters) -----\n${p}\n`));
    return;
  }
  const ch = readJSON(CHANNEL_FILE, null);
  if (!ch) { console.log('Telegram is not connected yet, so nothing was posted. Run "Telegram – 1. Connect group" first.'); return; }
  const posted = readJSON(POSTED_FILE, {});
  if (posted[DATE] && !FORCE) { console.log(`Already posted for ${DATE}. Skipping.`); return; }
  for (let i = 0; i < parts.length; i++) {
    // The card shows above the first English and the first Afrikaans message.
    const first = i === 0 || i === build(a, 'en').length;
    await send(ch.chat_id, parts[i], first ? card : null);
  }
  posted[DATE] = `${a.parashah} ${a.aliyah}`;
  writeJSON(POSTED_FILE, posted);
  console.log(`Posted ${a.parashah} Aliyah ${a.aliyah} (${parts.length} messages) to ${ch.title}.`);
}

(async () => {
  if (MODE === 'setup') await setup();
  else if (MODE === 'post') await post(false);
  else await post(true);
})().catch(e => { console.error('ERROR: ' + e.message); process.exit(1); });
