/**
 * Index Controller
 * ─────────────────
 * HTTP handlers for all Air Fare Index data endpoints.
 *
 * Data source: PostgreSQL airfare_observations table (68,400 records)
 *   - 8 airports: DEL, BOM, BLR, HYD, MAA, CCU, AMD, GOI
 *   - 56 directed routes
 *   - 5 airlines: Air India, Air India Express, Akasa Air, IndiGo, SpiceJet
 *
 * Endpoints:
 *   GET /api/index/dashboard    → getDashboardSummary()
 *   GET /api/index/route        → getRouteIndex()
 *   GET /api/index/airlines     → getAirlineIndex()
 *   GET /api/index/observations → getObservations()
 *   GET /api/index/trends       → getTrendData()
 *   GET /api/index/airports     → getAirports()
 *   GET /api/index/routes       → getAvailableRoutes()
 *   GET /api/index/quality      → getQualityStats()
 *   GET /api/index/comparison   → getComparisonData()
 */

import {
  buildIndex,
  getLatestHeadlineIndex,
  getRouteIndices,
  getAirlineIndices,
  invalidateCache,
} from '../services/indexService.js';

import {
  getAllObservations,
  getSummaryStats,
  getPaginatedObservations,
  getDataQualityStats,
  invalidateObservationCache,
} from '../services/observationService.js';

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * GET /api/index/dashboard
 * Returns all data needed to populate Dashboard KPI cards and charts.
 * Supports query filters: origin, destination, airline, window
 */
export async function getDashboardSummary(req, res) {
  try {
    const { origin, destination, airline, window: bookingWindow } = req.query;

    const [stats, headline, indexData, obs] = await Promise.all([
      getSummaryStats(),
      getLatestHeadlineIndex(),
      buildIndex(),
      getAllObservations(),
    ]);

    const { route_indices, airline_indices, overall_indices } = indexData;

    // Filter observations based on user selections
    let filteredObs = obs;
    if (origin && origin !== 'ALL') {
      filteredObs = filteredObs.filter((o) => o.origin === origin);
    }
    if (destination && destination !== 'ALL') {
      filteredObs = filteredObs.filter((o) => o.destination === destination);
    }
    if (airline && airline !== 'ALL' && airline !== 'all') {
      const CODE_MAP = {
        '6E': 'IndiGo',
        'AI': 'Air India',
        'IX': 'Air India Express',
        'QP': 'Akasa Air',
        'SG': 'SpiceJet',
      };
      const targetName = CODE_MAP[airline] || airline;
      filteredObs = filteredObs.filter((o) => o.airline === targetName || o.carrier_code === airline);
    }
    const normalizedWindow = bookingWindow ? bookingWindow.replace(' ', '+') : null;
    if (normalizedWindow && normalizedWindow !== 'ALL' && normalizedWindow !== '30D' && normalizedWindow !== '90D' && normalizedWindow !== 'FY') {
      filteredObs = filteredObs.filter((o) => o.lead_label === normalizedWindow);
    }

    const allFares = filteredObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
    const avgFare = allFares.length ? allFares.reduce((s, v) => s + v, 0) / allFares.length : null;
    const minFare = allFares.length ? Math.min(...allFares) : null;
    const maxFare = allFares.length ? Math.max(...allFares) : null;

    const loadFactors = filteredObs.map((o) => o.load_factor).filter((f) => f != null);
    const avgLoadFactor = loadFactors.length ? loadFactors.reduce((s, v) => s + v, 0) / loadFactors.length : null;

    const routesInFiltered = [...new Set(filteredObs.map((o) => o.route))].sort();
    const airlinesInFiltered = [...new Set(filteredObs.map((o) => o.airline))].sort();
    const airportsInFiltered = [...new Set([...filteredObs.map((o) => o.origin), ...filteredObs.map((o) => o.destination)])].sort();

    // ── Route breakdown: avg fare + index per route ────────────────────────
    const routeBreakdown = routesInFiltered.map((route) => {
      const routeObs = filteredObs.filter((o) => o.route === route);
      const routeRows = route_indices.filter((r) => r.route === route && r.status === 'VALID');
      const fares = routeObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
      const rAvgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      const rAvgIndex = routeRows.length
        ? routeRows.reduce((s, r) => s + (r.index_value || 0), 0) / routeRows.length
        : null;
      return {
        route,
        avgFare: rAvgFare,
        avgIndex: rAvgIndex,
        sampleCount: routeObs.length,
        origin: route.split('-')[0],
        destination: route.split('-')[1],
      };
    }).filter((r) => r.avgFare != null);

    // ── Airline breakdown: avg fare per carrier ────────────────────────────
    const airlineBreakdown = airlinesInFiltered.map((aName) => {
      const aFares = filteredObs.filter((o) => o.airline === aName).map((o) => o.total_fare_inr);
      const aAvgFare = aFares.length
        ? aFares.reduce((s, v) => s + v, 0) / aFares.length
        : null;
      const routeSet = new Set(filteredObs.filter((o) => o.airline === aName).map((o) => o.route));
      const aAvgIndex = (() => {
        const rows = airline_indices.filter((r) => r.airline === aName && r.status === 'VALID');
        return rows.length ? rows.reduce((s, r) => s + (r.index_value || 0), 0) / rows.length : null;
      })();
      return { airline: aName, avgFare: aAvgFare, avgIndex: aAvgIndex, obsCount: aFares.length, routeCount: routeSet.size };
    }).filter((a) => a.avgFare != null);

    // ── Fare by booking window ─────────────────────────────────────────────
    const bookingWindowsList = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'];
    const fareByBookingWindow = bookingWindowsList.map((bw) => {
      const bwObs = filteredObs.filter((o) => o.lead_label === bw);
      const fares = bwObs.map((o) => o.total_fare_inr);
      const bwAvgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      const overallRow = overall_indices.find((r) => r.booking_window === bw);
      return {
        booking_window: bw,
        avgFare: bwAvgFare,
        index_value: overallRow?.index_value ?? null,
        sample_count: bwObs.length,
      };
    }).filter((r) => r.avgFare != null);

    // ── Fare distribution histogram ────────────────────────────────────────
    const fareDistribution = buildFareHistogram(allFares);

    // Filtered headline calculation if specific corridor or airline is selected
    let effectiveHeadline = headline;
    if (routesInFiltered.length === 1) {
      const rRow = route_indices.find((r) => r.route === routesInFiltered[0] && r.period === '2026-09');
      if (rRow) {
        effectiveHeadline = {
          period: '2026-09',
          booking_window: bookingWindow || 'ALL',
          index_value: rRow.index_value,
          sample_count: filteredObs.length,
          route_coverage: 1,
          quality_score: rRow.quality_score || 1,
          quality_status: rRow.quality_status || 'HIGH',
          methodology_version: 'AIR_INDEX_V1',
        };
      }
    }

    res.json({
      status: 'success',
      data: {
        afiHeadline: effectiveHeadline,
        avgFare,
        avgLoadFactor,
        minFare,
        maxFare,
        observationCount: filteredObs.length,
        routeCount: routesInFiltered.length,
        airlineCount: airlinesInFiltered.length,
        airportCount: airportsInFiltered.length,
        bookingWindowCount: fareByBookingWindow.length,
        dateRange: stats.dateRange,
        dataMode: stats.dataMode,
        airports: airportsInFiltered,
        routes: routesInFiltered,
        airlines: airlinesInFiltered,
        bookingWindows: bookingWindowsList,
        routeBreakdown,
        airlineBreakdown,
        fareByBookingWindow,
        fareDistribution,
      },
    });
  } catch (err) {
    console.error('[IndexController] getDashboardSummary error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to compute index data.' });
  }
}

// ── Route ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/index/route?route=DEL-BOM&booking_window=T+7
 */
export async function getRouteIndex(req, res) {
  try {
    const { route, booking_window } = req.query;

    if (!route) {
      return res.status(400).json({ status: 'error', message: 'route query parameter is required.' });
    }

    const routeUpper = route.toUpperCase();
    const [rows, obs] = await Promise.all([
      getRouteIndices({ route: routeUpper, booking_window }),
      getAllObservations().then((all) => all.filter((o) => o.route === routeUpper)),
    ]);

    if (obs.length === 0 && rows.length === 0) {
      return res.json({ status: 'success', data: null, message: `No data found for route ${routeUpper}` });
    }

    // Per-airline breakdown
    const airlineSet = [...new Set(obs.map((o) => o.airline))];
    const airlineBreakdown = airlineSet.map((airline) => {
      const af = obs.filter((o) => o.airline === airline).map((o) => o.total_fare_inr);
      const avgFare = af.length ? af.reduce((s, v) => s + v, 0) / af.length : null;
      const loadFactors = obs.filter((o) => o.airline === airline).map((o) => o.load_factor).filter((f) => f != null);
      const avgLoadFactor = loadFactors.length ? loadFactors.reduce((s, v) => s + v, 0) / loadFactors.length : null;
      return { airline, avgFare, sampleCount: af.length, avgLoadFactor };
    }).filter((a) => a.avgFare != null);

    // Fare by booking window
    const bookingWindowSeries = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => {
      const bwRows = rows.filter((r) => r.booking_window === bw);
      const bwObs = obs.filter((o) => o.lead_label === bw);
      const indexRow = bwRows.find((r) => r.status === 'VALID');
      const fares = bwObs.map((o) => o.total_fare_inr);
      const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      const precomputedIndexValues = bwObs.map((o) => o.market_horizon_index_t45_100).filter((v) => v != null);
      const avgPrecomputedIndex = precomputedIndexValues.length
        ? precomputedIndexValues.reduce((s, v) => s + v, 0) / precomputedIndexValues.length
        : null;
      return {
        booking_window: bw,
        avgFare,
        index_value: indexRow?.index_value ?? null,
        representative_price: indexRow?.representative_price ?? null,
        precomputed_index: avgPrecomputedIndex,
        sample_count: bwObs.length,
      };
    }).filter((r) => r.avgFare != null);

    const allFares = obs.map((o) => o.total_fare_inr).filter((f) => f > 0);
    const avgFare = allFares.length ? allFares.reduce((s, v) => s + v, 0) / allFares.length : null;

    const validRows = rows.filter((r) => r.status === 'VALID');
    const indexValue = validRows.length
      ? validRows.reduce((s, r) => s + r.index_value, 0) / validRows.length
      : null;

    // Additional stats
    const loadFactors = obs.map((o) => o.load_factor).filter((f) => f != null);
    const avgLoadFactor = loadFactors.length ? loadFactors.reduce((s, v) => s + v, 0) / loadFactors.length : null;
    const demandScores = obs.map((o) => o.demand_score).filter((f) => f != null);
    const avgDemandScore = demandScores.length ? demandScores.reduce((s, v) => s + v, 0) / demandScores.length : null;
    const compCounts = obs.map((o) => o.competition_count).filter((f) => f != null);
    const avgCompetition = compCounts.length ? compCounts.reduce((s, v) => s + v, 0) / compCounts.length : null;

    res.json({
      status: 'success',
      data: {
        route: routeUpper,
        origin: routeUpper.split('-')[0],
        destination: routeUpper.split('-')[1],
        index_value: indexValue,
        avgFare,
        minFare: allFares.length ? Math.min(...allFares) : null,
        maxFare: allFares.length ? Math.max(...allFares) : null,
        totalObservations: obs.length,
        avgLoadFactor,
        avgDemandScore,
        avgCompetition,
        airlineBreakdown,
        bookingWindowSeries,
        routeIndexRows: rows,
      },
    });
  } catch (err) {
    console.error('[IndexController] getRouteIndex error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to compute route index.' });
  }
}

// ── Airlines ──────────────────────────────────────────────────────────────────

/**
 * GET /api/index/airlines?airline=IndiGo&route=DEL-BOM&booking_window=T+7
 */
export async function getAirlineIndex(req, res) {
  try {
    const { airline, route, booking_window } = req.query;

    const [airlineRows, obs] = await Promise.all([
      getAirlineIndices({ airline, route, booking_window }),
      getAllObservations(),
    ]);

    const airlineObs = airline ? obs.filter((o) => o.airline === airline) : obs;
    const allAirlines = [...new Set(obs.map((o) => o.airline))].sort();

    const airlineSummaries = await Promise.all(allAirlines.map(async (a) => {
      const aObs = obs.filter((o) => o.airline === a);
      const fares = aObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
      const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      const routes = new Set(aObs.map((o) => o.route));
      const aRows = (await getAirlineIndices({ airline: a })).filter((r) => r.status === 'VALID');
      const avgIndex = aRows.length
        ? aRows.reduce((s, r) => s + r.index_value, 0) / aRows.length
        : null;
      const loadFactors = aObs.map((o) => o.load_factor).filter((f) => f != null);
      const avgLoadFactor = loadFactors.length
        ? loadFactors.reduce((s, v) => s + v, 0) / loadFactors.length
        : null;
      return { airline: a, avgFare, avgIndex, routeCount: routes.size, sampleCount: fares.length, avgLoadFactor };
    }));

    // Per-route breakdown for selected airline
    const routeBreakdown = [];
    if (airline) {
      const routes = [...new Set(airlineObs.map((o) => o.route))];
      for (const r of routes) {
        const routeObs = airlineObs.filter((o) => o.route === r);
        const fares = routeObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
        const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
        routeBreakdown.push({ route: r, avgFare, sampleCount: routeObs.length });
      }
      routeBreakdown.sort((a, b) => b.sampleCount - a.sampleCount);
    }

    // Booking window breakdown for selected airline
    const bookingWindowBreakdown = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => {
      const bwObs = airlineObs.filter((o) => o.lead_label === bw);
      const fares = bwObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
      const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      return { booking_window: bw, avgFare, sample_count: bwObs.length };
    }).filter((r) => r.avgFare != null);

    const selectedFares = airlineObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
    const selectedAvgFare = selectedFares.length
      ? selectedFares.reduce((s, v) => s + v, 0) / selectedFares.length
      : null;

    res.json({
      status: 'success',
      data: {
        selectedAirline: airline || null,
        selectedAvgFare,
        selectedObservationCount: airlineObs.length,
        selectedRouteCount: new Set(airlineObs.map((o) => o.route)).size,
        airlineSummaries,
        routeBreakdown,
        bookingWindowBreakdown,
        airlineIndexRows: airlineRows,
      },
    });
  } catch (err) {
    console.error('[IndexController] getAirlineIndex error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to compute airline index.' });
  }
}

// ── Observations ──────────────────────────────────────────────────────────────

/**
 * GET /api/index/observations?route=DEL-BOM&airline=IndiGo&page=1&limit=25
 */
export async function getObservations(req, res) {
  try {
    const {
      route, airline, booking_window, origin, destination,
      search = '', page = 1, limit = 25,
      sortField = 'observation_date', sortAsc = 'false',
    } = req.query;

    const result = await getPaginatedObservations({
      route, airline, booking_window, origin, destination, search,
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10), 100), // cap at 100
      sortField,
      sortAsc: sortAsc === 'true',
    });

    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('[IndexController] getObservations error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to retrieve observations.' });
  }
}

// ── Trends ────────────────────────────────────────────────────────────────────

/**
 * GET /api/index/trends
 */
export async function getTrendData(req, res) {
  try {
    const [obs, indexData] = await Promise.all([
      getAllObservations(),
      buildIndex(),
    ]);
    const { overall_indices } = indexData;

    // Booking window fare/index series
    const bookingWindowTrend = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => {
      const bwObs = obs.filter((o) => o.lead_label === bw);
      const fares = bwObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
      const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      const indexRow = overall_indices.find((r) => r.booking_window === bw);
      return { label: bw, avgFare, index_value: indexRow?.index_value ?? null, sample_count: bwObs.length };
    }).filter((r) => r.avgFare != null);

    // Per-route trend
    const routeTrend = [...new Set(obs.map((o) => o.route))].sort().map((route) => {
      const routeObs = obs.filter((o) => o.route === route);
      const fares = routeObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
      const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      return { route, avgFare, sampleCount: routeObs.length };
    }).filter((r) => r.avgFare != null);

    // Per-observation-date trend (daily)
    const byDate = {};
    for (const o of obs) {
      const d = o.observation_date;
      if (!byDate[d]) byDate[d] = { fares: [], count: 0 };
      if (o.total_fare_inr > 0) byDate[d].fares.push(o.total_fare_inr);
      byDate[d].count++;
    }
    const dailyTrend = Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        const avgFare = v.fares.length ? v.fares.reduce((s, x) => s + x, 0) / v.fares.length : null;
        return { date, avgFare, count: v.count };
      });

    const allFares = obs.map((o) => o.total_fare_inr).filter((f) => f > 0);
    const trough = bookingWindowTrend.reduce((min, r) => (!min || r.avgFare < min.avgFare ? r : min), null);
    const peak = bookingWindowTrend.reduce((max, r) => (!max || r.avgFare > max.avgFare ? r : max), null);

    res.json({
      status: 'success',
      data: {
        periods: [...new Set(obs.map((o) => String(o.observation_date || '').slice(0, 7)))].sort(),
        bookingWindowTrend,
        routeTrend,
        dailyTrend,
        summary: {
          peakBookingWindow: peak?.label ?? null,
          troughBookingWindow: trough?.label ?? null,
          totalObservations: obs.length,
          overallAvgFare: allFares.length ? allFares.reduce((s, v) => s + v, 0) / allFares.length : null,
        },
      },
    });
  } catch (err) {
    console.error('[IndexController] getTrendData error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to compute trend data.' });
  }
}

// ── Airports ──────────────────────────────────────────────────────────────────

/**
 * GET /api/index/airports
 * Returns the 8 monitored airports dynamically from the dataset.
 */
export async function getAirports(req, res) {
  try {
    const stats = await getSummaryStats();
    res.json({ status: 'success', data: { airports: stats.airports || [] } });
  } catch (err) {
    console.error('[IndexController] getAirports error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get airports.' });
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/index/routes?origin=DEL
 * Returns all 56 directed routes dynamically from the dataset.
 */
export async function getAvailableRoutes(req, res) {
  try {
    const { origin, destination } = req.query;
    const obs = await getAllObservations();

    let routePairs = [...new Set(obs.map((o) => o.route))].sort();
    if (origin) routePairs = routePairs.filter((r) => r.startsWith(origin.toUpperCase() + '-'));
    if (destination) routePairs = routePairs.filter((r) => r.endsWith('-' + destination.toUpperCase()));

    // Enrich with stats
    const enriched = routePairs.map((route) => {
      const routeObs = obs.filter((o) => o.route === route);
      const fares = routeObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
      const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
      const airlines = [...new Set(routeObs.map((o) => o.airline))];
      return {
        route,
        origin: route.split('-')[0],
        destination: route.split('-')[1],
        sampleCount: routeObs.length,
        avgFare,
        airlines,
        airlineCount: airlines.length,
      };
    });

    res.json({ status: 'success', data: { routes: enriched, total: enriched.length } });
  } catch (err) {
    console.error('[IndexController] getAvailableRoutes error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to get routes.' });
  }
}

// ── Quality ───────────────────────────────────────────────────────────────────

/**
 * GET /api/index/quality
 * Returns real data quality statistics from the dataset.
 */
export async function getQualityStats(req, res) {
  try {
    const qualityData = await getDataQualityStats();
    if (!qualityData) {
      return res.json({ status: 'success', data: null, message: 'Quality data not available.' });
    }
    res.json({ status: 'success', data: qualityData });
  } catch (err) {
    console.error('[IndexController] getQualityStats error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to compute quality stats.' });
  }
}

// ── Comparison ────────────────────────────────────────────────────────────────

/**
 * GET /api/index/comparison?routes=DEL-BOM,BOM-DEL,DEL-BLR&type=route
 * Returns multi-entity comparison data.
 */
export async function getComparisonData(req, res) {
  try {
    const { routes: routesParam, airlines: airlinesParam } = req.query;

    const obs = await getAllObservations();
    const { route_indices, airline_indices } = await buildIndex();

    const result = {};

    if (routesParam) {
      const requestedRoutes = routesParam.split(',').map((r) => r.trim().toUpperCase()).slice(0, 6);
      result.routes = requestedRoutes.map((route) => {
        const routeObs = obs.filter((o) => o.route === route);
        const fares = routeObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
        const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
        const validRows = route_indices.filter((r) => r.route === route && r.status === 'VALID');
        const avgIndex = validRows.length
          ? validRows.reduce((s, r) => s + r.index_value, 0) / validRows.length
          : null;
        const bookingWindowSeries = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => {
          const bwObs = routeObs.filter((o) => o.lead_label === bw);
          const bwFares = bwObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
          return {
            booking_window: bw,
            avgFare: bwFares.length ? bwFares.reduce((s, v) => s + v, 0) / bwFares.length : null,
            sample_count: bwObs.length,
          };
        });
        return {
          route,
          origin: route.split('-')[0],
          destination: route.split('-')[1],
          avgFare,
          avgIndex,
          sampleCount: routeObs.length,
          minFare: fares.length ? Math.min(...fares) : null,
          maxFare: fares.length ? Math.max(...fares) : null,
          bookingWindowSeries,
        };
      });
    }

    if (airlinesParam) {
      const requestedAirlines = airlinesParam.split(',').map((a) => a.trim()).slice(0, 6);
      result.airlines = requestedAirlines.map((airline) => {
        const airlineObs = obs.filter((o) => o.airline === airline);
        const fares = airlineObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
        const avgFare = fares.length ? fares.reduce((s, v) => s + v, 0) / fares.length : null;
        const validRows = airline_indices.filter((r) => r.airline === airline && r.status === 'VALID');
        const avgIndex = validRows.length
          ? validRows.reduce((s, r) => s + r.index_value, 0) / validRows.length
          : null;
        const bookingWindowSeries = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => {
          const bwObs = airlineObs.filter((o) => o.lead_label === bw);
          const bwFares = bwObs.map((o) => o.total_fare_inr).filter((f) => f > 0);
          return {
            booking_window: bw,
            avgFare: bwFares.length ? bwFares.reduce((s, v) => s + v, 0) / bwFares.length : null,
            sample_count: bwObs.length,
          };
        });
        return {
          airline,
          avgFare,
          avgIndex,
          sampleCount: fares.length,
          routeCount: new Set(airlineObs.map((o) => o.route)).size,
          minFare: fares.length ? Math.min(...fares) : null,
          maxFare: fares.length ? Math.max(...fares) : null,
          bookingWindowSeries,
        };
      });
    }

    res.json({ status: 'success', data: result });
  } catch (err) {
    console.error('[IndexController] getComparisonData error:', err);
    res.status(500).json({ status: 'error', message: 'Failed to compute comparison data.' });
  }
}

// ── Cache invalidation (admin) ─────────────────────────────────────────────────

/**
 * POST /api/index/cache/invalidate
 */
export async function invalidateCacheHandler(req, res) {
  invalidateCache();
  invalidateObservationCache();
  res.json({ status: 'success', message: 'Index cache invalidated.' });
}

// ── Helper ────────────────────────────────────────────────────────────────────

function buildFareHistogram(fares, buckets = 8) {
  if (!fares || fares.length === 0) return [];
  const min = Math.min(...fares);
  const max = Math.max(...fares);
  const step = (max - min) / buckets;
  if (step === 0) return [{ range: `₹${Math.round(min)}`, count: fares.length }];

  const result = [];
  for (let i = 0; i < buckets; i++) {
    const lo = min + i * step;
    const hi = min + (i + 1) * step;
    const count = fares.filter((f) => f >= lo && (i === buckets - 1 ? f <= hi : f < hi)).length;
    result.push({
      range: `₹${Math.round(lo / 1000)}k–${Math.round(hi / 1000)}k`,
      count,
    });
  }
  return result.filter((b) => b.count > 0);
}
