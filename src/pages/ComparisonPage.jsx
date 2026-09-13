import React, { useState, useEffect } from 'react';
import StateCard from '../components/common/StateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { GitCompare, Plus, X, AlertCircle } from 'lucide-react';
import { AIRLINES } from '../config/airlines.js';
import { fetchAvailableRoutes, fetchComparisonData } from '../services/api/indexApi.js';

/**
 * ComparisonPage — View
 * ──────────────────────
 * Side-by-side comparison of up to 4 routes or airlines.
 * All route/airline data comes from the PostgreSQL dataset (68,400 records).
 * No mock data. No hardcoded routes.
 */
export default function ComparisonPage() {
  const [activeTab, setActiveTab] = useState('routes');

  // Available routes from backend (all 56 directed routes)
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);

  // Comparison data from backend
  const [comparisonData, setComparisonData] = useState(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState(null);

  const [selectedRouteIds, setSelectedRouteIds] = useState([]);
  const [selectedAirlineIds, setSelectedAirlineIds] = useState([]);

  const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];

  // Load available routes from backend
  useEffect(() => {
    let cancelled = false;
    setRoutesLoading(true);
    fetchAvailableRoutes()
      .then((data) => {
        if (!cancelled && data?.routes) {
          setAvailableRoutes(data.routes.map((r, i) => ({
            id: r.route,
            label: `${r.route} (${r.airlines.length} airlines · ₹${r.avgFare ? Math.round(r.avgFare).toLocaleString('en-IN') : '—'} avg)`,
            shortLabel: r.route,
            color: PALETTE[i % PALETTE.length],
            ...r,
          })));
        }
      })
      .catch((err) => {
        if (!cancelled) console.error('Failed to load routes:', err);
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Available airlines from config
  const availableAirlines = AIRLINES.filter((a) => a.id !== 'all').map((a, i) => ({
    id: a.datasetName || a.name,
    label: `${a.name} (${a.iata})`,
    shortLabel: a.datasetName || a.name,
    color: PALETTE[i % PALETTE.length],
  }));

  // Selection state
  const activeItems = activeTab === 'routes' ? availableRoutes : availableAirlines;
  const selectedIds = activeTab === 'routes' ? selectedRouteIds : selectedAirlineIds;
  const setSelectedIds = activeTab === 'routes' ? setSelectedRouteIds : setSelectedAirlineIds;

  const handleToggleItem = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else if (selectedIds.length < 4) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Fetch comparison data whenever selection changes
  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparisonData(null);
      return;
    }

    let cancelled = false;
    setCompLoading(true);
    setCompError(null);

    const params = activeTab === 'routes'
      ? { routes: selectedIds }
      : { airlines: selectedIds };

    fetchComparisonData(params)
      .then((data) => {
        if (!cancelled) setComparisonData(data);
      })
      .catch((err) => {
        if (!cancelled) setCompError(err);
      })
      .finally(() => {
        if (!cancelled) setCompLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedIds, activeTab]);

  const selectedObjects = activeItems.filter((it) => selectedIds.includes(it.id));

  const fmtFare = (n) =>
    n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` : 'N/A';
  const fmtIndex = (n) => (n != null ? n.toFixed(2) : 'N/A');

  // Build chart data: booking window fare comparison for selected items
  const compItems = activeTab === 'routes'
    ? (comparisonData?.routes || [])
    : (comparisonData?.airlines || []);

  const bookingWindowChartData = ['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => {
    const entry = { label: bw };
    compItems.forEach((item) => {
      const bwSeries = item.bookingWindowSeries?.find((r) => r.booking_window === bw);
      const key = activeTab === 'routes' ? item.route : item.airline;
      if (bwSeries?.avgFare != null) entry[key] = bwSeries.avgFare;
    });
    return entry;
  });

  const lineKeys = compItems.map((item, i) => ({
    key: activeTab === 'routes' ? item.route : item.airline,
    color: PALETTE[i % PALETTE.length],
    name: activeTab === 'routes' ? item.route : item.airline,
  }));

  return (
    <div className="page-inner-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Statistical Comparison Matrix</h1>
          <p className="page-subtitle">
            Side-by-side benchmarking and overlaid multi-trajectory fare graphs across corridors and carriers.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'routes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('routes'); setSelectedAirlineIds([]); }}
        >
          <span>Compare Routes</span>
        </button>

        <button
          type="button"
          className={`btn ${activeTab === 'airlines' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('airlines'); setSelectedRouteIds([]); }}
        >
          <span>Compare Airlines</span>
        </button>
      </div>

      {/* Item Selection Chips */}
      <div className="afi-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
          {activeTab === 'routes'
            ? `Select up to 4 of ${availableRoutes.length} routes to compare (${selectedIds.length}/4 selected):`
            : `Select up to 4 airlines to compare (${selectedIds.length}/4 selected):`}
        </div>

        {routesLoading && activeTab === 'routes' ? (
          <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>Loading routes from dataset…</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
            {activeItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    borderColor: isSelected ? item.color : undefined,
                    backgroundColor: isSelected ? item.color : undefined,
                    fontSize: '0.78rem',
                  }}
                  onClick={() => handleToggleItem(item.id)}
                >
                  <span>{item.shortLabel}</span>
                  {isSelected ? <X size={12} /> : <Plus size={12} />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* View or Empty State */}
      {selectedIds.length < 2 ? (
        <StateCard
          state="empty"
          emptyMessage="Please select at least 2 items above to render the side-by-side comparison matrix."
        />
      ) : (
        <>
          {compError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#ef4444' }}>
              <AlertCircle size={16} />
              <span>Failed to load comparison data: {compError.message}</span>
            </div>
          )}

          {/* Side-by-side metric cards */}
          {compLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedObjects.length}, 1fr)`, gap: '1rem', marginBottom: '1.5rem' }}>
              {selectedObjects.map((item) => (
                <div key={item.id} className="kpi-card skeleton-pulse" style={{ borderTop: `4px solid ${item.color}`, height: '140px' }} />
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compItems.length > 0 ? compItems.length : selectedObjects.length}, minmax(180px, 1fr))`, gap: '1rem', marginBottom: '1.5rem' }}>
              {(compItems.length > 0 ? compItems : selectedObjects).map((item, i) => {
                const isRoute = activeTab === 'routes';
                const label = isRoute ? item.route : item.airline;
                const color = PALETTE[i % PALETTE.length];
                return (
                  <div key={item.id || label} className="kpi-card" style={{ borderTop: `4px solid ${color}` }}>
                    <span className="kpi-label" style={{ fontFamily: 'monospace', fontWeight: 700 }}>{label}</span>
                    <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                      {fmtFare(item.avgFare)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Avg Fare
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: '0.5rem', fontWeight: 600 }}>
                      AFI: {fmtIndex(item.avgIndex)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                      Min: {fmtFare(item.minFare)} · Max: {fmtFare(item.maxFare)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                      {item.sampleCount?.toLocaleString('en-IN')} records
                      {isRoute && item.airlineCount && ` · ${item.airlineCount} airlines`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comparative Booking Window Chart */}
          <StateCard
            title={`Fare by Booking Window — ${activeTab === 'routes' ? 'Route' : 'Airline'} Comparison`}
            subtitle="Average Economy fare at each advance booking horizon"
          >
            {compLoading ? (
              <div className="skeleton-pulse" style={{ height: 220, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
            ) : compItems.length > 0 && lineKeys.length > 0 ? (
              <div style={{ marginTop: '0.75rem' }}>
                <LineChart
                  data={bookingWindowChartData}
                  xKey="label"
                  lines={lineKeys}
                  height={220}
                  showLegend
                  formatTooltipValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                No comparison data available.
              </div>
            )}
          </StateCard>
        </>
      )}
    </div>
  );
}
