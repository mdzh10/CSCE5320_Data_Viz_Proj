# Growing Up After Pediatric Spinal Cord Injury

An interactive D3.js dashboard of up to 45 years of follow-up for the 3,006 people in the US Spinal Cord Injury Model Systems database who were injured before age 18.

CSCE 5320 Scientific Data Visualization, Group 2: Muhammad Zubair Hasan, Fahmida Yasmin Rifat, Jayed Mohammad Barek.

| | |
|---|---|
| **Dashboard** | [`dashboard/dashboard.html`](dashboard/dashboard.html): download and open in any browser (one self-contained file, works offline) |
| **Final report** | [`report/Final_Report_Group2.pdf`](report/Final_Report_Group2.pdf) (editable copy: `.docx`) |
| **Demo video** | [`demo/Demo_Group2.mp4`](demo/Demo_Group2.mp4), about 2:40, with the narration script in [`demo/Demo_Narration_Script_Group2.pdf`](demo/Demo_Narration_Script_Group2.pdf) |
| **Dataset** | NSCISC Public Use Database, 2021 annual-report release: [request page](https://sites.uab.edu/nscisc/nscisc-database-public-use) (DOI [10.17605/OSF.IO/NP24C](https://doi.org/10.17605/OSF.IO/NP24C)) |

## Research questions

1. How do independence and well-being differ across the years after injury, and how much of that reflects who is still being interviewed?
2. Who is fully independent but unhappy, or the reverse?
3. How do groups (age at injury, injury severity, injury level, sex) compare?
4. Where does the data thin out, and who is still in the data?
5. Does a positive depression screen go with lower life satisfaction at every level of independence?
6. Growing up: how many finish school, earn a degree, work and marry, and does it differ between groups?

## Using the dashboard

- **Filter bar:** age at injury, ASIA grade, injury era, injury level and sex, plus the range of years since injury. Every chart and summary tile updates together. The **Minimum n** slider fades estimates that rest on too few people.
- **Views and switches** on each card (for example, Everyone interviewed / Same people at every year / Change within people on question 1).
- **Hover** any mark for exact values, 95% intervals and sample sizes.
- **Table view** and **CSV** under every chart; **Copy link to this view** saves the current filters in the page address.

Because most people are interviewed only a few times, charts where each year is a different group of people show separate dots with interval whiskers rather than lines; only the same-people view joins points.

## Data

The NSCISC Public Use Database is distributed by the National Spinal Cord Injury Statistical Center (University of Alabama at Birmingham). We used three files from the 2021 annual-report release: Form I (injury and first hospital stay, 35,675 people), Form II (follow-up interviews, 131,217 records) and Record Status. The raw files are **not** in this repository; request them from the [NSCISC public-use page](https://sites.uab.edu/nscisc/nscisc-database-public-use) and follow its terms of use.

Citation: Chen Y. *National Spinal Cord Injury Model Systems Database* (public use data, Version 2021 AR). National Spinal Cord Injury Statistical Center. DOI: 10.17605/OSF.IO/NP24C.

The dashboard embeds de-identified, derived records for the pediatric cohort (group labels and per-interview scores, without the original record IDs).

## Repository layout

```
dashboard/
  dashboard.html          the finished dashboard (built file)
  dashboard_src/          D3 source modules, template, styles and build script (Node.js)
  code/                   Python pipeline: raw NSCISC files -> data/, plus static figures
  data/                   data embedded in the dashboard and reference numbers
  figures/                static summary figures
  qa/                     independent pandas check of the numbers shown (21 of 21 pass)
  docs/                   design rationale and usability-test protocol
  README.md               details on every chart, rebuilding and limitations
report/                   final report (PDF and Word)
demo/                     demo video and narration script
```

## Rebuilding

```
cd dashboard/dashboard_src
npm install                 # installs D3 v7
node build.js               # rebuilds dashboard/dashboard.html

# regenerate the data from the raw NSCISC files (Python 3 with pandas, numpy, matplotlib)
python dashboard/code/build_dashboard_data.py --raw path/to/NSCISC_Public_Data_2021
python dashboard/code/make_figures.py
```

## Tools

Python (pandas, NumPy, Matplotlib) for data preparation; D3.js v7, JavaScript, HTML and CSS for the dashboard; Node.js for the build; Playwright with headless Chromium for rendering tests and screenshots.
