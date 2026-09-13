/**
 * Route Controller
 * ─────────────────
 * Orchestrates route-level data analysis.
 * Combines flight data from Aviationstack with route model processing.
 *
 * Data flow:
 *   Hook → routeController.getRouteAnalysis() → flightController → buildRouteAnalysis() → RouteAnalysis
 */

import { queryFlights } from './flightController.js';
import { buildRouteAnalysis } from '../models/routeModel.js';

/**
 * Fetches and processes route analysis for a given corridor.
 * Returns a RouteAnalysis object — hasData is false if no flights found.
 *
 * @param {Object} params
 * @param {string} params.origin       - Origin IATA code
 * @param {string} params.destination  - Destination IATA code
 * @param {string} [params.flightDate] - Optional date YYYY-MM-DD
 * @returns {Promise<import('../models/routeModel').RouteAnalysis>}
 */
export async function getRouteAnalysis({ origin, destination, flightDate }) {
  const flights = await queryFlights({ origin, destination, flightDate });
  return buildRouteAnalysis(origin, destination, flights);
}
