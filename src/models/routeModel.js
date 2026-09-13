/**
 * Route Data Model
 * ────────────────
 * Derives a route-level summary from an array of normalized flights.
 * This sits between the Aviationstack service and the route controller.
 *
 * Data flows:
 *   NormalizedFlight[] → routeModel.normalizeRouteFlights() → RouteAnalysis
 */

/**
 * @typedef {Object} RouteAnalysis
 * @property {string}   origin           - Origin IATA code
 * @property {string}   destination      - Destination IATA code
 * @property {number}   totalFlights     - Count of flights found
 * @property {string[]} airlines         - Distinct airlines operating the route
 * @property {NormalizedFlight[]} flights - Full normalized flight list
 * @property {boolean}  hasData          - Whether any usable data is available
 */

/**
 * Builds a RouteAnalysis summary from normalized flights for a given corridor.
 *
 * @param {string} origin
 * @param {string} destination
 * @param {import('./flightModel').NormalizedFlight[]} flights
 * @returns {RouteAnalysis}
 */
export function buildRouteAnalysis(origin, destination, flights) {
  if (!flights || flights.length === 0) {
    return {
      origin,
      destination,
      totalFlights: 0,
      airlines: [],
      flights: [],
      hasData: false,
    };
  }

  const airlines = [
    ...new Set(flights.map((f) => f.airline).filter(Boolean)),
  ];

  return {
    origin,
    destination,
    totalFlights: flights.length,
    airlines,
    flights,
    hasData: true,
  };
}
