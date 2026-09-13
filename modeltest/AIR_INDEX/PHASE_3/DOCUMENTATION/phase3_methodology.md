# Phase 3 Methodology

## Scope
Phase 3 calculates and persists an airfare price index from validated Phase 2 observations. It does not implement forecasting, anomaly-detection ML, recommendations, or a production dashboard.

## Representative fare
The primary representative fare is the **median** of valid INR `total_fare` observations. Mean, median, minimum, maximum and observation count are retained. IQR outlier filtering is configurable and does not imply that a high fare is invalid merely because it is expensive.

## Base-100 index
`I_t = (P_t / P_0) * 100`.
Examples: 4000/4000 = 100; 4800/4000 = 120; 4000/5000 = 80. Missing or non-positive base/current prices produce no index. The development base period is configurable (`2026-09`) and must be frozen as methodology metadata for a production release.

## Route index
For each configured route and booking window, valid observations are grouped by monthly search period. The representative fare is compared with the same route/window's base-period representative fare:
`RouteIndex_t = RepresentativeFare_t / RepresentativeFare_base * 100`.
Missing base, insufficient observations, invalid fares and missing observations receive explicit statuses.

## Booking windows
The five configured dimensions are **T+1, T+7, T+15, T+30 and T+45**. Each window is independently calculated; it is not just a display label.

## Headline AIR-INDEX
Each booking-window overall index is first calculated as a route-weighted average:
`I_window,t = Σ(w_i × I_i,window,t)`, using the configured prototype route weights and renormalizing only across valid routes. The headline for a period is the arithmetic mean of the available valid booking-window overall indices. This avoids `/index/latest` silently selecting T+1 while preserving booking-window analytics separately. Route coverage is reported with the headline quality metrics.

## Airline analytics
Airline indices are analytical route/window/airline groupings when the configured minimum sample size is met. They are **not** national aggregates and do not automatically receive official national weights.

## Weights
The package uses equal-weight **development/prototype** weights across the six representative routes. They are not official MoSPI/DGCA weights. Weights are validated to sum to 1 and stored as methodology data.

## Quality
Quality considers sample size, source/airline diversity, duplicate/outlier rates and route coverage. Thresholds are configurable. Partial route coverage is explicitly penalized; a one-route result cannot receive the same quality treatment as six-of-six coverage.

## Outliers
Default method: IQR with multiplier 1.5. The detection rule and treatment rule are configuration, not a blanket deletion policy. Legitimate high fares are not automatically discarded.

## Currency and fare definition
Initial domestic calculations use **INR** and `total_fare`. Base fare, taxes and fees remain separate where the Phase 2 schema provides them. Currency conversion is not performed implicitly.

## Data modes and provenance
The supported modes are `FIXTURE`, `PUBLIC_HISTORICAL`, `DEVELOPMENT_SYNTHETIC`, `API_TEST`, `LIVE_API`, `LIVE_NDC`, and `AUTHORIZED_SCRAPE`. The included complete mathematical test fixture is **DEVELOPMENT_SYNTHETIC** and is deterministic; it is not historical evidence and never represents live airfare.

The separate historical adapter can consume a genuinely public historical dataset and labels that adapter output `PUBLIC_HISTORICAL`. It does not convert the included synthetic fixture into historical data.

## Production data source
When `DATABASE_URL` is configured, PostgreSQL is the source of Phase 3 results for the API. If PostgreSQL is configured but unavailable, the API returns HTTP 503 rather than silently serving CSV fallback data. Without `DATABASE_URL`, the API may use the clearly labelled development synthetic fixture.

## Reproducibility and live-source dependency
The same observations plus the same methodology version/configuration produce reproducible calculations. Phase 3 can be validated using development/public historical data, while genuine live validation depends on authorized Phase 2 sources. No real-time AIR-INDEX claim is made from the included development data.
