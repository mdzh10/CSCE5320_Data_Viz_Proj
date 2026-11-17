/* ===== RQ6: life milestones — school, degree, work and marriage by age =====
   Data: a separate file (milestones_data.json, embedded only when RQ6 is built): per interview, education level, marital status
   and primary occupational status, recoded from the NSCISC Form II codes. These fields exist since 1973, so unlike CHART/SWL
   they are not missing before 1996.
   Form: small multiples, one panel per milestone, share of interviews (position) against approximate age at interview, as separate
   dots with a person-clustered Wilson whisker (no connecting line: each age group is different people). Optional split into at most three groups, drawn on the page-wide grey luminance ramp (groupings never
   take an outcome hue). The split choice reuses the shared state key S.cohortMode ('core' = no split) so the shared code is unchanged. */
const MSD = (() => { const e = document.getElementById('data-ms'); return e ? JSON.parse(e.textContent) : null; })();
const MSK = new Map(); if (MSD) MSD.rows.forEach(r => MSK.set(r[0] + ':' + r[1], r));
W.forEach(w => { const r = MSK.get(w.pid + ':' + w.yr); w.edu = r ? r[2] : null; w.mar = r ? r[3] : null; w.occ = r ? r[4] : null; });

const MS_AGES = [{ lo: 18, hi: 22, label: '18–21' }, { lo: 22, hi: 26, label: '22–25' }, { lo: 26, hi: 31, label: '26–30' }, { lo: 31, hi: 36, label: '31–35' },
  { lo: 36, hi: 41, label: '36–40' }, { lo: 41, hi: 51, label: '41–50' }, { lo: 51, hi: 200, label: '51+' }];
const MS = [
  { k: 'hs', name: 'High school diploma or more', base: 'edu', test: v => v >= 1 },
  { k: 'ba', name: "Bachelor's degree or more", base: 'edu', test: v => v === 3 },
  { k: 'work', name: 'Working (main status)', base: 'occ', test: v => v === 0 },
  { k: 'mar', name: 'Married', base: 'mar', test: v => v === 1 }
];
const MS_SPLITS = {
  core: { label: 'Everyone', groups: [{ name: 'All selected people', f: () => true }] },
  level: { label: 'Injury level', groups: [{ name: 'Paraplegia', f: p => LVLL[p.lvl] === 'Paraplegia' }, { name: 'Tetraplegia', f: p => LVLL[p.lvl] === 'Tetraplegia' }] },
  sev: { label: 'Severity', groups: [{ name: 'ASIA A (complete)', f: p => SEVL[p.sev] === 'A' }, { name: 'ASIA B–D (incomplete)', f: p => ['B', 'C', 'D'].includes(SEVL[p.sev]) }] },
  sex: { label: 'Sex', groups: SEXL.map((s, i) => ({ name: s, f: p => p.sex === i })) },
  era: { label: 'Injury era', groups: ERAL.map((e, i) => ({ name: 'Injured ' + e, f: p => p.era === i })) }
};
const msTone = (n, i) => n === 1 ? C.ink : n === 2 ? [ERA_TONES[0], ERA_TONES[2]][i] : ERA_TONES[i];
const msBin = a => MS_AGES.findIndex(b => a >= b.lo && a < b.hi);

function msCell(ws, m) {
  const v = ws.filter(w => nn(w[m.base])); if (!v.length) return null;
  const r = wilsonC(v, w => m.test(w[m.base]));
  return Object.assign(r, { label: `${p1(r.p)} (${p1(r.lo)}–${p1(r.hi)})` });
}

function renderMilestones() {
  const el = $('#ms'), lg = $('#ms-legend'), cav = $('#ms-caveat'), sg = $('#ms-seg');
  if (!MS_SPLITS[S.cohortMode]) S.cohortMode = 'core';
  sg.innerHTML = Object.entries(MS_SPLITS).map(([k, s]) => `<button type="button" data-co="${k}" aria-pressed="${S.cohortMode === k}">${s.label}</button>`).join('');
  const split = MS_SPLITS[S.cohortMode], G = split.groups.filter(g => SEL.persons.some(g.f));
  if (!SEL.waves.length || !MSD) { emptyMsg(el, MSD ? undefined : 'Milestone data are not part of this build.'); lg.innerHTML = ''; take('ms-take', ''); return; }
  const adult = SEL.waves.filter(w => msBin(w.age) >= 0);
  const cells = G.map(g => MS.map(m => MS_AGES.map((_, bi) => msCell(adult.filter(w => g.f(w.p) && msBin(w.age) === bi), m))));
  lg.innerHTML = G.map((g, i) => `<span class="item"><span class="key" style="border-color:${msTone(G.length, i)};border-top-width:3px"></span>${g.name} <span class="muted-s">(${f0(SEL.persons.filter(g.f).length)} people)</span></span>`).join('')
    + '<span class="item muted-s">Dots not joined: different people at each age · whisker: 95% interval · hollow: below minimum n</span>';

  const Wd = Math.max(el.clientWidth, 340), cols = Wd < 700 ? 1 : Wd < 1000 ? 2 : 4, gap = 24, ml = 40;
  const pw = (Wd - ml - gap * (cols - 1)) / cols, ph = 200, mt = 34, mb = 44, rows = Math.ceil(MS.length / cols), H = rows * (mt + ph + mb);
  const svg = mkSvg(el, Wd, H, 'Four small-multiple dot charts: share of interviews with a high-school diploma, a bachelor’s degree, work as the main status, and marriage, by approximate age at interview');
  const x = d3.scalePoint().domain(MS_AGES.map((_, i) => i)).range([10, pw - 10]);
  MS.forEach((m, mi) => {
    const ox = ml + (mi % cols) * (pw + gap), oy = Math.floor(mi / cols) * (mt + ph + mb), g = svg.append('g').attr('transform', `translate(${ox},${oy + mt})`);
    const y = d3.scaleLinear().domain([0, 100]).range([ph, 0]);
    svg.append('text').attr('class', 'ptitle').attr('x', ox).attr('y', oy + 16).text(m.name);
    [0, 25, 50, 75, 100].forEach(t => { g.append('line').attr('x1', 0).attr('x2', pw).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', t ? C.grid : C.axis);
      if (mi % cols === 0) g.append('text').attr('class', 'ax').attr('x', -8).attr('y', y(t)).attr('dy', '.32em').attr('text-anchor', 'end').text(t + '%'); });
    MS_AGES.forEach((b, i) => { if (cols < 4 || i % 2 === 0 || i === MS_AGES.length - 1) g.append('text').attr('class', 'ax').attr('x', x(i)).attr('y', ph + 16).attr('text-anchor', 'middle').text(b.label); });
    g.append('text').attr('class', 'axl').attr('x', pw / 2).attr('y', ph + 34).attr('text-anchor', 'middle').text('Approximate age at interview');
    G.forEach((gr, gi) => {
      const col = msTone(G.length, gi), pts = cells[gi][mi].map((c, i) => c ? { i, c, v: c.p * 100, low: c.n < S.minN } : null);
      /* different people in every age group, so separate dots with a 95% whisker and no connecting line */
      const off = (gi - (G.length - 1) / 2) * 7;
      pts.forEach(p => { if (!p) return; g.append('line').attr('x1', x(p.i) + off).attr('x2', x(p.i) + off).attr('y1', y(p.c.lo * 100)).attr('y2', y(p.c.hi * 100)).attr('stroke', col).attr('stroke-width', p.low ? 1.3 : 2).attr('opacity', p.low ? .45 : .5).attr('stroke-linecap', 'round'); });
      pts.forEach(p => { if (!p) return;
        g.append('circle').attr('cx', x(p.i) + off).attr('cy', y(p.v)).attr('r', 4.2).attr('fill', p.low ? C.surface : col).attr('stroke', p.low ? col : C.surface).attr('stroke-width', p.low ? 1.6 : 1.5)
          .on('mousemove', ev => tipShow(`<div class="th">${m.name} · age ${MS_AGES[p.i].label}</div><div class="tr">${key(col)}<span class="tl">${gr.name}</span><span class="tv">${p.c.label}</span></div><div class="tr ts">${f0(p.c.k)} of ${f0(p.c.n)} interviews with a known status, ${f0(p.c.np)} people${p.low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide); });
    });
  });
  { /* takeaway: everyone in view at ages 26-30, or the working gap between the first and last group at that age */
    const bi = 2, c = cells.map(gc => gc.map(mc => mc[bi]));
    if (G.length === 1) { const t = c[0]; take('ms-take', t.every(Boolean) ? `<b>At ages 26–30</b> (${f0(d3.max(t, z => z.n))} interviews): ${p0(t[0].p)} have a high-school diploma, ${p0(t[1].p)} a bachelor’s degree, ${p0(t[2].p)} are working and ${p0(t[3].p)} are married.` : ''); }
    else { const a = c[0][2], z = c[c.length - 1][2]; take('ms-take', a && z ? `<b>Working at ages 26–30:</b> ${G[0].name} ${p0(a.p)} (${f0(a.n)} interviews) versus ${G[G.length - 1].name} ${p0(z.p)} (${f0(z.n)}).` : ''); }
  }
  cav.innerHTML = `Each dot is a different set of interviews, and older ages come mostly from people injured before 1990 (use the era filter). Ages are approximate (± about 3 years). <b>Working</b> = paid work is the main status; <b>married</b> = current status.`;
  const head = ['Age at interview'].concat(G.flatMap(gr => MS.map(m => (G.length > 1 ? gr.name + ': ' : '') + m.name)));
  const trows = MS_AGES.map((b, bi) => [b.label].concat(G.flatMap((_, gi) => MS.map((m, mi) => { const z = cells[gi][mi][bi]; return z ? `${z.label} of ${f0(z.n)}` : '–'; }))));
  table('ms', 'Share of interviews with each milestone by approximate age at interview (95% person-clustered Wilson interval; n = interviews with a known status)', head, trows);
}
RENDERERS.push(renderMilestones);
