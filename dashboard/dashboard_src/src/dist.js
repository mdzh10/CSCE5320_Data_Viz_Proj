/* ===== RQ3: distributions by subgroup (stacked proportion bars of score bands) + mean and 95% CI as dot and whisker ===== */
const ORD = ['#86b6ef', '#3987e5', '#1c5cab', '#0d366b'];            // ordinal ramp, lightest step 250
const ORD_TXT = ['#0b0b0b', '#ffffff', '#ffffff', '#ffffff'];
const MEAN_DOM = { PI: [60, 100], SWL: [15, 30] };                    // fixed per outcome, so a filter never rescales the dot plot

function renderDist() {
  const el = $('#dist'), lg = $('#dist-legend'), cav = $('#dist-caveat');
  if (!SEL.waves.length) { emptyMsg(el); lg.innerHTML = ''; take('dist-take', ''); return; }
  const B = BANDS[S.distVar], o = OUTK[S.distVar];
  lg.innerHTML = `<span class="flabel" style="margin-right:4px">Score band:</span>` + B.labels.map((l, i) => `<span class="item"><span class="sw" style="background:${ORD[i]}"></span>${l}</span>`).join('')
    + `<span class="item"><span class="key" style="border-color:${C.ink};border-top-width:2px;width:14px"></span><span style="margin-left:-2px">●</span>&nbsp;Mean and 95% CI</span>`;
  const groups = [
    { title: 'Age at injury', key: 'age', items: AGEL.map((a, i) => ({ i, label: a })) },
    { title: 'Injury severity (ASIA grade at rehab discharge)', key: 'sev', items: SEVL.map((s, i) => ({ i, label: s === 'Unknown' ? 'Unknown' : 'Grade ' + s + (s === 'A' ? ' (complete)' : s === 'D' ? ' (mildest)' : ''), unknown: s === 'Unknown' })) },
    { title: 'Injury level', key: 'lvl', items: LVLL.map((s, i) => ({ i, label: s, unknown: s === 'Unknown' })).filter(it => P.some(p => p.lvl === it.i)) },
    { title: 'Sex', key: 'sex', items: SEXL.map((s, i) => ({ i, label: s })).filter(it => P.some(p => p.sex === it.i)) }
  ];
  const Wd = Math.max(el.clientWidth, 340), narrow = Wd < 640;
  const labW = narrow ? 112 : 190, dotW = narrow ? 0 : 200, nW = narrow ? 0 : 92, rightW = narrow ? 0 : dotW + nW + 24, rowH = 30, hdr = 26, top = 22;
  const rowsN = groups.reduce((a, g) => a + g.items.length, 0), H = top + groups.length * hdr + rowsN * rowH + 34;
  const svg = mkSvg(el, Wd, H, 'Stacked bars of score bands by age at injury, injury severity, injury level and sex, with the mean and its 95% confidence interval as a dot and whisker');
  const bx = d3.scaleLinear().domain([0, 1]).range([labW, Wd - rightW - 6]);
  const dx0 = Wd - rightW + 18, mx = d3.scaleLinear().domain(MEAN_DOM[S.distVar]).range([dx0, dx0 + dotW - 12]).clamp(true);
  let y0 = top; const trows = [], rowsInfo = [];
  if (!narrow) {
    svg.append('text').attr('class', 'lbl').attr('x', dx0).attr('y', 10).text(`Mean, 95% CI`);
    svg.append('text').attr('class', 'lbl').attr('x', Wd - 4).attr('y', 10).attr('text-anchor', 'end').text('Interviews (people)');
    mx.ticks(5).forEach(t => svg.append('line').attr('x1', mx(t)).attr('x2', mx(t)).attr('y1', top).attr('y2', H - 30).attr('stroke', C.grid));
    mx.ticks(5).forEach(t => svg.append('text').attr('class', 'ax').attr('x', mx(t)).attr('y', H - 16).attr('text-anchor', 'middle').text(t));
    svg.append('line').attr('x1', mx.range()[0]).attr('x2', mx.range()[1]).attr('y1', H - 30).attr('y2', H - 30).attr('stroke', C.axis);
  }
  svg.append('text').attr('class', 'ax').attr('x', bx(0)).attr('y', H - 16).text('0%');
  svg.append('text').attr('class', 'ax').attr('x', bx(1)).attr('y', H - 16).attr('text-anchor', 'end').text('100% of interviews');
  groups.forEach(gr => {
    svg.append('text').attr('class', 'lbl-strong').attr('x', 0).attr('y', y0 + 14).text(gr.title);
    y0 += hdr;
    const gInfo = { title: gr.title.split(' (')[0], rows: [] }; rowsInfo.push(gInfo);
    gr.items.forEach(it => {
      const ws = SEL.waves.filter(w => w.p[gr.key] === it.i && nn(w[S.distVar]));
      const n = ws.length, low = n < S.minN, cnt = [0, 0, 0, 0]; ws.forEach(w => cnt[B.f(w[S.distVar])]++);
      const s = meanCIc(ws, S.distVar), row = svg.append('g').attr('opacity', low ? .45 : 1), cy = y0 + rowH / 2 - 1;
      row.append('text').attr('class', 'lbl').attr('x', 8).attr('y', cy).attr('dy', '.32em').text(narrow ? it.label.replace(/ \(.*\)/, '') : it.label);
      if (!n) {
        row.append('text').attr('class', 'ax').attr('x', labW).attr('y', cy).attr('dy', '.32em').text('no interviews in current selection');
      } else {
        let acc = 0;
        cnt.forEach((c, bi) => {
          const w0 = c / n; if (!w0) return;
          const xs = bx(acc), wd = Math.max(0, bx(acc + w0) - bx(acc) - 2); acc += w0;
          const rr = row.append('rect').attr('x', xs).attr('y', y0 + 2).attr('width', wd).attr('height', 22).attr('rx', 3).attr('fill', ORD[bi]);
          if (wd > 30) row.append('text').attr('x', xs + wd / 2).attr('y', y0 + 13.5).attr('dy', '.32em').attr('text-anchor', 'middle').attr('font-size', 11).attr('font-weight', 600).attr('fill', ORD_TXT[bi]).text(p0(w0));
          rr.on('mousemove', ev => tipShow(`<div class="th">${it.label}</div><div class="tr"><span class="tl">${o.name} ${B.labels[bi]}</span><span class="tv">${p1(w0)}</span></div><div class="tr ts">${f0(c)} of ${f0(n)} interviews${low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
        });
      }
      if (!narrow && n) {
        const lo = s.mean - (isNaN(s.ci) ? 0 : s.ci), hi = s.mean + (isNaN(s.ci) ? 0 : s.ci), dom = MEAN_DOM[S.distVar];
        if (!isNaN(s.ci)) row.append('line').attr('x1', mx(lo)).attr('x2', mx(hi)).attr('y1', cy).attr('y2', cy).attr('stroke', C.ink).attr('stroke-width', 2).attr('stroke-linecap', 'round');
        if (lo < dom[0]) row.append('text').attr('class', 'ax').attr('x', mx(dom[0]) - 2).attr('y', cy).attr('dy', '.32em').attr('text-anchor', 'end').text('‹');
        row.append('circle').attr('cx', mx(s.mean)).attr('cy', cy).attr('r', 4.5).attr('fill', C.ink).attr('stroke', C.surface).attr('stroke-width', 2);
        row.append('rect').attr('x', dx0 - 6).attr('y', y0).attr('width', dotW).attr('height', rowH).attr('fill', 'transparent')
          .on('mousemove', ev => tipShow(`<div class="th">${it.label}</div><div class="tr"><span class="tl">Mean ${o.name.replace(' (SWL)', '')}</span><span class="tv">${f1(s.mean)}${isNaN(s.ci) ? '' : ' ± ' + f1(s.ci)}</span></div><div class="tr ts">95% CI clustered by person · ${f0(n)} interviews from ${f0(s.np)} people${low ? ' · below min n' : ''}</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
        row.append('text').attr('class', 'lbl').attr('x', Wd - 4).attr('y', cy).attr('dy', '.32em').attr('text-anchor', 'end').text(`${f0(n)} (${f0(s.np)})` + (low ? ' *' : ''));
      }
      if (n >= S.minN && !it.unknown) gInfo.rows.push({ name: it.label, share: cnt[3] / n, n });
      trows.push([gr.title.split(' (')[0] + ': ' + it.label, f0(n), f0(s.np)].concat(n ? cnt.map(c => p1(c / n)) : ['–', '–', '–', '–']).concat([n ? `${f1(s.mean)}${isNaN(s.ci) ? '' : ' ± ' + f1(s.ci)}` : '–']));
      y0 += rowH;
    });
  });
  { /* largest gap in the top-band share WITHIN one grouping variable (rows of different variables are not comparable) */
    const gaps = rowsInfo.filter(g => g.rows.length > 1).map(g => ({ g, hi: d3.greatest(g.rows, r => r.share), lo: d3.least(g.rows, r => r.share) })).map(d => Object.assign(d, { gap: d.hi.share - d.lo.share }));
    const best = d3.greatest(gaps, d => d.gap);
    take('dist-take', best && best.gap > 0 ? `Largest difference within one grouping, share of interviews in the top band, ${B.labels[3]}: <b>${best.g.title.toLowerCase()}</b>, ${best.hi.name} ${p0(best.hi.share)} (${f0(best.hi.n)} interviews) versus ${best.lo.name} ${p0(best.lo.share)} (${f0(best.lo.n)}).` : ''); }
  cav.innerHTML = `${S.distVar === 'PI' ? 'Bands, not box plots: over half of independence scores sit at 100.' : 'Bands show the whole 5–35 distribution.'} Dot and whisker: mean and 95% CI (by person). Faded: fewer than <b>${S.minN}</b> interviews. Groups overlap with era and with each other, so a gap is not an isolated effect.`;
  table('dist', `Share of interviews in each ${S.distVar} score band, with mean ± 95% CI`, ['Group', 'Interviews', 'People'].concat(B.labels, ['Mean ± 95% CI (by person)']), trows);
}
RENDERERS.push(renderDist);
