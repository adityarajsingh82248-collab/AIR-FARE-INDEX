# AIR-INDEX (SIH26056) — Phase 1: Data Foundation — Completion Report

**Input:** `airfare_sample.csv` (500 rows, 16 columns, single search-date snapshot: 2026-09-05)
**Output:** `airfare_clean.csv` (500 rows retained, 0 deleted)

---

## A. Data Quality Summary

The sample dataset turned out to be **structurally very clean** — this is expected for a
hand-built pipeline-development sample, but every check below was still run in full rather
than assumed.

| Check | Result |
|---|---|
| Rows / Columns | 500 / 16 |
| Exact duplicate rows | 0 |
| Missing cells (any column) | 0 |
| Fare component consistency (base+taxes+fees ≈ total) | 500/500 exact match |
| Negative or zero fares | 0 |
| Travel date before search date | 0 |
| Lead-time label vs. calculated lead-time mismatches | 0 |
| Unrecognized airport codes / origin==destination | 0 |
| Airline name variants needing merge | 0 |
| Statistical outliers (route-level IQR, on AVAILABLE fares) | 0 |
| Booking windows present | T+1, T+7, T+15, T+30, T+45 — all 5, all 6 routes |
| Routes | 6 (BLR-HYD, BOM-BLR, DEL-BLR, DEL-BOM, DEL-CCU, MAA-DEL) — matches the Phase 0 route basket exactly |
| Airlines | 5 (Air India, Air India Express, Akasa Air, IndiGo, SpiceJet) |
| Sources | 1 ("Sample Data") |
| Fare class | 1 (Economy only) |

## B. Problems Found

Only two things were flagged — neither is a data *error*, both are **structural limitations**
worth knowing about before Phase 2:

1. **35 SOLD_OUT and 11 MISSING-status rows still carry a quoted `total_fare`.** A sold-out or
   ambiguous-status quote is not a purchasable price, so these were **not deleted**, but were
   excluded from the index/representative-fare calculation via a new `usable_for_index` flag
   (454/500 rows are usable).
2. **482 of 500 rows share the same route+airline+travel_date+lead_time.** This looked like mass
   duplication at first glance, but adding `search_time` to the identity key drops true duplicates
   to **zero** — these are legitimate repeat fare checks of the same flight at different times of
   day (1–8 checks per combination, avg 3.4). They were kept and labeled
   `INTRADAY_REPEAT_CHECK`, not removed.

No fabricated route weights, no invented missing-value fills, no deleted rows.

## C. Exact Cleaning Actions Performed

- Types standardized explicitly (dates → `datetime`, fares → `numeric`, text fields trimmed/uppercased where appropriate) — every conversion failure would have been logged; none occurred.
- `route` derived as `origin-destination`.
- Airline names checked for case/spacing variants — none found; canonical mapping still produced (`airline_master_mapping.csv`) for future-proofing against real scraped data.
- `lead_time_days` calculated independently from `travel_date − search_date` and compared to the stated `lead_time` label.
- `fare_consistency_flag` computed per row (VALID / MINOR_DIFFERENCE / INVALID / MISSING_COMPONENT), with a ±₹5 rounding tolerance.
- `validation_status` / `validation_reason` computed per row against 12 invalid-value rules.
- `duplicate_flag` computed using the full identity key (route+airline+travel_date+lead_time+fare_class+source+search_time).
- `outlier_flag` computed via per-route IQR, using only AVAILABLE fares to set the "normal" bounds (so a sold-out quote can't distort what counts as normal).
- `route_median_fare` and `fare_deviation_pct` computed per row, relative to that route's AVAILABLE-fare median.
- Calendar features derived: `year`, `month`, `week`, `day_of_week`, `search_hour`, `travel_month`.
- `usable_for_index` derived (AVAILABLE + VALID + fare-consistent).

## D. Final Dataset Statistics

- **Final rows:** 500 (0 deleted, 0 fabricated)
- **Usable for index:** 454 (90.8%)
- **Fare range (usable):** ₹3,336 – ₹10,342 (total_fare)
- **Median vs. mean fare per route:** within ±5.4% of each other on every route (see `E` below) — no heavy skew in this sample, but **median is still the recommended representative-fare statistic** for the prototype, since it is inherently robust to the kind of one-off price spikes the index is meant to survive, and matches standard practice for price-index construction (e.g., CPI methodology). Mean is retained alongside it in the coverage tables for comparison, not as the chosen statistic.
- **Route coverage:** all 6 Phase-0 routes × all 5 booking windows × all 5 airlines present.
- **Single search-date snapshot** (2026-09-05): this dataset cannot yet support day-over-day index change (`daily_change`, `route_index`) — those fields are structurally present but `null` in the frontend/forecast samples, pending multi-day collection in Phase 2.

## E. Files Created

| File | Purpose |
|---|---|
| `airfare_clean.csv` | Final clean, flagged, feature-enriched dataset (500 rows) |
| `data_dictionary.csv` | Field-by-field definitions, types, examples, validation rules |
| `data_quality_report.csv` | Before/after summary metrics |
| `route_coverage.csv` | Per-route observation/airline/window/date coverage |
| `airline_coverage.csv` | Per-airline observation count, routes, median fare, availability rate |
| `source_coverage.csv` | Per-source coverage (single source in this sample) |
| `validation_report.csv` | Per-row validation status and reason |
| `duplicate_report.csv` | Duplicate-check summary + full row-level detail |
| `outlier_report.csv` | Per-row IQR outlier check against route baseline |
| `field_mapping.csv` | Current-field → standard-field mapping (1:1, no renames needed) |
| `airline_master_mapping.csv` | Raw → canonical airline name mapping |
| `postgresql_schema.sql` | `routes`, `airlines`, `sources`, `airfare_observations` tables + indexes; `index_values`/`anomalies`/`forecasts` stubbed as commented-out future tables |
| `anomaly_dataset.csv` | Simran's Phase-4 input: route, date, airline, lead_time, fare, route_median, deviation, availability, outlier_flag |
| `forecast_dataset.csv` | Priyal's time-series input: route-date grain, representative_fare (route_index/overall_index columns present but null — pending Phase 2/3) |
| `frontend_sample.json` | Khushi/Aditya's API contract sample — index_summary, route_summary, anomaly_sample, forecast_sample (index/ML fields explicitly null, not fabricated) |
| `PHASE_1_COMPLETION.md` | This report |

## F. Phase 1 Acceptance Checklist

- [x] Dataset audited
- [x] Schema documented
- [x] Data types standardized
- [x] Routes standardized
- [x] Airlines standardized
- [x] Booking windows validated
- [x] Fare components validated
- [x] Missing values analyzed
- [x] Availability standardized
- [x] Duplicates identified and handled
- [x] Outliers flagged
- [x] Invalid records documented
- [x] Route coverage analyzed
- [x] Airline coverage analyzed
- [x] Source coverage analyzed
- [x] Date/time features created
- [x] Clean dataset exported
- [x] Data quality report created
- [x] PostgreSQL schema prepared
- [x] APIx input prepared
- [x] AI-ready dataset prepared
- [x] Frontend JSON structure prepared

**All 21 checklist items pass on this sample.** That said — pass-on-sample ≠ pass-on-real-data:
this 500-row set was clearly built to be pipeline-friendly (single source, single fare class,
no true nulls). The pipeline code itself (`phase1_pipeline.py`) is written to actively catch and
report every category of problem the SIH task specifies, so it's ready to do real work once
Phase 2 scraping introduces messier, multi-source data — nothing here should be read as "the
real feed will also be this clean."

## G. What Jatin Should Do Next

- Approve (or send back) this Phase 1 output before anyone starts Phase 2 scraping.
- Finalize the **route weighting methodology** (currently `WEIGHT_PENDING` for all 6 routes) using DGCA passenger-traffic data, per the Phase 0 route-basket note.
- Define the **base period** for the index once multi-day data exists.
- Confirm median (not mean) as the representative-fare statistic, or override with reasoning.

## H. What Akshara Should Do Next

- Review `validation_report.csv` / `duplicate_report.csv` / `outlier_report.csv` as the audit trail of record.
- When Phase 2 scraping starts pulling from real, multiple sources, re-run `phase1_pipeline.py` against the new raw CSV — it's built to flag real messiness (missing values, fare mismatches, true duplicates, airline name variants) automatically.

## I. What Simran Should Prepare

- Build anomaly detection against `anomaly_dataset.csv` (route, date, airline, lead_time, total_fare, route_median, fare_deviation, availability, outlier_flag).
- Since `outlier_flag` found zero statistical outliers in this sample, Simran's model can't be validated against real anomalies yet — flag this as a Phase 2 dependency (need messier/longer real data, or inject synthetic test anomalies).

## J. What Priyal Should Prepare

- Review `forecast_dataset.csv` — the route-date grain and `representative_fare` column are ready, but this sample has **only one search date**, so there is no real time series yet.
- Priyal should confirm the schema (route, date, representative_fare, route_index, overall_index) is what the forecasting model needs, so Phase 2's daily collection cadence is designed around it from day one.

## K. What Khushi Should Prepare

- Build mock dashboard components against `frontend_sample.json`'s structure.
- All index/anomaly-score/forecast values are `null` by design — Khushi's UI should handle "pending" states for these fields rather than assuming they'll always be populated.

## L. What Aditya Should Implement

- Stand up `postgresql_schema.sql` (routes, airlines, sources, airfare_observations only — leave `index_values`/`anomalies`/`forecasts` commented out until their phases begin).
- Build the `airfare_clean.csv` → PostgreSQL ingestion script.
- Design the FastAPI contract around `frontend_sample.json`'s shape.

## M. Exact Phase 2 Starting Point

Phase 2 (automated collection / scraping) should begin **only after Jatin explicitly approves
this Phase 1 output**. When it does, the starting point is:

1. Point real scrapers (airline sites + OTAs) at the same 6 routes × 5 booking windows.
2. Feed raw scraped output through `phase1_pipeline.py` unchanged — it's already built to catch missing values, fare mismatches, true duplicates, and airline name variants that this clean sample didn't have.
3. Begin daily collection so `forecast_dataset.csv` accumulates a real time series and `route_index` / `overall_index` can eventually be computed.
4. Do **not** build final AI models (anomaly, forecasting) until enough real multi-day, multi-source data exists for meaningful training/validation.

---
*Do not proceed to Phase 2 until Jatin explicitly approves this Phase 1 completion.*
