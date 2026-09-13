/**
 * useIndexData Hook
 * ──────────────────
 * Fetches all dashboard-level Air Fare Index data from the backend.
 * Data comes from the real modeltest dataset (development_observations.csv).
 *
 * Usage:
 *   const { data, isLoading, isError, error, refetch } = useIndexData();
 *
 * Returns:
 *   data      — DashboardData object (or null while loading)
 *   isLoading — true while fetching
 *   isError   — true if the request failed
 *   error     — Error object (if isError)
 *   refetch   — Function to re-trigger the query
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchDashboardSummary } from '../services/api/indexApi.js';

export function useIndexData(filters = {}) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const filterKey = JSON.stringify(filters);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await fetchDashboardSummary(filters);
      setData(result);
    } catch (err) {
      setIsError(true);
      setError(err);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [filterKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isError, error, refetch: fetchData };
}
