# Phase 2 Schema Documentation

Phase 2 extends the Phase 1 structure with `collection_runs`, `collection_logs`, observation lineage fields, and additional indexes.

## Core tables
- `routes`
- `airlines`
- `sources`
- `airfare_observations`
- `collection_runs`
- `collection_logs`

## Observation lineage
`collection_run_id`, `source_url`, `collector_name`, `currency`, and optional flight metadata are retained when available.

## Availability
Phase 2 standardizes to `AVAILABLE`, `SOLD_OUT`, `MISSING`, `UNKNOWN`. Legacy Phase 1 values can be normalized during ingestion; raw source values remain available in raw storage.

## Indexing
Useful indexes cover route/date, route, airline, source, travel date, search date, booking window and collection timestamp.

## Route weights
`route_weight` remains NULL/`WEIGHT_PENDING` until an official methodology or approved source is available. No Phase 3 index tables are created here.
