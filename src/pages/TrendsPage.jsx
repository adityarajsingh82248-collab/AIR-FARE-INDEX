import React, { useState, useEffect } from 'react';
import StateCard from '../components/common/StateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { Download } from 'lucide-react';
import { useToast } from '../components/common/ToastContext';
import { fetchTrendData } from '../services/api/indexApi.js';

/**
 * TrendsPage — View
 * ──────────────────
 * Renders macroeconomic price trend visualizations.
 * All chart and table data sourced from the real modeltest dataset
 * via /api/index/trends → indexController.getTrendData.
 *
 * No mock data. No hardcoded trend arrays, CAGR, or seasonal stats.
 */
export default function TrendsPage({
  granularities = ['Daily', 'Weekly', 'Monthly', 'Yearly']
}) {
  const [selectedGranularity, setSelectedGranularity] = useState('Monthly');
  const [activeChartTab, setActiveChartTab] = useState('both');
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchTrendData()
      .then((data) => { if (!cancelled) setTrendData(data); })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const handleExportCsv = () => {
    if (!trendData || !trendData.historicalTable?.length) {
      addToast('No time series data available to export.', 'info');
      return;
    }
    const headers = ['Booking Window', 'Avg Fare (₹)', 'AFI Index', 'Observations', '% Change'];
    const rows = trendData.historicalTable.map((r) => [
      r.booking_window,
      r.avgFare ? Math.round(r.avgFare) : '',
      r.index_value ? r.index_value.toFixed(2) : '',
      r.sample_count,
      r.pctChange ? r.pctChange.toFixed(2) + '%' : '',
    ]);
    const csvContent = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'airindex_trends.csv';
    a.click();
    URL.revokeObjectURL(url);
    addToast('Trend data exported as CSV.', 'success');
  };

  const fmtFare = (n) =>
    n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` : '—';

  // Prepare chart data
  const bwTrend = trendData?.bookingWindowTrend || [];

  // Determine which lines to show based on activeChartTab
  const chartLines = [];
  if (activeChartTab === 'both' || activeChartTab === 'index') {
    chartLines.push({ key: 'index_value', color: '#3b82f6', name: 'AFI Index' });
  }
  if (activeChartTab === 'both' || activeChartTab === 'fare') {
    chartLines.push({ key: 'avgFare', color: '#10b981', name: 'Avg Fare (₹)' });
  }

  const chartData = bwTrend.map((r) => ({
    label: r.label,
    avgFare: r.avgFare,
    index_value: r.index_value,
  }));

  const routeTrend = trendData?.routeTrend || [];

  const summary = trendData?.summary;

  return (
    <div className="page-inner-container">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Macroeconomic Price Trends</h1>
          <p className="page-subtitle">
            Longitudinal airfare inflation patterns across booking windows and monitored domestic corridors.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleExportCsv}
        >
          <Download size={14} />
          <span>Export (CSV)</span>
        </button>
      </div>

      {/* Control Strip */}
      <div className="filter-bar-container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span className="filter-label" style={{ margin: 0 }}>Temporal Granularity:</span>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {granularities.map((g) => (
              <button
                key={g}
                type="button"
                className={`btn btn-sm ${selectedGranularity === g ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => setSelectedGranularity(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <button type="button" className={`btn btn-sm ${activeChartTab === 'both' ? 'btn-accent-tint' : 'btn-secondary'}`} onClick={() => setActiveChartTab('both')}>
            Dual Curve
          </button>
          <button type="button" className={`btn btn-sm ${activeChartTab === 'index' ? 'btn-accent-tint' : 'btn-secondary'}`} onClick={() => setActiveChartTab('index')}>
            Index Only
          </button>
          <button type="button" className={`btn btn-sm ${activeChartTab === 'fare' ? 'btn-accent-tint' : 'btn-secondary'}`} onClick={() => setActiveChartTab('fare')}>
            Fare (₹) Only
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="afi-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-surface-elevated)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>
              Trailing 12-Month Index CAGR
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
              N/A — Single period
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>
              Peak Booking Window
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: summary?.peakBookingWindow ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {loading ? '—' : summary?.peakBookingWindow || 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>
              Trough Booking Window
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: summary?.troughBookingWindow ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
              {loading ? '—' : summary?.troughBookingWindow || 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', display: 'block' }}>
              Annual Fare Volatility (CV)
            </span>
            <span style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
              N/A — Single period
            </span>
          </div>
        </div>
      </div>

      {/* Large Trend Chart */}
      <StateCard
        title={`Air Fare Index & Average Fare — Booking Window Profile`}
        subtitle="Audited aggregate series across advance booking windows (base period 2026-09 = 100)"
      >
        {loading ? (
          <div className="skeleton-pulse" style={{ height: 280, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
        ) : chartData.length > 0 ? (
          <div style={{ marginTop: '1rem' }}>
            <LineChart
              data={chartData}
              xKey="label"
              lines={chartLines}
              height={280}
              showLegend
              formatTooltipValue={(v, key) =>
                key === 'index_value'
                  ? v?.toFixed(2)
                  : `₹${Math.round(v).toLocaleString('en-IN')}`
              }
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
            {error ? 'Could not load trend data. Is the backend running?' : 'No trend data available'}
          </div>
        )}
      </StateCard>

      {/* Route Fare Bar Chart */}
      {!loading && routeTrend.length > 0 && (
        <StateCard
          title="Average Fare by Monitored Route"
          subtitle="Economy fare averages across all six monitored domestic corridors"
          style={{ marginTop: '1.5rem' }}
        >
          <div style={{ marginTop: '0.75rem' }}>
            <BarChart
              data={routeTrend.map((r) => ({ label: r.route, value: r.avgFare }))}
              xKey="label"
              yKey="value"
              height={220}
              multiColor
              formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
            />
          </div>
        </StateCard>
      )}

      {/* Historical Observations Table */}
      <div style={{ marginTop: '2rem' }}>
        <div className="section-title">Booking Window Fare &amp; Index Summary</div>
        {loading ? (
          <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
        ) : trendData?.historicalTable?.length ? (
          <div className="table-scroll-wrap" style={{ marginTop: '0.75rem' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booking Window</th>
                  <th>Average Fare</th>
                  <th>AFI Index Value</th>
                  <th>Observations</th>
                  <th>Δ vs Prev Window</th>
                </tr>
              </thead>
              <tbody>
                {trendData.historicalTable.map((row) => (
                  <tr key={row.booking_window}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{row.booking_window}</td>
                    <td style={{ fontWeight: 600 }}>{fmtFare(row.avgFare)}</td>
                    <td>
                      {row.index_value != null ? (
                        <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                          {row.index_value.toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                    <td>{row.sample_count}</td>
                    <td>
                      {row.pctChange != null ? (
                        <span
                          style={{
                            color: row.pctChange > 0 ? '#f59e0b' : '#10b981',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          {row.pctChange > 0 ? '+' : ''}{row.pctChange.toFixed(2)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <StateCard
            state="empty"
            emptyMessage={error ? 'Could not load trend data. Ensure the backend is running.' : 'No historical data available.'}
          />
        )}
      </div>
    </div>
  );
}
