/* ===== filters, KPIs, wiring ===== */
const FILTERS = [
  { id: 'age', label: 'Age at injury', vals: AGEL, tip: i => AGEL[i], text: i => AGEL[i].replace(' (', ' · ').replace(')', '') },
  { id: 'sev', label: 'ASIA grade (A complete → D mild)', vals: SEVL, tip: i => SEV_HINT[SEVL[i]], text: i => SEVL[i] },
  { id: 'era', label: 'Injury era', vals: ERAL, tip: i => 'Injured ' + ERAL[i], text: i => ERAL[i] },
  { id: 'lvl', label: 'Injury level', vals: LVLL, tip: i => LVLL[i], text: i => LVLL[i] },
  { id: 'sex', label: 'Sex', vals: SEXL, tip: i => SEXL[i], text: i => SEXL[i] }
];
const PKEY = { age: 'age', sev: 'sev', era: 'era', lvl: 'lvl', sex: 'sex' };

function buildFilters() {
  const box = $('#filters-chips');
  box.innerHTML = FILTERS.map(f => `<div class="fgroup"><div class="flabel" id="fl-${f.id}">${f.label}</div><div class="chips" role="group" aria-labelledby="fl-${f.id}">${f.vals.map((_, i) => {
    const n = P.filter(p => p[PKEY[f.id]] === i).length; if (!n) return '';   // categories absent from the cohort are not offered
    return `<button type="button" class="chip" data-f="${f.id}" data-i="${i}" title="${esc(f.tip(i))} (${f0(n)} people)" aria-pressed="true">${esc(f.text(i))}<span class="n">${f0(n)}</span></button>`;
  }).join('')}</div></div>`).join('');
  const opts = ANN.map(y => `<option value="${y}">${y}</option>`).join('');
  $('#yr-lo').innerHTML = opts; $('#yr-hi').innerHTML = opts; $('#yr-hi').value = S.hi;
}
function syncControls() {
  $$('.chip').forEach(b => b.setAttribute('aria-pressed', S[b.dataset.f].has(+b.dataset.i)));
  $('#yr-lo').value = S.lo; $('#yr-hi').value = S.hi; $('#minn').value = S.minN; $('#minn-val').textContent = S.minN;
  $$('[data-tv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tv === S.trajView));
  $$('[data-cb]').forEach(b => b.setAttribute('aria-pressed', b.dataset.cb === S.colorBy));
  $$('[data-dv]').forEach(b => b.setAttribute('aria-pressed', b.dataset.dv === S.distVar));
  $$('[data-bs]').forEach(b => b.setAttribute('aria-pressed', b.dataset.bs === S.basis));
  $$('[data-ppl]').forEach(b => b.setAttribute('aria-pressed', String(S.people)));
  $$('[data-ov]').forEach(b => b.setAttribute('aria-pressed', b.dataset.ov === S.ovVar));
  $$('[data-dp]').forEach(b => b.setAttribute('aria-pressed', b.dataset.dp === S.depVar));
  $$('[data-co]').forEach(b => b.setAttribute('aria-pressed', b.dataset.co === S.cohortMode));
  $$('[data-av]').forEach(b => b.setAttribute('aria-pressed', b.dataset.av === S.attrVar));
  const sl = $('#swl-lo'), sh = $('#swl-hi');
  if (sl) { sl.value = S.swlLo; sh.value = S.swlHi; $('#swl-lo-val').textContent = '≤ ' + S.swlLo; $('#swl-hi-val').textContent = '≥ ' + S.swlHi; }
  $$('[data-swlp]').forEach(b => { const q = b.dataset.swlp === 'q'; b.setAttribute('aria-pressed', String(q ? (S.swlLo === SWL_Q25 && S.swlHi === SWL_Q75) : (S.swlLo === 19 && S.swlHi === 26))); });
}
function chipClick(f, i) {
  const set = S[f], all = FILTERS.find(x => x.id === f).vals.length;
  if (set.size === all) { set.clear(); set.add(i); }            // from "all", a click focuses on one value
  else if (set.has(i)) { set.delete(i); if (!set.size) FILTERS.find(x => x.id === f).vals.forEach((_, k) => set.add(k)); }
  else set.add(i);
}
function resetAll() {
  FILTERS.forEach(f => { S[f.id].clear(); f.vals.forEach((_, k) => S[f.id].add(k)); });
  S.lo = ANN[0]; S.hi = ANN[ANN.length - 1]; S.minN = 30;
}

function renderKpis() {
  const ws = SEL.waves, np = SEL.persons.length;
  const per = d3.rollup(ws, v => v.length, w => w.pid), counts = Array.from(per.values());
  const pairs = ws.filter(w => nn(w.PI) && nn(w.SWL)), r = pearson(pairs.map(w => w.PI), pairs.map(w => w.SWL));
  const top = pairs.filter(w => w.PI === 100), pTop = top.length ? top.filter(w => w.SWL <= S.swlLo).length / top.length : NaN;
  const tiles = [
    ['People', f0(np), `of ${f0(P.length)} in the cohort`],
    ['Follow-up interviews', f0(ws.length), 'with at least one usable score'],
    ['Median interviews per person', counts.length ? f1(d3.median(counts)) : '–', `${f0(counts.length)} people with ≥ 1 in range`],
    ['Independence ↔ satisfaction', isNaN(r) ? '–' : 'r = ' + f2(r), `${f0(pairs.length)} paired interviews`],
    [`PI = 100 but SWL ≤ ${S.swlLo}`, isNaN(pTop) ? '–' : p1(pTop), `of ${f0(top.length)} fully independent interviews`]
  ];
  $('#kpis').innerHTML = tiles.map(t => `<div class="kpi"><div class="k">${t[0]}</div><div class="v">${t[1]}</div><div class="s">${t[2]}</div></div>`).join('');
}
function renderAll() {
  recompute(); syncControls(); renderKpis();
  RENDERERS.forEach(fn => { try { fn(); } catch (e) { console.error(fn.name, e); } });
  $('#status').textContent = `${f0(SEL.persons.length)} people, ${f0(SEL.waves.length)} interviews selected.`;
  updateHash();
}
const renderSoon = debounce(renderAll, 60);

document.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.classList.contains('chip')) { chipClick(t.dataset.f, +t.dataset.i); renderAll(); }
  else if (t.hasAttribute('data-reset')) { resetAll(); renderAll(); }
  else if (t.dataset.ser) { const k = t.dataset.ser; S.series.has(k) ? S.series.delete(k) : S.series.add(k); renderAll(); }
  else if (t.dataset.tv) { S.trajView = t.dataset.tv; trajIdx = null; renderAll(); }
  else if (t.dataset.cb) { S.colorBy = t.dataset.cb; renderAll(); }
  else if (t.dataset.dv) { S.distVar = t.dataset.dv; renderAll(); }
  else if (t.dataset.hv) { S.heatVar = t.dataset.hv; renderAll(); }
  else if (t.dataset.bs) { S.basis = t.dataset.bs; trajIdx = null; renderAll(); }
  else if (t.hasAttribute('data-ppl')) { S.people = !S.people; renderAll(); }
  else if (t.dataset.ov) { S.ovVar = t.dataset.ov; renderAll(); }
  else if (t.dataset.dp) { S.depVar = t.dataset.dp; renderAll(); }
  else if (t.dataset.co) { S.cohortMode = t.dataset.co; renderAll(); }
  else if (t.dataset.av) { S.attrVar = t.dataset.av; renderAll(); }
  else if (t.dataset.swlp) { if (t.dataset.swlp === 'q') { S.swlLo = SWL_Q25; S.swlHi = SWL_Q75; } else { S.swlLo = 19; S.swlHi = 26; } renderAll(); }
  else if (t.dataset.csv) downloadCsv(t.dataset.csv);
  else if (t.hasAttribute('data-copylink')) copyLink(t);
  else if (t.dataset.setrange) { const [a, b] = t.dataset.setrange.split(',').map(Number); S.lo = a; S.hi = b; renderAll(); }
  else if (t.dataset.tbl) toggleTable(t.dataset.tbl, t);
});
$('#yr-lo').addEventListener('change', e => { S.lo = +e.target.value; if (S.hi < S.lo) S.hi = S.lo; renderAll(); });
$('#yr-hi').addEventListener('change', e => { S.hi = +e.target.value; if (S.lo > S.hi) S.lo = S.hi; renderAll(); });
const swlInput = () => { const a = +$('#swl-lo').value, b = +$('#swl-hi').value; S.swlLo = Math.min(a, b - 1); S.swlHi = Math.max(b, a + 1); renderSoon(); };
if ($('#swl-lo')) { $('#swl-lo').addEventListener('input', swlInput); $('#swl-hi').addEventListener('input', swlInput); }
$('#minn').addEventListener('input', e => { S.minN = +e.target.value; $('#minn-val').textContent = S.minN; renderSoon(); });
new ResizeObserver(debounce(() => { const w = document.body.clientWidth; if (w !== buildFilters.lastW) { buildFilters.lastW = w; RENDERERS.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); } }, 120)).observe(document.body);


/* ===== sharing: the view lives in the address bar; each table can be downloaded as CSV ===== */
const SETS = ['age', 'sev', 'era', 'lvl', 'sex', 'series'], SCALARS = ['lo', 'hi', 'minN', 'trajView', 'colorBy', 'distVar', 'heatVar', 'basis', 'people', 'ovVar', 'depVar', 'cohortMode', 'swlLo', 'swlHi', 'attrVar'];
function encodeState() {
  const o = {}; SETS.forEach(k => o[k] = [...S[k]]); SCALARS.forEach(k => o[k] = S[k]);
  return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
}
function decodeState(code) {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(code))));
    const lim = { age: AGEL.length, sev: SEVL.length, era: ERAL.length, lvl: LVLL.length, sex: SEXL.length };
    SETS.forEach(k => {
      if (!Array.isArray(o[k])) return;
      const v = k === 'series' ? o[k].filter(x => OUTK[x]) : o[k].filter(x => Number.isInteger(x) && x >= 0 && x < lim[k]);
      if (v.length || k === 'series') S[k] = new Set(v);
    });
    SCALARS.forEach(k => { if (o[k] !== undefined && typeof o[k] === typeof S[k]) S[k] = o[k]; });
    if (!ANN.includes(S.lo) || !ANN.includes(S.hi) || S.lo > S.hi) { S.lo = ANN[0]; S.hi = ANN[ANN.length - 1]; }
  } catch (e) { /* ignore a malformed link */ }
}
function updateHash() { try { history.replaceState(null, '', '#s=' + encodeState()); } catch (e) { /* storage of the view is a convenience only */ } }
function copyLink(btn) {
  updateHash(); const url = location.href, done = ok => { const t = btn.textContent; btn.textContent = ok ? 'Link copied' : 'Link is in the address bar'; setTimeout(() => btn.textContent = t, 1800); };
  try { navigator.clipboard.writeText(url).then(() => done(true), () => done(false)); } catch (e) { done(false); }
}
function downloadCsv(id) {
  const t = TABLES[id]; if (!t || !t.head.length) return;
  const clean = v => '"' + String(v).replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\u00a0/g, ' ').replace(/"/g, '""') + '"';
  const csv = '\ufeff' + [t.head].concat(t.rows).map(r => r.map(clean).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `sci-dashboard-${id}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
}
$$('button[data-tbl]').forEach(b => { const c = document.createElement('button'); c.type = 'button'; c.className = 'tbl'; c.dataset.csv = b.dataset.tbl; c.textContent = 'CSV'; c.title = 'Download this table as a CSV file'; b.after(c); });
const hm = location.hash.match(/s=([^&]+)/); if (hm) decodeState(hm[1]);
buildFilters(); renderAll();
window.__dash = { S, P, W, get SEL() { return SEL; }, renderAll, resetAll, chipClick };
