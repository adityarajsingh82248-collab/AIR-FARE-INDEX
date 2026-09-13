/**
 * Flight Data Model
 * ─────────────────
 * Responsible for normalizing raw Aviationstack API responses
 * into a clean, consistent shape used throughout the application.
 *
 * Data flows:
 *   Aviationstack API → flightModel.normalizeFlightResponse() → Application
 */

/**
 * @typedef {Object} NormalizedFlight
 * @property {string} flightNumber      - e.g. "6E 2145"
 * @property {string} airline           - Airline name
 * @property {string} iataCode          - Airline IATA code e.g. "6E"
 * @property {string} origin            - Origin IATA airport code
 * @property {string} destination       - Destination IATA airport code
 * @property {string|null} departureTime - ISO departure time or null
 * @property {string|null} arrivalTime  - ISO arrival time or null
 * @property {string} status            - Flight status string
 * @property {string|null} aircraft     - Aircraft ICAO type or null
 */

/**
 * Normalizes a single flight object from Aviationstack API response.
 * Returns null if the data is insufficient to form a valid flight record.
 *
 * @param {Object} rawFlight - A single flight object from Aviationstack data[]
 * @returns {NormalizedFlight|null}
 */
export function normalizeFlight(rawFlight) {
  if (!rawFlight) return null;

  const flightNumber =
    rawFlight.flight?.iata ||
    rawFlight.flight?.icao ||
    null;

  const iataCode =
    rawFlight.airline?.iata ||
    rawFlight.airline?.icao ||
    null;

  const airlineName = rawFlight.airline?.name || null;

  const origin =
    rawFlight.departure?.iata ||
    rawFlight.departure?.icao ||
    null;

  const destination =
    rawFlight.arrival?.iata ||
    rawFlight.arrival?.icao ||
    null;

  // Require at minimum a flight number, origin and destination
  if (!flightNumber || !origin || !destination) return null;

  return {
    flightNumber,
    airline: airlineName,
    iataCode,
    origin,
    destination,
    departureTime: rawFlight.departure?.scheduled || null,
    arrivalTime: rawFlight.arrival?.scheduled || null,
    status: rawFlight.flight_status || 'unknown',
    aircraft: rawFlight.aircraft?.icao || null,
  };
}

/**
 * Normalizes the full Aviationstack API response envelope.
 * Returns an array of normalized flights (empty if none valid).
 *
 * @param {Object} rawResponse - Full Aviationstack API response object
 * @returns {NormalizedFlight[]}
 */
export function normalizeFlightResponse(rawResponse) {
  if (!rawResponse || !Array.isArray(rawResponse.data)) {
    return [];
  }

  return rawResponse.data
    .map(normalizeFlight)
    .filter(Boolean); // Remove nulls
}
