/**
 * Flight Controller
 * ──────────────────
 * Orchestrates the flow for raw flight queries.
 * Sits between the View layer (hooks) and the Aviationstack service.
 *
 * Responsibility:
 *   - Accept a route query from the application
 *   - Call the Aviationstack service
 *   - Return normalized flight data to the caller
 *   - Handle and re-throw errors with context
 *
 * Data flow:
 *   Hook → flightController.queryFlights() → aviationstackService → NormalizedFlight[]
 */

import { fetchFlights } from '../services/api/aviationstack.js';

/**
 * @typedef {Object} FlightQueryParams
 * @property {string} origin       - Origin IATA code (e.g. "DEL")
 * @property {string} destination  - Destination IATA code (e.g. "BOM")
 * @property {string} [flightDate] - Optional date YYYY-MM-DD
 */

/**
 * Queries flights for a given route from Aviationstack.
 *
 * @param {FlightQueryParams} params
 * @returns {Promise<import('../models/flightModel').NormalizedFlight[]>}
 * @throws {Error} if the query fails or params are invalid
 */
export async function queryFlights({ origin, destination, flightDate }) {
  if (!origin || !destination) {
    throw new Error('Origin and destination airport codes are required.');
  }

  if (origin === destination) {
    throw new Error('Origin and destination must be different airports.');
  }

  return fetchFlights({ origin, destination, flightDate });
}
