/**
 * Index Routes
 * ─────────────
 * Air Fare Index data endpoints (public, read-only).
 *
 * All data served from PostgreSQL airfare_observations table
 * sourced from airfare_index_upgraded_8airports.csv (68,400 records).
 *
 * GET /api/index/dashboard     → Dashboard KPIs + charts
 * GET /api/index/route         → Route-level fare + index data
 * GET /api/index/airlines      → Airline-level index + fare data
 * GET /api/index/observations  → Paginated raw observation records
 * GET /api/index/trends        → Trend time-series data
 * GET /api/index/airports      → 8 monitored airports (dynamic)
 * GET /api/index/routes        → 56 directed routes (dynamic)
 * GET /api/index/quality       → Data quality statistics
 * GET /api/index/comparison    → Multi-entity comparison data
 */

import express from 'express';
import {
  getDashboardSummary,
  getRouteIndex,
  getAirlineIndex,
  getObservations,
  getTrendData,
  getAirports,
  getAvailableRoutes,
  getQualityStats,
  getComparisonData,
  invalidateCacheHandler,
} from '../controllers/indexController.js';

const router = express.Router();

router.get('/dashboard', getDashboardSummary);
router.get('/route', getRouteIndex);
router.get('/airlines', getAirlineIndex);
router.get('/observations', getObservations);
router.get('/trends', getTrendData);
router.get('/airports', getAirports);
router.get('/routes', getAvailableRoutes);
router.get('/quality', getQualityStats);
router.get('/comparison', getComparisonData);
router.post('/cache/invalidate', invalidateCacheHandler);

export default router;
