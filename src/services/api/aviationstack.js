/**
 * Aviationstack API Service
 * ──────────────────────────
 * Communicates with Aviationstack through the server-side Vite proxy.
 * The API key is NEVER present in this file — it is injected by the proxy.
 *
 * Proxy route: /api/aviationstack  →  https://api.aviationstack.com/v1
 * (configured in vite.config.js)
 *
 * Data flow:
 *   Controller → aviationstackService → /api/aviationstack proxy → Aviationstack API
 *                                    ← raw response
 *               normalizeFlightResponse()
 *                                    → NormalizedFlight[]
 */

import { AVIATIONSTACK_PROXY_BASE } from '../../config/aviationstack.js';
import { normalizeFlightResponse } from '../../models/flightModel.js';

/**
 * @typedef {Object} FlightQueryParams
 * @property {string} origin       - Origin IATA airport code (e.g. "DEL")
 * @property {string} destination  - Destination IATA airport code (e.g. "BOM")
 * @property {string} [flightDate] - Optional date string YYYY-MM-DD
 */

/**
 * Fetches flights for a given origin–destination pair from Aviationstack.
 * Returns normalized flight data. Throws on API or network error.
 *
 * @param {FlightQueryParams} params
 * @returns {Promise<import('../../models/flightModel').NormalizedFlight[]>}
 */
export async function fetchFlights({ origin, destination, flightDate }) {
  if (!origin || !destination) {
    throw new Error('Origin and destination are required to fetch flights.');
  }

  // Build query string — API key is NOT added here (proxy injects it server-side)
  const params = new URLSearchParams({
    dep_iata: origin,
    arr_iata: destination,
  });

  if (flightDate) {
    params.set('flight_date', flightDate);
  }

  const url = `${AVIATIONSTACK_PROXY_BASE}/flights?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Aviationstack API error: ${response.status} ${response.statusText}`
    );
  }

  const rawData = await response.json();

  // Check for Aviationstack-level errors
  if (rawData.error) {
    throw new Error(
      `Aviationstack error: ${rawData.error.message || JSON.stringify(rawData.error)}`
    );
  }

  return normalizeFlightResponse(rawData);
}
