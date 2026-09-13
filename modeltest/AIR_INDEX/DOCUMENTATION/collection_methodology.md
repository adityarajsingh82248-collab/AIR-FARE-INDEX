# Phase 2 Collection Methodology

## Pipeline
Authorized source -> collector -> raw JSONL -> Phase 1-compatible normalization -> validation -> deduplication -> PostgreSQL.

## Source controls
A source is eligible for live collection only when its configuration status is `LIVE`, `permitted=true`, and a documented authorization/official-interface basis exists. Restricted or unverified sources remain disabled.

The implementation does not bypass CAPTCHA, authentication, bot controls, IP restrictions, robots rules, or rate limits. Retries are bounded and are not used to evade throttling. Request delay, timeout and max retries are configurable per source.

## Booking windows
T+1, T+7, T+15, T+30 and T+45 are calculated from the actual search date. Calendar dates are not hard-coded in collectors.

## Raw retention
Raw observations are append-only JSONL. Clean/validated outputs are separate. Source payloads, collection run IDs and source metadata are retained where available.

## Fare logic
Base fare, taxes and fees are preserved only when actually provided. Missing components remain NULL. Total fare is stored independently. Component consistency is validated with a documented tolerance.

## Availability
Standardized values are AVAILABLE, SOLD_OUT, MISSING and UNKNOWN. SOLD_OUT observations do not receive fabricated fares and are retained for availability analysis.

## Deduplication
A same-timestamp exact observation identity uses source, route, airline, travel date, search date/time, fare class and flight number when available. A later search for the same route/airline/travel date/lead-time is retained as an intraday repeat.

## Frequency
The scheduler is configured for a controlled daily run at 09:00. Actual frequency in production is whatever the deployed scheduler executes; the system does not claim "real-time" unless that cadence is actually operating.
