/* ===== core: data, state, helpers ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const f0 = d3.format(',.0f'), f1 = d3.format('.1f'), f2 = d3.format('.2f');
const p0 = d => d3.format('.0%')(d), p1 = d => d3.format('.1%')(d);

/* palette: dataviz reference, fixed entity -> colour (never recoloured by a filter) */
const C = {
  blue: '#2a78d6', orange: '#eb6834', aqua: '#1baf7a', yellow: '#eda100', magenta: '#e87ba4',
  green: '#008300', violet: '#6250d6',
  ink: '#0b0b0b', ink2: '#52514e', muted: '#898781', grid: '#e1e0d9', axis: '#c3c2b7',
  surface: '#fcfcfb', ctx: '#a9a89f', neutralDark: '#6b6a66', neutralLight: '#d6d5cd',
  red: '#e34948', dark: '#2b2a28'
};
/* Colour meanings are fixed across the page. Outcome hues (below) are never reused for a grouping.
   Ordered groupings (injury era, age at injury) use one neutral luminance ramp, light = older era / older age;
   the only extra hue is red, reserved for the RQ2 exception group. */
const ERA_TONES = ['#b9b8af', '#807f79', '#3d3c39'];
const RAMP = { 100: '#cde2fb', 250: '#86b6ef', 400: '#3987e5', 450: '#2a78d6', 550: '#1c5cab', 700: '#0d366b' };
const HEAT = d3.scaleLinear().domain([0, .2, .4, .6, .8, 1])
  .range(['#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#1c5cab', '#0d366b']).interpolate(d3.interpolateRgb);

/* outcomes on a common 0-100 axis (SWL rescaled from 5-35) */
const OUT = [
  { k: 'PI', name: 'Physical independence', color: C.blue, lo: 0, hi: 100, unit: '0–100' },
  { k: 'SWL', name: 'Life satisfaction (SWL)', color: C.orange, lo: 5, hi: 35, unit: '5–35' },
  { k: 'SI', name: 'Social integration', color: C.aqua, lo: 0, hi: 100, unit: '0–100' },
  { k: 'MB', name: 'Mobility', color: C.yellow, lo: 0, hi: 100, unit: '0–100' },
  { k: 'OP', name: 'Occupation', color: C.magenta, lo: 0, hi: 100, unit: '0–100' }
];
const OUTK = Object.fromEntries(OUT.map(o => [o.k, o]));
const scaleOut = (o, x) => (x - o.lo) / (o.hi - o.lo) * 100;

/* variables for completeness views */
const CVARS = [
  { k: 'PI', name: 'CHART physical independence' }, { k: 'MB', name: 'CHART mobility' },
  { k: 'OP', name: 'CHART occupation' }, { k: 'SI', name: 'CHART social integration' },
  { k: 'SWL', name: 'Satisfaction with life' }, { k: 'PHQ9', name: 'PHQ-9 total' },
  { k: 'PHQ2', name: 'PHQ-2 (items 1–2)' }, { k: 'pain', name: 'Pain interference' }
];

const DATA = JSON.parse(document.getElementById('data').textContent);
const LK = DATA.lookups, ANN = DATA.meta.anniversaries;
const SEVL = LK.severity, ERAL = LK.era, AGEL = LK.age_band, SEXL = LK.sex, LVLL = LK.level;
const SEV_HINT = { A: 'A: complete injury', B: 'B: sensory incomplete', C: 'C: motor incomplete', D: 'D: motor incomplete, useful function', Unknown: 'Unknown / normal' };

const P = DATA.persons.map(r => ({ pid: r[0], age: r[1], sev: r[2], era: r[3], sex: r[4], lvl: r[5], inj: r[6], nw: r[7], st: r[8] }));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const rand = rng(5320);
const W = DATA.waves.map(r => {
  const w = { pid: r[0], yr: r[1], cal: r[2], age: r[3], PI: r[4], MB: r[5], OP: r[6], SI: r[7], SWL: r[8], PHQ9: r[9], PHQ2: r[10], pain: r[11] ? 1 : null };
  w.p = P[w.pid];
  w.eraCal = w.cal <= 1995 ? 0 : w.cal <= 2000 ? 1 : w.cal <= 2010 ? 2 : w.cal <= 2015 ? 3 : 4;
  w.ageGrp = w.age < 18 ? 0 : w.age < 25 ? 1 : w.age < 40 ? 2 : 3;
  w.jx = rand() - .5; w.jy = rand() - .5;
  return w;
});
/* fixed (cohort-wide) cut-points for the divergence definition: quartiles of all valid SWL totals */
const SWL_Q25 = DATA.meta.headline_checks.swl_q25, SWL_Q75 = DATA.meta.headline_checks.swl_q75;

/* ===== state ===== */
const S = {
  age: new Set(AGEL.map((_, i) => i)), sev: new Set(SEVL.map((_, i) => i)), era: new Set(ERAL.map((_, i) => i)),
  lvl: new Set(LVLL.map((_, i) => i)), sex: new Set(SEXL.map((_, i) => i)),
  lo: ANN[0], hi: ANN[ANN.length - 1], minN: 30,
  series: new Set(['PI', 'SWL', 'SI']), trajView: 'main',
  colorBy: 'divergence', distVar: 'PI', heatVar: 'PI',
  basis: 'pooled', people: false, ovVar: 'PI', depVar: 'PHQ2', cohortMode: 'core',
  swlLo: SWL_Q25, swlHi: SWL_Q75, attrVar: 'PI'   // pooled = everyone interviewed at each anniversary; balanced = same people at every plotted year
};
/* validity helpers shared by the trajectory and overlap panels */
const OVK = [{ k: 'PI', name: 'CHART', long: 'CHART physical-independence' }, { k: 'SWL', name: 'SWL', long: 'life-satisfaction (SWL)' }, { k: 'PHQ2', name: 'PHQ-2', long: 'PHQ-2' }];
let SEL = null;
function recompute() {
  const ok = new Array(P.length);
  P.forEach(p => ok[p.pid] = S.age.has(p.age) && S.sev.has(p.sev) && S.era.has(p.era) && S.lvl.has(p.lvl) && S.sex.has(p.sex));
  SEL = { ok, persons: P.filter(p => ok[p.pid]), waves: W.filter(w => ok[w.pid] && w.yr >= S.lo && w.yr <= S.hi) };
  SEL.byYr = d3.group(SEL.waves, w => w.yr);
  /* per person: Map(year -> wave); one interview per person per anniversary (checked in the data) */
  SEL.byPid = d3.group(SEL.waves, w => w.pid);
}
/* set of people with a valid score for key k at every anniversary in `years` */
function balancedSet(k, years) {
  if (!years.length) return new Set();
  const out = new Set();
  SEL.byPid.forEach((ws, pid) => { const have = new Set(ws.filter(w => nn(w[k])).map(w => w.yr)); if (years.every(y => have.has(y))) out.add(pid); });
  return out;
}
const yearsInRange = () => ANN.filter(y => y >= S.lo && y <= S.hi);

/* ===== stats ===== */
const nn = v => v !== null && v !== undefined;
function meanCI(vals) {
  const n = vals.length; if (!n) return { n: 0, mean: NaN, ci: NaN, sd: NaN };
  const m = d3.mean(vals), sd = n > 1 ? d3.deviation(vals) : 0;
  return { n, mean: m, sd, ci: n > 1 ? 1.96 * sd / Math.sqrt(n) : NaN };
}
function wilson(k, n) {
  if (!n) return [NaN, NaN];
  const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), a = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n));
  return [(c - a) / d, (c + a) / d];
}
function pearson(xs, ys) {
  const n = xs.length; if (n < 3) return NaN;
  const mx = d3.mean(xs), my = d3.mean(ys); let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - mx, dy = ys[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy; }
  return sxy / Math.sqrt(sxx * syy);
}

/* rank correlation (average ranks for ties): robust to the ceiling at PI = 100 */
function ranks(v) {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]), r = new Array(v.length);
  for (let i = 0; i < idx.length;) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[idx[k][1]] = avg; i = j + 1; }
  return r;
}
const spearman = (xs, ys) => xs.length < 3 ? NaN : pearson(ranks(xs), ranks(ys));
/* least-squares line y = a + b x */
function ols(xs, ys) {
  const n = xs.length; if (n < 3) return null;
  const mx = d3.mean(xs), my = d3.mean(ys); let sxy = 0, sxx = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; }
  if (!sxx) return null; const b = sxy / sxx; return { a: my - b * mx, b };
}

/* Interviews from one person are not independent. These give intervals that are robust to that:
   meanCIc = cluster-robust (by person) standard error of a mean; wilsonC = Wilson interval on the effective n (n / design effect). */
function meanCIc(ws, k) {
  const v = ws.map(w => w[k]), n = v.length;
  if (!n) return { n: 0, np: 0, mean: NaN, ci: NaN, sd: NaN };
  const m = d3.mean(v), sd = n > 1 ? d3.deviation(v) : 0, by = new Map();
  ws.forEach(w => by.set(w.pid, (by.get(w.pid) || 0) + (w[k] - m)));
  const np = by.size; let ss = 0; by.forEach(s => ss += s * s);
  return { n, np, mean: m, sd, ci: np > 1 ? 1.96 * Math.sqrt(np / (np - 1) * ss) / n : NaN };
}
function wilsonC(ws, pred) {
  const n = ws.length; if (!n) return { n: 0, np: 0, k: 0, p: NaN, lo: NaN, hi: NaN, deff: 1 };
  const k = ws.filter(pred).length, p = k / n, by = new Map();
  ws.forEach(w => by.set(w.pid, (by.get(w.pid) || 0) + ((pred(w) ? 1 : 0) - p)));
  const np = by.size; let ss = 0; by.forEach(s => ss += s * s);
  const seC = np > 1 ? Math.sqrt(np / (np - 1) * ss) / n : NaN, seS = Math.sqrt(p * (1 - p) / n);
  const deff = seS > 0 && !isNaN(seC) ? Math.max(1, (seC / seS) ** 2) : 1, ne = n / deff, [a, b] = wilson(p * ne, ne);
  return { n, np, k, p, lo: a, hi: b, deff };
}

/* ===== svg + tooltip + table twin ===== */
function mkSvg(el, w, h, label) {
  el.innerHTML = '';
  return d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', label);
}
function emptyMsg(el, msg) {
  msg = msg || (SEL.persons.length ? 'These people have no interviews with usable scores in the selected years.' : 'No people match the current filters.');
  el.innerHTML = `<div class="empty">${msg} <button class="reset" style="margin-left:8px" data-reset>Reset filters</button></div>`;
}
const tipEl = $('#tip');
function tipShow(html, x, y) {
  tipEl.innerHTML = html; tipEl.classList.add('on');
  const r = tipEl.getBoundingClientRect(); let L = x + 14, T = y + 14;
  if (L + r.width > innerWidth - 8) L = x - r.width - 14;
  if (T + r.height > innerHeight - 8) T = y - r.height - 14;
  tipEl.style.left = Math.max(8, L) + 'px'; tipEl.style.top = Math.max(8, T) + 'px';
}
const tipHide = () => tipEl.classList.remove('on');
const key = (c, dash) => `<span class="tk" style="border-color:${c};${dash ? 'border-top-style:dashed' : ''}"></span>`;

const TABLES = {};
function table(id, caption, head, rows) {
  const box = document.getElementById('tbl-' + id); if (!box) return;
  TABLES[id] = { caption, head, rows };
  if (box.hidden) { box.innerHTML = ''; return; }
  box.innerHTML = `<table><caption>${caption}</caption><thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<th scope="row" style="font-weight:500;color:var(--ink)">${c}</th>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function toggleTable(id, btn) {
  const box = document.getElementById('tbl-' + id); box.hidden = !box.hidden;
  btn.setAttribute('aria-expanded', String(!box.hidden)); btn.textContent = box.hidden ? 'Table view' : 'Hide table';
  const t = TABLES[id]; if (t) table(id, t.caption, t.head, t.rows);
}
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

/* greedy vertical de-collision for direct labels */
function spread(items, minGap, lo, hi) {
  items.sort((a, b) => a.y - b.y);
  for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < minGap) items[i].y = items[i - 1].y + minGap;
  const over = items.length ? items[items.length - 1].y - hi : 0;
  if (over > 0) { items.forEach(d => d.y -= over); }
  for (let i = items.length - 2; i >= 0; i--) if (items[i + 1].y - items[i].y < minGap) items[i].y = items[i + 1].y - minGap;
  return items;
}
/* shared definitions used by more than one research-question module */
let trajIdx = null;
const DEP = [
  { k: 'PHQ2', name: 'PHQ-2 ≥ 3 (screens positive)', color: C.violet, test: v => v >= 3, base: 'PHQ2' },
  { k: 'PHQ9', name: 'PHQ-9 ≥ 10 (moderate or worse)', color: C.green, test: v => v >= 10, base: 'PHQ9' }
];
const BANDS = {
  PI: { name: 'Physical independence (CHART, 0–100)', labels: ['≤ 50', '51–89', '90–99', '100 (ceiling)'], f: v => v <= 50 ? 0 : v < 90 ? 1 : v < 100 ? 2 : 3 },
  SWL: { name: 'Life satisfaction (SWL, 5–35)', labels: ['5–19', '20–24', '25–29', '30–35'], f: v => v <= 19 ? 0 : v <= 24 ? 1 : v <= 29 ? 2 : 3 }
};
const HAS = id => !!document.getElementById(id);   // is this research question's card part of the current build?
/* one-sentence, numbers-only reading of the current selection, shown under a card's heading */
function take(id, html) { const e = document.getElementById(id); if (!e) return; e.hidden = !html; e.innerHTML = html || ''; }
const RENDERERS = [];
