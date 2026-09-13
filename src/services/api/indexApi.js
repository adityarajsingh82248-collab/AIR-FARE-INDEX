/**
 * Index API Client
 * ─────────────────
 * Frontend service that communicates with the backend /api/index/* endpoints.
 * All requests go through the Vite dev proxy → backend on port 5000.
 *
 * Data source: PostgreSQL airfare_observations (68,400 records, 56 routes, 8 airports, 5 airlines)
 *
 * Data flow:
 *   React Hook → indexApi → /api/index/* → indexController → indexService → PostgreSQL
 */

const BASE = '/api/index';

/**
 * Shared fetch wrapper with consistent error handling.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function apiFetch(url) {
  const response = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText} (${url})`);
  }

  const json = await response.json();

  if (json.status === 'error') {
    throw new Error(json.message || 'Unknown API error');
  }

  return json.data;
}

/**
 * Fetches all data needed to populate the Dashboard.
 * @param {Object} [filters] - { origin, destination, airline, window }
 * @returns {Promise<DashboardData>}
 */
export async function fetchDashboardSummary(filters = {}) {
  const params = new URLSearchParams();
  if (filters.origin && filters.origin !== 'ALL') params.set('origin', filters.origin);
  if (filters.destination && filters.destination !== 'ALL') params.set('destination', filters.destination);
  if (filters.airline && filters.airline !== 'ALL' && filters.airline !== 'all') params.set('airline', filters.airline);
  if (filters.window && filters.window !== 'ALL') params.set('window', filters.window);
  const qs = params.toString();
  return apiFetch(`${BASE}/dashboard${qs ? `?${qs}` : ''}`);
}

/**
 * Fetches index and fare data for a specific route.
 * @param {string} route - e.g. "DEL-BOM"
 * @param {string} [bookingWindow] - e.g. "T+7"
 * @returns {Promise<RouteIndexData>}
 */
export async function fetchRouteIndex(route, bookingWindow) {
  const params = new URLSearchParams({ route });
  if (bookingWindow) params.set('booking_window', bookingWindow);
  return apiFetch(`${BASE}/route?${params}`);
}

/**
 * Fetches airline index data and summaries.
 * @param {{ airline?: string, route?: string, booking_window?: string }} filters
 * @returns {Promise<AirlineIndexData>}
 */
export async function fetchAirlineIndex({ airline, route, booking_window } = {}) {
  const params = new URLSearchParams();
  if (airline) params.set('airline', airline);
  if (route) params.set('route', route);
  if (booking_window) params.set('booking_window', booking_window);
  return apiFetch(`${BASE}/airlines?${params}`);
}

/**
 * Fetches paginated observation records for the DataExplorer.
 * @param {{ route?: string, airline?: string, booking_window?: string, search?: string, page?: number, limit?: number, sortField?: string, sortAsc?: boolean }} params
 * @returns {Promise<{ records: any[], total: number, page: number, totalPages: number }>}
 */
export async function fetchObservations({
  route,
  airline,
  booking_window,
  search = '',
  page = 1,
  limit = 25,
  sortField = 'observation_date',
  sortAsc = false,
} = {}) {
  const params = new URLSearchParams({ page, limit, sortField, sortAsc });
  if (route) params.set('route', route);
  if (airline) params.set('airline', airline);
  if (booking_window) params.set('booking_window', booking_window);
  if (search) params.set('search', search);
  return apiFetch(`${BASE}/observations?${params}`);
}

/**
 * Fetches trend time-series data.
 * @returns {Promise<TrendData>}
 */
export async function fetchTrendData() {
  return apiFetch(`${BASE}/trends`);
}

/**
 * Fetches the 8 monitored airports dynamically from the dataset.
 * @returns {Promise<{ airports: { code: string, city: string }[] }>}
 */
export async function fetchAirports() {
  return apiFetch(`${BASE}/airports`);
}

/**
 * Fetches all 56 directed routes dynamically from the dataset.
 * @param {{ origin?: string, destination?: string }} filters
 * @returns {Promise<{ routes: RouteData[], total: number }>}
 */
export async function fetchAvailableRoutes({ origin, destination } = {}) {
  const params = new URLSearchParams();
  if (origin) params.set('origin', origin);
  if (destination) params.set('destination', destination);
  return apiFetch(`${BASE}/routes?${params}`);
}

/**
 * Fetches data quality statistics from the dataset.
 * @returns {Promise<QualityStats>}
 */
export async function fetchQualityStats() {
  return apiFetch(`${BASE}/quality`);
}

/**
 * Fetches comparison data for multiple routes or airlines.
 * @param {{ routes?: string[], airlines?: string[] }} params
 * @returns {Promise<ComparisonData>}
 */
export async function fetchComparisonData({ routes, airlines } = {}) {
  const params = new URLSearchParams();
  if (routes && routes.length > 0) params.set('routes', routes.join(','));
  if (airlines && airlines.length > 0) params.set('airlines', airlines.join(','));
  return apiFetch(`${BASE}/comparison?${params}`);
}
