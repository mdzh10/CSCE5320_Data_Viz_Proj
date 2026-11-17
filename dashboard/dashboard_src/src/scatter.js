/* ===== RQ2: divergence scatter (small multiples) ===== */
const PANELS = [{ lo: 1, hi: 5, label: 'Years 1–5' }, { lo: 10, hi: 20, label: 'Years 10–20' }, { lo: 25, hi: 45, label: 'Years 25–45' }];
/* hue is reserved for the exception group (red); ordered groupings use the page-wide grey luminance ramp, so no outcome hue
   from RQ1 (blue = independence, orange = satisfaction) is reused here with another meaning */
const ERA_COL = ERA_TONES, AGE_COL = [ERA_TONES[2], ERA_TONES[0]];   // early childhood (small group) dark, adolescent light
const HL1 = w => w.PI === 100 && w.SWL <= S.swlLo;      // fully independent but low satisfaction (cutoff set by the user; default = cohort bottom quartile)
const HL2 = w => w.PI <= 50 && w.SWL >= S.swlHi;        // low independence but high satisfaction (default = cohort top quartile)

function scatterCats() {
  if (S.colorBy === 'divergence') return {
    cats: [{ id: 'a', name: `Independent but dissatisfied (PI 100, SWL ≤ ${S.swlLo})`, color: C.red }, { id: 'b', name: `Low independence but satisfied (PI ≤ 50, SWL ≥ ${S.swlHi})`, color: C.dark }, { id: 'c', name: 'Other', color: C.ctx }],
    f: w => HL1(w) ? 0 : HL2(w) ? 1 : 2, order: (a, b) => (b.c === 2) - (a.c === 2)
  };
  if (S.colorBy === 'injury') return { cats: ERAL.map((e, i) => ({ id: 'e' + i, name: 'Injured ' + e, color: ERA_COL[i] })), f: w => w.p.era, order: (a, b) => a.c - b.c };
  return { cats: AGEL.map((a, i) => ({ id: 'g' + i, name: a, color: AGE_COL[i] })), f: w => w.p.age, order: (a, b) => b.c - a.c };
}
/* correlation, least-squares line and the two exception shares (person-clustered Wilson intervals) for one set of interviews */
function scatterStats(data) {
  const xs = data.map(w => w.PI), ys = data.map(w => w.SWL);
  const top = data.filter(w => w.PI === 100), low = data.filter(w => w.PI <= 50);
  return { n: data.length, np: new Set(data.map(w => w.pid)).size, r: pearson(xs, ys), rho: spearman(xs, ys), fit: ols(xs, ys), top: wilsonC(top, HL1), low: wilsonC(low, HL2) };
}
const shareTxt = (s, pct = p1) => s.n ? `${pct(s.p)} (${pct(s.lo)}–${pct(s.hi)})` : '–';

function renderScatter() {
  const el = $('#scatter'), lg = $('#scatter-legend'), cav = $('#scatter-caveat');
  const pairs = SEL.waves.filter(w => nn(w.PI) && nn(w.SWL));
  if (!SEL.waves.length) { emptyMsg(el); lg.innerHTML = ''; take('scatter-take', ''); return; }
  const { cats, f, order } = scatterCats();
  const Wd = Math.max(el.clientWidth, 320), narrow = Wd < 700;
  const cols = narrow ? 1 : 3, gap = 26, ml = 48, mr = 8, mt = 58, mb = 42;
  const pw = narrow ? Wd - ml - mr : (Wd - ml - mr - gap * 2) / 3, ph = narrow ? 250 : 320;
  const histW = 40, plotW = pw - histW - 10;                       // points on the left, a count strip for PI = 100 on the right
  const rowsN = narrow ? 3 : 1, H = rowsN * (mt + ph + mb);
  const svg = mkSvg(el, Wd, H, 'Scatter plots of physical independence against life satisfaction in three post-injury periods, with a least-squares line and a count of interviews at full independence');
  const x = d3.scaleLinear().domain([-5, 105]).range([0, plotW]);
  const y = d3.scaleLinear().domain([4, 36]).range([ph, 0]);
  const counts = cats.map(() => 0); const table_rows = [];
  PANELS.forEach((pn, i) => {
    const gx = narrow ? ml : ml + i * (pw + gap), gy = narrow ? i * (mt + ph + mb) : 0;
    const g = svg.append('g').attr('transform', `translate(${gx},${gy + mt})`);
    const data = pairs.filter(w => w.yr >= pn.lo && w.yr <= pn.hi), st = scatterStats(data);
    table_rows.push([pn.label, f0(st.n), f0(st.np), isNaN(st.r) ? '–' : f2(st.r), isNaN(st.rho) ? '–' : f2(st.rho), st.top.n ? `${shareTxt(st.top)} of ${f0(st.top.n)}` : '–', st.low.n ? `${shareTxt(st.low)} of ${f0(st.low.n)}` : '–']);
    svg.append('text').attr('class', 'ptitle').attr('x', gx).attr('y', gy + 16).text(pn.label);
    if (data.length) {
      svg.append('text').attr('class', 'lbl').attr('x', gx).attr('y', gy + 34).text(`${f0(st.n)} interviews · r = ${isNaN(st.r) ? '–' : f2(st.r)}`);
      { const t = svg.append('text').attr('class', 'lbl').attr('x', gx).attr('y', gy + 51);
        if (st.top.n) { t.append('tspan').attr('fill', C.red).text('● '); t.append('tspan').text(`Independent but dissatisfied: ${p0(st.top.p)}`); } else t.text('No interviews at PI = 100'); }
    } else svg.append('text').attr('class', 'lbl').attr('x', gx).attr('y', gy + 32).text('No paired interviews in the selected range');
    // grid + axes
    [5, 15, 25, 35].forEach(t => { if (i === 0 || narrow) g.append('text').attr('class', 'ax').attr('x', -8).attr('y', y(t)).attr('dy', '.32em').attr('text-anchor', 'end').text(t); g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', C.grid); });
    [0, 25, 50, 75, 100].forEach(t => g.append('text').attr('class', 'ax').attr('x', x(t)).attr('y', ph + 16).attr('text-anchor', 'middle').text(t));
    g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', ph).attr('y2', ph).attr('stroke', C.axis);
    g.append('text').attr('class', 'axl').attr('x', plotW / 2).attr('y', ph + 33).attr('text-anchor', 'middle').text('Independence (CHART, 0–100)');
    if (i === 0 || narrow) g.append('text').attr('class', 'axl').attr('transform', `translate(-34,${ph / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Life satisfaction (SWL, 5–35)');
    // reference lines at the chosen satisfaction cutoffs
    [S.swlLo, S.swlHi].forEach(q => g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', y(q)).attr('y2', y(q)).attr('stroke', C.axis).attr('stroke-dasharray', '4 4'));
    if (!data.length) return;
    // points: context first, highlighted or smaller groups on top; context recedes (low opacity) so the dense column at 100 reads as density
    const pts = data.map(w => ({ w, cx: x(w.PI + w.jx * 6), cy: y(w.SWL + w.jy * .8), c: f(w) }));
    pts.forEach(p => counts[p.c]++);
    const ctx = d => S.colorBy === 'divergence' && d.c === 2;
    g.append('g').selectAll('circle').data([...pts].sort(order)).join('circle').attr('cx', d => d.cx).attr('cy', d => d.cy)
      .attr('r', d => ctx(d) ? 1.9 : 2.8).attr('fill', d => cats[d.c].color).attr('opacity', d => ctx(d) ? .2 : S.colorBy === 'divergence' ? .85 : .55);
    // least-squares line (descriptive; the scores are bounded, so it is a summary of direction, not a model)
    if (st.fit) {
      const x0 = 0, x1 = 100, y0v = st.fit.a + st.fit.b * x0, y1v = st.fit.a + st.fit.b * x1;
      g.append('line').attr('x1', x(x0)).attr('x2', x(x1)).attr('y1', y(Math.max(4, Math.min(36, y0v)))).attr('y2', y(Math.max(4, Math.min(36, y1v))))
        .attr('stroke', C.ink).attr('stroke-width', 2).attr('opacity', .85).attr('stroke-linecap', 'round');
    }
    // count strip: interviews at PI = 100 by satisfaction score (the column where dots overlap most)
    const at100 = data.filter(w => w.PI === 100), hc = d3.rollup(at100, v => v.length, w => w.SWL), hmax = d3.max(hc.values()) || 1, hx = plotW + 10;
    g.append('line').attr('x1', hx).attr('x2', hx).attr('y1', 0).attr('y2', ph).attr('stroke', C.axis);
    hc.forEach((k, v) => {
      const bh = Math.max(1, y(v - .5) - y(v + .5) - 1), red = S.colorBy === 'divergence' && v <= S.swlLo;
      g.append('rect').attr('x', hx).attr('y', y(v + .5) + .5).attr('width', Math.max(1, k / hmax * histW)).attr('height', bh).attr('rx', 1)
        .attr('fill', red ? C.red : C.ctx).attr('opacity', red ? .85 : .8)
        .on('mousemove', ev => tipShow(`<div class="th">${pn.label} · physical independence = 100</div><div class="tr"><span class="tl">Life satisfaction ${v}</span><span class="tv">${f0(k)} interviews</span></div><div class="tr ts">of ${f0(at100.length)} interviews at full independence</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    });
    const ring = g.append('circle').attr('r', 6).attr('fill', 'none').attr('stroke', C.ink).attr('stroke-width', 2).style('display', 'none');
    const dl = d3.Delaunay.from(pts, d => d.cx, d => d.cy);
    g.append('rect').attr('width', plotW).attr('height', ph).attr('fill', 'transparent')
      .on('mousemove', ev => {
        const [mx, my] = d3.pointer(ev), j = dl.find(mx, my), d = pts[j];
        if (Math.hypot(d.cx - mx, d.cy - my) > 22) { ring.style('display', 'none'); tipHide(); return; }
        ring.style('display', null).attr('cx', d.cx).attr('cy', d.cy);
        const w = d.w;
        tipShow(`<div class="th">${w.yr} years after injury · interview ~${w.cal}</div>
          <div class="tr"><span class="tl">Physical independence</span><span class="tv">${w.PI}</span></div>
          <div class="tr"><span class="tl">Life satisfaction</span><span class="tv">${w.SWL}</span></div>
          <div class="tr ts">${AGEL[w.p.age]} · ASIA ${SEVL[w.p.sev]} · injured ${ERAL[w.p.era]}</div>
          <div class="tr ts">${cats[d.c].name}</div>`, ev.clientX, ev.clientY);
      }).on('mouseleave', () => { ring.style('display', 'none'); tipHide(); });
  });
  { const allP = pairs.filter(w => PANELS.some(pn => w.yr >= pn.lo && w.yr <= pn.hi)), st = scatterStats(allP);
    table_rows.push(['All three periods', f0(st.n), f0(st.np), isNaN(st.r) ? '–' : f2(st.r), isNaN(st.rho) ? '–' : f2(st.rho), st.top.n ? `${shareTxt(st.top)} of ${f0(st.top.n)}` : '–', st.low.n ? `${shareTxt(st.low)} of ${f0(st.low.n)}` : '–']);
    take('scatter-take', st.n ? `${f0(st.n)} paired interviews (${f0(st.np)} people): r = ${isNaN(st.r) ? '–' : f2(st.r)}, a weak link. ${st.top.n ? `<b>${p0(st.top.p)}</b> of fully independent interviews are dissatisfied (SWL ≤ ${S.swlLo})` : ''}${st.top.n && st.low.n ? '; ' : ''}${st.low.n ? `<b>${p0(st.low.p)}</b> of low-independence ones (PI ≤ 50) are satisfied (SWL ≥ ${S.swlHi})` : ''}.` : ''); }
  lg.innerHTML = cats.map((c, i) => `<span class="item"><span class="sw" style="background:${c.color};border-radius:50%;width:10px;height:10px"></span>${c.name} <span class="muted-s">(${f0(counts[i])})</span></span>`).join('')
    + `<span class="item"><span class="key" style="border-color:${C.ink};border-top-width:2px"></span>Trend line</span>`;
  cav.innerHTML = `Each dot is one interview (jittered). Bars at the right count the interviews at PI = 100 by satisfaction. Dashed lines: the cutoffs (${S.swlLo} and ${S.swlHi}${S.swlLo === SWL_Q25 && S.swlHi === SWL_Q75 ? ', cohort quartiles' : ''}). Correlation is descriptive, not causal.`;
  table('scatter', 'Paired physical-independence and life-satisfaction interviews by period (shares with 95% person-clustered Wilson intervals)', ['Period', 'Paired interviews', 'People', 'Pearson r', 'Spearman ρ', `PI = 100 with SWL ≤ ${S.swlLo}`, `PI ≤ 50 with SWL ≥ ${S.swlHi}`], table_rows);
}
RENDERERS.push(renderScatter);
