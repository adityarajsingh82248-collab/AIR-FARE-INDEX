/**
 * Index Service — Calculates the Air Fare Index from PostgreSQL dataset
 * ────────────────────────────────────────────────────────────────────────
 * Data source: airfare_observations table (68,400 records)
 *   - 8 airports: DEL, BOM, BLR, HYD, MAA, CCU, AMD, GOI
 *   - 56 directed routes
 *   - 5 airlines: Air India, Air India Express, Akasa Air, IndiGo, SpiceJet
 *   - 5 booking horizons: T+1, T+7, T+15, T+30, T+45
 *
 * Methodology (AIR_INDEX_V1):
 *   - Representative price: median of economy fares per (route, booking_window, period)
 *   - Outlier removal: IQR (multiplier: 1.5)
 *   - Aggregation: equal-weight across all 56 routes (1/56 each)
 *   - Base period: 2026-08 (earliest full observation month)
 *   - Base index: 100
 *   - Pre-computed index: market_horizon_index_t45_100 (T+45 baseline = 100)
 */

import { getAllObservations } from './observationService.js';

// ── CONFIG ─────────────────────────────────────────────────────────────────────

const BASE_PERIOD = '2026-08';
const BASE_INDEX_VALUE = 100.0;
const OUTLIER_MULTIPLIER = 1.5;
const MINIMUM_OBSERVATIONS = 3;
const QUALITY_HIGH = 0.85;
const QUALITY_MEDIUM = 0.60;
const METHODOLOGY_VERSION = 'AIR_INDEX_V1';
const BOOKING_WINDOWS = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];

// 56 directed routes — equal weight (1/56 each)
// Dynamically built from observations on first call
let _ROUTE_WEIGHTS = null;
let _VALID_ROUTES = null;

function ensureRouteWeights(observations) {
  if (_ROUTE_WEIGHTS) return;
  const routes = [...new Set(observations.map((o) => o.route).filter(Boolean))].sort();
  const weight = routes.length > 0 ? 1 / routes.length : 0;
  _ROUTE_WEIGHTS = {};
  routes.forEach((r) => { _ROUTE_WEIGHTS[r] = weight; });
  _VALID_ROUTES = new Set(routes);
}

// ── In-memory index cache ─────────────────────────────────────────────────────

let _indexCache = null;

// ── Pure math helpers ─────────────────────────────────────────────────────────

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mean(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function filterOutliersIQR(values, multiplier = 1.5) {
  if (values.length < 4) return { filtered: values, removedCount: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;
  const filtered = values.filter((v) => v >= lower && v <= upper);
  return { filtered, removedCount: values.length - filtered.length };
}

function fareSummary(values) {
  if (!values || values.length === 0) {
    return { representative_price: null, mean_price: null, median_price: null, minimum_price: null, maximum_price: null, observation_count: 0 };
  }
  const clean = values.filter((v) => v != null && isFinite(v) && v > 0);
  if (clean.length === 0) return { representative_price: null, mean_price: null, median_price: null, minimum_price: null, maximum_price: null, observation_count: 0 };
  const m = median(clean);
  return {
    representative_price: m,
    mean_price: mean(clean),
    median_price: m,
    minimum_price: Math.min(...clean),
    maximum_price: Math.max(...clean),
    observation_count: clean.length,
  };
}

function base100(currentPrice, basePrice) {
  if (currentPrice == null || basePrice == null) return null;
  if (currentPrice <= 0 || basePrice <= 0) return null;
  return (currentPrice / basePrice) * BASE_INDEX_VALUE;
}

function qualityScore(sampleCount, { routeCoverage = 1, outlierRate = 0 } = {}) {
  if (sampleCount < MINIMUM_OBSERVATIONS) return { quality_score: 0, quality_status: 'INSUFFICIENT_DATA' };
  let score = 1.0;
  score -= outlierRate * 0.2;
  score = Math.max(0, score);
  const status = score >= QUALITY_HIGH ? 'HIGH' : score >= QUALITY_MEDIUM ? 'MEDIUM' : 'LOW';
  return { quality_score: Math.round(score * 10000) / 10000, quality_status: status };
}

function toPeriod(dateStr) {
  return String(dateStr || '').slice(0, 7);
}

// ── Index calculation functions ──────────────────────────────────────────────

function calculateRouteIndices(observations) {
  // Group by (route, lead_label, period)
  const groups = {};
  for (const o of observations) {
    const route = (o.route || `${o.origin}-${o.destination}`).toUpperCase();
    const window = o.lead_label;
    const period = toPeriod(o.observation_date);
    if (!route || !window || !period) continue;
    const key = `${route}|||${window}|||${period}`;
    if (!groups[key]) groups[key] = { route, window, period, fares: [], precomputed: [] };
    if (o.total_fare_inr > 0) {
      groups[key].fares.push(o.total_fare_inr);
    }
    if (o.market_horizon_index_t45_100 != null) {
      groups[key].precomputed.push(o.market_horizon_index_t45_100);
    }
  }

  // First pass: collect base prices per (route, window)
  const basePrices = {};
  const seriesData = {};
  for (const [key, g] of Object.entries(groups)) {
    const { filtered, removedCount } = filterOutliersIQR(g.fares, OUTLIER_MULTIPLIER);
    const summary = fareSummary(filtered);
    if (summary.representative_price == null) continue;

    const seriesKey = `${g.route}|||${g.window}`;
    if (!seriesData[seriesKey]) seriesData[seriesKey] = {};
    seriesData[seriesKey][g.period] = {
      summary,
      originalCount: g.fares.length,
      removedCount,
      precomputed: g.precomputed,
    };
    if (g.period === BASE_PERIOD) {
      basePrices[seriesKey] = summary.representative_price;
    }
  }

  // Second pass: compute indices
  const out = [];
  for (const [seriesKey, periods] of Object.entries(seriesData)) {
    const [route, window] = seriesKey.split('|||');
    const basePrice = basePrices[seriesKey] || null;

    for (const [period, data] of Object.entries(periods)) {
      const { summary, originalCount, removedCount, precomputed } = data;
      const price = summary.representative_price;
      const idx = base100(price, basePrice);
      const outlierRate = removedCount / Math.max(originalCount, 1);
      const q = qualityScore(originalCount, { outlierRate });
      const status =
        basePrice == null ? 'MISSING_BASE'
        : originalCount < MINIMUM_OBSERVATIONS || idx == null ? 'INSUFFICIENT_DATA'
        : 'VALID';
      const weight = _ROUTE_WEIGHTS ? _ROUTE_WEIGHTS[route] || null : null;
      const precomputedIdx = precomputed.length > 0 ? mean(precomputed) : null;

      out.push({
        period,
        route,
        booking_window: window,
        representative_price: price,
        mean_price: summary.mean_price,
        median_price: summary.median_price,
        minimum_price: summary.minimum_price,
        maximum_price: summary.maximum_price,
        base_price: basePrice,
        index_value: idx,
        precomputed_index: precomputedIdx,
        sample_count: originalCount,
        outlier_count: removedCount,
        weight,
        methodology_version: METHODOLOGY_VERSION,
        status,
        ...q,
      });
    }
  }

  return out;
}

function calculateAirlineIndices(observations) {
  const groups = {};
  for (const o of observations) {
    const route = (o.route || `${o.origin}-${o.destination}`).toUpperCase();
    const window = o.lead_label;
    const airline = o.airline;
    const period = toPeriod(o.observation_date);
    if (!route || !window || !airline || !period) continue;
    const key = `${route}|||${window}|||${airline}|||${period}`;
    if (!groups[key]) groups[key] = { route, window, airline, period, fares: [] };
    if (o.total_fare_inr > 0) groups[key].fares.push(o.total_fare_inr);
  }

  const basePrices = {};
  const allRows = [];
  for (const [, g] of Object.entries(groups)) {
    const price = median(g.fares.filter((f) => f > 0));
    const baseKey = `${g.route}|||${g.window}|||${g.airline}`;
    if (g.period === BASE_PERIOD) basePrices[baseKey] = price;
    allRows.push({ ...g, price });
  }

  const out = [];
  for (const row of allRows) {
    const baseKey = `${row.route}|||${row.window}|||${row.airline}`;
    const basePrice = basePrices[baseKey] || null;
    const n = row.fares.length;
    const idx = n >= MINIMUM_OBSERVATIONS ? base100(row.price, basePrice) : null;
    const status =
      n >= MINIMUM_OBSERVATIONS && basePrice != null && idx != null ? 'VALID'
      : n >= MINIMUM_OBSERVATIONS && basePrice == null ? 'MISSING_BASE'
      : 'INSUFFICIENT_DATA';

    out.push({
      route: row.route,
      booking_window: row.window,
      airline: row.airline,
      period: row.period,
      representative_price: row.price,
      base_price: basePrice,
      index_value: idx,
      sample_count: n,
      status,
      methodology_version: METHODOLOGY_VERSION,
    });
  }
  return out;
}

function calculateOverallIndex(routeRows) {
  const groups = {};
  for (const r of routeRows) {
    const key = `${r.period}|||${r.booking_window}`;
    if (!groups[key]) groups[key] = { period: r.period, booking_window: r.booking_window, rows: [] };
    groups[key].rows.push(r);
  }

  const out = [];
  for (const [, g] of Object.entries(groups)) {
    const valid = g.rows.filter(
      (r) => r.index_value != null && r.route && _VALID_ROUTES && _VALID_ROUTES.has(r.route) && r.status === 'VALID'
    );
    if (valid.length === 0) continue;

    const totalWeight = valid.reduce((s, r) => s + (_ROUTE_WEIGHTS[r.route] || 0), 0);
    const value = totalWeight > 0
      ? valid.reduce((s, r) => s + (_ROUTE_WEIGHTS[r.route] || 0) * r.index_value, 0) / totalWeight
      : null;

    const coverage = _VALID_ROUTES ? valid.length / _VALID_ROUTES.size : 0;
    const sampleCount = valid.reduce((s, r) => s + (r.sample_count || 0), 0);
    const q = qualityScore(sampleCount, { routeCoverage: coverage });

    out.push({
      period: g.period,
      booking_window: g.booking_window,
      index_value: value,
      sample_count: sampleCount,
      route_coverage: coverage,
      routes_included: valid.length,
      ...q,
      methodology_version: METHODOLOGY_VERSION,
    });
  }

  return out.sort((a, b) => {
    if (a.period !== b.period) return a.period.localeCompare(b.period);
    return BOOKING_WINDOWS.indexOf(a.booking_window) - BOOKING_WINDOWS.indexOf(b.booking_window);
  });
}

function calculateHeadlineIndices(overallIndices) {
  const byPeriod = {};
  for (const r of overallIndices) {
    if (r.index_value == null) continue;
    if (!byPeriod[r.period]) byPeriod[r.period] = [];
    byPeriod[r.period].push(r);
  }

  return Object.entries(byPeriod)
    .map(([period, rows]) => {
      const value = rows.reduce((s, r) => s + r.index_value, 0) / rows.length;
      const coverage = rows.reduce((s, r) => s + (r.route_coverage || 0), 0) / rows.length;
      const quality = rows.reduce((s, r) => s + (r.quality_score || 0), 0) / rows.length;
      const sampleCount = rows.reduce((s, r) => s + (r.sample_count || 0), 0);
      const status = quality >= QUALITY_HIGH && coverage >= 0.8 ? 'HIGH' : quality >= QUALITY_MEDIUM ? 'MEDIUM' : 'LOW';

      return {
        period,
        booking_window: 'ALL',
        index_value: value,
        sample_count: sampleCount,
        route_coverage: coverage,
        quality_score: Math.round(quality * 10000) / 10000,
        quality_status: status,
        methodology_version: METHODOLOGY_VERSION,
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));
}

// ── Main build function (cached) ─────────────────────────────────────────────

/**
 * Builds the complete Air Fare Index from the PostgreSQL dataset.
 * Result is cached after first computation.
 * @returns {Promise<object>}
 */
export async function buildIndex() {
  if (_indexCache) return _indexCache;

  const observations = await getAllObservations();

  if (observations.length === 0) {
    console.warn('[IndexService] No observations found — returning empty index.');
    return {
      route_indices: [],
      overall_indices: [],
      headline_indices: [],
      airline_indices: [],
      methodology: { message: 'No data loaded yet.' },
    };
  }

  ensureRouteWeights(observations);

  const routeIndices = calculateRouteIndices(observations);
  const overallIndices = calculateOverallIndex(routeIndices);
  const headlineIndices = calculateHeadlineIndices(overallIndices);
  const airlineIndices = calculateAirlineIndices(observations);

  _indexCache = {
    route_indices: routeIndices,
    overall_indices: overallIndices,
    headline_indices: headlineIndices,
    airline_indices: airlineIndices,
    methodology: {
      methodology_version: METHODOLOGY_VERSION,
      base_period: BASE_PERIOD,
      base_index: BASE_INDEX_VALUE,
      representative_price_method: 'median',
      outlier_method: 'iqr',
      outlier_multiplier: OUTLIER_MULTIPLIER,
      booking_windows: BOOKING_WINDOWS,
      routes: _VALID_ROUTES ? [..._VALID_ROUTES].sort() : [],
      route_count: _VALID_ROUTES ? _VALID_ROUTES.size : 0,
      airport_count: 8,
      airline_count: 5,
      weights: 'equal (1/56 per route)',
      fare_definition: 'total_fare_inr',
      cabin: 'Economy',
      data_source: 'airfare_index_upgraded_8airports.csv → PostgreSQL airfare_observations',
      observation_count: observations.length,
    },
  };

  console.log(
    `[IndexService] Index built: ${routeIndices.length} route rows, ` +
    `${overallIndices.length} overall rows, ` +
    `${headlineIndices.length} headline rows, ` +
    `${airlineIndices.length} airline rows. ` +
    `Routes: ${_VALID_ROUTES ? _VALID_ROUTES.size : 0}`
  );

  return _indexCache;
}

/**
 * Clears the cached index (call if dataset is reloaded).
 */
export function invalidateCache() {
  _indexCache = null;
  _ROUTE_WEIGHTS = null;
  _VALID_ROUTES = null;
}

// ── Convenience accessors ────────────────────────────────────────────────────

export async function getLatestHeadlineIndex() {
  const { headline_indices } = await buildIndex();
  return headline_indices.length ? headline_indices[headline_indices.length - 1] : null;
}

export async function getRouteIndices({ route, booking_window } = {}) {
  let { route_indices } = await buildIndex();
  if (route) route_indices = route_indices.filter((r) => r.route === route.toUpperCase());
  if (booking_window) route_indices = route_indices.filter((r) => r.booking_window === booking_window);
  return route_indices;
}

export async function getAirlineIndices({ route, airline, booking_window } = {}) {
  let { airline_indices } = await buildIndex();
  if (route) airline_indices = airline_indices.filter((r) => r.route === route.toUpperCase());
  if (airline) airline_indices = airline_indices.filter((r) => r.airline === airline);
  if (booking_window) airline_indices = airline_indices.filter((r) => r.booking_window === booking_window);
  return airline_indices;
}
