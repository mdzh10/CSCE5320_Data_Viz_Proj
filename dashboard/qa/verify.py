"""Independent recomputation of the dashboard's numbers with pandas.

  node qa/extract_tables.js dashboard.html qa/tables.json      # dump the dashboard's own "Table view" twins
  python3 qa/verify.py --data data/dashboard_data.json --tables qa/tables.json

Every check is skipped when the build does not contain that research question's table, so the same script serves every increment.
Exit code 0 = all checks that ran matched."""
import argparse, json, re, sys
import numpy as np, pandas as pd

ap = argparse.ArgumentParser()
ap.add_argument('--data', default='data/dashboard_data.json'); ap.add_argument('--tables', default='qa/tables.json')
a = ap.parse_args()
D = json.load(open(a.data)); O = json.load(open(a.tables)); LK = D['lookups']; ANN = D['meta']['anniversaries']
P = pd.DataFrame(D['persons'], columns=D['person_fields']); W = pd.DataFrame(D['waves'], columns=D['wave_fields'])
W = W.merge(P[['pid', 'age_band', 'severity', 'era', 'sex', 'level']], on='pid')
ST = {r.pid: r.status for r in P.itertuples()}
RESULTS = []

def num(s):
    s = s.replace('−', '-').replace(',', '').replace('+', '')
    return float(s)
def check(name, ok, detail=''):
    RESULTS.append(ok); print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else '  ' + detail))
def close(x, y, tol=0.051): return (np.isnan(x) and np.isnan(y)) or abs(x - y) <= tol

def mci(x):                                   # plain mean and 95% CI (independent observations: one interview per person per year)
    x = np.asarray(x, float); n = len(x)
    return n, (x.mean() if n else np.nan), (1.96 * x.std(ddof=1) / np.sqrt(n) if n > 1 else np.nan)
def mcic(df, k):                              # cluster-robust by person
    x = df[k].astype(float); n = len(x)
    if not n: return 0, 0, np.nan, np.nan
    m = x.mean(); d = (x - m).groupby(df.pid).sum(); npp = len(d)
    return n, npp, m, (1.96 * np.sqrt(npp / (npp - 1) * (d ** 2).sum()) / n if npp > 1 else np.nan)
def wilson(k, n):
    z = 1.96; p = k / n; d = 1 + z * z / n; c = p + z * z / (2 * n); h = z * np.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return (c - h) / d, (c + h) / d
def wilsonc(df, pred):
    n = len(df)
    if not n: return n, 0, np.nan, np.nan, np.nan
    y = pred.astype(float); p = y.mean(); d = (y - p).groupby(df.pid).sum(); npp = len(d)
    seC = np.sqrt(npp / (npp - 1) * (d ** 2).sum()) / n if npp > 1 else np.nan; seS = np.sqrt(p * (1 - p) / n)
    deff = max(1, (seC / seS) ** 2) if seS > 0 and not np.isnan(seC) else 1; ne = n / deff
    lo, hi = wilson(p * ne, ne); return n, npp, p, lo, hi
band_pi = lambda v: 0 if v <= 50 else 1 if v < 90 else 2 if v < 100 else 3
band_swl = lambda v: 0 if v <= 19 else 1 if v <= 24 else 2 if v <= 29 else 3

STATES = {  # filter state used by qa/extract_tables.js
    'default': dict(sel=P, lo=1, hi=45, dep=('PHQ2', 3)),
    'filt': dict(sel=P[(P.age_band == 1) & P.severity.isin([2, 3]) & (P.level == 1)], lo=5, hi=30, dep=('PHQ9', 10)),
}
def wv(st): s = STATES[st]; return W[W.pid.isin(s['sel'].pid) & (W.yr >= s['lo']) & (W.yr <= s['hi'])]

# ---- RQ1 pooled trajectories (plain CIs) and the same-people view
for st in STATES:
    t = O.get(f'{st}:traj')
    if not t: continue
    Wf = wv(st); ok = True
    for row in t[1:]:
        y = int(row[0]); g = Wf[Wf.yr == y]
        for ci, k in [(4, 'PI'), (6, 'SWL'), (8, 'SI')]:
            n, m, c = mci(g[k].dropna()); got = row[ci]
            if n == 0: ok &= got == '–'; continue
            mm = re.match(r'(-?[\d.]+)(?: ± ([\d.]+))?$', got.replace('−', '-'))
            ok &= bool(mm) and close(float(mm.group(1)), m) and (mm.group(2) is None or close(float(mm.group(2)), c)) and int(row[ci + 1].replace(',', '')) == n
            if not ok: print('   ', st, y, k, got, round(m, 2), round(c, 2), n); break
    check(f'RQ1 pooled means, CIs and n ({st})', ok)
if O.get('bal2040:traj'):
    yrs = [20, 25, 30, 35, 40]; have = W[W.PI.notna() & W.yr.isin(yrs)].groupby('pid').yr.nunique(); bal = have[have == 5].index; g = W[W.pid.isin(bal) & W.yr.isin(yrs)]
    ok = True
    for row in O['bal2040:traj'][1:]:
        s = g[g.yr == int(row[0])]; n, m, c = mci(s.PI.dropna()); mm = re.match(r'(-?[\d.]+) ± ([\d.]+)', row[4]); ok &= bool(mm) and close(float(mm.group(1)), m) and close(float(mm.group(2)), c) and int(row[5]) == n
    check(f'RQ1 same-people view, years 20-40 (n={len(bal)})', ok)

# ---- RQ1 within-person change
for st in STATES:
    t = O.get(f'{st}_change:traj') if st != 'default' else O.get('default_change:traj')
    if st == 'filt': t = O.get('filt_change:traj')
    if not t: continue
    Wf = wv(st); yrs = [y for y in ANN if STATES[st]['lo'] <= y <= STATES[st]['hi']]; ok = True
    for row in t[1:]:
        a0, b0 = [int(x) for x in row[0].split(' → ')]
        for ci, k in [(1, 'PI'), (2, 'SWL'), (3, 'SI')]:
            wa = Wf[(Wf.yr == a0)].set_index('pid')[k].dropna(); wb = Wf[(Wf.yr == b0)].set_index('pid')[k].dropna(); d = (wb - wa.reindex(wb.index)).dropna(); n = len(d)
            got = row[ci]
            if n == 0: ok &= got == '–'; continue
            mm = re.match(r'(-?[\d.]+)(?: ± ([\d.]+))? \(n=([\d,]+); (\d+)% up, (\d+)% same, (\d+)% down\)', got.replace('−', '-').replace('+', ''))
            if not mm: ok = False; print('   unparsed', got); continue
            sd = d.std(ddof=1) if n > 1 else np.nan; ci_ = 1.96 * sd / np.sqrt(n) if n > 1 else np.nan
            good = close(float(mm.group(1)), d.mean()) and (mm.group(2) is None or close(float(mm.group(2)), ci_)) and int(mm.group(3).replace(',', '')) == n
            sh = [int(mm.group(4)), int(mm.group(5)), int(mm.group(6))]; ex = [100 * (d > 0).mean(), 100 * (d == 0).mean(), 100 * (d < 0).mean()]
            good &= all(abs(x - y) <= 0.51 for x, y in zip(sh, ex))
            if not good: ok = False; print('   ', st, row[0], k, got, round(d.mean(), 2), round(ci_, 2), n, [round(v) for v in ex])
    check(f'RQ1 within-person change, consecutive anniversaries ({st})', ok)

# ---- RQ1 depression-screen view: share positive per anniversary with a Wilson interval (one interview per person per year)
def pct3(cell):
    mm = re.match(r'([\d.]+)% \(([\d.]+)%–([\d.]+)%\)', cell); return [float(x) for x in mm.groups()] if mm else None
for st in STATES:
    t = O.get(f'{st}_depr:traj')
    if not t: continue
    Wf = wv(st); ok = True
    for row in t[1:]:
        g = Wf[Wf.yr == int(row[0])]
        for ci, k, cut in [(4, 'PHQ2', 3), (6, 'PHQ9', 10)]:
            v = g[k].dropna(); n = len(v); got = row[ci]
            if n == 0: ok &= got == '–'; continue
            kk = int((v >= cut).sum()); lo, hi = wilson(kk, n); vals = pct3(got)
            good = vals is not None and all(abs(a - 100 * b) <= 0.051 for a, b in zip(vals, (kk / n, lo, hi))) and int(row[ci + 1].replace(',', '')) == n
            if not good: ok = False; print('   ', st, row[0], k, got, kk, n, round(lo, 3), round(hi, 3))
    check(f'RQ1 depression screen, share positive and Wilson interval ({st})', ok)

# ---- RQ2 scatter panels: n, people, Pearson r, Spearman rho, both exception shares with person-clustered Wilson intervals
LO_CUT, HI_CUT = D['meta']['headline_checks']['swl_q25'], D['meta']['headline_checks']['swl_q75']
PANELS2 = [('Years 1–5', 1, 5), ('Years 10–20', 10, 20), ('Years 25–45', 25, 45), ('All three periods', None, None)]
for st in STATES:
    t = O.get(f'{st}:scatter')
    if not t: continue
    Wf = wv(st); pr = Wf[Wf.PI.notna() & Wf.SWL.notna()]; ok = True
    for row, (lab, a0, b0) in zip(t[1:], PANELS2):
        g = pr if a0 is None else pr[(pr.yr >= a0) & (pr.yr <= b0)]
        good = row[0] == lab and int(row[1].replace(',', '')) == len(g)
        if len(g):
            good &= int(row[2].replace(',', '')) == g.pid.nunique()
            r = g.PI.corr(g.SWL); rho = g.PI.rank().corr(g.SWL.rank())
            good &= abs(float(row[3]) - r) <= 0.0051 and abs(float(row[4]) - rho) <= 0.0051
            for ci, sub, pred in [(5, g[g.PI == 100], lambda d: d.SWL <= LO_CUT), (6, g[g.PI <= 50], lambda d: d.SWL >= HI_CUT)]:
                if not len(sub): good &= row[ci] == '–'; continue
                n, npp, p, lo, hi = wilsonc(sub, pred(sub)); vals = pct3(row[ci])
                good &= vals is not None and all(abs(x - 100 * y) <= 0.051 for x, y in zip(vals, (p, lo, hi))) and row[ci].endswith('of ' + f'{n:,}')
        if not good: ok = False; print('   ', st, row, len(g))
    check(f'RQ2 correlations and exception shares with clustered intervals ({st})', ok and len(t) == 5)

# ---- RQ3 distributions by subgroup, person-clustered mean CI
for st in STATES:
    t = O.get(f'{st}:dist')
    if not t: continue
    Wf = wv(st); ok = True; i = 1
    for key, labels in [('age_band', LK['age_band']), ('severity', LK['severity']), ('level', LK['level']), ('sex', LK['sex'])]:
        for ix, lab in enumerate(labels):
            if key in ('level', 'sex') and not (P[key] == ix).any(): continue
            row = t[i]; i += 1; g = Wf[(Wf[key] == ix) & Wf.PI.notna()]; n = len(g)
            if n == 0: ok &= row[1] == '0'; continue
            n_, np_, m, c = mcic(g, 'PI'); sh = np.bincount(g.PI.map(band_pi), minlength=4) / n
            got = [float(x.strip('%')) for x in row[3:7]]; mm = re.match(r'(-?[\d.]+)(?: ± ([\d.]+))?$', row[7])
            good = int(row[1].replace(',', '')) == n and int(row[2].replace(',', '')) == np_ and all(abs(x - 100 * y) <= 0.051 for x, y in zip(got, sh)) and close(float(mm.group(1)), m) and (mm.group(2) is None or close(float(mm.group(2)), c))
            if not good: ok = False; print('   ', st, row, n, np_, round(m, 2), round(c, 2))
    check(f'RQ3 band shares, mean and person-clustered CI ({st})', ok and i == len(t))

# ---- RQ5 mood: Wilson interval on the effective n, clustered SWL means, gap CI
for st in STATES:
    t = O.get(f'{st}:mood')
    if not t: continue
    var, cut = STATES[st]['dep']; Wf = wv(st); ws = Wf[Wf.PI.notna() & Wf[var].notna()].copy(); ws['b'] = ws.PI.map(band_pi); ok = True
    for bi, row in enumerate(t[1:]):
        g = ws[ws.b == bi]; pos = g[var] >= cut; n, npp, p, lo, hi = wilsonc(g, pos)
        sp = mcic(g[pos & g.SWL.notna()], 'SWL'); sn = mcic(g[~pos & g.SWL.notna()], 'SWL')
        gap = sp[2] - sn[2] if sp[0] and sn[0] else np.nan; gci = np.sqrt(sp[3] ** 2 + sn[3] ** 2) if sp[0] > 1 and sn[0] > 1 and not np.isnan(sp[3]) and not np.isnan(sn[3]) else np.nan
        m0 = re.match(r'([\d,]+) \(([\d,]+)\)', row[1]); good = int(m0.group(1).replace(',', '')) == n and int(m0.group(2).replace(',', '')) == npp
        m1 = re.match(r'([\d.]+)% \(([\d.]+)%–([\d.]+)%\)', row[2]); good &= bool(m1) and all(abs(float(x) - 100 * y) <= 0.051 for x, y in zip(m1.groups(), (p, lo, hi)))
        for ci, s in [(3, sn), (4, sp)]:
            mm = re.match(r'(-?[\d.]+)(?: ± ([\d.]+))? \(([\d,]+)\)', row[ci].replace('−', '-'))
            if s[0] == 0: good &= row[ci] == '–'
            else: good &= bool(mm) and close(float(mm.group(1)), s[2]) and (mm.group(2) is None or close(float(mm.group(2)), s[3])) and int(mm.group(3).replace(',', '')) == s[0]
        mg = re.match(r'(-?[\d.]+)(?: ± ([\d.]+))?', row[5].replace('−', '-'))
        if not np.isnan(gap): good &= bool(mg) and close(float(mg.group(1)), gap) and (mg.group(2) is None or close(float(mg.group(2)), gci))
        if not good: ok = False; print('   ', st, row, n, npp, round(p, 3), round(lo, 3), round(hi, 3), sp, sn, gap, gci)
    check(f'RQ5 share positive (Wilson on effective n), clustered SWL means and gap ({st}, {var} >= {cut})', ok)

# ---- RQ6 life milestones: share by approximate age group, person-clustered Wilson interval (milestones_data.json)
import os
MSF = os.path.join(os.path.dirname(a.data), 'milestones_data.json')
if any(k.endswith(':ms') for k in O) and os.path.exists(MSF):
    MSJ = json.load(open(MSF)); MSW = pd.DataFrame(MSJ['rows'], columns=MSJ['fields'])
    AGES = [(18, 22), (22, 26), (26, 31), (31, 36), (36, 41), (41, 51), (51, 200)]
    TESTS = [('edu', lambda v: v >= 1), ('edu', lambda v: v == 3), ('occ', lambda v: v == 0), ('mar', lambda v: v == 1)]
    for st in STATES:
        t = O.get(f'{st}:ms')
        if not t: continue
        Wf = wv(st).merge(MSW, on=['pid', 'yr'], how='left'); ok = True; nchk = 0
        for row, (lo, hi) in zip(t[1:], AGES):
            g = Wf[(Wf.age >= lo) & (Wf.age < hi)]
            for ci, (base, test) in enumerate(TESTS, start=1):
                v = g[g[base].notna()]
                if not len(v): ok &= row[ci] == '–'; continue
                n, npp, p, lo_, hi_ = wilsonc(v, v[base].map(test)); vals = pct3(row[ci]); nchk += 1
                good = vals is not None and all(abs(x - 100 * y) <= 0.051 for x, y in zip(vals, (p, lo_, hi_))) and row[ci].endswith('of ' + f'{n:,}')
                if not good: ok = False; print('   ', st, row[0], ci, row[ci], round(p, 4), n)
        check(f'RQ6 milestones by age, {nchk} cells ({st})', ok and nchk > 0 and len(t) == 8)

# ---- RQ4: completeness, attrition selectivity
for tag, var in [('default:attr', 'PI'), ('default_attrSWL:attr', 'SWL'), ('filt:attr', 'PI')]:
    t = O.get(tag)
    if not t: continue
    st = tag.split(':')[0].replace('_attrSWL', ''); Wf = wv(st); ok = True
    for row in t[1:]:
        a0, b0 = [int(x) for x in row[0].split(' → ')]; ia = ANN.index(a0)
        anch = Wf[(Wf.yr == a0) & Wf[var].notna()].copy(); anch['st'] = [ST[p][ia + 1] for p in anch.pid]
        for ci, codes in [(1, 'I'), (2, 'LM'), (3, 'D')]:
            g = anch[anch.st.isin(list(codes))][var]; n, m, c = mci(g); got = row[ci]
            if n == 0: ok &= got == '–'; continue
            mm = re.match(r'([\d.]+)(?: ± ([\d.]+))? \(n=([\d,]+)\)', got)
            if not (mm and close(float(mm.group(1)), m) and int(mm.group(3).replace(',', '')) == n and (mm.group(2) is None or close(float(mm.group(2)), c))): ok = False; print('   ', tag, row[0], ci, got, round(m, 2), round(c, 2), n)
    check(f'RQ4 attrition card: earlier {var} by later status ({tag})', ok)
for st in STATES:
    t = O.get(f'{st}:overlap')
    if not t: continue
    Wf = wv(st); k = 'PI'; yrs = [int(h.split()[-1]) for h in t[0][1:] if h.split()[-1].isdigit()] or None
    have = {y: set(Wf[(Wf.yr == y) & Wf[k].notna()].pid) for y in ANN if STATES[st]['lo'] <= y <= STATES[st]['hi']}
    ok = True; chk = 0
    for r in t[1:]:
        for ci, cell in enumerate(r[1:], start=1):
            m = re.match(r'([\d,]+)', cell)
            if not m or ci >= len(t[0]): continue
            try: ya, yb = int(r[0].split()[-1]), int(t[0][ci].split()[-1])
            except Exception: continue
            if ya in have and yb in have and ya <= yb: chk += 1; ok &= int(m.group(1).replace(',', '')) == len(have[ya] & have[yb])
    if chk: check(f'RQ4 overlap matrix, {chk} cells ({st})', ok)

# ---- headline counts shown in the KPI tiles (filtered state)
if O.get('filt_kpi'):
    Wf = wv('filt'); kp = ' '.join(O['filt_kpi']); nums = [int(x.replace(',', '')) for x in re.findall(r'\| ([\d,]+) \|', kp)]
    check('KPI tiles: people and interviews in the filtered selection', nums[:2] == [len(STATES['filt']['sel']), len(Wf)] and f"{Wf.pid.nunique():,} people with" in kp)
print(f'\n{sum(RESULTS)} of {len(RESULTS)} checks passed'); sys.exit(0 if all(RESULTS) else 1)
