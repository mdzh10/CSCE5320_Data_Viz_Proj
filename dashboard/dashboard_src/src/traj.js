/* ===== RQ1: trajectories =====
   Honesty rule (course feedback): a line implies "the same units over time". Here most people have only a few
   follow-up scores, so the default view is POOLED (each point = whoever was interviewed that anniversary) and is drawn
   as separate dots with CI whiskers and no connecting line; the BALANCED view (same people at every plotted anniversary) is drawn with a heavy line. */

function buildSeries(years, bx) {
  const minN = S.minN;
  if (S.trajView === 'main') {
    return OUT.filter(o => S.series.has(o.k)).map(o => ({
      key: o.k, name: o.name, short: o.name.replace(' (SWL)', ''), color: o.color, kind: 'mean', o,
      pts: years.map(y => {
        const ws = bx.get(y) || [], vals = ws.map(w => w[o.k]).filter(nn), s = meanCI(vals);
        const v = scaleOut(o, s.mean), c = isNaN(s.ci) ? NaN : s.ci / (o.hi - o.lo) * 100;
        return { y, n: s.n, N: ws.length, v, lo: v - c, hi: v + c, raw: s.mean, rawCi: s.ci, low: s.n < minN };
      })
    }));
  }
  return DEP.map(d => ({
    key: d.k, name: d.name, short: d.name.split(' (')[0], color: d.color, kind: 'pct', d,
    pts: years.map(y => {
      const ws = bx.get(y) || [], vals = ws.map(w => w[d.base]).filter(nn), n = vals.length, k = vals.filter(d.test).length;
      const [a, b] = wilson(k, n), v = n ? k / n * 100 : NaN;
      return { y, n, N: ws.length, v, lo: a * 100, hi: b * 100, raw: n ? k / n : NaN, k, low: n < minN };
    })
  }));
}

/* who contributes at each anniversary under the chosen basis */
function trajBasis(years, vkey) {
  if (S.basis === 'balanced' && years.length > 1) {
    const set = balancedSet(vkey, years);
    return { mode: 'balanced', set, bx: new Map(years.map(y => [y, (SEL.byYr.get(y) || []).filter(w => set.has(w.pid))])) };
  }
  return { mode: 'pooled', set: null, bx: SEL.byYr, forced: S.basis === 'balanced' };
}
/* widest span of consecutive anniversaries (inside the current range) that still has >= minN people with a score at every one */
function suggestBalanced(vkey, years) {
  let best = null; const need = Math.max(S.minN, 10);
  for (let i = 0; i < years.length; i++) for (let j = i + 1; j < years.length; j++) {
    const n = balancedSet(vkey, years.slice(i, j + 1)).size;
    if (n >= need && (!best || j - i > best.span || (j - i === best.span && n > best.n))) best = { lo: years[i], hi: years[j], span: j - i, n };
  }
  return best;
}
const sameSet = (ws, k) => new Set(ws.filter(w => nn(w[k])).map(w => w.pid));

function renderTraj() {
  const el = $('#traj'), lg = $('#traj-legend'), cav = $('#traj-caveat'), bn = $('#traj-basis');
  let years = yearsInRange(); const main = S.trajView === 'main';
  const vkey = main ? 'PI' : 'PHQ2', vname = main ? (document.body.clientWidth < 620 ? 'valid CHART score' : 'valid CHART physical-independence score') : 'valid PHQ-2';
  const change = S.trajView === 'change';
  const pbtn = $('[data-ppl]'); if (pbtn) { pbtn.disabled = !main; pbtn.title = main ? 'Draw a random sample of individual people as thin lines (people with at least two scores)' : 'Individual lines are available for the score view only'; }
  $$('[data-bs]').forEach(b => { b.disabled = change; });
  if (!SEL.waves.length) { emptyMsg(el); lg.innerHTML = ''; bn.hidden = true; take('traj-take', ''); return; }
  if (change) return renderTrajChange(el, lg, cav, bn, years);
  /* depression screens exist only from 2001 on, so later anniversaries are often empty: stop the axis at the last year with any screen */
  let trimNote = '';
  if (!main) {
    const has = years.map(yy => (SEL.byYr.get(yy) || []).some(w => DEP.some(d => nn(w[d.base]))));
    const li = has.lastIndexOf(true);
    if (li >= 0 && li < years.length - 1) { trimNote = ` No depression screen is recorded after year ${years[li]} in this selection, so the axis stops there.`; years = years.slice(0, li + 1); }
  }
  const B = trajBasis(years, vkey), bx = B.bx, balanced = B.mode === 'balanced';
  if (balanced && !B.set.size) {
    const sg = suggestBalanced(vkey, years);
    bn.hidden = true; lg.innerHTML = ''; table('traj', '', [], []);
    el.innerHTML = `<div class="empty">No one has a ${vname} at <b>every</b> anniversary from year ${years[0]} to year ${years[years.length - 1]}. That is the finding: complete follow-up over this span is essentially absent. ${sg ? `<br>The widest span with at least ${Math.max(S.minN, 10)} people is years ${sg.lo}–${sg.hi} (${f0(sg.n)} people). <button class="reset" style="margin-left:8px" data-setrange="${sg.lo},${sg.hi}">Use years ${sg.lo}–${sg.hi}</button>` : '<br>Narrow the year range or lower the minimum n.'} <button class="reset" style="margin-left:8px" data-bs="pooled">Back to everyone</button></div>`;
    cav.innerHTML = ''; return;
  }
  // legend
  const modeKey = balanced
    ? `<span class="item"><span class="key" style="border-color:${C.ink2};border-top-width:4px"></span><span><b>Heavy line</b>: the same ${f0(B.set.size)} people at every point</span></span>`
    : `<span class="item"><span style="font-weight:700;color:${C.ink2}">● ●</span>&nbsp;<span><b>Separate dots, no line</b>: a different group of people at each year; whisker = 95% CI</span></span>`;
  if (main) {
    lg.innerHTML = OUT.map(o => `<button type="button" data-ser="${o.k}" aria-pressed="${S.series.has(o.k)}" title="Show or hide"><span class="key" style="border-color:${o.color}"></span>${o.name}${o.k === 'SWL' ? ' <span class="muted-s">(rescaled 5–35 → 0–100)</span>' : ''}</button>`).join('') + modeKey;
  } else {
    lg.innerHTML = DEP.map(d => `<span class="item"><span class="key" style="border-color:${d.color}"></span>${d.name}</span>`).join('') + modeKey;
  }
  const series = buildSeries(years, bx);
  if (!series.length) { el.innerHTML = '<div class="empty">Select at least one measure in the legend above.</div>'; bn.hidden = true; table('traj', '', [], []); return; }

  { /* one-sentence reading: first vs last well-populated point of the first visible series */
    const s0 = series[0], ok = s0.pts.filter(p => !isNaN(p.v) && p.n >= S.minN), fp = ok[0], lp = ok[ok.length - 1];
    if (fp && lp && fp !== lp) {
      const val = p => s0.kind === 'mean' ? `${f1(p.raw)}${s0.o && s0.o.k === 'SWL' ? ' of 5–35' : ' of 100'}` : p1(p.raw);
      take('traj-take', `<b>${s0.short}:</b> ${val(fp)} at year ${fp.y} (${f0(fp.n)} people) and ${val(lp)} at year ${lp.y} (${f0(lp.n)} people)${balanced ? ', the same people at both' : ', but these are different groups of people'}.`);
    } else take('traj-take', '');
  }
  /* ---- continuity: how many of this year's people were also scored at the previous anniversary ---- */
  const vsets = years.map(yy => sameSet(bx.get(yy) || [], vkey));
  const cont = years.map((yy, i) => i ? [...vsets[i]].filter(p => vsets[i - 1].has(p)).length : null);
  const okN = s => s.size >= S.minN, anyOk = vsets.filter(okN).length > 1;
  const aIdx = vsets.findIndex(s => anyOk ? okN(s) : s.size), bIdx = vsets.length - 1 - [...vsets].reverse().findIndex(s => anyOk ? okN(s) : s.size);
  if (balanced) {
    bn.hidden = false; bn.className = 'basis ok';
    bn.innerHTML = `<b>Same people at every point:</b> the <b>${f0(B.set.size)}</b> people with a ${vname} at all of years ${years[0]}–${years[years.length - 1]}. A small, long-followed group: compare it with the pooled view before generalising.`;
  } else if (aIdx >= 0 && bIdx > aIdx) {
    const both = [...vsets[aIdx]].filter(p => vsets[bIdx].has(p)).length;
    bn.hidden = false; bn.className = 'basis warn';
    bn.innerHTML = `<b>Different people at different points.</b> ${f0(vsets[aIdx].size)} people have a ${vname.replace('valid ', '')} at year ${years[aIdx]} and ${f0(vsets[bIdx].size)} at year ${years[bIdx]}; ${both === 0 ? '<b>none</b> have both' : both === 1 ? 'only <b>1</b> has both' : `only <b>${f0(both)}</b> have both`}, so the dots are not joined. ${HAS('card-4d') ? '<a href="#card-4d">See who overlaps (4d)</a> or switch' : 'Switch'} to “Same people” to follow one group.${B.forced ? ' (“Same people” needs at least two anniversaries.)' : ''}`;
  } else { bn.hidden = false; bn.className = 'basis warn'; bn.innerHTML = `<b>Single anniversary.</b> One group of people at one point in time; there is no trajectory to read.`; }

  const Wd = Math.max(el.clientWidth, 320), narrow = Wd < 620;
  const m = { t: 12, r: narrow ? 20 : 168, b: 30, l: main ? 46 : 54 };
  const H1 = narrow ? 300 : 330, stripH = 78, gap = 62, H = H1 + gap + stripH + 22;
  const svg = mkSvg(el, Wd, H, main ? 'Line chart of average outcome scores by post-injury year; each point averages a different group of people unless the same-people view is on' : 'Line chart of the share screening positive for depression by post-injury year');
  const x = d3.scaleLinear().domain(years.length > 1 ? [years[0], years[years.length - 1]] : [years[0] - 1, years[0] + 1]).range([m.l + 14, Wd - m.r - 14]);
  const showPeople = main && S.people;
  let ymin, ymax;
  if (main) {
    const vals = series.flatMap(s => s.pts.filter(p => !isNaN(p.lo)).map(p => p.lo));
    ymin = vals.length ? Math.min(40, Math.floor((d3.min(vals) - 4) / 10) * 10) : 40; ymax = 100;
    if (showPeople) ymin = 0;
  } else {
    const vals = series.flatMap(s => s.pts.filter(p => !isNaN(p.hi) && p.n >= 2).map(p => p.hi));
    ymin = 0; ymax = Math.max(20, Math.ceil(((d3.max(vals) || 20) + 2) / 10) * 10);
  }
  const y = d3.scaleLinear().domain([ymin, ymax]).range([H1 - m.b, m.t]);
  const g = svg.append('g');
  y.ticks(6).forEach(t => {
    g.append('line').attr('x1', m.l).attr('x2', Wd - m.r).attr('y1', y(t)).attr('y2', y(t)).attr('stroke', C.grid).attr('stroke-width', 1);
    g.append('text').attr('class', 'ax').attr('x', m.l - 8).attr('y', y(t)).attr('dy', '.32em').attr('text-anchor', 'end').text(main ? t : t + '%');
  });
  g.append('line').attr('x1', m.l).attr('x2', Wd - m.r).attr('y1', H1 - m.b).attr('y2', H1 - m.b).attr('stroke', C.axis);
  years.forEach(t => g.append('text').attr('class', 'ax').attr('x', x(t)).attr('y', H1 - m.b + 17).attr('text-anchor', 'middle').text(t));
  g.append('text').attr('class', 'axl').attr('transform', `translate(11,${(m.t + H1 - m.b) / 2}) rotate(-90)`).attr('text-anchor', 'middle')
    .text(main ? (balanced ? 'Average score, same people (0–100)' : 'Average score that year (0–100)') : 'Share screening positive');

  /* ---- optional: individual people as thin lines (sample), first visible measure ---- */
  let peopleNote = '';
  if (showPeople) {
    const s0 = series[0], o = s0.o, yset = new Set(years);
    const pts = []; let one = 0;
    SEL.byPid.forEach((ws, pid) => {
      if (balanced && !B.set.has(pid)) return;
      const own = ws.filter(w => nn(w[o.k]) && yset.has(w.yr)).sort((a, b) => a.yr - b.yr);
      if (own.length === 1) one++; else if (own.length > 1) pts.push(own);
    });
    const r = rng(7), sample = pts.map(p => [r(), p]).sort((a, b) => a[0] - b[0]).slice(0, 140).map(d => d[1]);
    const line = d3.line().x(w => x(w.yr)).y(w => y(scaleOut(o, w[o.k])));
    const gp = g.append('g').attr('pointer-events', 'none');
    sample.forEach(own => {
      gp.append('path').attr('d', line(own)).attr('fill', 'none').attr('stroke', s0.color).attr('stroke-width', 1).attr('opacity', .28);
      own.forEach(w => gp.append('circle').attr('cx', x(w.yr)).attr('cy', y(scaleOut(o, w[o.k]))).attr('r', 1.8).attr('fill', s0.color).attr('opacity', .45));
    });
    const lens = pts.map(p => p.length), med = lens.length ? d3.median(lens) : 0;
    peopleNote = ` <b>Thin lines</b> are real people: a random ${f0(sample.length)} of the ${f0(pts.length)} with two or more scores (${f0(one)} more have only one).`;
  }

  /* ---- marks. Pooled points are different people at each anniversary, so they are drawn as separate dots with
     their 95% CI as a whisker and NO connecting line (a line would imply the same people are followed). Only the
     same-people view, where every point is the same group, gets a line and a band. ---- */
  const mr = balanced ? 3.6 : 4.6, dOff = balanced ? 0 : 7;
  const offOf = si => (si - (series.length - 1) / 2) * dOff;
  series.forEach((s, si) => {
    const col = s.color, off = offOf(si), wOff = balanced ? (si - (series.length - 1) / 2) * 5 : off;
    if (balanced) {
      const area = d3.area().defined(p => p.n >= S.minN && !isNaN(p.lo)).x(p => x(p.y)).y0(p => y(Math.max(ymin, p.lo))).y1(p => y(Math.min(ymax, p.hi)));
      g.append('path').datum(s.pts).attr('d', area).attr('fill', col).attr('opacity', .10);
      for (let i = 1; i < s.pts.length; i++) {
        const a = s.pts[i - 1], b = s.pts[i]; if (isNaN(a.v) || isNaN(b.v)) continue;
        const faint = a.low || b.low;
        g.append('line').attr('x1', x(a.y)).attr('y1', y(a.v)).attr('x2', x(b.y)).attr('y2', y(b.v)).attr('stroke', col).attr('stroke-width', faint ? 1.6 : 2.6).attr('stroke-linecap', 'round')
          .attr('stroke-dasharray', faint ? '2 4' : null).attr('opacity', faint ? .6 : 1);
      }
    }
    s.pts.forEach((p, i) => {
      if (isNaN(p.v)) return;
      if ((!balanced || p.low) && !isNaN(p.lo) && !isNaN(p.hi) && p.n > 1)   /* the 95% CI as a whisker */
        g.append('line').attr('x1', x(p.y) + wOff).attr('x2', x(p.y) + wOff).attr('y1', y(Math.max(ymin, p.lo))).attr('y2', y(Math.min(ymax, p.hi)))
          .attr('stroke', col).attr('stroke-width', p.low ? 1.4 : 2).attr('opacity', p.low ? .5 : .55).attr('stroke-linecap', 'round');
      const last = i === s.pts.length - 1;
      g.append('circle').attr('class', 'mk').attr('cx', x(p.y) + off).attr('cy', y(p.v)).attr('r', last ? mr + 1 : mr)
        .attr('fill', p.low ? C.surface : col).attr('stroke', p.low ? col : C.surface).attr('stroke-width', p.low ? 1.8 : 2);
    });
  });
  // direct labels (de-collided)
  if (!narrow) {
    const labs = series.map(s => { const lp = [...s.pts].reverse().find(p => !isNaN(p.v)); return lp ? { s, y: y(lp.v), y0: y(lp.v), lx: x(lp.y) } : null; }).filter(Boolean);
    spread(labs, 15, m.t + 6, H1 - m.b - 4);
    labs.forEach(l => {
      g.append('text').attr('class', 'lbl-strong').attr('x', Math.min(l.lx + 12 + dOff * (series.length - 1) / 2, Wd - m.r + 8)).attr('y', l.y).attr('dy', '.32em').text(l.s.short);
    });
  }

  /* ---- strip: the people behind each point, shaded by injury era ---- */
  const s0 = H1 + gap;
  const strip = svg.append('g');
  const counts = years.map((yy, i) => {
    const ws = bx.get(yy) || [], vw = ws.filter(w => nn(w[vkey])), era = [0, 0, 0]; vw.forEach(w => era[w.p.era]++);
    return { y: yy, N: ws.length, V: vw.length, era };
  });
  const yb = d3.scaleLinear().domain([0, d3.max(counts, c => c.V) || 1]).range([stripH, 0]);
  const bw = Math.min(26, Math.max(6, (Wd - m.l - m.r) / years.length * .5));
  strip.append('text').attr('class', 'lbl-strong').attr('x', m.l).attr('y', s0 - 38).text(balanced ? 'The same people at every point' : narrow ? 'People behind each point, by injury era' : 'Who is behind each point: people with a score, by injury era');
  strip.append('text').attr('class', 'lbl').attr('x', m.l).attr('y', s0 - 22).html(ERAL.map((e, i) => `<tspan fill="${ERA_TONES[i]}" font-weight="700">■</tspan> ${narrow ? '' : 'injured '}${e}`).join(' &nbsp; ') + (narrow ? '' : ` &nbsp;·&nbsp; number = people with a ${vname}`));
  counts.forEach(c => {
    let acc = 0;
    c.era.forEach((n, ei) => {
      if (!n) return;
      const h = stripH - yb(n), yTop = s0 + yb(acc + n);
      strip.append('rect').attr('x', x(c.y) - bw / 2).attr('width', bw).attr('y', yTop).attr('height', Math.max(0, h - 1)).attr('fill', ERA_TONES[ei]);
      acc += n;
    });
    strip.append('text').attr('class', 'ax').attr('x', x(c.y)).attr('y', s0 + yb(c.V) - 4).attr('text-anchor', 'middle').text(f0(c.V));
  });
  strip.append('line').attr('x1', m.l).attr('x2', Wd - m.r).attr('y1', s0 + stripH).attr('y2', s0 + stripH).attr('stroke', C.axis);
  svg.append('text').attr('class', 'axl').attr('x', (m.l + Wd - m.r) / 2).attr('y', H - 4).attr('text-anchor', 'middle').text('Years since injury (follow-up anniversary)');

  /* ---- crosshair + tooltip ---- */
  const cross = svg.append('line').attr('y1', m.t).attr('y2', s0 + stripH).attr('stroke', C.ink2).attr('stroke-width', 1).attr('stroke-dasharray', '3 3').style('display', 'none');
  const hl = svg.append('g');
  function showAt(i, evt) {
    trajIdx = i; const yy = years[i]; cross.style('display', null).attr('x1', x(yy)).attr('x2', x(yy));
    hl.selectAll('*').remove();
    const rows = series.map((s, si) => {
      const p = s.pts[i]; if (isNaN(p.v)) return '';
      hl.append('circle').attr('cx', x(yy) + offOf(si)).attr('cy', y(p.v)).attr('r', 6).attr('fill', s.color).attr('stroke', C.surface).attr('stroke-width', 2);
      const val = s.kind === 'mean' ? `${f1(p.raw)}${p.rawCi ? ` ± ${f1(p.rawCi)}` : ''}${s.o.k === 'SWL' ? ' of 5–35' : ''}` : `${p1(p.raw)} (${p1(p.lo / 100)}–${p1(p.hi / 100)})`;
      return `<div class="tr">${key(s.color)}<span class="tl">${s.short}</span><span class="tv">${val}</span><span class="ts">${f0(p.n)} people${p.low ? ' · below min n' : ''}</span></div>`;
    }).join('');
    const c = counts[i];
    const link = i ? `<div class="tr ts">${f0(cont[i])} of ${f0(c.V)} (${c.V ? p0(cont[i] / c.V) : '–'}) also have a score at year ${years[i - 1]}</div>` : '';
    const html = `<div class="th">${yy} year${yy > 1 ? 's' : ''} after injury · ${balanced ? 'same people' : 'whoever was interviewed'}</div>${rows}<div class="tr ts">${f0(c.N)} interviews, ${f0(c.V)} with ${vname}</div><div class="tr ts">Injury era: ${ERAL.map((e, k) => `${e} ${f0(c.era[k])}`).join(' · ')}</div>${link}`;
    let px, py;
    if (evt && evt.clientX !== undefined) { px = evt.clientX; py = evt.clientY; } else { const b = el.getBoundingClientRect(); px = b.left + x(yy); py = b.top + m.t + 40; }
    tipShow(html, px, py);
  }
  const hide = () => { cross.style('display', 'none'); hl.selectAll('*').remove(); tipHide(); };
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', Wd - m.l - m.r).attr('height', s0 + stripH - m.t).attr('fill', 'transparent').style('cursor', 'crosshair')
    .on('mousemove', ev => { const [mx] = d3.pointer(ev); let bi = 0, bd = 1e9; years.forEach((yy, i) => { const d = Math.abs(x(yy) - mx); if (d < bd) { bd = d; bi = i; } }); showAt(bi, ev); })
    .on('mouseleave', hide);
  svg.attr('tabindex', 0).on('keydown', ev => {
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') { ev.preventDefault(); const i = trajIdx === null ? 0 : Math.max(0, Math.min(years.length - 1, trajIdx + (ev.key === 'ArrowRight' ? 1 : -1))); showAt(i); }
    if (ev.key === 'Escape') hide();
  }).on('blur', hide);

  /* ---- caveat + table ---- */
  const basisTxt = balanced
    ? `<b>Same ${f0(B.set.size)} people at every point</b>, so the line is change within one group, but only for people followed this long.`
    : `<b>Each dot is a different group of people</b> (see the strip), so a difference between years mixes real change, who is still followed, and injury era.`;
  cav.innerHTML = (main
    ? `${basisTxt}${peopleNote} ${balanced ? 'Band' : 'Whiskers'}: 95% CI. Hollow: fewer than <b>${S.minN}</b> scores.${ymin > 0 ? ` Axis starts at ${ymin}.` : ''} Satisfaction is rescaled to 0–100 only to share the axis.`
    : `${basisTxt} Whiskers: 95% intervals; hollow: fewer than <b>${S.minN}</b> respondents. The PHQ-9 total is missing for most 2011–15 interviews.${trimNote}`);
  const head = ['Year', 'Interviews', `People with ${vname.replace('valid ', '')}`, 'Also scored at previous anniversary'].concat(series.flatMap(s => [s.short, 'n']));
  const rows = years.map((yy, i) => [yy, f0(counts[i].N), f0(counts[i].V), i ? `${f0(cont[i])} (${counts[i].V ? p0(cont[i] / counts[i].V) : '–'})` : '–'].concat(series.flatMap(s => { const p = s.pts[i]; return [isNaN(p.v) ? '–' : (s.kind === 'mean' ? `${f1(p.raw)}${isNaN(p.rawCi) ? '' : ' ± ' + f1(p.rawCi)}` : `${p1(p.raw)} (${p1(p.lo / 100)}–${p1(p.hi / 100)})`), f0(p.n)]; })));
  table('traj', (main ? 'Mean score by post-injury year (95% CI); SWL shown in original 5–35 units' : 'Share screening positive by post-injury year (95% Wilson CI)') + (balanced ? ' · same people at every year' : ' · pooled: different people at each year'), head, rows);
}

/* ===== RQ1, third view: change within the same people between consecutive anniversaries ===== */
function renderTrajChange(el, lg, cav, bn, years) {
  lg.innerHTML = OUT.map(o => `<button type="button" data-ser="${o.k}" aria-pressed="${S.series.has(o.k)}" title="Show or hide"><span class="key" style="border-color:${o.color}"></span>${o.name}${o.k === 'SWL' ? ' <span class="muted-s">(5–35 points)</span>' : ''}</button>`).join('');
  const meas = OUT.filter(o => S.series.has(o.k)), pairs = years.slice(1).map((yy, i) => [years[i], yy]);
  if (!meas.length) { el.innerHTML = '<div class="empty">Select at least one measure in the legend above.</div>'; bn.hidden = true; take('traj-take', ''); table('traj', '', [], []); return; }
  if (!pairs.length) { el.innerHTML = '<div class="empty">Choose a range with at least two anniversaries to compare.</div>'; bn.hidden = true; take('traj-take', ''); table('traj', '', [], []); return; }
  bn.hidden = false; bn.className = 'basis ok';
  bn.innerHTML = '<b>Same people, two time points.</b> Each bar is the average change for the people scored at <i>both</i> years of that step (n under the bar).';
  const res = meas.map(o => ({
    o, rows: pairs.map(([a, b]) => {
      const d = [];
      SEL.byPid.forEach(ws => { const wa = ws.find(w => w.yr === a && nn(w[o.k])), wb = ws.find(w => w.yr === b && nn(w[o.k])); if (wa && wb) d.push(wb[o.k] - wa[o.k]); });
      const n = d.length, m = n ? d3.mean(d) : NaN, sd = n > 1 ? d3.deviation(d) : NaN, up = d.filter(x => x > 0).length, same = d.filter(x => x === 0).length;
      return { a, b, n, m, ci: n > 1 ? 1.96 * sd / Math.sqrt(n) : NaN, up, same, down: n - up - same, low: n < S.minN };
    })
  }));
  const Wd = Math.max(el.clientWidth, 320), narrow = Wd < 760, cols = narrow ? 1 : meas.length, gap = 24, pw = (Wd - gap * (cols - 1)) / cols;
  const ph = 230, mt = 46, mb = 58, rowsN = narrow ? meas.length : 1, H = rowsN * (mt + ph + mb);
  const svg = mkSvg(el, Wd, H, 'Bar charts of the average change in each measure between consecutive follow-up anniversaries, for people with a score at both');
  const trows = pairs.map(([a, b]) => [`${a} → ${b}`]);
  res.forEach((r, pi) => {
    const ox = narrow ? 0 : pi * (pw + gap), oy = narrow ? pi * (mt + ph + mb) : 0, ml = 40, mr = 6, o = r.o;
    const ext = d3.max(r.rows.filter(x => x.n > 1), x => Math.abs(x.m) + (isNaN(x.ci) ? 0 : x.ci)) || 5, step = (o.hi - o.lo) > 50 ? 5 : 2;
    const mx = Math.max(step * 2, Math.ceil(ext / step) * step);
    const x = d3.scaleBand().domain(pairs.map((_, i) => i)).range([ox + ml, ox + pw - mr]).paddingInner(.25).paddingOuter(.1);
    const y = d3.scaleLinear().domain([-mx, mx]).range([oy + mt + ph, oy + mt]);
    svg.append('text').attr('class', 'ptitle').attr('x', ox).attr('y', oy + 16).text(o.name.replace(' (SWL)', ''));
    svg.append('text').attr('class', 'lbl').attr('x', ox).attr('y', oy + 31).text(`mean change in points (scale ${o.lo}–${o.hi}), 95% CI`);
    const tightN = x.bandwidth() < 48;
    if (x.bandwidth() < 40) svg.append('text').attr('class', 'lbl').attr('x', ox + ml).attr('y', oy + mt + ph + 50).text('bar = step ending at that year (first: 1→5)');
    if (tightN) svg.append('text').attr('class', 'ax').attr('x', ox + ml - 6).attr('y', oy + mt + ph + 29).attr('text-anchor', 'end').text('n');
    y.ticks(5).forEach(tk => { svg.append('line').attr('x1', ox + ml).attr('x2', ox + pw - mr).attr('y1', y(tk)).attr('y2', y(tk)).attr('stroke', tk === 0 ? C.axis : C.grid).attr('stroke-width', tk === 0 ? 1.5 : 1); svg.append('text').attr('class', 'ax').attr('x', ox + ml - 6).attr('y', y(tk)).attr('dy', '.32em').attr('text-anchor', 'end').text(tk > 0 ? '+' + tk : tk); });
    r.rows.forEach((row, i) => {
      const cx = x(i) + x.bandwidth() / 2, g = svg.append('g');
      { const tight = x.bandwidth() < 40; svg.append('text').attr('class', 'ax').attr('x', cx).attr('y', oy + mt + ph + 15).attr('text-anchor', 'middle').text(tight ? `→${row.b}` : `${row.a}→${row.b}`); }
      svg.append('text').attr('class', 'ax').attr('x', cx).attr('y', oy + mt + ph + 29).attr('text-anchor', 'middle').attr('opacity', row.low ? .6 : 1).text((tightN ? '' : 'n=') + f0(row.n));
      trows[i].push(row.n ? `${row.m > 0 ? '+' : ''}${f1(row.m)}${isNaN(row.ci) ? '' : ' ± ' + f1(row.ci)} (n=${f0(row.n)}; ${p0(row.up / row.n)} up, ${p0(row.same / row.n)} same, ${p0(row.down / row.n)} down)` : '–');
      if (!row.n) return;
      const y0 = y(0), y1 = y(row.m), bw = Math.min(x.bandwidth(), 34), bx = cx - bw / 2;
      g.append('rect').attr('x', bx).attr('width', bw).attr('y', Math.min(y0, y1)).attr('height', Math.max(1, Math.abs(y1 - y0))).attr('rx', 2)
        .attr('fill', row.low ? C.surface : o.color).attr('stroke', o.color).attr('stroke-width', row.low ? 1.8 : 0).attr('stroke-dasharray', row.low ? '3 3' : null);
      if (!isNaN(row.ci)) { g.append('line').attr('x1', cx).attr('x2', cx).attr('y1', y(row.m - row.ci)).attr('y2', y(row.m + row.ci)).attr('stroke', C.ink).attr('stroke-width', 1.5); [row.m - row.ci, row.m + row.ci].forEach(v => g.append('line').attr('x1', cx - 4).attr('x2', cx + 4).attr('y1', y(v)).attr('y2', y(v)).attr('stroke', C.ink).attr('stroke-width', 1.5)); }
      g.append('rect').attr('x', x(i)).attr('width', x.bandwidth()).attr('y', oy + mt).attr('height', ph).attr('fill', 'transparent')
        .on('mousemove', ev => tipShow(`<div class="th">${o.name.replace(' (SWL)', '')} · years ${row.a} → ${row.b}</div><div class="tr"><span class="tl">Mean change</span><span class="tv">${row.m > 0 ? '+' : ''}${f1(row.m)}${isNaN(row.ci) ? '' : ' ± ' + f1(row.ci)}</span></div><div class="tr ts">${f0(row.n)} people with both scores${row.low ? ' · below min n' : ''}</div><div class="tr ts">${p0(row.up / row.n)} higher · ${p0(row.same / row.n)} unchanged · ${p0(row.down / row.n)} lower</div>`, ev.clientX, ev.clientY)).on('mouseleave', tipHide);
    });
  });
  /* takeaway: n-weighted mean change over all steps of the first visible measure */
  const r0 = res[0], tot = d3.sum(r0.rows, x => x.n), wm = tot ? d3.sum(r0.rows, x => x.n * (x.m || 0)) / tot : NaN, up = d3.sum(r0.rows, x => x.up), dn = d3.sum(r0.rows, x => x.down), sm = d3.sum(r0.rows, x => x.same);
  take('traj-take', tot ? `<b>${r0.o.name.replace(' (SWL)', '')}:</b> across ${f0(tot)} person-to-person comparisons, the average change is ${wm > 0 ? '+' : ''}${f1(wm)} points; ${p0(up / tot)} rose, ${p0(sm / tot)} stayed the same, ${p0(dn / tot)} fell.` : '');
  cav.innerHTML = `Each bar compares people with <i>themselves</i> five years apart (first step: four years). People already at 100 cannot rise. Whiskers: 95% CI; dashed: fewer than <b>${S.minN}</b> people.`;
  table('traj', 'Mean within-person change between consecutive anniversaries (95% CI; n people with both scores; share higher / unchanged / lower)', ['Step'].concat(meas.map(m => m.name.replace(' (SWL)', ''))), trows);
}
RENDERERS.push(renderTraj);
