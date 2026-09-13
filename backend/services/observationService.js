/**
 * Observation Service (PostgreSQL)
 * ────────────────────────────────
 * Serves airfare observation data from the PostgreSQL `airfare_observations` table.
 * Source: airfare_index_upgraded_8airports.csv (68,400 records, 56 routes, 8 airports)
 *
 * Dataset facts:
 *   - 68,400 records
 *   - 8 airports: DEL, BOM, BLR, HYD, MAA, CCU, AMD, GOI
 *   - 56 directed routes (e.g. DEL-BOM and BOM-DEL are separate)
 *   - 5 airlines: Air India, Air India Express, Akasa Air, IndiGo, SpiceJet
 *   - 5 booking horizons: T+1, T+7, T+15, T+30, T+45
 *   - Cabin: Economy
 *   - Observation period: 2026-08-15 to 2026-09-13
 *   - Pre-computed index column: market_horizon_index_t45_100
 *   - Data type: synthetic_realistic
 */

import { query } from '../config/database.js';

// ── In-memory cache (loaded once, invalidated on import) ─────────────────────

let _cache = null;
let _summaryCache = null;

/**
 * Invalidates the in-memory cache (call after CSV re-import).
 */
export function invalidateObservationCache() {
  _cache = null;
  _summaryCache = null;
}

// ── Data access functions ──────────────────────────────────────────────────────

/**
 * Returns all observations from the database (cached after first load).
 * @returns {Promise<ObservationRecord[]>}
 */
export async function getAllObservations() {
  if (_cache !== null) return _cache;

  try {
    const result = await query(`
      SELECT
        id, observation_date::text, travel_date::text,
        lead_days, lead_label,
        origin, origin_city, destination, destination_city, route,
        airline, airline_iata, flight_number,
        departure_time, arrival_time, distance_km, stops,
        cabin, fare_bucket,
        base_fare_inr::float, taxes_inr::float, fees_inr::float, total_fare_inr::float,
        seats_available, aircraft_capacity,
        load_factor::float, demand_score::float,
        weekend_flag, holiday_flag, competition_count,
        currency, data_type,
        route_horizon_median_fare_inr::float,
        fare_vs_route_median_pct::float,
        market_median_fare_inr::float,
        t45_baseline_fare_inr::float,
        market_horizon_index_t45_100::float
      FROM airfare_observations
      ORDER BY observation_date, route, lead_days
    `);
    _cache = result.rows;
    console.log(`[ObservationService] Loaded ${_cache.length} observations from PostgreSQL.`);
    return _cache;
  } catch (err) {
    console.error('[ObservationService] Failed to load observations:', err.message);
    return [];
  }
}

/**
 * Returns observations filtered by criteria.
 * @param {{ route?: string, airline?: string, booking_window?: string, origin?: string, destination?: string }} filters
 */
export async function getObservations({ route, airline, booking_window, origin, destination } = {}) {
  const obs = await getAllObservations();

  let filtered = obs;
  if (route) {
    const r = route.toUpperCase();
    filtered = filtered.filter((o) => o.route === r);
  }
  if (origin) {
    filtered = filtered.filter((o) => o.origin === origin.toUpperCase());
  }
  if (destination) {
    filtered = filtered.filter((o) => o.destination === destination.toUpperCase());
  }
  if (airline) {
    filtered = filtered.filter((o) => o.airline === airline || o.airline_iata === airline);
  }
  if (booking_window) {
    filtered = filtered.filter((o) => o.lead_label === booking_window);
  }
  return filtered;
}

/**
 * Returns high-level summary statistics from the database.
 */
export async function getSummaryStats() {
  if (_summaryCache) return _summaryCache;

  try {
    const result = await query(`
      SELECT
        COUNT(*)::int                             AS total_observations,
        COUNT(DISTINCT route)::int                AS route_count,
        COUNT(DISTINCT airline)::int              AS airline_count,
        COUNT(DISTINCT origin)::int               AS airport_count,
        ROUND(AVG(total_fare_inr)::numeric, 2)    AS avg_fare,
        MIN(total_fare_inr)                        AS min_fare,
        MAX(total_fare_inr)                        AS max_fare,
        MIN(observation_date)::text               AS obs_from,
        MAX(observation_date)::text               AS obs_to,
        MIN(travel_date)::text                    AS travel_from,
        MAX(travel_date)::text                    AS travel_to
      FROM airfare_observations
    `);

    const routesResult = await query(`
      SELECT DISTINCT route FROM airfare_observations ORDER BY route
    `);

    const airlinesResult = await query(`
      SELECT DISTINCT airline, airline_iata FROM airfare_observations ORDER BY airline
    `);

    const airportsResult = await query(`
      SELECT DISTINCT origin AS code, origin_city AS city
      FROM airfare_observations
      ORDER BY origin
    `);

    const windowsResult = await query(`
      SELECT DISTINCT lead_label, MIN(lead_days) AS sort_order
      FROM airfare_observations
      GROUP BY lead_label
      ORDER BY sort_order
    `);

    const row = result.rows[0];
    _summaryCache = {
      totalObservations: row.total_observations,
      routeCount: row.route_count,
      airlineCount: row.airline_count,
      airportCount: row.airport_count,
      routes: routesResult.rows.map((r) => r.route),
      airlines: airlinesResult.rows.map((r) => r.airline),
      airports: airportsResult.rows,
      bookingWindows: windowsResult.rows.map((r) => r.lead_label),
      avgFare: parseFloat(row.avg_fare),
      minFare: parseFloat(row.min_fare),
      maxFare: parseFloat(row.max_fare),
      dateRange: {
        obsFrom: row.obs_from,
        obsTo: row.obs_to,
        travelFrom: row.travel_from,
        travelTo: row.travel_to,
      },
      dataMode: 'DEVELOPMENT_SYNTHETIC',
    };
    return _summaryCache;
  } catch (err) {
    console.error('[ObservationService] getSummaryStats error:', err.message);
    return {
      totalObservations: 0,
      routes: [],
      airlines: [],
      airports: [],
      bookingWindows: [],
      avgFare: null,
      minFare: null,
      maxFare: null,
      dateRange: {},
      dataMode: 'UNKNOWN',
    };
  }
}

/**
 * Returns paginated observations (for admin Data Explorer).
 */
export async function getPaginatedObservations({
  route,
  airline,
  booking_window,
  origin,
  destination,
  search = '',
  page = 1,
  limit = 25,
  sortField = 'observation_date',
  sortAsc = false,
} = {}) {
  const obs = await getObservations({ route, airline, booking_window, origin, destination });

  let filtered = obs;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (o) =>
        (o.route || '').toLowerCase().includes(q) ||
        (o.airline || '').toLowerCase().includes(q) ||
        (o.origin || '').toLowerCase().includes(q) ||
        (o.destination || '').toLowerCase().includes(q) ||
        (o.flight_number || '').toLowerCase().includes(q)
    );
  }

  // Sort
  const safeSort = ['observation_date', 'travel_date', 'total_fare_inr', 'route', 'airline', 'lead_label'];
  const field = safeSort.includes(sortField) ? sortField : 'observation_date';
  filtered = [...filtered].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();
    if (aVal < bVal) return sortAsc ? -1 : 1;
    if (aVal > bVal) return sortAsc ? 1 : -1;
    return 0;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * limit;
  const records = filtered.slice(start, start + limit);

  return { records, total, page: safePage, totalPages };
}

/**
 * Returns data quality statistics calculated from the actual dataset.
 */
export async function getDataQualityStats() {
  try {
    const result = await query(`
      SELECT
        COUNT(*)::int                                                      AS total_records,
        COUNT(DISTINCT route)::int                                        AS distinct_routes,
        COUNT(DISTINCT airline)::int                                      AS distinct_airlines,
        COUNT(DISTINCT origin)::int                                       AS distinct_origins,
        COUNT(*) FILTER (WHERE total_fare_inr IS NULL OR total_fare_inr <= 0)::int AS invalid_fares,
        COUNT(*) FILTER (WHERE lead_label IS NULL OR lead_label = '')::int AS missing_lead_label,
        COUNT(*) FILTER (WHERE origin IS NULL OR destination IS NULL)::int AS missing_airports,
        COUNT(*) FILTER (WHERE load_factor < 0 OR load_factor > 1)::int  AS invalid_load_factor,
        COUNT(*) FILTER (WHERE lead_days NOT IN (1,7,15,30,45))::int     AS invalid_lead_days,
        COUNT(*) FILTER (WHERE currency != 'INR' OR currency IS NULL)::int AS invalid_currency,
        ROUND(MIN(total_fare_inr)::numeric, 2)                           AS min_fare,
        ROUND(MAX(total_fare_inr)::numeric, 2)                           AS max_fare,
        ROUND(AVG(total_fare_inr)::numeric, 2)                           AS avg_fare,
        MIN(observation_date)::text                                       AS min_obs_date,
        MAX(observation_date)::text                                       AS max_obs_date
      FROM airfare_observations
    `);

    // Check duplicates: same route + airline + lead_label + travel_date + flight_number
    const dupResult = await query(`
      SELECT COUNT(*) AS dup_count FROM (
        SELECT route, airline, lead_label, travel_date, flight_number, COUNT(*) AS cnt
        FROM airfare_observations
        GROUP BY route, airline, lead_label, travel_date, flight_number
        HAVING COUNT(*) > 1
      ) t
    `);

    const row = result.rows[0];
    const dupCount = parseInt(dupResult.rows[0].dup_count);

    return {
      totalRecords: row.total_records,
      distinctRoutes: row.distinct_routes,
      distinctAirlines: row.distinct_airlines,
      distinctOrigins: row.distinct_origins,
      invalidFares: row.invalid_fares,
      missingLeadLabel: row.missing_lead_label,
      missingAirports: row.missing_airports,
      invalidLoadFactor: row.invalid_load_factor,
      invalidLeadDays: row.invalid_lead_days,
      invalidCurrency: row.invalid_currency,
      duplicateGroups: dupCount,
      fareRange: { min: parseFloat(row.min_fare), max: parseFloat(row.max_fare), avg: parseFloat(row.avg_fare) },
      dateRange: { from: row.min_obs_date, to: row.max_obs_date },
      overallStatus: row.invalid_fares === 0 && row.missing_airports === 0 ? 'PASS' : 'WARN',
    };
  } catch (err) {
    console.error('[ObservationService] getDataQualityStats error:', err.message);
    return null;
  }
}
