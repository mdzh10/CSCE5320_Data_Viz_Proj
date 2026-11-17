/* ===== RQ4: completeness heatmaps ===== */
function hatchDefs(svg, id, col) {
  const d = svg.append('defs').append('pattern').attr('id', id).attr('width', 6).attr('height', 6).attr('patternUnits', 'userSpaceOnUse').attr('patternTransform', 'rotate(45)');
  d.append('rect').attr('width', 6).attr('height', 6).attr('fill', 'none');
  d.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', 6).attr('stroke', col).attr('stroke-width', 1.6).attr('opacity', .55);
}
const heatTxt = v => v > .5 ? '#ffffff' : '#0b0b0b';

function renderHeatYear() {
  const el = $('#heatA'), cav = $('#heatA-caveat'), years = yearsInRange();
  if (!SEL.waves.length) { emptyMsg(el); return; }
  const Wd = Math.max(el.clientWidth, 340), narrow = Wd < 620;
  const ml = narrow ? 92 : 190, mr = 6, top = 46, rh = 30, H = top + rh * CVARS.length + 8;
  const svg = mkSvg(el, Wd, H, 'Heatmap of the share of follow-up interviews with a valid score, by instrument and post-injury year');
  hatchDefs(svg, 'hatchA', C.ink2);
  const cw = (Wd - ml - mr) / years.length;
  years.forEach((yy, j) => {
    const N = (SEL.byYr.get(yy) || []).length;
    if (!narrow) svg.append('text').attr('class', 'ax').attr('x', ml + j * cw + cw / 2).attr('y', 12).attr('text-anchor', 'middle').text(`n=${f0(N)}`);
    svg.append('text').attr('class', 'lbl-strong').attr('x', ml + j * cw + cw / 2).attr('y', 32).attr('text-anchor', 'middle').text(narrow ? yy : `Year ${yy}`);
  });
  const trows = [];
  CVARS.forEach((v, i) => {
    svg.append('text').attr('class', 'lbl').attr('x', ml - 10).attr('y', top + i * rh + rh / 2).attr('dy', '.32em').attr('text-anchor', 'end').text(narrow ? (v.short || v.name.replace('CHART ', '').replace('Satisfaction with life', 'Satisfaction').replace('physical independence', 'independence').replace('social integration', 'social').replace(' (items 1–2)', '').replace(' interference', '')) : v.name);
    const row = [v.name];
    years.forEach((yy, j) => {
      const ws = SEL.byYr.get(yy) || [], N = ws.length, k = ws.filter(w => nn(w[v.k])).length, r = N ? k / N : NaN, low = N < S.minN;
      row.push(isNaN(r) ? '–' : p0(r));
      const x0 = ml + j * cw + 1, y0 = top + i * rh + 1, w0 = cw - 2, h0 = rh - 2;
      const g = svg.append('g');
      g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('rx', 3).attr('fill', isNaN(r) ? C.neutralLight : HEAT(r));
      if (low) g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('rx', 3).attr('fill', 'url(#hatchA)');
      if (!isNaN(r) && w0 > 30) g.append('text').attr('x', x0 + w0 / 2).attr('y', y0 + h0 / 2).attr('dy', '.34em').attr('text-anchor', 'middle').attr('font-size', 11.5).attr('font-weight', 600).attr('fill', heatTxt(r)).text(p0(r));
      g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('fill', 'transparent')
        .on('mousemove', ev => tipShow(`<div class="th">${v.name} · year ${yy}</div><div class="tr"><span class="tl">Valid score</span><span class="tv">${isNaN(r) ? '–' : p1(r)}</span></div><div class="tr ts">${f0(k)} of ${f0(N)} interviews${low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    });
    trows.push(row);
  });
  cav.innerHTML = `Hatched: fewer than <b>${S.minN}</b> interviews. Low early-year completeness is mostly about <i>when</i> the interview happened (see 4b), not the respondent’s age.`;
  table('heatA', 'Share of follow-up interviews with a valid score, by instrument and post-injury year', ['Instrument'].concat(years.map(y => 'Yr ' + y)), trows);
}

function renderHeatEra() {
  const el = $('#heatB'), cav = $('#heatB-caveat'), lg = $('#heatB-seg');
  lg.innerHTML = CVARS.filter(v => ['PI', 'SWL', 'PHQ2', 'pain'].includes(v.k)).map(v => `<button type="button" data-hv="${v.k}" aria-pressed="${S.heatVar === v.k}">${v.k === 'PI' ? 'CHART' : v.k === 'SWL' ? 'SWL' : v.k === 'PHQ2' ? 'PHQ-2' : 'Pain'}</button>`).join('');
  if (!SEL.waves.length) { emptyMsg(el); return; }
  const vk = S.heatVar, v = CVARS.find(c => c.k === vk);
  const structural = (er) => (['PI', 'MB', 'OP', 'SI', 'SWL'].includes(vk) && er === 0) || (['PHQ9', 'PHQ2'].includes(vk) && er <= 1);
  const Wd = Math.max(el.clientWidth, 320), ml = 78, mr = 4, top = 40, rh = 48, H = top + rh * 5 + 10;
  const svg = mkSvg(el, Wd, H, 'Heatmap of the share of interviews with a valid score by calendar era and age at interview');
  hatchDefs(svg, 'hatchB', C.ink2);
  const cw = (Wd - ml - mr) / 4, trows = [];
  LK.age_grp.forEach((a, j) => svg.append('text').attr('class', 'lbl-strong').attr('x', ml + j * cw + cw / 2).attr('y', 30).attr('text-anchor', 'middle').text(a));
  svg.append('text').attr('class', 'ax').attr('x', ml + 2 * cw).attr('y', 12).attr('text-anchor', 'middle').text('Age at interview (estimated)');
  LK.era_cal.forEach((er, i) => {
    svg.append('text').attr('class', 'lbl-strong').attr('x', ml - 10).attr('y', top + i * rh + rh / 2).attr('dy', '.32em').attr('text-anchor', 'end').text(er);
    const row = [er];
    LK.age_grp.forEach((a, j) => {
      const ws = SEL.waves.filter(w => w.eraCal === i && w.ageGrp === j), N = ws.length, k = ws.filter(w => nn(w[vk])).length, r = N ? k / N : NaN, low = N > 0 && N < S.minN, st = structural(i);
      row.push(N ? `${p0(r)} (n=${f0(N)})` : '–');
      const x0 = ml + j * cw + 1.5, y0 = top + i * rh + 1.5, w0 = cw - 3, h0 = rh - 3, g = svg.append('g');
      g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('rx', 4).attr('fill', N ? HEAT(r) : C.page || '#f2f1ec').attr('stroke', N ? 'none' : C.axis).attr('stroke-dasharray', N ? null : '3 3');
      if (st && N) g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('rx', 4).attr('fill', 'url(#hatchB)');
      if (low && !st) g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('rx', 4).attr('fill', 'url(#hatchB)').attr('opacity', .6);
      if (N) {
        const lab = st ? C.ink : heatTxt(r), box = st || r < .5;
        if (st) g.append('rect').attr('x', x0 + w0 / 2 - 30).attr('y', y0 + h0 / 2 - 15).attr('width', 60).attr('height', 30).attr('rx', 4).attr('fill', C.surface).attr('opacity', .92);
        g.append('text').attr('x', x0 + w0 / 2).attr('y', y0 + h0 / 2 - 4).attr('text-anchor', 'middle').attr('font-size', 12.5).attr('font-weight', 650).attr('fill', st ? C.ink : lab).text(p0(r));
        g.append('text').attr('x', x0 + w0 / 2).attr('y', y0 + h0 / 2 + 10).attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', st ? C.ink2 : lab).attr('opacity', .9).text('n=' + f0(N));
      }
      g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', h0).attr('fill', 'transparent')
        .on('mousemove', ev => tipShow(`<div class="th">${v.name}</div><div class="tr ts">Interviewed ${er} · age ${a}</div>${N ? `<div class="tr"><span class="tl">Valid score</span><span class="tv">${p1(r)}</span></div><div class="tr ts">${f0(k)} of ${f0(N)} interviews</div>` : '<div class="tr ts">No interviews in this cell</div>'}${st && N ? '<div class="tr ts">Hatched: instrument not yet in the interview schedule</div>' : ''}`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    });
    trows.push(row);
  });
  cav.innerHTML = `<b>Era beats age.</b> Hatched: the instrument was not yet collected (CHART/SWL from Nov 1995, PHQ from Oct 2000). Ages are estimated.`;
  table('heatB', `${v.name}: share valid, by interview era and age (n of interviews)`, ['Interview era'].concat(LK.age_grp), trows);
}
RENDERERS.push(renderHeatYear, renderHeatEra);

/* ===== RQ4: cohort status flow ===== */
const FLOW = [
  { id: 'I', name: 'Interviewed (useful data)', color: C.blue, codes: ['I'], txt: '#ffffff' },
  { id: 'L', name: 'Lost, withdrew or no record', color: C.orange, codes: ['L', 'M'], txt: '#0b0b0b' },
  { id: 'D', name: 'Deceased', color: C.neutralDark, codes: ['D'], txt: '#ffffff' },
  { id: 'X', name: 'Not yet due or exempt', color: C.neutralLight, codes: ['X'], txt: '#0b0b0b' }
];
function renderFlow() {
  const el = $('#flow'), lg = $('#flow-legend'), cav = $('#flow-caveat'), years = yearsInRange();
  lg.innerHTML = FLOW.map(f => `<span class="item"><span class="sw" style="background:${f.color}"></span>${f.name}</span>`).join('');
  if (!SEL.persons.length) { emptyMsg(el); return; }
  const Wd = Math.max(el.clientWidth, 320), m = { t: 8, r: 8, b: 40, l: 40 }, H = 320;
  const svg = mkSvg(el, Wd, H, 'Stacked columns showing the status of every person in the cohort at each follow-up anniversary');
  const x = d3.scaleBand().domain(years).range([m.l, Wd - m.r]).paddingInner(.25).paddingOuter(.1);
  const y = d3.scaleLinear().domain([0, 1]).range([H - m.b, m.t]);
  [0, .25, .5, .75, 1].forEach(t => { svg.append('line').attr('x1', m.l).attr('x2', Wd - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', C.grid); svg.append('text').attr('class', 'ax').attr('x', m.l - 8).attr('y', y(t)).attr('dy', '.32em').attr('text-anchor', 'end').text(p0(t)); });
  const bw = Math.min(34, x.bandwidth()), trows = [], N = SEL.persons.length;
  years.forEach(yy => {
    const idx = ANN.indexOf(yy), cnt = {}; FLOW.forEach(f => cnt[f.id] = 0);
    SEL.persons.forEach(p => { const c = p.st[idx]; const f = FLOW.find(f => f.codes.includes(c)); if (f) cnt[f.id]++; });
    const xs = x(yy) + (x.bandwidth() - bw) / 2; let acc = 0; const row = [yy];
    FLOW.forEach(f => {
      const c = cnt[f.id], a = c / N, y1 = y(acc + a), y0 = y(acc), h = Math.max(0, y0 - y1 - 2); acc += a; row.push(`${p1(a)} (${f0(c)})`);
      if (!c) return;
      svg.append('rect').attr('x', xs).attr('width', bw).attr('y', y1).attr('height', h).attr('rx', 2).attr('fill', f.color)
        .on('mousemove', ev => tipShow(`<div class="th">${yy} years after injury</div><div class="tr">${key(f.color)}<span class="tl">${f.name}</span><span class="tv">${f0(c)}</span><span class="ts">${p1(a)} of ${f0(N)}</span></div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
      if (h > 16 && bw > 24) svg.append('text').attr('x', xs + bw / 2).attr('y', y1 + h / 2).attr('dy', '.34em').attr('text-anchor', 'middle').attr('font-size', 10.5).attr('font-weight', 600).attr('fill', f.txt).attr('pointer-events', 'none').text(p0(a));
    });
    svg.append('text').attr('class', 'ax').attr('x', x(yy) + x.bandwidth() / 2).attr('y', H - m.b + 16).attr('text-anchor', 'middle').text(yy);
    trows.push(row);
  });
  svg.append('line').attr('x1', m.l).attr('x2', Wd - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', C.axis);
  svg.append('text').attr('class', 'axl').attr('x', (m.l + Wd - m.r) / 2).attr('y', H - 6).attr('text-anchor', 'middle').text('Years since injury');
  cav.innerHTML = `Share of all ${f0(N)} selected people in each state. “Not yet due”: injured too recently to reach that year (data end 2021).`;
  table('flow', 'Status of selected people at each follow-up anniversary, % (count)', ['Year'].concat(FLOW.map(f => f.name)), trows);
}
RENDERERS.push(renderFlow);

/* ===== RQ4 (cont.): are the same people behind each point? follow-up depth + pairwise overlap ===== */
function renderOverlap() {
  const el = $('#overlap'), cav = $('#overlap-caveat'), sg = $('#overlap-seg');
  sg.innerHTML = OVK.map(v => `<button type="button" data-ov="${v.k}" aria-pressed="${S.ovVar === v.k}">${v.name}</button>`).join('');
  if (!SEL.waves.length) { emptyMsg(el); return; }
  const ov = OVK.find(v => v.k === S.ovVar), years = yearsInRange(), k = ov.k;
  /* people with a valid score per anniversary, and scores per person */
  const sets = years.map(yy => new Set((SEL.byYr.get(yy) || []).filter(w => nn(w[k])).map(w => w.pid)));
  const yset = new Set(years), per = new Map(SEL.persons.map(p => [p.pid, 0]));
  SEL.byPid.forEach((ws, pid) => per.set(pid, ws.filter(w => nn(w[k]) && yset.has(w.yr)).length));
  const CATS = [0, 1, 2, 3, 4, 5], cnt = CATS.map(() => 0);
  per.forEach(n => cnt[Math.min(n, 5)]++);
  const NP = SEL.persons.length, few = cnt[0] + cnt[1];

  const Wd = Math.max(el.clientWidth, 340), narrow = Wd < 760;
  const leftW = narrow ? Wd : Math.min(380, Wd * .36), gap = narrow ? 0 : 36;
  const histH = 34 + CATS.length * 32 + 30;
  const cell = narrow ? Math.min(46, (Wd - 44) / years.length) : Math.min(46, (Wd - leftW - gap - 44) / years.length);
  const mTop = 54, mH = mTop + years.length * cell + 8;
  const H = narrow ? histH + 18 + mH : Math.max(histH, mH);
  const svg = mkSvg(el, Wd, H, `Left, how many valid ${ov.name} scores each person has; right, how many people have a valid score at both of two anniversaries`);
  hatchDefs(svg, 'hatchO', C.ink2);

  /* left: depth histogram (horizontal bars) */
  const hx = d3.scaleLinear().domain([0, d3.max(cnt) || 1]).range([0, leftW - 150]);
  svg.append('text').attr('class', 'lbl-strong').attr('x', 0).attr('y', 14).text(`Valid ${ov.name} scores per person`);
  svg.append('text').attr('class', 'lbl').attr('x', 0).attr('y', 30).text(`${f0(NP)} selected people, years ${years[0]}–${years[years.length - 1]}`);
  const trows = [];
  CATS.forEach((c, i) => {
    const yy = 34 + i * 32 + 12, lab = c === 5 ? '5 or more' : c === 0 ? 'None' : c === 1 ? '1 score' : c + ' scores', n = cnt[i], w0 = hx(n);
    svg.append('text').attr('class', 'lbl').attr('x', 74).attr('y', yy + 8).attr('text-anchor', 'end').attr('dy', '.32em').text(lab);
    svg.append('rect').attr('x', 82).attr('y', yy - 6).attr('width', Math.max(n ? 2 : 0, w0)).attr('height', 28 - 6).attr('rx', 3).attr('fill', c <= 1 ? C.ctx : C.neutralDark)
      .on('mousemove', ev => tipShow(`<div class="th">${lab} (${ov.long})</div><div class="tr"><span class="tv">${f0(n)}</span><span class="tl">people</span><span class="ts">${NP ? p1(n / NP) : '–'} of selected</span></div>${c <= 1 ? '<div class="tr ts">Cannot show change within a person</div>' : ''}`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    svg.append('text').attr('class', 'lbl-strong').attr('x', 82 + Math.max(2, w0) + 6).attr('y', yy + 8).attr('dy', '.32em').attr('font-weight', 500).text(`${f0(n)} · ${NP ? p0(n / NP) : '–'}`);
    trows.push([lab, f0(n), NP ? p1(n / NP) : '–']);
  });
  svg.append('text').attr('class', 'lbl').attr('x', 0).attr('y', 34 + CATS.length * 32 + 22).attr('fill', C.ink2).text(`${NP ? p0(few / NP) : '–'} of people have 0 or 1 score (grey bars).`);

  /* right: pairwise overlap, upper triangle */
  const ox = narrow ? 36 : leftW + gap + 36, oy = narrow ? histH + 18 : 0;
  svg.append('text').attr('class', 'lbl-strong').attr('x', ox - 36).attr('y', oy + 14).text('People with a score at both anniversaries');
  svg.append('text').attr('class', 'lbl').attr('x', ox - 36).attr('y', oy + 30).text(narrow ? 'Colour = share of the smaller group; diagonal = n' : 'Colour = share of the smaller of the two groups; diagonal = people at that anniversary');
  const orows = [];
  years.forEach((a, i) => {
    svg.append('text').attr('class', 'ax').attr('x', ox + i * cell + cell / 2).attr('y', oy + mTop - 8).attr('text-anchor', 'middle').text(a);
    svg.append('text').attr('class', 'ax').attr('x', ox - 8).attr('y', oy + mTop + i * cell + cell / 2).attr('dy', '.32em').attr('text-anchor', 'end').text(a);
  });
  years.forEach((a, i) => {
    const row = [a];
    years.forEach((b, j) => {
      if (j < i) { row.push(''); return; }
      const A = sets[i], Bs = sets[j], n = i === j ? A.size : [...A].filter(p => Bs.has(p)).length, sm = Math.min(A.size, Bs.size), fr = i === j ? NaN : (sm ? n / sm : NaN);
      row.push(i === j ? `${f0(n)}` : `${f0(n)}${isNaN(fr) ? '' : ' (' + p0(fr) + ')'}`);
      const x0 = ox + j * cell + 1, y0 = oy + mTop + i * cell + 1, w0 = cell - 2, low = n < S.minN;
      const g = svg.append('g');
      g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', w0).attr('rx', 3).attr('fill', i === j ? C.neutralLight : isNaN(fr) ? C.neutralLight : HEAT(fr));
      if (low && i !== j) g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', w0).attr('rx', 3).attr('fill', 'url(#hatchO)');
      if (w0 > 26) g.append('text').attr('x', x0 + w0 / 2).attr('y', y0 + w0 / 2).attr('dy', '.34em').attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600).attr('fill', i === j ? C.ink : heatTxt(isNaN(fr) ? 0 : fr)).text(f0(n));
      g.append('rect').attr('x', x0).attr('y', y0).attr('width', w0).attr('height', w0).attr('fill', 'transparent')
        .on('mousemove', ev => tipShow(i === j
          ? `<div class="th">Year ${a}</div><div class="tr"><span class="tv">${f0(n)}</span><span class="tl">people with a valid ${ov.name} score</span></div>`
          : `<div class="th">Year ${a} and year ${b}</div><div class="tr"><span class="tv">${f0(n)}</span><span class="tl">people have a valid score at both</span></div><div class="tr ts">${f0(A.size)} at year ${a}, ${f0(Bs.size)} at year ${b}${isNaN(fr) ? '' : ' · ' + p0(fr) + ' of the smaller group'}${low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    });
    orows.push(row);
  });
  cav.innerHTML = `Cells far from the diagonal share almost nobody, which is why the question 1 dots are not joined. Hatched: fewer than <b>${S.minN}</b> people.`;
  table('overlap', `People with a valid ${ov.name} score at both anniversaries, count (share of the smaller group); diagonal = people at that anniversary. Scores per person: ${trows.map(r => `${r[0]} ${r[1]} (${r[2]})`).join('; ')}`,
    ['Anniversary'].concat(years.map(y => 'Yr ' + y)), orows);
}
RENDERERS.push(renderOverlap);

/* ===== RQ4 (cont.): do people who leave the data look different earlier? =====
   People with a valid score at an anniversary, grouped by what happened by the NEXT anniversary
   (still interviewed / lost, withdrew or no record / deceased). Compares their scores at the earlier anniversary. */
function renderAttrition() {
  const el = $('#attr'), lg = $('#attr-legend'), cav = $('#attr-caveat'), sg = $('#attr-seg');
  sg.innerHTML = [['PI', 'CHART independence'], ['SWL', 'Life satisfaction']].map(([k, t]) => `<button type="button" data-av="${k}" aria-pressed="${S.attrVar === k}">${t}</button>`).join('');
  const GR = [{ id: 'I', name: 'Still interviewed at the next anniversary', short: 'Interviewed', color: FLOW[0].color, codes: ['I'] }, { id: 'L', name: 'Lost, withdrew or no record', short: 'Lost', color: FLOW[1].color, codes: ['L', 'M'] }, { id: 'D', name: 'Deceased', short: 'Deceased', color: FLOW[2].color, codes: ['D'] }];
  lg.innerHTML = GR.map(g => `<span class="item"><span class="sw" style="background:${g.color};border-radius:50%"></span>${g.name}</span>`).join('');
  const o = OUTK[S.attrVar], yrs = yearsInRange().filter(y => ANN.indexOf(y) < ANN.length - 1 && ANN[ANN.indexOf(y) + 1] <= S.hi);
  if (!SEL.persons.length || !yrs.length) { emptyMsg(el, yrs.length ? undefined : 'Choose a range with at least two anniversaries.'); table('attr', '', [], []); return; }
  const rows = yrs.map(a => {
    const ia = ANN.indexOf(a), b = ANN[ia + 1], anch = (SEL.byYr.get(a) || []).filter(w => nn(w[o.k]));
    const gs = GR.map(g => { const v = anch.filter(w => g.codes.includes(w.p.st[ia + 1])).map(w => w[o.k]), s = meanCI(v); return { g, n: s.n, m: s.mean, ci: s.ci, low: s.n < S.minN }; });
    return { a, b, gs, pending: anch.filter(w => w.p.st[ia + 1] === 'X').length };
  });
  const Wd = Math.max(el.clientWidth, 340), narrow = Wd < 700, rowH = 58, top = 34, labW = narrow ? 84 : 110, rightW = narrow ? 0 : 190, H = top + rows.length * rowH + 30;
  const svg = mkSvg(el, Wd, H, 'Dot plot comparing the earlier score of people who were later still interviewed, lost, or deceased, for each pair of consecutive anniversaries');
  const dom = S.attrVar === 'PI' ? [30, 100] : [10, 35], x = d3.scaleLinear().domain(dom).range([labW, Wd - rightW - 14]);
  (S.attrVar === 'PI' ? [40, 50, 60, 70, 80, 90, 100] : [10, 15, 20, 25, 30, 35]).forEach(t => { svg.append('line').attr('x1', x(t)).attr('x2', x(t)).attr('y1', top - 6).attr('y2', top + rows.length * rowH).attr('stroke', C.grid); svg.append('text').attr('class', 'ax').attr('x', x(t)).attr('y', top + rows.length * rowH + 15).attr('text-anchor', 'middle').text(t); });
  svg.append('text').attr('class', 'axl').attr('x', narrow ? Wd : (labW + Wd - rightW) / 2).attr('y', H - 3).attr('text-anchor', narrow ? 'end' : 'middle').text(narrow ? `Mean earlier score (scale ${o.lo}–${o.hi}), 95% CI` : `Mean ${o.name.replace(' (SWL)', '').toLowerCase()} at the earlier anniversary (scale ${o.lo}–${o.hi}), 95% CI`);
  if (!narrow) { svg.append('text').attr('class', 'lbl-strong').attr('x', Wd - rightW + 8).attr('y', 11).text('People behind the dots'); svg.append('text').attr('class', 'ax').attr('x', Wd - rightW + 8).attr('y', 25).text('interviewed · lost · deceased'); }
  const trows = [];
  rows.forEach((r, i) => {
    const yc = top + i * rowH + rowH / 2;
    svg.append('text').attr('class', 'lbl-strong').attr('x', 0).attr('y', yc - 4).text(`Year ${r.a}`);
    svg.append('text').attr('class', 'ax').attr('x', 0).attr('y', yc + 10).text(`→ year ${r.b}`);
    const tr = [`${r.a} → ${r.b}`];
    r.gs.forEach((q, k) => {
      const dy = (k - 1) * 14, col = q.g.color, g = svg.append('g').attr('opacity', q.low ? .6 : 1);
      if (!q.n) { tr.push('–'); return; }
      if (!isNaN(q.ci)) g.append('line').attr('x1', x(Math.max(dom[0], q.m - q.ci))).attr('x2', x(Math.min(dom[1], q.m + q.ci))).attr('y1', yc + dy).attr('y2', yc + dy).attr('stroke', col).attr('stroke-width', 2);
      g.append('circle').attr('cx', x(q.m)).attr('cy', yc + dy).attr('r', 5).attr('fill', q.low ? C.surface : col).attr('stroke', q.low ? col : C.surface).attr('stroke-width', 2)
        .on('mousemove', ev => tipShow(`<div class="th">Year ${r.a} → ${r.b}: ${q.g.short.toLowerCase()}</div><div class="tr"><span class="tl">Mean score at year ${r.a}</span><span class="tv">${f1(q.m)}${isNaN(q.ci) ? '' : ' ± ' + f1(q.ci)}</span></div><div class="tr ts">${f0(q.n)} people${q.low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
      tr.push(`${f1(q.m)}${isNaN(q.ci) ? '' : ' ± ' + f1(q.ci)} (n=${f0(q.n)})`);
    });
    if (!narrow) svg.append('text').attr('class', 'lbl').attr('x', Wd - rightW + 8).attr('y', yc + 4).text(`${r.gs.map(q => f0(q.n)).join(' · ')}${r.pending ? `  (+${f0(r.pending)} not yet due)` : ''}`);
    svg.append('line').attr('x1', 0).attr('x2', Wd).attr('y1', top + (i + 1) * rowH - 0.5).attr('y2', top + (i + 1) * rowH - 0.5).attr('stroke', C.grid).attr('stroke-dasharray', '1 3');
    trows.push(tr);
  });
  /* takeaway: n-weighted gap, deceased vs still interviewed, over the steps with at least two people deceased */
  const dd = rows.filter(r => r.gs[2].n >= 2 && r.gs[0].n >= 2), nd = d3.sum(dd, r => r.gs[2].n);
  const gapD = nd ? d3.sum(dd, r => r.gs[2].n * (r.gs[2].m - r.gs[0].m)) / nd : NaN;
  const dl = rows.filter(r => r.gs[1].n >= 2 && r.gs[0].n >= 2), nl = d3.sum(dl, r => r.gs[1].n);
  const gapL = nl ? d3.sum(dl, r => r.gs[1].n * (r.gs[1].m - r.gs[0].m)) / nl : NaN;
  take('attr-take', nd || nl ? `${nd ? `People who had died by the next anniversary scored ${f1(Math.abs(gapD))} points ${gapD < 0 ? 'lower' : 'higher'} earlier than those still interviewed (average over steps, ${f0(nd)} people).` : ''}${nd && nl ? ' ' : ''}${nl ? `Those lost to follow-up scored ${f1(Math.abs(gapL))} points ${gapL < 0 ? 'lower' : 'higher'} (${f0(nl)} people).` : ''}` : '');
  cav.innerHTML = `Groups by status at the <i>next</i> anniversary; people not yet due are left out. Hollow: fewer than <b>${S.minN}</b> people. Descriptive: it does not show why people left.`;
  table('attr', `Mean ${o.name.replace(' (SWL)', '')} at the earlier anniversary by status at the next anniversary (± 95% CI; n people)`, ['Step', 'Still interviewed', 'Lost, withdrew or no record', 'Deceased'], trows);
}
RENDERERS.push(renderAttrition);
