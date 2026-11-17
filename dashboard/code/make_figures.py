"""Static report figures for the CSCE 5320 project (redesigned, replaces the four draft figures).

Reads ../data/dashboard_data.json (written by build_dashboard_data.py) and writes PNGs to ../figures/.
Design rules applied (see docs/DESIGN_RATIONALE.md): one shared 0-100 axis (no dual axis); fixed colour per entity;
direct labels; n shown with the marks; CIs; bands instead of box plots for ceiling-bound scores;
sequential single-hue ramp for share-valid; light surface, thin marks.
Run:  python make_figures.py            # every figure
      python make_figures.py --rq 1,2,3   # only the figures that belong to these research questions
Figures exist for questions 1-4 (the dashboard cards for questions 5 and 6 have no static figure).
"""
import json, os
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap
from matplotlib.patches import Patch
from matplotlib.lines import Line2D

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data", "dashboard_data.json")
OUT = os.path.join(HERE, "..", "figures"); os.makedirs(OUT, exist_ok=True)

C = dict(blue="#2a78d6", orange="#eb6834", aqua="#1baf7a", yellow="#eda100", magenta="#e87ba4",
         green="#008300", violet="#6250d6", ink="#0b0b0b", ink2="#52514e", muted="#898781",
         grid="#e1e0d9", axis="#c3c2b7", surface="#fcfcfb", ctx="#a9a89f", dark="#6b6a66", light="#d6d5cd")
plt.rcParams.update({
    "font.family": ["Inter", "DejaVu Sans"], "font.size": 10, "axes.edgecolor": C["axis"], "axes.labelcolor": C["ink2"],
    "xtick.color": C["muted"], "ytick.color": C["muted"], "axes.facecolor": C["surface"], "figure.facecolor": C["surface"],
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": False, "savefig.facecolor": C["surface"]})
HEAT = LinearSegmentedColormap.from_list("blue", ["#cde2fb", "#9ec5f4", "#5598e7", "#2a78d6", "#1c5cab", "#0d366b"])

d = json.load(open(DATA))
LK = d["lookups"]
P = pd.DataFrame(d["persons"], columns=d["person_fields"])
W = pd.DataFrame(d["waves"], columns=d["wave_fields"])
W = W.join(P.set_index("pid")[["age_band", "severity", "era"]], on="pid")
W["era_cal"] = pd.cut(W.cal, [0, 1995, 2000, 2010, 2015, 2030], labels=LK["era_cal"]).astype(str)
W["age_grp"] = pd.cut(W.age, [0, 18, 25, 40, 100], right=False, labels=LK["age_grp"]).astype(str)
ANN = d["meta"]["anniversaries"]
Q25, Q75 = d["meta"]["headline_checks"]["swl_q25"], d["meta"]["headline_checks"]["swl_q75"]
SW = W.copy(); SW["SWLs"] = (SW.SWL - 5) / 30 * 100


def mean_ci(s):
    s = s.dropna(); n = len(s)
    return (s.mean(), 1.96 * s.std(ddof=1) / np.sqrt(n), n) if n > 1 else (np.nan, np.nan, n)


def save(fig, name):
    fig.savefig(os.path.join(OUT, name), dpi=200, bbox_inches="tight"); plt.close(fig); print("wrote", name)


# ---------------------------------------------------------------- 1. trajectories
def fig_traj(minn=30):
    ser = [("PI", "Physical independence", C["blue"]), ("SWLs", "Life satisfaction (SWL, rescaled)", C["orange"]),
           ("SI", "Social integration", C["aqua"])]
    fig, (ax, ax2) = plt.subplots(2, 1, figsize=(9.2, 6.4), gridspec_kw=dict(height_ratios=[4, 1], hspace=.28), sharex=True)
    ends = []
    offs = {"PI": 0, "SWLs": -0.7, "SI": 0.7}          # small horizontal offsets so the three measures do not overlap
    for col, name, color in ser:
        m = [mean_ci(SW[SW.yr == y][col]) for y in ANN]
        mu = np.array([a for a, b, c in m]); ci = np.array([b for a, b, c in m]); n = np.array([c for a, b, c in m])
        ok = n >= minn; xs = np.array(ANN) + offs[col]
        # each year is a different group of people, so separate dots with a 95% CI whisker and no connecting line
        ax.vlines(xs[ok], (mu - ci)[ok], (mu + ci)[ok], color=color, lw=2, alpha=.55)
        ax.vlines(xs[~ok], (mu - ci)[~ok], (mu + ci)[~ok], color=color, lw=1.3, alpha=.45)
        ax.scatter(xs[ok], mu[ok], s=38, color=color, edgecolor=C["surface"], linewidth=1.5, zorder=3)
        ax.scatter(xs[~ok], mu[~ok], s=38, facecolor=C["surface"], edgecolor=color, linewidth=1.5, zorder=3)
        ends.append([mu[-1], name, color])
    ends.sort();
    for i in range(1, len(ends)):
        if ends[i][0] - ends[i - 1][0] < 4: ends[i][0] = ends[i - 1][0] + 4
    for y, name, color in ends: ax.text(ANN[-1] + 2.4, y, name, va="center", fontsize=9.5, color=C["ink"], fontweight="bold")
    ax.set_ylim(40, 100); ax.set_ylabel("Mean score (0-100 scale)"); ax.yaxis.grid(True, color=C["grid"], lw=.8); ax.set_axisbelow(True)
    ax.set_title("Independence and well-being after pediatric SCI, by years since injury", loc="left", fontsize=12, fontweight="bold", color=C["ink"], pad=26)
    ax.text(0, 1.045, f"Mean and 95% CI. Each year is a different group of people, so the dots are not joined. "
            f"Hollow: fewer than {minn} scores. Axis starts at 40.", transform=ax.transAxes, fontsize=8.8, color=C["ink2"])
    cnt = [(len(W[W.yr == y]), W[(W.yr == y) & W.PI.notna()].shape[0]) for y in ANN]
    ax2.bar(ANN, [c[0] for c in cnt], width=2.6, color=C["light"], label="All interviews")
    ax2.bar(ANN, [c[1] for c in cnt], width=2.6, color=C["blue"], label="With valid CHART score")
    for y, (a, b) in zip(ANN, cnt): ax2.text(y, a + 40, f"{a:,}", ha="center", fontsize=7.8, color=C["muted"])
    ax2.set_xticks(ANN); ax2.set_xlabel("Years since injury"); ax2.set_ylabel("Interviews"); ax2.set_ylim(0, 2900)
    ax2.legend(frameon=False, fontsize=8, loc="upper right", ncol=2)
    save(fig, "fig1_trajectories.png")


# ---------------------------------------------------------------- 2. divergence
def fig_divergence():
    pr = W.dropna(subset=["PI", "SWL"]); rng = np.random.default_rng(5320)
    fig, axs = plt.subplots(1, 3, figsize=(11.2, 4.2), sharey=True, gridspec_kw=dict(wspace=.07))
    for ax, (lo, hi, lab) in zip(axs, [(1, 5, "Years 1-5"), (10, 20, "Years 10-20"), (25, 45, "Years 25-45")]):
        s = pr[pr.yr.between(lo, hi)]
        x = s.PI.values + rng.uniform(-3, 3, len(s)); y = s.SWL.values + rng.uniform(-.4, .4, len(s))
        hi1 = ((s.PI == 100) & (s.SWL <= Q25)).values; hi2 = ((s.PI <= 50) & (s.SWL >= Q75)).values; ctx = ~(hi1 | hi2)
        ax.scatter(x[ctx], y[ctx], s=7, color=C["ctx"], alpha=.38, lw=0)
        ax.scatter(x[hi1], y[hi1], s=9, color="#e34948", alpha=.65, lw=0)
        ax.scatter(x[hi2], y[hi2], s=11, color="#2b2a28", alpha=.8, lw=0)
        for q in (Q25, Q75): ax.axhline(q, color=C["axis"], lw=.9, ls=(0, (3, 3)))
        r = np.corrcoef(s.PI, s.SWL)[0, 1]; top = s[s.PI == 100]
        ax.set_title(lab, loc="left", fontsize=10.5, fontweight="bold", color=C["ink"], pad=16)
        ax.text(0, 1.02, f"n = {len(s):,} | r = {r:.2f} | {np.mean(top.SWL <= Q25):.0%} of PI = 100 have SWL <= {Q25:.0f}", transform=ax.transAxes, fontsize=8, color=C["ink2"])
        ax.set_xlim(-6, 106); ax.set_ylim(4, 36); ax.set_xlabel("Physical independence (CHART)"); ax.yaxis.grid(False)
    axs[0].set_ylabel("Life satisfaction (SWL, 5-35)")
    fig.legend(handles=[Line2D([], [], marker="o", ls="", color="#e34948", label=f"High independence, low satisfaction (PI = 100, SWL <= {Q25:.0f})"),
                        Line2D([], [], marker="o", ls="", color="#2b2a28", label=f"Low independence, high satisfaction (PI <= 50, SWL >= {Q75:.0f})"),
                        Line2D([], [], marker="o", ls="", color=C["ctx"], label="All other interviews")],
               loc="lower center", ncol=3, frameon=False, fontsize=8.8, bbox_to_anchor=(.5, -.1))
    fig.suptitle("Independence and life satisfaction diverge for many people", x=.125, ha="left", y=1.03, fontsize=12, fontweight="bold", color=C["ink"])
    save(fig, "fig2_divergence.png")


# ---------------------------------------------------------------- 3. subgroup bands
def fig_bands(var="PI"):
    ORD = ["#86b6ef", "#3987e5", "#1c5cab", "#0d366b"]; TXT = [C["ink"], "w", "w", "w"]
    if var == "PI":
        f = lambda v: 0 if v <= 50 else 1 if v < 90 else 2 if v < 100 else 3
        labs = ["<= 50", "51-89", "90-99", "100 (ceiling)"]; ttl = "Physical independence (CHART, 0-100)"
    else:
        f = lambda v: 0 if v <= 19 else 1 if v <= 24 else 2 if v <= 29 else 3
        labs = ["5-19", "20-24", "25-29", "30-35"]; ttl = "Life satisfaction (SWL, 5-35)"
    rows = [("Age at injury", [(a, W[W.age_band == i]) for i, a in enumerate(LK["age_band"])]),
            ("Injury severity (ASIA, rehab discharge)", [(("Grade " + s) if s != "Unknown" else s, W[W.severity == i]) for i, s in enumerate(LK["severity"])])]
    nrow = sum(len(r[1]) for r in rows) + 2
    fig, ax = plt.subplots(figsize=(9.4, .42 * nrow + 1.3)); y = 0; ytk, ytl = [], []
    for title, items in rows:
        ax.text(-.02, y, title, ha="right", va="center", fontsize=9.5, fontweight="bold", color=C["ink"], transform=ax.get_yaxis_transform()); y += 1
        for name, g in items:
            v = g[var].dropna(); n = len(v)
            if n:
                c = np.bincount([f(a) for a in v], minlength=4) / n; acc = 0
                for i, sh in enumerate(c):
                    ax.barh(y, sh - .004, left=acc, height=.62, color=ORD[i], alpha=1 if n >= 30 else .45)
                    if sh > .06: ax.text(acc + sh / 2, y, f"{sh:.0%}", ha="center", va="center", fontsize=8.5, color=TXT[i], fontweight="bold")
                    acc += sh
                m, ci, _ = mean_ci(v); ax.text(1.02, y, f"{m:.1f} +/- {ci:.1f}", va="center", fontsize=8.5, color=C["ink"]); ax.text(1.27, y, f"{n:,}", va="center", ha="right", fontsize=8.5, color=C["ink2"])
            ytk.append(y); ytl.append(name); y += 1
    ax.set_yticks(ytk); ax.set_yticklabels(ytl, fontsize=9); ax.invert_yaxis(); ax.set_xlim(0, 1); ax.set_xticks([])
    ax.spines[:].set_visible(False); ax.tick_params(axis="y", length=0)
    ax.text(1.02, 0, "Mean +/- 95% CI", fontsize=8.5, color=C["ink2"], va="center"); ax.text(1.27, 0, "Interviews", fontsize=8.5, color=C["ink2"], ha="right", va="center")
    ax.legend(handles=[Patch(color=ORD[i], label=labs[i]) for i in range(4)], loc="upper left", bbox_to_anchor=(0, 1.09), ncol=4, frameon=False, fontsize=8.5, title=None)
    ax.set_title(f"{ttl}: share of interviews by score band", loc="left", fontsize=12, fontweight="bold", color=C["ink"], pad=40)
    save(fig, f"fig3_subgroup_bands_{var}.png")


# ---------------------------------------------------------------- 4. completeness
def fig_complete():
    VARS = [("PI", "CHART physical independence"), ("MB", "CHART mobility"), ("OP", "CHART occupation"), ("SI", "CHART social integration"),
            ("SWL", "Satisfaction with life"), ("PHQ9", "PHQ-9 total"), ("PHQ2", "PHQ-2 (items 1-2)"), ("pain", "Pain interference")]
    W["pain"] = W["pain"].replace({0: np.nan})
    M = np.array([[W[W.yr == y][k].notna().mean() for y in ANN] for k, _ in VARS]); N = [len(W[W.yr == y]) for y in ANN]
    fig = plt.figure(figsize=(11.6, 5.6)); gs = fig.add_gridspec(1, 2, width_ratios=[1.75, 1], wspace=.28)
    ax = fig.add_subplot(gs[0]); ax.imshow(M, cmap=HEAT, vmin=0, vmax=1, aspect="auto")
    for i in range(M.shape[0]):
        for j in range(M.shape[1]): ax.text(j, i, f"{M[i, j]:.0%}", ha="center", va="center", fontsize=8.3, color="w" if M[i, j] > .5 else C["ink"], fontweight="bold")
    ax.set_xticks(range(len(ANN))); ax.set_xticklabels([f"Yr {y}\nn={n:,}" for y, n in zip(ANN, N)], fontsize=8); ax.xaxis.tick_top()
    ax.set_yticks(range(len(VARS))); ax.set_yticklabels([v[1] for v in VARS], fontsize=9); ax.tick_params(length=0)
    ax.set_xticks(np.arange(-.5, len(ANN)), minor=True); ax.set_yticks(np.arange(-.5, len(VARS)), minor=True); ax.grid(which="minor", color=C["surface"], lw=2); ax.tick_params(which="minor", length=0)
    for s in ax.spines.values(): s.set_visible(False)
    ax.set_title("Share of follow-up interviews with a valid score", loc="left", fontsize=11.5, fontweight="bold", color=C["ink"], pad=34)
    # era x age
    ax2 = fig.add_subplot(gs[1]); er, ag = LK["era_cal"], LK["age_grp"]
    G = np.full((5, 4), np.nan); Nn = np.zeros((5, 4), int)
    for i, e in enumerate(er):
        for j, a in enumerate(ag):
            g = W[(W.era_cal == e) & (W.age_grp == a)]; Nn[i, j] = len(g)
            if len(g): G[i, j] = g.PI.notna().mean()
    ax2.imshow(np.ma.masked_invalid(G), cmap=HEAT, vmin=0, vmax=1, aspect="auto")
    for i in range(5):
        for j in range(4):
            if Nn[i, j]:
                hatched = i == 0
                if hatched: ax2.add_patch(plt.Rectangle((j - .5, i - .5), 1, 1, fill=False, hatch="////", edgecolor=C["ink2"], lw=0, alpha=.5))
                ax2.text(j, i, f"{G[i, j]:.0%}\nn={Nn[i, j]:,}", ha="center", va="center", fontsize=8, fontweight="bold",
                         color=C["ink"] if hatched else ("w" if G[i, j] > .5 else C["ink"]),
                         bbox=dict(boxstyle="round,pad=.2", fc=C["surface"], ec="none", alpha=.9) if hatched else None)
    ax2.set_xticks(range(4)); ax2.set_xticklabels(ag, fontsize=9); ax2.xaxis.tick_top(); ax2.set_yticks(range(5)); ax2.set_yticklabels(er, fontsize=9); ax2.tick_params(length=0)
    ax2.set_xticks(np.arange(-.5, 4), minor=True); ax2.set_yticks(np.arange(-.5, 5), minor=True); ax2.grid(which="minor", color=C["surface"], lw=2); ax2.tick_params(which="minor", length=0)
    for s in ax2.spines.values(): s.set_visible(False)
    ax2.set_title("CHART valid, by interview era x age", loc="left", fontsize=11.5, fontweight="bold", color=C["ink"], pad=34)
    ax2.text(0, -.07, "Hatched: CHART not yet collected (added Nov 1995).\nAge at interview is estimated.", transform=ax2.transAxes, fontsize=8, color=C["ink2"], va="top")
    save(fig, "fig4_completeness.png")


# ---------------------------------------------------------------- 5. cohort flow
def fig_flow():
    fl = pd.DataFrame([[y] + [sum(1 for p in P.status if p[i] in cs) for cs in ("I", "LM", "D", "X")] for i, y in enumerate(ANN)], columns=["yr", "I", "L", "D", "X"])
    tot = len(P); spec = [("I", "Interviewed (useful data)", C["blue"], "w"), ("L", "Lost, withdrew or no record", C["orange"], C["ink"]),
                          ("D", "Deceased", C["dark"], "w"), ("X", "Not yet due or exempt", C["light"], C["ink"])]
    fig, ax = plt.subplots(figsize=(8.8, 4.8)); bottom = np.zeros(len(fl)); x = np.arange(len(fl))
    for k, name, col, tc in spec:
        h = fl[k].values / tot
        ax.bar(x, h - .004, bottom=bottom, width=.62, color=col, label=name)
        for xi, (hh, b) in enumerate(zip(h, bottom)):
            if hh > .045: ax.text(xi, b + hh / 2, f"{hh:.0%}", ha="center", va="center", fontsize=8, color=tc, fontweight="bold")
        bottom += h
    ax.set_xticks(x); ax.set_xticklabels(fl.yr); ax.set_xlabel("Years since injury"); ax.set_yticks([0, .25, .5, .75, 1]); ax.set_yticklabels(["0%", "25%", "50%", "75%", "100%"])
    ax.yaxis.grid(True, color=C["grid"], lw=.8); ax.set_axisbelow(True); ax.set_ylim(0, 1)
    ax.legend(loc="upper center", bbox_to_anchor=(.5, 1.13), ncol=4, frameon=False, fontsize=8.5, handlelength=1, columnspacing=1.2)
    ax.set_title(f"Who is still in the data? Status of all {tot:,} people at each follow-up anniversary", loc="left", fontsize=11.5, fontweight="bold", color=C["ink"], pad=34)
    save(fig, "fig5_cohort_flow.png")


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser(description="Static report figures, optionally for a subset of research questions")
    ap.add_argument("--rq", default="1,2,3,4", help="comma-separated research questions (figures exist for 1-4)")
    want = {int(x) for x in ap.parse_args().rq.split(",") if x.strip()}
    if 1 in want: fig_traj()
    if 2 in want: fig_divergence()
    if 3 in want: fig_bands("PI"); fig_bands("SWL")
    if 4 in want: fig_complete(); fig_flow()
