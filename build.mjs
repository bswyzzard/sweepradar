// SweepRadar static site generator. Usage: node build.mjs [dataset-dir | dataset-url]
// Env: DATASET_URL (Apify dataset items URL), BASE_URL, BASE_PATH
import fs from 'node:fs'; import path from 'node:path';
const SRC = process.argv[2] || process.env.DATASET_URL || '../apify-actors/sweepstakes-radar/storage/datasets/default';
const BASE_URL = process.env.BASE_URL || 'https://bswyzzard.github.io';
const BP = process.env.BASE_PATH ?? '/sweepradar';
const OUT = 'dist', NAME = 'SweepRadar';
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
async function load() {
  if (/^https?:/.test(SRC)) { const r = await fetch(SRC); if (!r.ok) throw new Error('fetch ' + r.status); return r.json(); }
  return fs.readdirSync(SRC).filter(f => /^\d+\.json$/.test(f)).map(f => JSON.parse(fs.readFileSync(path.join(SRC, f))));
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
const money = n => n ? '$' + Math.round(n).toLocaleString('en-US') : null;
const fmtDate = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not stated';
const days = d => d ? Math.round((new Date(d + 'T12:00:00') - new Date(today + 'T12:00:00')) / 864e5) : null;
const CATS = {
  cash: { label: 'Cash prizes', re: /\b(cash|\$\d[\d,]*\s*(cash|check)|visa prepaid|paypal|venmo|money)\b/i },
  cars: { label: 'Car & vehicle giveaways', re: /\b(car|truck|suv|vehicle|jeep|ford|toyota|chevy|chevrolet|tesla|motorcycle|atv|boat)\b/i },
  travel: { label: 'Trip & travel sweepstakes', re: /\b(trip|vacation|travel|flight|airfare|hotel|resort|cruise|getaway|nights?)\b/i },
  electronics: { label: 'Electronics giveaways', re: /\b(tv|television|laptop|ipad|iphone|tablet|playstation|ps5|xbox|nintendo|switch|console|headphones|speaker|camera|gaming pc|smartwatch)\b/i },
  'gift-cards': { label: 'Gift card giveaways', re: /\bgift ?cards?\b/i },
};
function clean(x, i) {
  const t = (x.title || '').replace(/\s+/g, ' ').trim();
  let sp = (x.sponsor || '').trim();
  if (!sp || sp.length > 50 || /^[(a-z]/.test(sp) || /provided|winner|prize/i.test(sp)) sp = null;
  const text = t + ' ' + (x.prize || '');
  const cats = Object.keys(CATS).filter(k => CATS[k].re.test(text));
  const winners = Number.isFinite(x.winners) && x.winners > 0 ? x.winners : null;
  return { ...x, title: t, sponsorClean: sp, cats, winnersN: winners, daily: /daily/i.test(x.entryFrequency || '') };
}
const rel = u => /sweet|lovers|sweepstakesfanatics|sweepsadvantage|contestgirl|online-sweepstakes|ilovegiveaways|sweepstakesbible/i.test(u || '') ? 'nofollow noopener' : 'noopener';
function summary(s) {
  const bits = [];
  bits.push(`${s.title} is ${s.sponsorClean ? 'a sweepstakes from ' + s.sponsorClean : 'an open sweepstakes'}`
    + (s.endDate ? ` that ends ${fmtDate(s.endDate)}` : '') + '.');
  if (s.arvUsd) bits.push(`Each prize has an approximate retail value of ${money(s.arvUsd)}${s.winnersN > 1 ? `, with ${s.winnersN.toLocaleString()} winners` : ''}.`);
  else if (s.winnersN) bits.push(`${s.winnersN.toLocaleString()} winner${s.winnersN > 1 ? 's' : ''} will be selected.`);
  if (s.cats.length) bits.push(`Prize type: ${s.cats.map(c => CATS[c].label.replace(/ (prizes|giveaways|sweepstakes)$/i, '').toLowerCase()).join(', ')}.`);
  bits.push(s.daily ? 'You can enter once per day.' : 'Entry is typically once per person; check the rules.');
  bits.push(`Eligibility: ${eligTxt(s)}.`);
  return bits.join(' ');
}
const css = `*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1b1f24;background:#f7f8fa}a{color:#0b5bd3}header,main,footer{max-width:860px;margin:auto;padding:0 16px}header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding-top:14px}header .logo{font-weight:800;font-size:1.3rem;text-decoration:none;color:#111}nav a{margin-right:12px;font-size:.95rem}h1{font-size:1.6rem;line-height:1.25}h2{margin-top:2rem}ul.list{list-style:none;padding:0}ul.list li{background:#fff;border:1px solid #e3e6ea;border-radius:10px;padding:12px 14px;margin:8px 0}ul.list .m{color:#5b6573;font-size:.9rem}.card{background:#fff;border:1px solid #e3e6ea;border-radius:12px;padding:16px}dl{display:grid;grid-template-columns:max-content 1fr;gap:6px 14px}dt{font-weight:600}.btn{display:inline-block;background:#0b5bd3;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin:6px 8px 6px 0}.btn.alt{background:#e8eefb;color:#0b5bd3}.note{background:#fff8e1;border:1px solid #f1d98a;border-radius:10px;padding:10px 14px;font-size:.92rem}.app{background:#111;color:#fff;border-radius:12px;padding:16px;margin:28px 0}.app a{color:#9cc3ff}footer{color:#5b6573;font-size:.88rem;padding:30px 16px}`;
const DISC = `<p class="note"><strong>Data only.</strong> We don't sponsor or run these sweepstakes. Always read the official rules. No purchase necessary to enter or win a legal sweepstakes.</p>`;
const APP = `<section class="app" id="app"><h2 style="margin-top:0">Get the ${NAME} app (coming soon)</h2><p>Daily "ending soon" alerts and a tracker for what you've entered. The iPhone app is in the works. <a href="${BP}/app/">Try the web preview</a>.</p></section>`;
function page({ title, desc, pathname, body, noindex, jsonld, ogType = 'website' }) {
  const url = BASE_URL + BP + pathname;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><link rel="canonical" href="${url}">
${noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<meta property="og:site_name" content="${NAME}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="og:type" content="${ogType}"><meta name="twitter:card" content="summary">
<link rel="stylesheet" href="${BP}/style.css">${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}</head><body>
<header><a class="logo" href="${BP}/">📡 ${NAME}</a><nav><a href="${BP}/category/cash/">Cash</a><a href="${BP}/category/cars/">Cars</a><a href="${BP}/category/travel/">Travel</a><a href="${BP}/daily/">Daily</a><a href="${BP}/state/washington/">Washington</a><a href="${BP}/state/">States</a><a href="${BP}/app/">App</a></nav></header>
<main>${body}</main><footer>${DISC}<p><a href="${BP}/about/">About</a> · <a href="${BP}/privacy/">Privacy</a> · <a href="${BP}/archive/">Ended sweepstakes</a> · Updated ${fmtDate(today)}</p></footer></body></html>`;
}
const li = s => `<li><a href="${BP}/s/${s.slug}/"><strong>${esc(s.title)}</strong></a><div class="m">${[s.endDate ? (days(s.endDate) === 0 ? 'Ends today' : 'Ends ' + fmtDate(s.endDate)) : null, s.arvUsd ? money(s.arvUsd) + ' ARV' : null, s.winnersN ? s.winnersN.toLocaleString() + ' winner' + (s.winnersN > 1 ? 's' : '') : null, s.daily ? 'Daily entry' : null].filter(Boolean).join(' · ')}</div></li>`;
const ul = a => a.length ? `<ul class="list">${a.map(li).join('')}</ul>` : '<p>Nothing right now. Check back tomorrow.</p>';
function write(p, html) { const f = path.join(OUT, p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); }
const raw = (await load()).filter(x => x && x.title);
const ST = {AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'};
const elig = (s, st) => { const e = s.eligibleStates || ['US-50+DC', ...(s.excludedStates || []).map(x => '-' + x)]; return e[0] === 'US-50+DC' ? !e.includes('-' + st) : e.includes(st); };
const eligTxt = s => { const e = s.eligibleStates || ['US-50+DC', ...(s.excludedStates || []).map(x => '-' + x)]; return e[0] === 'US-50+DC' ? 'All 50 states + DC' + (e.length > 1 ? ', except ' + e.slice(1).map(x => x.slice(1)).join(', ') : '') : 'Only ' + e.join(', '); };
const seen = new Set();
const all = raw.map(clean).map(s => { let b = slugify(s.title) || 'sweepstakes', sl = b, n = 2; while (seen.has(sl)) sl = `${b}-${n++}`; seen.add(sl); return { ...s, slug: sl }; });
const live = all.filter(s => !s.endDate || s.endDate >= today), ended = all.filter(s => s.endDate && s.endDate < today);
const byEnd = (a, b) => (a.endDate || '9999').localeCompare(b.endDate || '9999');
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT);
fs.writeFileSync(path.join(OUT, 'style.css'), css); fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
const urls = [];
const add = (p, args) => { write(p, page({ pathname: p, ...args })); if (!args.noindex) urls.push(p); };
// home
const endingToday = live.filter(s => days(s.endDate) === 0).sort(byEnd);
const week = live.filter(s => { const d = days(s.endDate); return d > 0 && d <= 7; }).sort(byEnd);
const big = [...live].filter(s => s.arvUsd).sort((a, b) => b.arvUsd - a.arvUsd).slice(0, 15);
const most = [...live].filter(s => s.winnersN > 1).sort((a, b) => b.winnersN - a.winnersN).slice(0, 15);
add('/', { title: `${NAME}: Open Sweepstakes & Giveaways Ending Soon (${live.length} live)`, desc: `${live.length} open sweepstakes you can enter today, sorted by deadline, prize value and number of winners. Updated daily.`,
  jsonld: { '@context': 'https://schema.org', '@type': 'WebSite', name: NAME, url: BASE_URL + BP + '/' },
  body: `<h1>Open sweepstakes, sorted by deadline and prize</h1><p>${live.length} live sweepstakes and giveaways, updated ${fmtDate(today)}. Every listing links to the sponsor's official rules.</p>
<h2>Ending today</h2>${ul(endingToday)}<h2>Ending this week</h2>${ul(week.slice(0, 25))}<h2>Biggest prizes</h2>${ul(big)}<h2>Most winners</h2>${ul(most)}${APP}
<h2>Browse</h2><ul>${Object.entries(CATS).map(([k, c]) => `<li><a href="${BP}/category/${k}/">${c.label}</a></li>`).join('')}<li><a href="${BP}/daily/">Daily-entry sweepstakes</a></li><li><a href="${BP}/one-time/">One-time entry sweepstakes</a></li><li><a href="${BP}/state/washington/">Sweepstakes open to Washington residents</a></li></ul>` });
// detail pages
for (const s of all) {
  const isEnded = ended.includes(s);
  const where = s.sponsorClean ? ` by ${s.sponsorClean}` : '';
  const title = `${s.title}${s.endDate ? ` (Ends ${fmtDate(s.endDate)})` : ''} | ${NAME}`;
  const desc = (isEnded ? 'Ended. ' : '') + `${s.title}${where}: ${s.arvUsd ? money(s.arvUsd) + ' prize value, ' : ''}${s.winnersN ? s.winnersN + ' winner(s), ' : ''}${s.daily ? 'daily entry, ' : ''}deadline ${fmtDate(s.endDate)}. Rules and entry link.`.slice(0, 300);
  const rulesBtn = s.officialRulesUrl ? `<a class="btn alt" href="${esc(s.officialRulesUrl)}" rel="${rel(s.officialRulesUrl)}" target="_blank">Official rules</a>` : '';
  const entry = s.entryUrl || s.source;
  const entryBtn = !isEnded && entry ? `<a class="btn" href="${esc(entry)}" rel="${rel(entry)}" target="_blank">Go to entry page</a>` : '';
  const jsonld = { '@context': 'https://schema.org', '@type': 'Event', name: s.title, description: summary(s), eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    startDate: s.startDate && s.startDate <= (s.endDate || s.startDate) ? s.startDate : (s.postedAt || '').slice(0, 10) || today, endDate: s.endDate || undefined,
    location: { '@type': 'VirtualLocation', url: entry }, organizer: s.sponsorClean ? { '@type': 'Organization', name: s.sponsorClean } : undefined,
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD', availability: isEnded ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock', url: entry, validThrough: s.endDate || undefined } };
  add(`/s/${s.slug}/`, { title, desc, noindex: isEnded, ogType: 'article', jsonld: isEnded ? null : jsonld, body: `
<p><a href="${BP}/">← All sweepstakes</a></p><h1>${esc(s.title)}</h1>${isEnded ? '<p class="note"><strong>This sweepstakes has ended.</strong> It is kept for reference only.</p>' : ''}
<div class="card"><dl><dt>Deadline</dt><dd>${fmtDate(s.endDate)}${!isEnded && days(s.endDate) != null ? ` (${days(s.endDate) === 0 ? 'today' : days(s.endDate) + ' days left'})` : ''}</dd>
<dt>Sponsor</dt><dd>${esc(s.sponsorClean || 'See official rules')}</dd><dt>Prize value (ARV)</dt><dd>${s.arvUsd ? money(s.arvUsd) + ' per prize' : 'See official rules'}</dd>
<dt>Winners</dt><dd>${s.winnersN ? s.winnersN.toLocaleString() : 'See official rules'}</dd><dt>Entry frequency</dt><dd>${s.daily ? 'Daily' : esc(s.entryFrequency && s.entryFrequency !== 'unknown' ? s.entryFrequency : 'One-time / see rules')}</dd>
<dt>Eligibility</dt><dd>${s.minAge ? s.minAge + '+, ' : ''}${s.usOnly ? 'U.S. residents' : 'See rules for residency'}; ${esc(eligTxt(s))}.</dd>
<dt>How to enter</dt><dd>${esc({ form: 'Online entry form', email: 'Email entry', social: 'Social media entry', mail: 'Mail-in entry', code: 'Enter a code' }[s.entryMethod] || 'Online. Follow the steps on the entry page.')}</dd></dl>
<p>${entryBtn}${rulesBtn}</p></div><h2>Summary</h2><p>${esc(summary(s))}</p>
<p>${s.cats.map(c => `<a href="${BP}/category/${c}/">${CATS[c].label}</a>`).join(' · ')}</p>${DISC}${APP}` });
}
// lists
const listPage = (p, h, intro, arr) => add(p, { title: `${h} (${arr.length} open) | ${NAME}`, desc: `${intro} ${arr.length} open now, sorted by deadline. Updated ${fmtDate(today)}.`, body: `<h1>${h}</h1><p>${intro}</p>${ul(arr.sort(byEnd))}${APP}` });
for (const [k, c] of Object.entries(CATS)) listPage(`/category/${k}/`, c.label, `Open ${c.label.toLowerCase()} you can enter now.`, live.filter(s => s.cats.includes(k)));
listPage('/daily/', 'Daily-entry sweepstakes', 'Sweepstakes you can enter once every day for more chances to win.', live.filter(s => s.daily));
listPage('/one-time/', 'One-time entry sweepstakes', 'Enter once and you\'re done.', live.filter(s => !s.daily));
listPage('/state/washington/', 'Sweepstakes open to Washington residents', 'Sweepstakes that don\'t exclude Washington State, based on the official rules.', live.filter(s => elig(s, 'WA')));
for (const [k, n] of Object.entries(ST)) if (k !== 'WA') listPage(`/state/${slugify(n)}/`, `Sweepstakes open to ${n} residents`, `Sweepstakes that don't exclude ${n}, based on the official rules.`, live.filter(s => elig(s, k)));
add('/state/', { title: `Sweepstakes by state | ${NAME}`, desc: 'Open sweepstakes filtered by US state eligibility.', body: `<h1>Sweepstakes by state</h1><ul>${Object.entries(ST).map(([k, n]) => `<li><a href="${BP}/state/${slugify(n)}/">${n}</a> (${live.filter(s => elig(s, k)).length})</li>`).join('')}</ul>` });
// compact app feed
const FC = { car: 'car', cash: 'cash', travel: 'travel', electronics: 'electronics', gift_card: 'gift_card', home: 'home' };
const FF = new Set(['daily', 'weekly', 'one-time', 'instant-win']);
fs.writeFileSync(path.join(OUT, 'feed.json'), JSON.stringify({ updated: today, count: live.length, items: live.sort(byEnd).map(s => ({
  id: s.slug, title: s.title, sponsor: s.sponsorClean, prize: (s.prize || '').slice(0, 280) || null, arv: s.arvUsd || null, winners: s.winnersN,
  end: s.endDate || null, freq: FF.has(s.entryFrequency) ? s.entryFrequency : (s.daily ? 'daily' : 'one-time'), cat: FC[s.prizeCategory] || 'other',
  states: s.eligibleStates || ['US-50+DC', ...(s.excludedStates || []).map(x => '-' + x)], minAge: s.minAge || null,
  rules: s.officialRulesUrl || null, entry: s.entryUrl || s.source || null, img: s.imageUrl || null, url: BASE_URL + BP + '/s/' + s.slug + '/' })) }));
add('/archive/', { title: `Ended sweepstakes archive | ${NAME}`, desc: 'Sweepstakes that have closed.', noindex: true, body: `<h1>Ended sweepstakes</h1>${ul(ended.sort(byEnd).reverse())}` });
add('/about/', { title: `About ${NAME}`, desc: `${NAME} is a free directory of open sweepstakes, sorted by deadline and prize.`, body: `<h1>About ${NAME}</h1><p>${NAME} is a free, data-only directory of open sweepstakes and giveaways. We gather public listings daily, check deadlines and state eligibility, and link you to each sponsor's official rules and entry page. We don't enter sweepstakes for you, and we're not affiliated with any sponsor.</p>${APP}` });
add('/privacy/', { title: `Privacy Policy | ${NAME}`, desc: `${NAME} privacy policy.`, body: `<h1>Privacy Policy</h1><p>Last updated ${fmtDate(today)}.</p><p>This site doesn't collect personal information, use accounts, or set tracking cookies. Our host (GitHub Pages) may keep standard server logs, like IP addresses, for security. When you click through to a sponsor's site, their privacy policy applies. If we add an email list or analytics later, this page will be updated first.</p><h2>SweepRadar app</h2><p>The SweepRadar app has no accounts and collects no personal data. Your home state, saved sweepstakes, tracker statuses and reminder settings are stored only on your device. Reminders are optional, off by default, and scheduled locally on your device. The app downloads the public listings feed from this site. We don't sell data, run ads that track you, or share anything with third parties. Contact: akfc12@gmail.com.</p>` });
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${BASE_URL + BP + u}</loc><lastmod>${today}</lastmod></url>`).join('')}</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE_URL + BP}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, '404.html'), page({ title: 'Not found | ' + NAME, desc: 'Page not found', pathname: '/404', noindex: true, body: `<h1>Not found</h1><p>This sweepstakes may have ended. <a href="${BP}/">See open sweepstakes</a>.</p>` }));
console.log(`built: ${all.length} listings (${live.length} live, ${ended.length} ended), ${urls.length} indexable URLs`);

// Copy static files (e.g. Search Console verification) into dist root
import { cpSync as __cp, existsSync as __ex } from 'node:fs';
if (__ex('static')) __cp('static', 'dist', { recursive: true });
