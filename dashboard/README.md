# Growing up after pediatric spinal cord injury: interactive dashboard

CSCE 5320 Scientific Data Visualization, Group 2. Data: National Spinal Cord Injury Model Systems (NSCISC) Public Use Database, 2021 annual report. Cohort: 3,006 people injured before age 18.

**Final version: research questions 1 to 6.** Open `dashboard.html` in any browser. It is one self-contained file (D3 and the data are embedded), so it works offline with no server.

## Research questions

| # | Question | Status |
|---|---|---|
| 1 | How do independence and well-being differ across follow-up anniversaries, and how much of that reflects who is still being interviewed? | done |
| 2 | Who is fully independent but unhappy, or the reverse? | done |
| 3 | How do subgroups (age at injury, severity, injury level, sex) compare? | done |
| 4 | Where does the data thin out, and who is still in the data? | done |
| 5 | Does a positive depression screen go with lower life satisfaction at every level of independence? | done |
| 6 | Growing up: how many finish school, earn a degree, work and marry, and how does that differ between groups? | done |

## What the dashboard does

One filter row controls every chart: age at injury, ASIA severity grade, injury era, injury level, sex, the range of years since injury, and a minimum-n slider. The slider fades or hollows small groups; it never hides them. Every chart has a **Table view** with the exact numbers and a **CSV** button that downloads them. Tooltips appear on hover or, for the trajectory chart, with the arrow keys. **Copy link to this view** stores the filters and the open view in the page address, so a colleague who opens the link sees the same picture.

**Question 1, trajectories.** Mean scores for physical independence, life satisfaction and social integration on one shared 0 to 100 axis (life satisfaction is rescaled from 5 to 35 so no dual axis is needed), drawn as separate dots with 95% interval whiskers (each year is a different group of people, so the dots are not joined). Three views: the mean score per anniversary, the share screening positive for depression (PHQ-2 and PHQ-9), and **change within people**, which compares each person with themselves at consecutive anniversaries (mean change with its interval, and the share who rose, stayed the same or fell).

**Question 2, divergence.** Three small-multiple scatter plots (years 1 to 5, 10 to 20, 25 to 45). Red marks interviews with full independence but low life satisfaction; near-black marks low independence but high satisfaction; everything else is faint grey context. Each panel shows Pearson r, Spearman ρ (a rank correlation, less affected by the ceiling) and a least-squares line; a bar strip at the right edge counts the many interviews at PI = 100 by satisfaction score. The two exception shares carry 95% intervals that allow for people with several interviews. "Low" and "high" default to the cohort's own quartiles; two sliders, or the **standard SWLS bands** preset (19 and below, 26 and above), change the cutoffs. A one-sentence reading under the heading restates the correlation and both shares for the current selection.

**Question 3, subgroups.** Stacked bars of score bands (ordered blue ramp) by age at injury, severity, injury level and sex. Beside each row the mean is drawn as a dot with its 95% confidence interval on one fixed scale, followed by the interview count. Bands are used instead of box plots because half of all independence scores sit at the ceiling of 100. Intervals are computed by person, so a person with several interviews does not count as several independent observations.

**Question 4, thinning data and attrition.** Five panels. 4: share of interviews with a usable score by instrument and year. 4b: the same by interview era and age, to separate an era effect from an age effect. 4c: what happened to the people at each anniversary (interviewed, lost, deceased, not yet due). 4d: how many people have scores at two different anniversaries, which is the limit on what any line chart can say about the same people. 4e: whether people who later left the data scored differently earlier. People who later died scored clearly lower beforehand, for example about 54 against 84 on physical independence at the 10 to 15 and 15 to 20 steps; people lost to follow-up did not score systematically lower.

**Question 5, mood.** Left: the share of interviews screening positive for depression within each level of physical independence. Right: mean life satisfaction of screen-negative and screen-positive interviews at the same independence level, with the gap and its interval. Intervals are person-clustered; the gap interval treats the two groups as independent, which is approximate.

**Question 6, life milestones.** Four small-multiple panels show the share of interviews with a high-school diploma, a bachelor's degree, paid work as the main status, and marriage, by approximate age at interview (18 to 21 up to 51 and over). Each age group is shown as a separate dot with a 95% whisker, and the panels can be split by injury level, severity, sex or injury era. These fields are recorded since 1973, so this view also covers the early interviews that have no CHART or satisfaction scores. The data come from a separate file, `data/milestones_data.json`.

## Reading the trajectories correctly

Most people have only a few follow-up scores, so the lines in question 1 do **not** follow the same people from year 1 to year 45. For example, 370 people have a valid independence score at year 1 and 49 at year 45, and none of them has both. The chart is built around this fact:

- By default each point averages **whoever was interviewed that year**, so the points are drawn as separate dots with a 95% CI whisker and are **not joined by a line**; a notice above the chart states how many people overlap between the first and last year shown. Only the same-people view draws a line.
- **Same people at every year** restricts the chart to people with a score at every plotted anniversary. The line is drawn heavy and the notice states how many people that is. With the full 1 to 45 range nobody qualifies, and the chart says so and suggests the widest range that works.
- **Show individual people** draws a random sample of single people as thin lines, so you can see how short most person-level records are.
- The strip under the chart shows how many people stand behind each point, shaded by injury era, and the tooltip reports how many of them also have a score at the previous anniversary.
- **Change within people** is the one view that does follow people, and only across two anniversaries at a time.

## Folder map

```
dashboard.html              the deliverable (built file)
dashboard_src/
  build.js                  builds dashboard.html from src/ (node build.js)
  rq.config.json            which research questions the build includes
  package.json              d3 dependency
  src/                      core, traj, scatter, dist, heat, mood, milestones, main (.js), template.html, styles.css
code/
  build_dashboard_data.py   raw NSCISC files -> data/dashboard_data.json
  make_figures.py           static report figures -> figures/
data/
  dashboard_data.json       the data embedded in the dashboard
  qa_reference.json         headline numbers used for cross-checks
  completeness_by_year.csv  derived table behind a static figure
  cohort_status_counts.csv  derived table behind a static figure
  milestones_data.json      education, work and marital status per interview (question 6)
figures/                    static figures for the report
qa/                         extract_tables.js, verify.py (independent pandas check), links.js (shared-link test), VERIFICATION.txt
docs/                       DESIGN_RATIONALE.md, USABILITY_TEST.md
```

## Rebuild

```
cd dashboard_src
npm install
node build.js                 # uses rq.config.json
node build.js --rq 1,2        # or choose questions on the command line
```

To regenerate the data from the raw files, request the NSCISC public-use files (2021 AR release) from https://sites.uab.edu/nscisc/nscisc-database-public-use and run

```
python code/build_dashboard_data.py --raw path/to/NSCISC_Public_Data_2021
python code/make_figures.py --rq 1,2,3,4
```

Python 3 with pandas, numpy and matplotlib is needed. The raw files are not part of this repository.

## Data note

The dashboard embeds de-identified person-level records derived from the NSCISC public-use files (age band, severity, injury era, sex, injury level, injury year, and per-interview scores), without the original record IDs. The raw NSCISC files are not included. Please follow the NSCISC data-use terms when reusing the data. The repository stays private until the team has confirmed that those terms allow the built page to be published.

## Checks done

- Cohort and headline numbers re-derived from the raw files: 3,006 people, 2,665 with at least one useful follow-up, 7,825 interviews.
- `qa/extract_tables.js` dumps the dashboard's own table views and `qa/verify.py` recomputes them independently in pandas (means, intervals, shares, correlations, within-person changes and counts) for the default view and a filtered view. `qa/VERIFICATION.txt` holds the result for this build.
- Colours were validated for colour-vision deficiency; every chart also uses direct labels, a legend and a table view.
- Rendered at desktop and phone widths; empty selections, small groups, single groups, keyboard use, tooltips and the shared link were tested without console errors.
- A task protocol for a short usability test is in `docs/USABILITY_TEST.md`; it has not been run with real participants yet.

## Limitations

Observational data: patterns are descriptive, not causal. Where several interviews from one person are pooled the intervals are clustered by person; the per-year views contain at most one interview per person and use ordinary intervals. Group differences are not isolated effects because age band, severity and level are correlated with injury era and with each other; no adjusted model is fitted. Interview age and calendar year are estimated from age and year of injury plus the follow-up anniversary, so questions 1 to 5 use years since injury as the time axis and question 6 groups age into bins wider than that error. Severity is the ASIA grade at rehabilitation discharge, falling back to rehabilitation admission and then acute admission. People who remain in the data are a surviving subset.
