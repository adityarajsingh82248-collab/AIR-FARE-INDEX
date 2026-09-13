# Phase 3 Data Sources

## Included development source
The bundled `PHASE_3/DATA/development_observations.csv` is deterministic **DEVELOPMENT_SYNTHETIC** data generated solely for mathematical and integration testing. It is not a public historical dataset, not live airfare, and not evidence of actual market prices.

## Public historical adapter
`PHASE_3/DATA_ADAPTERS/historical_dataset_adapter.py` supports a genuinely public EaseMyTrip/Kaggle-style Flight Price Prediction dataset. Adapter output is labelled `PUBLIC_HISTORICAL` and maps the source `Price` field to `total_fare` without inventing taxes or fees. The external dataset itself is not redistributed in this package; verify its current license/provenance before use.

## Phase 2 observations
For production, Phase 3 consumes validated Phase 2 PostgreSQL observations through `PHASE_3/INDEX_ENGINE/phase2_db_adapter.py`. Each observation should carry an explicit `data_mode`. Authorized NDC observations use `LIVE_NDC`; authorized permitted web collection uses `AUTHORIZED_SCRAPE`.

## API sandbox/test data
API sandbox/test responses are not treated as live AIR-INDEX observations. They may be used only for connector/API testing and must retain `API_TEST` provenance.

## Live boundary
No genuine live observations are included in the package. A real-time AIR-INDEX claim requires authorized Phase 2 live observations and their accumulated history.
