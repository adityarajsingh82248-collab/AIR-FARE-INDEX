/**
 * useFlightData Hook
 * ───────────────────
 * React hook that wraps the flightController.
 * Provides raw normalized flight data for a given query.
 *
 * Usage:
 *   const { data, isLoading, isError, error } = useFlightData({ origin: 'DEL', destination: 'BOM' });
 */

import { useState, useEffect, useCallback } from 'react';
import { queryFlights } from '../controllers/flightController.js';

/**
 * @param {Object} params
 * @param {string|null} params.origin       - Origin IATA code, or null to skip
 * @param {string|null} params.destination  - Destination IATA code, or null to skip
 * @param {string} [params.flightDate]      - Optional date YYYY-MM-DD
 */
export function useFlightData({ origin, destination, flightDate } = {}) {
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
      const result = await queryFlights({ origin, destination, flightDate });
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
