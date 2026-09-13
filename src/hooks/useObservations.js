/**
 * useObservations Hook
 * ─────────────────────
 * Fetches paginated real observation records from the backend.
 * Data comes from the real modeltest dataset (development_observations.csv).
 *
 * Used by DataExplorerPage to replace the empty observations={[]} prop.
 *
 * Usage:
 *   const { records, total, page, totalPages, isLoading, isError, setFilters, setPage } = useObservations();
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchObservations } from '../services/api/indexApi.js';

export function useObservations(initialFilters = {}) {
  const [filters, setFilters] = useState({
    route: '',
    airline: '',
    booking_window: '',
    search: '',
    sortField: 'search_date',
    sortAsc: false,
    ...initialFilters,
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const result = await fetchObservations({ ...filters, page, limit });
      setRecords(result.records || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      setIsError(true);
      setError(err);
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  return {
    records,
    total,
    page,
    totalPages,
    isLoading,
    isError,
    error,
    setPage,
    updateFilters,
    refetch: fetchData,
  };
}
