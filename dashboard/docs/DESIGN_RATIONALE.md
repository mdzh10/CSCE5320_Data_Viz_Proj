# Design rationale

How the dashboard follows the course material (Munzner, *Visualization Analysis and Design*, and the module slides), written for the research questions in this increment: questions 1 to 6.

## Nested model

| Level | Decision | Threat and how it was handled |
|---|---|---|
| Domain situation | Clinicians and researchers who follow people injured as children want to know how independence and well-being look decades later, and how much of that picture reflects who is still being interviewed. | Wrong problem: the questions come from the project proposal and were narrowed to what the public data can answer. |
| Data and task abstraction | A table of 3,006 people (age band, severity, injury era, sex, level) and a table of 7,825 interviews keyed by person and follow-up year (ordered quantitative scores, plus derived bands and screens). Tasks: identify trends, compare groups, summarise distributions, find outliers and correlations. | Wrong abstraction: scores are ceiling-bound (50.6% of independence scores equal 100), so distributions are shown as score bands rather than medians. Missing scores are kept visible, not dropped. |
| Idiom | Line charts with confidence bands, small-multiple scatter plots, 100% stacked bars, direct labels, tooltips, table twins. | Wrong idiom: a first draft used box plots, which collapsed at the ceiling of 100 (median and upper quartile both equal 100), so they were replaced by score-band bars. Outcomes share one axis instead of using two. |
| Algorithm | Wilson intervals for proportions, normal-approximation intervals for means, person-clustered standard errors where one person contributes several interviews, nearest-point hover through a Delaunay structure, redraw on every filter change. | Too slow: interactions felt instantaneous on a laptop during testing; they were not formally timed. |

Immediate validation done: every number in the table views is recomputed independently in pandas (`qa/verify.py`) for the default view and a filtered selection; colours were checked for colour-vision deficiency; layouts were checked at desktop and phone widths. Downstream validation at the idiom level (a usability test with classmates: can people read the encodings and use the interactions?) is planned for the next increment; the protocol is in `docs/USABILITY_TEST.md`. The abstraction level is argued from the proposal and the instructor's feedback but not tested with target users, and the domain level would need spinal cord injury researchers or clinicians, which is outside the scope of this course project.

## What, why, how per question

| | What (data) | Why (task) | How (idiom) |
|---|---|---|---|
| RQ1 | Mean score per follow-up anniversary, per measure; share screening positive; paired change between consecutive anniversaries | Identify trend; compare measures; summarise change within a person | Unjoined dots with CI whiskers on one 0 to 100 axis (a line only in the same-people mode), direct labels, n strip; small-multiple bars of mean change with intervals |
| RQ2 | Paired independence and satisfaction scores per interview | Find correlation and outliers | Small multiples by period; red and near-black mark the two exception groups against faint grey context; least-squares line; a count strip for the overplotted column at PI = 100; adjustable cutoffs |
| RQ3 | Score band shares by group, with mean and interval | Compare distributions across groups | Stacked proportion bars on an ordered luminance ramp, plus the mean as a dot with a 95% CI whisker on one fixed scale |
| RQ4 | Share of interviews with a valid score by instrument, year, era and age; status of each person at each anniversary; scores per person; earlier scores by later status | Locate missingness; explain it; check who remains | Sequential-ramp heat maps, 100% status bars, an overlap matrix with a histogram, a dot plot with intervals |
| RQ5 | Depression screen and satisfaction within bands of physical independence | Compare a relationship across strata | Proportion bars with intervals beside a paired dot plot and the gap |
| RQ6 | Share of interviews with each life milestone (high school, bachelor's degree, work, marriage) by approximate age at interview; optional split into two or three groups | Discover trends with age; compare groups at the same age | Small multiples (one panel per milestone, common 0 to 100% axis), lines with person-clustered Wilson bands; group lines on the grey luminance ramp |

## Marks and channels

- **Position** carries the quantitative values (line height, scatter axes, bar length), the most accurate channel.
- **Hue** is used only for identity and never for order. Colour follows the entity across the whole page: physical independence is always blue, life satisfaction always orange, social integration always aqua, and a filter never repaints a series. Groupings never reuse those hues: injury era and age at injury use grey luminance steps, and red is kept for the one exception group in the scatter plot.
- **Luminance** is used only for ordered scales (the score-band ramp, the injury-era ramp) and kept to four steps or fewer so that the steps stay distinguishable.
- The palette was run through a colour-vision-deficiency validator; no red-green pair carries meaning, and every colour is also backed by a label or legend, so colour is never the only channel.
- **Popout:** in the scatter plot, the two exception groups are red and near-black over faint grey, so they stand out without a legend lookup.
- **Overplotting:** about half of all paired interviews sit at PI = 100. Context dots are drawn at low opacity and a small bar strip at the right edge of each panel counts the interviews at 100 by satisfaction score, so density is shown by length rather than guessed from overlapping dots.
- **Common scale:** the outcomes in RQ1 share one 0 to 100 position axis so their shapes can be compared; the chart says to compare movement, not levels across instruments. The RQ3 mean dots use one fixed scale per outcome, so a filter never rescales them.
- No pie charts, no 3D, no animation: panels are placed side by side so the eye compares them instead of memory.

## Honesty about what a line means

A line implies the same units followed over time. Here most people contribute only a few scores, so the dashboard encodes who is behind each point:

- the default view draws each anniversary as separate dots with CI whiskers and **no connecting line**, because each point is a different group of people (RQ6 milestones by age follow the same rule);
- a **same-people** view uses a heavy line and states how many people qualify;
- an **individual-people** view shows how short single-person records are;
- the strip under the chart shows people per point by injury era, and the tooltip gives the share who also appear at the previous anniversary;
- the **change within people** view makes the only claim a paired comparison can support: the same person at two anniversaries;
- every interval and band is hidden or hollowed below a user-set minimum n instead of being removed.

## Honesty about uncertainty

- Several interviews from one person are not independent. Where they are pooled the standard error is clustered by person, and proportions use a Wilson interval on the effective sample size (n divided by the design effect). The per-year views hold one interview per person, so ordinary intervals apply there.
- The table views state what each interval is.
- The gap interval in RQ5 treats the two groups as independent, which is approximate.
- Adjustable cutoffs (RQ2) stay visible in the legend and in the takeaway sentence, so a different cutoff cannot be mistaken for the default one.
- Takeaway sentences contain numbers only and are recomputed for every selection; they never name a cause.

## Interaction and feedback

One sticky filter row scopes every view (overview first, filter, details on demand). Hover shows a tooltip near the cursor without a delay, the trajectory chart can be read with the arrow keys, and every chart has a table view and a CSV download. Axes and reference lines (for example the cohort-wide satisfaction quartiles) stay fixed when a filter changes, so a change in the data is not confused with a change in the scale. **Copy link to this view** encodes the filters and open views in the page address; a damaged link falls back to the default view.

## Known limitations

No zoom or pan and no brushing between panels. No adjusted model: group differences are not isolated effects because age band, severity and level are correlated with injury era and with each other. Interview age is only approximate for people injured before age 15, so questions 1 to 5 use years since injury as the time axis; question 6 uses age groups wider than that error.
Survivor selection is shown (RQ4) but not corrected for.

