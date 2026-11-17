"""
Dashboard data pipeline (v2) - pediatric-onset SCI cohort, NSCISC 2021AR.

Usage (from anywhere):
    python code/build_dashboard_data.py --raw <folder with f1_public_2021.csv, f2_public_2021.csv, rec_public_2021.csv>
    (default --raw: ../../NSCISC_Public_Data_2021, i.e. a sibling of this repository's folder)
    Optional --ids <csv with the 3,006 pediatric UniIDs from the feasibility step>; if omitted the cohort is
    taken from Form I (AInjAge < 18) and checked against the expected size of 3,006.

What it does (and why it differs from Main_Analysis/00_build_dataset.py):
  * re-derives the cohort (age at injury < 18) from Form I and asserts it equals
    the 3,006 UniIDs saved by Feasibility_Analysis
  * severity = ASIA Impairment Scale at REHAB DISCHARGE (AASAImDs), falling back to
    rehab admission (AASAImRb) then acute-care admission (AASAImAd). Admission-only
    severity (what Main_Analysis used) is blank for non-Day-1 patients.
    Frankel numeric codes (pre-Aug-1993) mapped per Data Dictionary Form I #120.
  * outcome cleaning from the Data Dictionary: CHART totals 999 -> NaN, SWL total
    88/99 -> NaN, PHQ-9 total 99 -> NaN. Adds PHQ-2 (sum of items 1-2, range 0-6)
    because in interviews from ~2011 to 2015 only PHQ-2 was collected for nearly all
    adults (items 3-9 are coded 9 "unknown/not done" for ~95%), so the 9-item total is
    structurally missing in that window while PHQ-2 stays ~95% complete for adults from
    2001 on (verified below; PHQ-2 >= 3 is the standard positive-screen cutoff).
  * interview calendar year (= injury year + post-injury year) and approximate
    interview age (= age at injury + post-injury year; midpoint for the three binned
    injury-age groups) - needed to separate era effects from age effects.
  * per-anniversary cohort status flow (Interviewed / Deceased / Lost-withdrew /
    Missed / Not yet due or exempt) built from Form II, Record Status and injury year.
  * writes a compact JSON for the dashboard and Tableau-ready CSVs.
"""
import argparse, json, os
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
_ap = argparse.ArgumentParser()
_ap.add_argument("--raw", default=os.path.join(HERE, "..", "..", "NSCISC_Public_Data_2021"),
                 help="folder holding the NSCISC 2021AR public CSVs (not part of this repository)")
_ap.add_argument("--ids", default=None, help="optional CSV (column UniID) of the expected pediatric cohort")
_args = _ap.parse_args()
DATA = _args.raw
PED_IDS = _args.ids or os.path.join(HERE, "..", "..", "Feasibility_Analysis", "outputs", "pediatric_uniids_2021.csv")
OUT = os.path.join(HERE, "..", "data")
os.makedirs(OUT, exist_ok=True)

DATA_CUTOFF_YEAR = 2021          # 2021AR release
ANN = [1, 5, 10, 15, 20, 25, 30, 35, 40, 45]

# ---------------------------------------------------------------- Form I
f1_cols = ["UniID", "AInjDt", "AInjAge", "ASex", "AASAImAd", "AASAImRb", "AASAImDs",
           "ANCatAdm", "ANCatRhb", "ANCatDis"]
f1_all = pd.read_csv(f"{DATA}/f1_public_2021.csv", dtype=str, usecols=f1_cols)

AGE_MID = {"0-5y": 3.0, "6-12y": 9.0, "13-14y": 13.5, "15": 15.0, "16": 16.0, "17": 17.0}
ped_derived = set(f1_all.loc[f1_all.AInjAge.isin(AGE_MID), "UniID"])
ped_saved = set(pd.read_csv(PED_IDS, dtype=str).UniID) if os.path.exists(PED_IDS) else ped_derived   # id list is optional
assert ped_derived == ped_saved and len(ped_saved) == 3006, "cohort mismatch"
print("cohort re-derived from AInjAge == saved list:", len(ped_saved))

f1 = f1_all[f1_all.UniID.isin(ped_saved)].copy()
f1["age_inj"] = f1.AInjAge.map(AGE_MID)
f1["age_exact"] = f1.AInjAge.isin(["15", "16", "17"])
f1["inj_year"] = f1.AInjDt.astype(int)
f1["age_band"] = np.where(f1.age_inj <= 12, "Early childhood (0-12)", "Adolescent (13-17)")

SEV = {"5": "A", "A": "A", "1": "B", "B": "B", "2": "C", "C": "C", "3": "D", "D": "D",
       "4": "E", "E": "E"}
def pick_severity(r):
    for col, src in (("AASAImDs", "discharge"), ("AASAImRb", "rehab admit"), ("AASAImAd", "acute admit")):
        g = SEV.get(r[col])
        if g is not None:
            return pd.Series([g, src])
    return pd.Series(["Unknown", "none"])
f1[["sev_raw", "sev_src"]] = f1.apply(pick_severity, axis=1)
# E (normal) is too small to analyse on its own; fold into the unknown/other group
f1["severity"] = f1.sev_raw.replace({"E": "Unknown"})
print("\nSeverity (discharge-first hierarchy):\n", f1.severity.value_counts().to_dict())
print("severity source:", f1.sev_src.value_counts().to_dict())
adm_only = f1.AASAImAd.map(SEV).fillna("Unknown").replace({"E": "Unknown"})
print("for comparison, admission-only unknown/missing:", int((adm_only == "Unknown").sum()))

def level(r):
    for c in ("ANCatDis", "ANCatRhb", "ANCatAdm"):
        v = r[c]
        if v in ("1", "2", "3"): return "Paraplegia"
        if v in ("4", "5", "6"): return "Tetraplegia"
    return "Unknown"
f1["level"] = f1.apply(level, axis=1)
f1["sex"] = f1.ASex.map({"1": "Male", "2": "Female"}).fillna("Unknown")
f1["inj_era"] = pd.cut(f1.inj_year, [1971, 1989, 1999, 2021],
                       labels=["1972-1989", "1990-1999", "2000-2021"]).astype(str)

# ------------------------------------------------------- Record status
rec = pd.read_csv(f"{DATA}/rec_public_2021.csv", dtype=str,
                  usecols=["UniID", "SStatCur", "SDthDt"])
rec = rec[rec.UniID.isin(ped_saved)].copy()
rec["death_year"] = pd.to_numeric(rec.SDthDt, errors="coerce")
print("\nFinal status:", rec.SStatCur.value_counts().to_dict())

# ---------------------------------------------------------------- Form II
f2_cols = ["UniID", "BYear", "BFolUpCt", "BCHPITot", "BCHMbTot", "BCHOpTot", "BCHSocIn",
           "BLifSatT", "BLifSat1", "BBPHQSDS", "BPainWrk", "BEducLvl", "BMarStat", "BPrLvlSt"] + [f"BBPHQ{i}" for i in range(1, 10)]
f2_all = pd.read_csv(f"{DATA}/f2_public_2021.csv", dtype=str, usecols=f2_cols)
f2_all = f2_all[f2_all.UniID.isin(ped_saved)].copy()
f2_all["BYear"] = f2_all.BYear.astype(int)
print("all cohort Form II rows:", len(f2_all), "| lost-to-system (BFolUpCt=5):", int((f2_all.BFolUpCt == "5").sum()))
print("BYear values:", sorted(f2_all.BYear.unique()))

w = f2_all[f2_all.BFolUpCt != "5"].copy()          # useful waves
w = w.merge(f1[["UniID", "inj_year", "age_inj", "age_exact", "age_band", "severity",
                "sex", "level", "inj_era"]], on="UniID")
w["cal"] = w.inj_year + w.BYear
w["age_int"] = w.age_inj + w.BYear

def numeric_valid(col, bad, lo=None, hi=None):
    v = pd.to_numeric(w[col], errors="coerce")
    v = v.where(~v.isin(bad))
    if lo is not None: v = v.where((v >= lo) & (v <= hi))
    return v
w["PI"] = numeric_valid("BCHPITot", [999], 0, 100)
w["MB"] = numeric_valid("BCHMbTot", [999], 0, 100)
w["OP"] = numeric_valid("BCHOpTot", [999], 0, 100)
w["SI"] = numeric_valid("BCHSocIn", [999], 0, 100)
w["SWL"] = numeric_valid("BLifSatT", [88, 99], 5, 35)
w["PHQ9"] = numeric_valid("BBPHQSDS", [99], 0, 27)
items = np.column_stack([pd.to_numeric(w[f"BBPHQ{i}"], errors="coerce") for i in range(1, 3)])
ok2 = np.all((items >= 0) & (items <= 3), axis=1)
w["PHQ2"] = np.where(ok2, items.sum(axis=1), np.nan)
w["PAIN_ok"] = w.BPainWrk.isin(["0", "1", "2", "3", "4", "8"])
w["SWL_scaled"] = (w.SWL - 5) / 30 * 100         # SWL 5-35 rescaled to 0-100 for a common axis

person_counts = w.groupby("UniID").size().rename("n_waves")
persons = (f1.merge(rec[["UniID", "SStatCur", "death_year"]], on="UniID", how="left")
             .merge(person_counts, on="UniID", how="left"))
persons["n_waves"] = persons.n_waves.fillna(0).astype(int)
persons = persons.sort_values("UniID").reset_index(drop=True)
persons["pid"] = persons.index
w = w.merge(persons[["UniID", "pid"]], on="UniID")

# ---------------------------------------------------- cohort status flow
lost_rows = set(zip(f2_all.loc[f2_all.BFolUpCt == "5", "UniID"], f2_all.loc[f2_all.BFolUpCt == "5", "BYear"]))
useful_rows = set(zip(w.UniID, w.BYear))
EXEMPT = {"Norm-Min", "Minimal", "Normal"}
LOSTISH = {"Lost", "ID Unknown", "Withdrew Consent"}
def status_string(r):
    s = []
    for y in ANN:
        due = r.inj_year + y
        if (r.UniID, y) in useful_rows: s.append("I")
        elif pd.notna(r.death_year) and r.death_year <= due: s.append("D")
        elif (r.UniID, y) in lost_rows: s.append("L")
        elif due > DATA_CUTOFF_YEAR: s.append("X")
        elif r.SStatCur in EXEMPT: s.append("X")
        elif r.SStatCur in LOSTISH: s.append("L")
        else: s.append("M")
    return "".join(s)
persons["status"] = persons.apply(status_string, axis=1)
flow = pd.DataFrame([{"year": y, **pd.Series([s[i] for s in persons.status]).value_counts().to_dict()}
                     for i, y in enumerate(ANN)]).fillna(0).astype({c: int for c in "IDLMX"} if False else {})
print("\nCohort status by anniversary (I=interviewed D=deceased L=lost/withdrew M=missed X=not due/exempt):")
print(flow.to_string(index=False))

# ------------------------------------------------- reproduce proposal stats
checks = {}
checks["persons_with_useful_wave"] = int(w.UniID.nunique())
checks["useful_waves"] = int(len(w))
pairs = w.dropna(subset=["PI", "SWL"])
checks["pairs"] = int(len(pairs))
checks["pearson_r"] = round(float(pairs.PI.corr(pairs.SWL)), 3)
q25 = float(pairs.SWL.quantile(.25)); q75 = float(pairs.SWL.quantile(.75))
full = pairs[pairs.PI == 100]
checks["share_PI100"] = round(len(full) / len(pairs), 3)
checks["PI100_in_bottom_SWL_quartile"] = round(float((full.SWL <= q25).mean()), 3)
checks["lowPI_in_top_SWL_quartile"] = round(float((pairs[pairs.PI <= 50].SWL >= q75).mean()), 3)
checks["swl_q25"] = q25; checks["swl_q75"] = q75
print("\nProposal headline stats re-derived:", checks)
assert checks["useful_waves"] == 7825 and checks["persons_with_useful_wave"] == 2665
assert checks["pairs"] == 4019 and abs(checks["pearson_r"] - 0.227) < 0.001

# --------------------------------------------- completeness decomposition
w["era_cal"] = pd.cut(w.cal, [0, 1995, 2000, 2010, 2015, 2030],
                      labels=["<=1995", "1996-2000", "2001-2010", "2011-2015", "2016+"]).astype(str)
w["age_grp"] = pd.cut(w.age_int, [0, 18, 25, 40, 100], right=False,
                      labels=["<18", "18-24", "25-39", "40+"]).astype(str)
vars_ok = {"CHART Physical Independence": w.PI.notna(), "CHART Mobility": w.MB.notna(),
           "CHART Occupation": w.OP.notna(), "CHART Social Integration": w.SI.notna(),
           "Satisfaction With Life total": w.SWL.notna(), "PHQ-9 total (9 items)": w.PHQ9.notna(),
           "PHQ-2 (items 1-2)": w.PHQ2.notna(), "Pain interference with work": w.PAIN_ok}
w_ok = pd.DataFrame(vars_ok)
comp_year = (pd.concat([w[["BYear"]], w_ok], axis=1).groupby("BYear")
             .agg(n=("BYear", "size"), **{k: (k, "mean") for k in vars_ok}).reset_index())
comp_era_age = (pd.concat([w[["era_cal", "age_grp"]], w_ok], axis=1).groupby(["era_cal", "age_grp"])
                .agg(n=("CHART Physical Independence", "size"),
                     chart_pi=("CHART Physical Independence", "mean"),
                     swl=("Satisfaction With Life total", "mean"),
                     phq9=("PHQ-9 total (9 items)", "mean"), phq2=("PHQ-2 (items 1-2)", "mean"))
                .reset_index())
print("\nPHQ-9 (9 items) vs PHQ-2 completeness among adults (age_int>=19), by interview era:")
adult = w[w.age_int >= 19]
print(adult.groupby("era_cal").agg(n=("pid", "size"), phq9=("PHQ9", lambda s: s.notna().mean()),
                                   phq2=("PHQ2", lambda s: s.notna().mean())).round(2).to_string())
print("\nCHART PI completeness by interview era x age group:")
print(comp_era_age.pivot(index="era_cal", columns="age_grp", values="chart_pi").round(2).to_string())

# ------------------------------------------------------------- write files
# lookups (index order is part of the JSON contract with dashboard.html)
LK = {
    "age_band": ["Early childhood (0-12)", "Adolescent (13-17)"],
    "severity": ["A", "B", "C", "D", "Unknown"],
    "era": ["1972-1989", "1990-1999", "2000-2021"],
    "sex": ["Male", "Female", "Unknown"],
    "level": ["Paraplegia", "Tetraplegia", "Unknown"],
    "era_cal": ["<=1995", "1996-2000", "2001-2010", "2011-2015", "2016+"],
    "age_grp": ["<18", "18-24", "25-39", "40+"],
    "status_codes": {"I": "Interviewed", "D": "Deceased", "L": "Lost or withdrew",
                     "M": "Eligible, no record", "X": "Not yet due or exempt"},
}
def idx(series, key): return series.map({v: i for i, v in enumerate(LK[key])}).astype(int)

persons_out = pd.DataFrame({
    "pid": persons.pid, "age_band": idx(persons.age_band, "age_band"),
    "severity": idx(persons.severity, "severity"), "era": idx(persons.inj_era, "era"),
    "sex": idx(persons.sex, "sex"), "level": idx(persons.level, "level"),
    "inj_year": persons.inj_year, "n_waves": persons.n_waves, "status": persons.status})
def nn(s): return s.round(1).where(s.notna(), None)
waves_out = pd.DataFrame({
    "pid": w.pid, "yr": w.BYear, "cal": w.cal, "age": w.age_int.round(1),
    "PI": w.PI, "MB": w.MB, "OP": w.OP, "SI": w.SI, "SWL": w.SWL, "PHQ9": w.PHQ9, "PHQ2": w.PHQ2,
    "pain": w.PAIN_ok.astype(int)}).sort_values(["pid", "yr"]).reset_index(drop=True)
rows_w = [[None if (isinstance(v, float) and np.isnan(v)) else (int(v) if float(v).is_integer() else float(v))
           for v in r] for r in waves_out.itertuples(index=False)]
payload = {
    "meta": {"cohort": int(len(persons)), "waves": int(len(w)), "anniversaries": ANN,
             "data_cutoff_year": DATA_CUTOFF_YEAR,
             "source": "NSCISC Public Use Database 2021AR (Form I, Form II, Record Status)",
             "headline_checks": checks,
             "notes": ["Severity = ASIA grade at rehab discharge (fallback rehab admit, acute admit).",
                       "Interview age = age at injury + post-injury year (bin midpoints for ages 0-14).",
                       "Interview year = injury year + post-injury year."]},
    "lookups": LK,
    "person_fields": list(persons_out.columns),
    "persons": persons_out.values.tolist(),
    "wave_fields": list(waves_out.columns),
    "waves": rows_w,
}
with open(f"{OUT}/dashboard_data.json", "w") as fh:
    json.dump(payload, fh, separators=(",", ":"))
print("\nwrote", f"{OUT}/dashboard_data.json", os.path.getsize(f"{OUT}/dashboard_data.json") // 1024, "KB")

# Tableau-ready extracts
w_csv = w[["UniID", "BYear", "cal", "age_int", "age_band", "severity", "sex", "level", "inj_era",
           "era_cal", "age_grp", "PI", "MB", "OP", "SI", "SWL", "SWL_scaled", "PHQ9", "PHQ2"]].copy()
w_csv.columns = ["UniID", "PostInjuryYear", "InterviewYear", "InterviewAgeApprox", "AgeAtInjuryBand",
                 "Severity", "Sex", "NeuroLevel", "InjuryEra", "InterviewEra", "InterviewAgeGroup",
                 "CHART_PhysicalIndependence", "CHART_Mobility", "CHART_Occupation",
                 "CHART_SocialIntegration", "SWL_Total", "SWL_Scaled0to100", "PHQ9_Total", "PHQ2_Total"]
w_csv.to_csv(f"{OUT}/waves_long.csv", index=False)
persons[["UniID", "age_band", "severity", "sex", "level", "inj_year", "inj_era", "SStatCur",
         "death_year", "n_waves", "sev_src"]].to_csv(f"{OUT}/persons.csv", index=False)
flow_long = [{"UniID": r.UniID, "PostInjuryYear": y, "Status": LK["status_codes"][r.status[i]]}
             for r in persons.itertuples() for i, y in enumerate(ANN)]
pd.DataFrame(flow_long).to_csv(f"{OUT}/cohort_status_long.csv", index=False)
comp_year.to_csv(f"{OUT}/completeness_by_year.csv", index=False)
comp_era_age.to_csv(f"{OUT}/completeness_by_era_age.csv", index=False)
flow.to_csv(f"{OUT}/cohort_status_counts.csv", index=False)

# ---------------------------------------------------------------- life milestones (RQ6), a separate file
# Codes from the Data Dictionary, Form II #14 (marital status), #16 (education), #83 (occupational status).
# Collected since 1973, so unlike CHART/SWL they are not missing before 1996.
def recode(col, mapping):
    v = pd.to_numeric(w[col], errors="coerce")
    return v.map(mapping)
w["edu"] = recode("BEducLvl", {1: 0, 2: 0, 3: 1, 4: 2, 5: 3, 6: 3, 7: 3})            # <HS, HS/GED, associate, bachelor's+; 8 other, 9 unknown -> missing
w["mar"] = recode("BMarStat", {1: 0, 2: 1, 3: 2, 4: 2, 5: 2, 7: 3})                  # never, married, div/sep/widowed, partner; 6 other, 9 unknown -> missing
w["occ"] = recode("BPrLvlSt", {1: 0, 6: 1, 2: 2, 3: 2, 4: 2, 7: 3, 5: 4, 8: 4, 9: 4, 10: 5})   # working, student, homemaker/training, unemployed, retired, other; 99 -> missing
ms = w[["pid", "BYear", "edu", "mar", "occ"]].sort_values(["pid", "BYear"])
ms_payload = {"fields": ["pid", "yr", "edu", "mar", "occ"],
              "lookups": {"edu": ["Less than high school", "High school or GED", "Associate degree", "Bachelor's or higher"],
                          "mar": ["Never married", "Married", "Divorced, separated or widowed", "Living with a partner"],
                          "occ": ["Working", "Student", "Homemaker or training", "Unemployed", "Retired", "Other"]},
              "rows": [[None if pd.isna(v) else int(v) for v in r] for r in ms.itertuples(index=False)]}
with open(f"{OUT}/milestones_data.json", "w") as fh:
    json.dump(ms_payload, fh, separators=(",", ":"))
print("wrote", f"{OUT}/milestones_data.json", "| valid edu/mar/occ:", int(w.edu.notna().sum()), int(w.mar.notna().sum()), int(w.occ.notna().sum()))

# independent reference aggregates for QA of the dashboard
ref = {"mean_by_year": {c: w.groupby("BYear")[c].agg(["mean", "count"]).round(4).reset_index().values.tolist()
                        for c in ["PI", "MB", "OP", "SI", "SWL"]},
       "completeness_by_year": comp_year.round(4).values.tolist(), "flow": flow.values.tolist(),
       "checks": checks}
with open(f"{OUT}/qa_reference.json", "w") as fh:
    json.dump(ref, fh)
print("done")
