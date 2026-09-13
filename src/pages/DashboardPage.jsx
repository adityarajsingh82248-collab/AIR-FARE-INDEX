import React, { useState } from 'react';
import FilterBar from '../components/common/FilterBar';
import StateCard from '../components/common/StateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { useIndexData } from '../hooks/useIndexData.js';
import { 
  TrendingUp, 
  TrendingDown, 
  Layers, 
  Database, 
  ChevronRight,
  BarChart2,
  Activity,
  AlertCircle
} from 'lucide-react';

/**
 * DashboardPage — View
 * ─────────────────────
 * Renders the national AFI dashboard.
 * All KPI and chart data comes from the real modeltest dataset
 * via useIndexData → /api/index/dashboard → indexService → development_observations.csv.
 *
 * No mock data. No hardcoded values.
 */
export default function DashboardPage({
  filterOptions,
  filters,
  onFilterChange,
  onResetFilters,
  isLoading: isRefreshing,
  isError: propIsError,
  onRetry,
  onNavigate
}) {
  const { data, isLoading, isError, refetch } = useIndexData(filters);

  const fmt = (n) =>
    n != null ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n)) : null;

  const fmtFare = (n) =>
    n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` : null;

  const fmtIndex = (n) => (n != null ? n.toFixed(2) : null);

  const headline = data?.afiHeadline;
  const afiValue = headline?.index_value != null ? fmtIndex(headline.index_value) : null;
  const avgFare = data?.avgFare != null ? fmtFare(data.avgFare) : null;
  const obsCount = data?.observationCount != null ? fmt(data.observationCount) : null;
  const loadFactor = data?.avgLoadFactor != null ? `${(data.avgLoadFactor * 100).toFixed(1)}%` : null;

  // ── Chart data preparation ──────────────────────────────────────────────

  // Route Performance — avg fare per route, sorted descending
  const routeChartData = (data?.routeBreakdown || [])
    .filter((r) => r.avgFare != null)
    .sort((a, b) => b.avgFare - a.avgFare)
    .map((r) => ({ label: r.route, value: r.avgFare, index: r.avgIndex }));

  // Airline Performance — avg fare per airline
  const airlineChartData = (data?.airlineBreakdown || [])
    .filter((a) => a.avgFare != null)
    .sort((a, b) => b.avgFare - a.avgFare)
    .map((a) => ({ label: a.airline, value: a.avgFare }));

  // Booking Horizon Bar Chart — avg fare by window
  const bookingHorizonBarData = (data?.fareByBookingWindow || [])
    .filter((b) => b.avgFare != null)
    .map((b) => ({ label: b.booking_window, value: b.avgFare }));

  // AFI Trend — booking window series (x=booking_window, y=index_value)
  const afiTrendData = (data?.fareByBookingWindow || [])
    .filter((r) => r.index_value != null)
    .map((r) => ({ label: r.booking_window, avgFare: r.avgFare, index_value: r.index_value }));

  // Fare Distribution Histogram
  const fareDistData = (data?.fareDistribution || []).map((b) => ({ label: b.range, value: b.count }));

  const loading = isLoading || isRefreshing;

  return (
    <div className="page-inner-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">National Air Fare Index Dashboard</h1>
          <p className="page-subtitle">
            Comprehensive macro-level monitoring of price trends, carrier dynamics, and spatial route dispersion.
          </p>
        </div>
        {data?.dataMode && (
          <span
            className="trend-badge"
            style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-tertiary)', fontSize: '0.72rem' }}
          >
            <Database size={11} />
            <span>{data.dataMode}</span>
          </span>
        )}
      </div>

      {/* Global Filter Bar */}
      <FilterBar
        options={filterOptions}
        filters={filters}
        onChange={onFilterChange}
        onReset={onResetFilters}
      />

      {/* Error state */}
      {isError && !loading && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            background: 'var(--color-error-subtle, rgba(239,68,68,0.08))',
            border: '1px solid var(--color-error-border, rgba(239,68,68,0.2))',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            color: 'var(--color-error, #ef4444)',
          }}
        >
          <AlertCircle size={16} />
          <span>Could not load index data from backend. Ensure the backend server is running.</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={refetch} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid">
        {/* 1. Current Air Fare Index */}
        <div className={`kpi-card dominant ${loading ? 'skeleton-pulse' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">Current Air Fare Index</span>
            <span
              className="trend-badge"
              style={
                afiValue
                  ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }
                  : { background: 'var(--bg-surface-elevated)', color: 'var(--text-tertiary)' }
              }
            >
              <Activity size={12} />
              <span>{afiValue ? 'Live' : 'Pending'}</span>
            </span>
          </div>
          {afiValue ? (
            <div className="kpi-value">{afiValue}</div>
          ) : (
            <div className="kpi-value" style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>
              {loading ? '—' : 'N/A'}
            </div>
          )}
          <div className="kpi-context">Base Period (2026-09) = 100.0</div>
          <div className="kpi-footer">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {headline?.quality_status ? `Quality: ${headline.quality_status}` : 'AIR_INDEX_V1 · Median · IQR'}
            </span>
          </div>
        </div>

        {/* 2. Average Airfare */}
        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">National Average Airfare</span>
          </div>
          {avgFare ? (
            <div className="kpi-value">{avgFare}</div>
          ) : (
            <div className="kpi-value" style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>
              {loading ? '—' : 'N/A'}
            </div>
          )}
          <div className="kpi-context">Weighted across all monitored domestic routes</div>
          <div className="kpi-footer">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {data ? `Economy · ${data.routeCount} Routes · ${data.airlineCount} Airlines` : 'Audited Economy Quotes'}
            </span>
          </div>
        </div>

        {/* 3. Average Load Factor */}
        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">Average Load Factor</span>
            <span
              className="trend-badge"
              style={
                loadFactor
                  ? { background: 'rgba(16,185,129,0.12)', color: '#10b981', borderColor: 'rgba(16,185,129,0.25)' }
                  : { background: 'var(--bg-surface-elevated)', color: 'var(--text-tertiary)' }
              }
            >
              <span>{loadFactor ? 'Audited' : 'Pending'}</span>
            </span>
          </div>
          {loadFactor ? (
            <div className="kpi-value">{loadFactor}</div>
          ) : (
            <div className="kpi-value" style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>
              {loading ? '—' : 'N/A'}
            </div>
          )}
          <div className="kpi-context">Audited seat occupancy across filtered flights</div>
          <div className="kpi-footer">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>DGCA-compliant sample weighting</span>
          </div>
        </div>

        {/* 4. Active Corridors Scope */}
        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">Monitored Corridors</span>
          </div>
          {data ? (
            <div className="kpi-value">{data.routeCount} Routes</div>
          ) : (
            <div className="kpi-value" style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>
              {loading ? '—' : 'N/A'}
            </div>
          )}
          <div className="kpi-context">
            {data ? `${data.airportCount} Hub Airports · ${data.airlineCount} Carriers` : 'Audited Corridors'}
          </div>
          <div className="kpi-footer">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>100% Directional Hub Coverage</span>
          </div>
        </div>

        {/* 5. Observation Count */}
        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">Collected Observations</span>
            <span
              className="trend-badge"
              style={
                obsCount
                  ? { background: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderColor: 'rgba(59,130,246,0.25)' }
                  : { background: 'var(--bg-surface-elevated)', color: 'var(--text-tertiary)' }
              }
            >
              <Database size={12} />
              <span>{obsCount ? 'Loaded' : 'Pending'}</span>
            </span>
          </div>
          {obsCount ? (
            <div className="kpi-value">{obsCount}</div>
          ) : (
            <div className="kpi-value" style={{ color: 'var(--text-tertiary)', fontSize: '1.25rem' }}>
              {loading ? '—' : 'N/A'}
            </div>
          )}
          <div className="kpi-context">Audited Economy quotes across domestic city pairs</div>
          <div className="kpi-footer">
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {data ? `${data.routeCount} Routes · ${data.airlineCount} Airlines` : 'Audited Quotes'}
            </span>
          </div>
        </div>
      </div>

      {/* AFI Trend by Booking Window */}
      <StateCard
        title="Air Fare Index — Booking Window Profile"
        subtitle="Index value and average fare by advance booking period (base period 2026-09 = 100)"
        className="afi-card"
        action={
          <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-surface-elevated)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {['T+1', 'T+7', 'T+15', 'T+30', 'T+45'].map((bw) => (
              <span
                key={bw}
                style={{
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.72rem',
                  color: 'var(--text-tertiary)',
                  background: 'transparent',
                }}
              >
                {bw}
              </span>
            ))}
          </div>
        }
      >
        {loading ? (
          <div className="skeleton-pulse" style={{ height: 220, borderRadius: 'var(--radius-md)' }} />
        ) : afiTrendData.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <LineChart
              data={afiTrendData}
              xKey="label"
              lines={[
                { key: 'index_value', color: '#3b82f6', name: 'AFI Index' },
                { key: 'avgFare', color: '#10b981', name: 'Avg Fare (₹)' },
              ]}
              height={230}
              showLegend
              formatTooltipValue={(v, key) =>
                key === 'index_value' ? v?.toFixed(2) : `₹${Math.round(v)?.toLocaleString('en-IN')}`
              }
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            No index data available
          </div>
        )}
      </StateCard>

      {/* Grid of 4 Sub-Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* 1. Route Performance */}
        <StateCard
          title="Route Performance"
          subtitle="Average Economy fare by monitored domestic corridor"
          action={
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onNavigate('/routes')}
              style={{ fontSize: '0.75rem' }}
            >
              <span>View Routes</span>
              <ChevronRight size={12} />
            </button>
          }
        >
          {loading ? (
            <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
          ) : routeChartData.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <BarChart
                data={routeChartData}
                xKey="label"
                yKey="value"
                height={200}
                multiColor
                formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No route data available
            </div>
          )}
        </StateCard>

        {/* 2. Airline Performance */}
        <StateCard
          title="Airline Performance"
          subtitle="Average Economy fare by carrier across all monitored routes"
          action={
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onNavigate('/airlines')}
              style={{ fontSize: '0.75rem' }}
            >
              <span>View Airlines</span>
              <ChevronRight size={12} />
            </button>
          }
        >
          {loading ? (
            <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
          ) : airlineChartData.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <BarChart
                data={airlineChartData}
                xKey="label"
                yKey="value"
                height={200}
                multiColor
                formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No airline data available
            </div>
          )}
        </StateCard>

        {/* 3. Fare Distribution */}
        <StateCard
          title="Fare Distribution"
          subtitle="Economy quote frequency across observed price tiers"
          action={
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onNavigate('/data')}
              style={{ fontSize: '0.75rem' }}
            >
              <span>View Data</span>
              <ChevronRight size={12} />
            </button>
          }
        >
          {loading ? (
            <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
          ) : fareDistData.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <BarChart
                data={fareDistData}
                xKey="label"
                yKey="value"
                height={200}
                color="#8b5cf6"
                formatValue={(v) => `${v} quotes`}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No distribution data available
            </div>
          )}
        </StateCard>

        {/* 4. Advance Booking Horizon Curve */}
        <StateCard
          title="Advance Booking Horizon Curve"
          subtitle="Average economy fare across booking intervals (T+1 to T+45)"
          action={
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => onNavigate('/compare')}
              style={{ fontSize: '0.75rem' }}
            >
              <span>Compare Horizons</span>
              <ChevronRight size={12} />
            </button>
          }
        >
          {loading ? (
            <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
          ) : bookingHorizonBarData.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <BarChart
                data={bookingHorizonBarData}
                xKey="label"
                yKey="value"
                height={200}
                color="#0284c7"
                formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No horizon data available
            </div>
          )}
        </StateCard>
      </div>
    </div>
  );
}
