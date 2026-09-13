import React, { useState, useEffect } from 'react';
import StateCard from '../../components/common/StateCard';
import { CheckCircle2, AlertTriangle, XCircle, Database, RefreshCw } from 'lucide-react';
import { fetchQualityStats } from '../../services/api/indexApi.js';

/**
 * AdminQualityPage — View
 * ────────────────────────
 * Renders real data quality statistics from the PostgreSQL airfare_observations table.
 * All counts and metrics are calculated live from the authoritative dataset.
 */
export default function AdminQualityPage() {
  const [quality, setQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = () => {
    setLoading(true);
    setError(null);
    fetchQualityStats()
      .then((data) => setQuality(data))
      .catch((err) => setError(err.message || 'Failed to load quality stats.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const statusIcon = (count) => {
    if (count === 0) return <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />;
    if (count <= 10) return <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />;
    return <XCircle size={16} style={{ color: 'var(--color-danger)' }} />;
  };

  const statusBadge = (count) => {
    if (count === 0) return 'up';
    if (count <= 10) return '';
    return 'down';
  };

  return (
    <div className="page-inner-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Data Quality & Statistical Assurance</h1>
          <p className="page-subtitle">
            Automated verification monitors for the authoritative airfare dataset (68,400 records, 56 routes, 8 airports).
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#ef4444' }}>
          {error}
        </div>
      )}

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          {
            title: 'Total Records',
            value: quality?.totalRecords?.toLocaleString('en-IN') ?? '—',
            context: `${quality?.distinctRoutes ?? '—'} routes · ${quality?.distinctAirlines ?? '—'} airlines`,
            badge: 'up',
            icon: <Database size={14} />,
          },
          {
            title: 'Invalid Fares',
            value: loading ? '…' : (quality?.invalidFares ?? '—'),
            context: 'Records with fare ≤ 0 or NULL',
            badge: statusBadge(quality?.invalidFares || 0),
            icon: statusIcon(quality?.invalidFares || 0),
          },
          {
            title: 'Missing Airports',
            value: loading ? '…' : (quality?.missingAirports ?? '—'),
            context: 'Records with NULL origin or destination',
            badge: statusBadge(quality?.missingAirports || 0),
            icon: statusIcon(quality?.missingAirports || 0),
          },
          {
            title: 'Duplicate Groups',
            value: loading ? '…' : (quality?.duplicateGroups ?? '—'),
            context: 'Route+airline+date+flight groups with count > 1',
            badge: statusBadge(quality?.duplicateGroups || 0),
            icon: statusIcon(quality?.duplicateGroups || 0),
          },
          {
            title: 'Invalid Lead Days',
            value: loading ? '…' : (quality?.invalidLeadDays ?? '—'),
            context: 'Lead days not in {1, 7, 15, 30, 45}',
            badge: statusBadge(quality?.invalidLeadDays || 0),
            icon: statusIcon(quality?.invalidLeadDays || 0),
          },
          {
            title: 'Invalid Load Factor',
            value: loading ? '…' : (quality?.invalidLoadFactor ?? '—'),
            context: 'Load factor outside [0, 1] range',
            badge: statusBadge(quality?.invalidLoadFactor || 0),
            icon: statusIcon(quality?.invalidLoadFactor || 0),
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}
            style={{ borderTop: `3px solid ${card.badge === 'up' ? 'var(--color-success)' : card.badge === 'down' ? 'var(--color-danger)' : 'var(--color-warning)'}` }}
          >
            <div className="kpi-header">
              <span className="kpi-label">{card.title}</span>
              <span className={`trend-badge ${card.badge}`} style={{ gap: '0.35rem', fontSize: '0.7rem' }}>
                {card.icon}
                <span>{card.badge === 'up' ? 'OK' : card.badge === 'down' ? 'Issues' : 'Warn'}</span>
              </span>
            </div>
            <div className="kpi-value" style={{ fontSize: '1.6rem' }}>{loading ? '—' : card.value}</div>
            <div className="kpi-context">{card.context}</div>
          </div>
        ))}
      </div>

      {/* Fare Range Card */}
      {quality?.fareRange && (
        <div className="afi-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Fare Range Statistics</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Minimum Fare', value: `₹${Math.round(quality.fareRange.min).toLocaleString('en-IN')}` },
              { label: 'Average Fare', value: `₹${Math.round(quality.fareRange.avg).toLocaleString('en-IN')}` },
              { label: 'Maximum Fare', value: `₹${Math.round(quality.fareRange.max).toLocaleString('en-IN')}` },
            ].map((item) => (
              <div key={item.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{item.label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dataset Date Range */}
      {quality?.dateRange && (
        <StateCard
          title="Dataset Coverage"
          subtitle="Observation date range from the authoritative dataset"
        >
          <div style={{ display: 'flex', gap: '2rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Observation From</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{quality.dateRange.from}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Observation To</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{quality.dateRange.to}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Overall Status</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: quality?.overallStatus === 'PASS' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                {quality?.overallStatus ?? '—'}
              </div>
            </div>
          </div>
        </StateCard>
      )}
    </div>
  );
}
