import React, { useState, useMemo, useCallback } from 'react';
import Modal from '../components/common/Modal';
import StateCard from '../components/common/StateCard';
import { 
  Search, 
  Download, 
  SlidersHorizontal, 
  ArrowUpDown, 
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../components/common/ToastContext';
import { useObservations } from '../hooks/useObservations.js';

/**
 * DataExplorerPage — View
 * ────────────────────────
 * Renders the observation microdata explorer.
 * Data comes from the real modeltest dataset (development_observations.csv)
 * via the useObservations hook → /api/index/observations → observationService.
 *
 * All 541 real observation records are available with search, filter, sort, and pagination.
 */
export default function DataExplorerPage({
  isLoading: _propLoading,
  isError: _propError,
  onRetry: _propRetry
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [originFilter, setOriginFilter] = useState('ALL');
  const [airlineFilter, setAirlineFilter] = useState('ALL');
  const [sortField, setSortField] = useState('search_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState({
    date: true,
    origin: true,
    destination: true,
    airline: true,
    cabinClass: true,
    fare: true,
    tripType: true,
    source: true,
    status: true
  });

  const { addToast } = useToast();

  // Real data from modeltest dataset via backend API
  const {
    records: rawRecords,
    total: totalRecords,
    page,
    totalPages,
    isLoading,
    isError,
    setPage,
    updateFilters,
    refetch,
  } = useObservations();

  // Map raw CSV records → existing UI table shape
  const paginatedData = useMemo(() => rawRecords.map((r) => ({
    id: r.observation_id,
    date: r.search_date,
    origin: r.origin,
    destination: r.destination,
    airline: r.airline,
    flightNo: r.lead_time,  // lead_time (T+1, T+7…) used as proxy — no flight number in dataset
    cabinClass: r.fare_class,
    fare: r.total_fare,
    baseFare: null,  // not available in PHASE_3 dataset
    taxes: null,     // not available in PHASE_3 dataset
    tripType: 'One Way',
    source: r.source,
    status: r.validation_status,
    advanceDays: r.lead_time_days,
    // Keep raw fields for the modal
    _raw: r,
  })), [rawRecords]);

  const rowsPerPage = 25;

  const handleExport = useCallback(() => {
    if (rawRecords.length === 0) {
      addToast('No data to export.', 'info');
      return;
    }
    const headers = ['observation_id', 'origin', 'destination', 'route', 'airline', 'travel_date', 'search_date', 'lead_time', 'fare_class', 'total_fare', 'source', 'validation_status'];
    const rows = rawRecords.map((r) => headers.map((h) => r[h] ?? ''));
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `airindex_observations_page${page}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Observations exported as CSV.', 'success');
  }, [rawRecords, page, addToast]);

  // Unused var placeholders for sort toggle
  const filteredData = paginatedData; // server-side handled
  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
      updateFilters({ sortField: field, sortAsc: !sortAsc });
    } else {
      setSortField(field);
      setSortAsc(true);
      updateFilters({ sortField: field, sortAsc: true });
    }
  };

  return (
    <div className="page-inner-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Observation Microdata Explorer</h1>
          <p className="page-subtitle">
            Search, filter, and audit collected airfare quotes feeding the national index calculation pipeline.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsColumnModalOpen(true)}
          >
            <SlidersHorizontal size={14} />
            <span>Column Visibility</span>
          </button>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleExport}
          >
            <Download size={14} />
            <span>Export Filtered Set</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="data-table-container">
        {/* Table Toolbar */}
        <div className="table-toolbar">
          <div className="table-search-box">
            <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search by observation ID, airline, corridor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                updateFilters({ search: e.target.value });
              }}
              aria-label="Search observations"
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              value={originFilter}
              onChange={(e) => {
                const val = e.target.value;
                setOriginFilter(val);
                // Convert origin filter to route prefix filter
                updateFilters({ route: val === 'ALL' ? '' : val });
              }}
            >
              <option value="ALL">All Origins</option>
              <option value="DEL">Delhi (DEL)</option>
              <option value="BOM">Mumbai (BOM)</option>
              <option value="BLR">Bengaluru (BLR)</option>
              <option value="MAA">Chennai (MAA)</option>
              <option value="CCU">Kolkata (CCU)</option>
              <option value="HYD">Hyderabad (HYD)</option>
            </select>

            <select
              className="form-select"
              style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.65rem' }}
              value={airlineFilter}
              onChange={(e) => {
                const val = e.target.value;
                setAirlineFilter(val);
                updateFilters({ airline: val === 'ALL' ? '' : val });
              }}
            >
              <option value="ALL">All Carriers</option>
              <option value="IndiGo">IndiGo</option>
              <option value="Air India">Air India</option>
              <option value="SpiceJet">SpiceJet</option>
            </select>
          </div>
        </div>

        {/* Table State Handling */}
        {isLoading ? (
          <div style={{ padding: '2rem' }}>
            <div className="skeleton-pulse" style={{ height: '300px', width: '100%' }} />
          </div>
        ) : isError ? (
          <StateCard
            state="error"
            errorMessage="Failed to retrieve observation data. Ensure the backend server is running on port 5000."
            onRetry={refetch}
          />
        ) : paginatedData.length === 0 ? (
          <StateCard
            state="empty"
            emptyMessage="No airfare records matched your search criteria."
          />
        ) : (
          <div className="table-scroll-wrap">
            <table className="data-table" aria-label="Audited Airfare Observations">
              <thead>
                <tr>
                  {visibleColumns.date && (
                    <th className="sortable" onClick={() => toggleSort('date')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Observation Date</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.origin && (
                    <th className="sortable" onClick={() => toggleSort('origin')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Origin</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.destination && (
                    <th className="sortable" onClick={() => toggleSort('destination')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Destination</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.airline && (
                    <th className="sortable" onClick={() => toggleSort('airline')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Airline &amp; Flight</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.cabinClass && <th>Cabin Class</th>}
                  {visibleColumns.fare && (
                    <th className="sortable" onClick={() => toggleSort('fare')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>Fare Total (₹)</span>
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                  )}
                  {visibleColumns.tripType && <th>Trip Type</th>}
                  {visibleColumns.source && <th>Data Stream</th>}
                  {visibleColumns.status && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => (
                  <tr 
                    key={row.id} 
                    onClick={() => setSelectedRecord(row)}
                    title="Click to view complete observation audit trail"
                  >
                    {visibleColumns.date && <td style={{ fontFamily: 'monospace' }}>{row.date}</td>}
                    {visibleColumns.origin && <td style={{ fontWeight: 600 }}>{row.origin}</td>}
                    {visibleColumns.destination && <td style={{ fontWeight: 600 }}>{row.destination}</td>}
                    {visibleColumns.airline && (
                      <td>
                        <div style={{ fontWeight: 500 }}>{row.airline}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{row.flightNo}</div>
                      </td>
                    )}
                    {visibleColumns.cabinClass && <td>{row.cabinClass}</td>}
                    {visibleColumns.fare && (
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {row.fare != null ? `₹${row.fare.toLocaleString('en-IN')}` : '—'}
                      </td>
                    )}
                    {visibleColumns.tripType && <td>{row.tripType}</td>}
                    {visibleColumns.source && (
                      <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {row.source}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td>
                        <span className="trend-badge up" style={{ fontSize: '0.72rem' }}>
                          <CheckCircle2 size={11} />
                          <span>{row.status}</span>
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="table-pagination">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>
              Showing {totalRecords === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, totalRecords)} of {totalRecords} records
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontWeight: 600 }}>
              Page {page} of {totalPages}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Row Inspection Modal */}
      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title={`Observation Record: ${selectedRecord?.id || ''}`}
        footer={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setSelectedRecord(null)}
          >
            Close Details
          </button>
        }
      >
        {selectedRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Corridor</span>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedRecord.origin} → {selectedRecord.destination}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Airline · Booking Window</span>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedRecord.airline} · {selectedRecord.flightNo}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div className="afi-card" style={{ padding: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Total Observed Fare</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {selectedRecord.fare != null ? `₹${selectedRecord.fare.toLocaleString('en-IN')}` : '—'}
                </div>
              </div>
              <div className="afi-card" style={{ padding: '0.75rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Advance Days</span>
                <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                  {selectedRecord.advanceDays != null ? `${selectedRecord.advanceDays} days` : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Observation ID:</span>
                <strong style={{ fontFamily: 'monospace' }}>{selectedRecord.id}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Search Date:</span>
                <strong>{selectedRecord.date}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Travel Date:</span>
                <strong>{selectedRecord._raw?.travel_date || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Data Mode:</span>
                <strong>{selectedRecord._raw?.data_mode || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ingestion Stream:</span>
                <strong>{selectedRecord.source || '—'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Validation Status:</span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{selectedRecord.status || '—'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Column Visibility Toggle Modal */}
      <Modal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        title="Customize Table Columns"
        footer={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsColumnModalOpen(false)}
          >
            Apply Columns
          </button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {Object.keys(visibleColumns).map((colKey) => (
            <label key={colKey} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', textTransform: 'capitalize' }}>
              <input
                type="checkbox"
                checked={visibleColumns[colKey]}
                onChange={(e) => setVisibleColumns({ ...visibleColumns, [colKey]: e.target.checked })}
                style={{ width: '16px', height: '16px' }}
              />
              <span>{colKey.replace(/([A-Z])/g, ' $1')}</span>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
