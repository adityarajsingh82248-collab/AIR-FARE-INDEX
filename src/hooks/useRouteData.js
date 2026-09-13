/**
 * useRouteData Hook
 * ──────────────────
 * React hook that wraps the routeController.
 * Provides flight/route data for a given origin-destination pair.
 *
 * Usage:
 *   const { data, isLoading, isError, error } = useRouteData('DEL', 'BOM');
 *
 * Returns:
 *   data      — RouteAnalysis object (or null if not loaded)
 *   isLoading — true while fetching
 *   isError   — true if the request failed
 *   error     — Error object if isError
 *   refetch   — Function to re-trigger the query
 */

import { useState, useEffect, useCallback } from 'react';
import { getRouteAnalysis } from '../controllers/routeController.js';

/**
 * @param {string|null} origin      - Origin IATA code, or null to skip
 * @param {string|null} destination - Destination IATA code, or null to skip
 * @param {string} [flightDate]     - Optional date YYYY-MM-DD
 */
export function useRouteData(origin, destination, flightDate) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!origin || !destination || origin === destination) {
      setData(null);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await getRouteAnalysis({ origin, destination, flightDate });
      setData(result);
    } catch (err) {
      setIsError(true);
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [origin, destination, flightDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isError, error, refetch: fetchData };
}
