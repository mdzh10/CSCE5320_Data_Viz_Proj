/* ===== RQ5: mood vs independence and satisfaction =====
   Left: how common is a positive depression screen at each independence level?
   Right: life satisfaction of screen-negative vs screen-positive interviews at the SAME independence level (does the gap persist?). */
function renderMood() {
  const el = $('#mood'), lg = $('#mood-legend'), cav = $('#mood-caveat'), sg = $('#mood-seg');
  sg.innerHTML = DEP.map(d => `<button type="button" data-dp="${d.k}" aria-pressed="${S.depVar === d.k}">${d.k === 'PHQ2' ? 'PHQ-2 ≥ 3' : 'PHQ-9 ≥ 10'}</button>`).join('');
  const d = DEP.find(x => x.k === S.depVar), B = BANDS.PI, NEG = C.neutralDark;
  lg.innerHTML = `<span class="item"><span class="sw" style="background:${d.color}"></span>Screens positive (${d.name.split(' (')[0]})</span><span class="item"><span class="sw" style="background:${NEG}"></span>Screens negative</span>`;
  if (!SEL.waves.length) { emptyMsg(el); take('mood-take', ''); return; }
  const ws = SEL.waves.filter(w => nn(w.PI) && nn(w[d.base]));
  if (!ws.length) { el.innerHTML = `<div class="empty">No interviews in this selection have both a physical-independence score and a ${d.k === 'PHQ2' ? 'PHQ-2' : 'PHQ-9'}. <button class="reset" style="margin-left:8px" data-reset>Reset filters</button></div>`; table('mood', '', [], []); take('mood-take', ''); return; }
  const rows = B.labels.map((lab, bi) => {
    const inb = ws.filter(w => B.f(w.PI) === bi), isPos = w => d.test(w[d.base]);
    const wc = wilsonC(inb, isPos);
    const sp = meanCIc(inb.filter(w => isPos(w) && nn(w.SWL)), 'SWL'), sn = meanCIc(inb.filter(w => !isPos(w) && nn(w.SWL)), 'SWL');
    const gap = sp.n && sn.n ? sp.mean - sn.mean : NaN, gci = (sp.n > 1 && sn.n > 1 && !isNaN(sp.ci) && !isNaN(sn.ci)) ? Math.sqrt(sp.ci ** 2 + sn.ci ** 2) : NaN;
    return { lab, bi, n: inb.length, np: wc.np, k: wc.k, p: wc.p, lo: wc.lo, hi: wc.hi, deff: wc.deff, sp, sn, gap, gci, low: inb.length < S.minN, lowP: sp.n < S.minN || sn.n < S.minN };
  });
  const Wd = Math.max(el.clientWidth, 340), narrow = Wd < 780, rowH = 46, top = 58, labW = narrow ? 84 : 96;
  const panelH = top + rows.length * rowH + 28;
  let leftX0, leftX1, rightX0, rightX1, H, rightY0 = 0, gapX = null;
  if (narrow) { leftX0 = labW; leftX1 = Wd - 70; rightX0 = labW; rightX1 = Wd - 16; rightY0 = panelH + 10; H = rightY0 + panelH; }
  else { leftX0 = labW; leftX1 = labW + Math.max(150, Wd * .22); rightX0 = leftX1 + 120; gapX = Wd - 150; rightX1 = gapX - 28; H = panelH; }
  const svg = mkSvg(el, Wd, H, 'Left, share screening positive for depression by physical-independence band; right, mean life satisfaction of screen-negative and screen-positive interviews in the same band');
  const pmax = Math.max(.1, Math.ceil(((d3.max(rows, r => isNaN(r.hi) ? 0 : r.hi) || .1) + .02) * 10) / 10);
  const px = d3.scaleLinear().domain([0, pmax]).range([leftX0, leftX1]);
  const sx = d3.scaleLinear().domain([5, 35]).range([rightX0, rightX1]);
  /* headers */
  svg.append('text').attr('class', 'lbl-strong').attr('x', 0).attr('y', 14).text('Share screening positive');
  svg.append('text').attr('class', 'lbl').attr('x', 0).attr('y', 30).text('by independence level (bars: 95% CI)');
  svg.append('text').attr('class', 'lbl-strong').attr('x', narrow ? 0 : rightX0 - 0).attr('y', rightY0 + 14).text('Average life satisfaction (SWL, 5–35)');
  svg.append('text').attr('class', 'lbl').attr('x', narrow ? 0 : rightX0).attr('y', rightY0 + 30).text('within each level: mean ± 95% CI');
  if (!narrow) { svg.append('text').attr('class', 'lbl-strong').attr('x', gapX).attr('y', 14).text('Gap in SWL'); svg.append('text').attr('class', 'lbl').attr('x', gapX).attr('y', 30).text('positive − negative'); }
  [top, rightY0 + top].forEach(yy => svg.append('text').attr('class', 'ax').attr('x', labW - 10).attr('y', yy - 8).attr('text-anchor', 'end').text('CHART score'));
  /* axes */
  const gridL = svg.append('g'), gridR = svg.append('g');
  px.ticks(4).forEach(t => { gridL.append('line').attr('x1', px(t)).attr('x2', px(t)).attr('y1', top - 4).attr('y2', top + rows.length * rowH).attr('stroke', C.grid); gridL.append('text').attr('class', 'ax').attr('x', px(t)).attr('y', top + rows.length * rowH + 14).attr('text-anchor', 'middle').text(p0(t)); });
  [10, 15, 20, 25, 30, 35].forEach(t => { gridR.append('line').attr('x1', sx(t)).attr('x2', sx(t)).attr('y1', rightY0 + top - 4).attr('y2', rightY0 + top + rows.length * rowH).attr('stroke', C.grid); gridR.append('text').attr('class', 'ax').attr('x', sx(t)).attr('y', rightY0 + top + rows.length * rowH + 14).attr('text-anchor', 'middle').text(t); });
  /* satisfaction cutoffs on the SWL panel: the same ones RQ2 uses */
  [[S.swlLo, 'low'], [S.swlHi, 'high']].forEach(([q, lab]) => { svg.append('line').attr('x1', sx(q)).attr('x2', sx(q)).attr('y1', rightY0 + top - 4).attr('y2', rightY0 + top + rows.length * rowH).attr('stroke', C.axis).attr('stroke-dasharray', '4 4'); svg.append('text').attr('class', 'ax').attr('x', sx(q)).attr('y', rightY0 + top - 8).attr('text-anchor', 'middle').text(`${lab} = ${q}`); });
  rows.forEach((r, i) => {
    const yl = top + i * rowH + rowH / 2, yr = rightY0 + yl, fade = r.low ? .45 : 1;
    const lab = r.lab;
    [yl, yr].forEach(yy => { svg.append('text').attr('class', 'lbl').attr('x', labW - 10).attr('y', yy).attr('dy', '.32em').attr('text-anchor', 'end').attr('opacity', fade).text(lab); });
    /* left: bar + CI */
    const gL = svg.append('g').attr('opacity', fade);
    if (r.n) {
      gL.append('rect').attr('x', px(0)).attr('y', yl - 11).attr('width', Math.max(1, px(r.p) - px(0))).attr('height', 22).attr('rx', 3).attr('fill', d.color)
        .on('mousemove', ev => tipShow(`<div class="th">${lab}</div><div class="tr"><span class="tl">Screens positive</span><span class="tv">${p1(r.p)}</span></div><div class="tr ts">95% CI ${p1(r.lo)}–${p1(r.hi)} · ${f0(r.k)} of ${f0(r.n)} interviews${r.low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
      gL.append('line').attr('x1', px(r.lo)).attr('x2', px(r.hi)).attr('y1', yl).attr('y2', yl).attr('stroke', C.ink).attr('stroke-width', 1.6);
      [r.lo, r.hi].forEach(v => gL.append('line').attr('x1', px(v)).attr('x2', px(v)).attr('y1', yl - 4).attr('y2', yl + 4).attr('stroke', C.ink).attr('stroke-width', 1.6));
      { const t = gL.append('text').attr('class', 'lbl-strong').attr('x', px(r.hi) + 8).attr('y', yl).attr('dy', '.32em').attr('font-weight', 500);
        t.append('tspan').text(`${p0(r.p)}`); t.append('tspan').attr('class', 'ax').attr('font-weight', 400).text(`  n=${f0(r.n)}${r.low ? ' *' : ''}`); }
    } else gL.append('text').attr('class', 'ax').attr('x', leftX0).attr('y', yl).attr('dy', '.32em').text('no interviews');
    /* right: two dots + CI */
    const gR = svg.append('g').attr('opacity', r.lowP ? .5 : 1);
    [[r.sn, NEG, -7, 'Screens negative'], [r.sp, d.color, 7, 'Screens positive']].forEach(([s, col, dy, nm]) => {
      if (!s.n) return;
      if (!isNaN(s.ci)) { gR.append('line').attr('x1', sx(Math.max(5, s.mean - s.ci))).attr('x2', sx(Math.min(35, s.mean + s.ci))).attr('y1', yr + dy).attr('y2', yr + dy).attr('stroke', col).attr('stroke-width', 2); }
      gR.append('circle').attr('cx', sx(s.mean)).attr('cy', yr + dy).attr('r', 5.5).attr('fill', s.n < S.minN ? C.surface : col).attr('stroke', s.n < S.minN ? col : C.surface).attr('stroke-width', 2)
        .on('mousemove', ev => tipShow(`<div class="th">${lab} · ${nm.toLowerCase()}</div><div class="tr"><span class="tl">Mean SWL</span><span class="tv">${f1(s.mean)}${isNaN(s.ci) ? '' : ' ± ' + f1(s.ci)}</span></div><div class="tr ts">${f0(s.n)} interviews${s.n < S.minN ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    });
    if (!narrow) {
      if (!isNaN(r.gap)) {
        svg.append('text').attr('class', 'lbl-strong').attr('x', gapX).attr('y', yl - 4).attr('opacity', r.lowP ? .5 : 1).text(`${r.gap > 0 ? '+' : '−'}${f1(Math.abs(r.gap))} pts`);
        svg.append('text').attr('class', 'ax').attr('x', gapX).attr('y', yl + 11).attr('opacity', r.lowP ? .5 : 1).text(isNaN(r.gci) ? 'CI n/a' : `95% CI ±${f1(r.gci)}`);
      } else svg.append('text').attr('class', 'ax').attr('x', gapX).attr('y', yl).attr('dy', '.32em').text('n/a');
    }
  });
  const g0 = rows.filter(r => !isNaN(r.gap) && !r.lowP);
  take('mood-take', g0.length ? `Screen-positive interviews have lower life satisfaction at ${g0.filter(r => r.gap < 0).length} of ${g0.length} well-populated independence levels (gap ${f1(d3.min(g0, r => Math.abs(r.gap)))} to ${f1(d3.max(g0, r => Math.abs(r.gap)))} points).` : '');
  const allGap = g0.length ? `${g0.filter(r => r.gap < 0).length} of ${g0.length} well-populated independence levels show lower satisfaction among screen-positive interviews.` : '';
  cav.innerHTML = `Intervals are computed by person. Mood and independence affect each other, so this cannot say which comes first. PHQ-2 is available from late 2000. Faded or hollow: fewer than <b>${S.minN}</b> interviews.`;
  table('mood', `Depression screen (${d.name}) by independence band: share positive, and mean SWL by screen result`,
    ['Independence band', 'Interviews (people)', 'Positive', 'SWL screen-negative (n)', 'SWL screen-positive (n)', 'Gap (95% CI)'],
    rows.map(r => [r.lab, `${f0(r.n)} (${f0(r.np)})`, r.n ? `${p1(r.p)} (${p1(r.lo)}–${p1(r.hi)})` : '–', r.sn.n ? `${f1(r.sn.mean)}${isNaN(r.sn.ci) ? '' : ' ± ' + f1(r.sn.ci)} (${f0(r.sn.n)})` : '–', r.sp.n ? `${f1(r.sp.mean)}${isNaN(r.sp.ci) ? '' : ' ± ' + f1(r.sp.ci)} (${f0(r.sp.n)})` : '–', isNaN(r.gap) ? '–' : `${r.gap > 0 ? '+' : '−'}${f1(Math.abs(r.gap))}${isNaN(r.gci) ? '' : ' ± ' + f1(r.gci)}`]));
}
RENDERERS.push(renderMood);
