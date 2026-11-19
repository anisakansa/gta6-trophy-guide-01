// Leonida Trophy Atlas — offline tracker for the 55 GTA VI trophies.
// Progress lives only in this browser (localStorage); export/import moves it as JSON.
const KEY = 'leonida-trophy-atlas-v1';
const SPOILER_KEY = 'leonida-trophy-atlas-spoilers';
const $ = (id) => document.getElementById(id);

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let earned = new Set();
try {
  earned = new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]').filter((n) => typeof n === 'string'));
} catch { earned = new Set(); }
earned = new Set([...earned].filter((name) => trophies.some((t) => t.name === name)));

let hideSpoilers = localStorage.getItem(SPOILER_KEY) === '1';
$('spoilers').checked = hideSpoilers;

const KIND_LABELS = {
  story: 'Story', side: 'Side mission', activity: 'Activity', collectible: 'Collectible',
  exploration: 'Exploration', combat: 'Combat', heist: 'Heist', money: 'Money', misc: 'Odd job',
};
const GRADE_ORDER = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
const STAGES = [
  ['Play the story', 'Chapters 1–4, the named story missions and the finale. Save manually at the start of every chapter.'],
  ['Side strands & the one missable', 'Finish the contact strands (Andy, Kenton, Billy, Randy, Tyrone), 8 stranger strands and Bret\u2019s hunt — and meditate at Lucia\u2019s balcony in Chapter 1 before it closes.'],
  ['Activities & challenges', 'Shooting range golds, drone races, races, fishing, arcade, bowling, 250 stunts and 50 challenges.'],
  ['Explore & collect', 'Every region of Leonida, 100 vehicles, card sets, 100 WAiNK spots and the odd secrets.'],
  ['Money & heists', 'Shops, bank vaults, armored trucks, gang operations, laundering, spending and garages.'],
  ['The platinum', 'Reach 100% completion — the in-game checklist shows the last few percent — and Vice Got a Price! pops.'],
];

function save() {
  localStorage.setItem(KEY, JSON.stringify([...earned]));
  localStorage.setItem(SPOILER_KEY, hideSpoilers ? '1' : '0');
}

function isHidden(t) {
  return hideSpoilers && t.secret && !earned.has(t.name);
}

function visibleTrophies() {
  const q = $('search').value.trim().toLowerCase();
  const kind = $('kind').value;
  const grade = $('grade').value;
  const status = $('status').value;
  const unconfirmedOnly = $('guidesOnly').checked;
  let list = trophies.filter((t) => {
    if (kind !== 'all' && t.kind !== kind) return false;
    if (grade !== 'all' && t.grade !== grade) return false;
    if (status === 'earned' && !earned.has(t.name)) return false;
    if (status === 'unearned' && earned.has(t.name)) return false;
    if (status === 'missable' && !t.missable) return false;
    if (unconfirmedOnly && !t.source.includes('unconfirmed')) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.guide.toLowerCase().includes(q))) return false;
    return true;
  });
  const sort = $('sort').value;
  if (sort === 'grade') list = [...list].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || a.id - b.id);
  else if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name));
  return list;
}

function badge(text, cls) {
  const s = document.createElement('span');
  s.className = `badge ${cls}`;
  s.textContent = text;
  return s;
}

function renderCard(t) {
  const card = document.createElement('article');
  card.className = 'card' + (earned.has(t.name) ? ' earned' : '');
  const hidden = isHidden(t);
  if (hidden) card.classList.add('spoiler-hidden');

  const head = document.createElement('div');
  head.className = 'card-head';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', `Mark ${hidden ? 'hidden trophy' : t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    save();
    render();
  });
  const title = document.createElement('h3');
  title.className = 'card-title';
  const num = document.createElement('span');
  num.className = 'num';
  num.textContent = `#${t.id} · ${t.points} points`;
  title.append(num, document.createTextNode(hidden ? 'Hidden trophy — earn it to reveal' : t.name));
  head.append(box, title);
  card.append(head);

  const desc = document.createElement('p');
  desc.className = 'card-desc';
  desc.textContent = hidden ? 'A hidden story trophy. Its name and description stay concealed until you earn it.' : t.description;
  card.append(desc);

  const badges = document.createElement('div');
  badges.className = 'badges';
  badges.append(badge(t.grade, t.grade), badge(KIND_LABELS[t.kind] ?? t.kind, 'kind'));
  if (t.secret) badges.append(badge('Hidden', 'secret'));
  if (t.missable) badges.append(badge('Potentially missable', 'missable'));
  if (t.source.includes('unconfirmed')) badges.append(badge('Step unconfirmed', 'unconfirmed'));
  card.append(badges);

  const guide = document.createElement('details');
  guide.className = 'card-guide';
  guide.open = !hidden;
  const summary = document.createElement('summary');
  summary.textContent = hidden ? 'Guide hidden with spoilers' : 'How to earn it';
  const body = document.createElement('p');
  body.textContent = hidden ? 'Turn spoilers off, or earn this trophy, to read its guide.' : t.guide;
  guide.append(summary, body);
  card.append(guide);

  const src = document.createElement('p');
  src.className = 'card-source';
  src.textContent = `Sources: ${t.source}`;
  card.append(src);
  return card;
}

function renderDashboard() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  const points = trophies.filter((t) => earned.has(t.name)).reduce((s, t) => s + t.points, 0);
  const totalPoints = trophies.reduce((s, t) => s + t.points, 0);
  const pct = Math.round((done / total) * 100);
  $('progressFill').style.width = `${pct}%`;
  $('progressText').textContent = `${done} of ${total} earned`;
  $('pointsText').textContent = `${points.toLocaleString()} of ${totalPoints.toLocaleString()} points`;
  $('percentText').textContent = `${pct}%`;
  const chips = $('gradeCounts');
  chips.replaceChildren();
  for (const g of ['platinum', 'gold', 'silver', 'bronze']) {
    const all = trophies.filter((t) => t.grade === g).length;
    const got = trophies.filter((t) => t.grade === g && earned.has(t.name)).length;
    const chip = document.createElement('span');
    chip.className = `grade-chip ${g}`;
    chip.innerHTML = '';
    const b = document.createElement('b');
    b.textContent = g[0].toUpperCase() + g.slice(1);
    chip.append(b, document.createTextNode(` ${got}/${all}`));
    chips.append(chip);
  }
  const left = total - done;
  $('platinumState').textContent = done === total
    ? 'Leonida Legend — platinum earned!'
    : `${left} ${left === 1 ? 'trophy' : 'trophies'} to go`;
  $('platinumCard').style.opacity = done === total ? '1' : '';
}

function renderStages() {
  const ol = $('stages');
  ol.replaceChildren();
  STAGES.forEach(([title, text], i) => {
    const stageTrophies = trophies.filter((t) => t.stage === i + 1);
    const got = stageTrophies.filter((t) => earned.has(t.name)).length;
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = title;
    const p = document.createElement('p');
    p.textContent = text;
    const meta = document.createElement('p');
    meta.className = 'stage-meta';
    meta.textContent = `${got}/${stageTrophies.length} earned in this stage`;
    li.append(h, p, meta);
    ol.append(li);
  });
  const miss = trophies.find((t) => t.missable);
  $('missableCallout').textContent = miss
    ? `⚠ Only one trophy can be missed: #${miss.id} ${miss.name} — ${miss.description} ${earned.has(miss.name) ? '(earned — safe.)' : '(not earned yet — meditate at Lucia’s balcony before Chapter 1 ends.)'}`
    : '';
}

function render() {
  renderDashboard();
  renderStages();
  const list = visibleTrophies();
  const cards = $('cards');
  cards.replaceChildren(...list.map(renderCard));
  $('empty').hidden = list.length > 0;
  $('resultCount').textContent = `Showing ${list.length} of ${trophies.length} trophies` +
    (hideSpoilers ? ' · spoilers hidden' : '');
}

$('search').addEventListener('input', render);
for (const id of ['kind', 'grade', 'status', 'sort']) $(id).addEventListener('change', render);
$('guidesOnly').addEventListener('change', render);
$('spoilers').addEventListener('change', (e) => {
  hideSpoilers = e.target.checked;
  save();
  render();
});

$('export').addEventListener('click', () => {
  const payload = { game: 'Grand Theft Auto VI', exported: new Date().toISOString(), earned: [...earned] };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'leonida-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

$('import').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const names = Array.isArray(data) ? data : data.earned;
    if (!Array.isArray(names)) throw new Error('no earned list');
    const valid = names.filter((n) => trophies.some((t) => t.name === n));
    if (valid.length === 0 && names.length > 0) throw new Error('no matching trophy names');
    earned = new Set(valid);
    save();
    render();
  } catch (err) {
    alert(`Could not import that file: ${err.message}. It must be a progress file exported from this guide.`);
  }
  e.target.value = '';
});

$('reset').addEventListener('click', () => {
  if (confirm('Clear all earned trophies? This cannot be undone (export first if you want a backup).')) {
    earned = new Set();
    save();
    render();
  }
});

window.__atlasReady = true;
render();
