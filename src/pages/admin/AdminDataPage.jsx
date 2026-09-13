import React, { useState, useEffect } from 'react';
import Modal from '../../components/common/Modal';
import StateCard from '../../components/common/StateCard';
import {
  FileSpreadsheet,
  Database,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '../../components/common/ToastContext';

const BACKEND_URL = '/api/admin/dataset-stats';

/**
 * AdminDataPage — View
 * ─────────────────────
 * Displays real dataset information from PostgreSQL airfare_observations table.
 * Source: airfare_index_upgraded_8airports.csv (68,400 records).
 */
export default function AdminDataPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(BACKEND_URL, { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      setError(err.message || 'Failed to load dataset stats.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const fmtFare = (n) =>
    n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` : '—';

  const ds = stats?.dataset;

  return (
    <div className="page-inner-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Dataset Management</h1>
          <p className="page-subtitle">
            Authoritative dataset status and PostgreSQL table information.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={fetchStats} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 1rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.85rem', color: '#ef4444' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Dataset Metadata Card */}
      <div className="afi-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="brand-icon-box" style={{ width: '38px', height: '38px' }}>
            <Database size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>
              {ds?.name || 'airfare_index_upgraded_8airports.csv'}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              PostgreSQL table: <code style={{ fontFamily: 'monospace' }}>{ds?.tableName || 'airfare_observations'}</code>
            </div>
          </div>
          <span className={`trend-badge ${loading ? '' : 'up'}`} style={{ marginLeft: 'auto' }}>
            {loading ? 'Checking…' : `${(ds?.totalRecords || 0).toLocaleString('en-IN')} Records`}
          </span>
        </div>

        {/* Stat Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Total Records', value: loading ? '…' : (ds?.totalRecords?.toLocaleString('en-IN') ?? '—') },
            { label: 'Routes', value: loading ? '…' : (ds?.routeCount ?? '—') },
            { label: 'Airports', value: loading ? '…' : (ds?.airportCount ?? '—') },
            { label: 'Airlines', value: loading ? '…' : (ds?.airlineCount ?? '—') },
            { label: 'Avg Fare', value: loading ? '…' : fmtFare(ds?.avgFare) },
            { label: 'Min Fare', value: loading ? '…' : fmtFare(ds?.minFare) },
            { label: 'Max Fare', value: loading ? '…' : fmtFare(ds?.maxFare) },
            { label: 'Booking Windows', value: loading ? '…' : (ds?.bookingWindows?.length ?? '—') },
          ].map((item) => (
            <div key={item.label} style={{ background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Date Range */}
      {ds?.dateRange && (
        <div className="afi-card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.75rem' }}>Coverage Period</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Observations From', value: ds.dateRange.obsFrom },
              { label: 'Observations To', value: ds.dateRange.obsTo },
              { label: 'Travel From', value: ds.dateRange.travelFrom },
              { label: 'Travel To', value: ds.dateRange.travelTo },
            ].filter((item) => item.value).map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.label}</div>
                <div style={{ fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Airlines & Routes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <StateCard title="Airlines in Dataset" subtitle="Carriers present in airfare_observations">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
            {loading ? (
              <div className="skeleton-pulse" style={{ height: '2rem', width: '100%' }} />
            ) : (ds?.airlines || []).map((a) => (
              <span key={a} className="trend-badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--color-primary)', borderColor: 'rgba(59,130,246,0.2)' }}>
                {a}
              </span>
            ))}
          </div>
        </StateCard>

        <StateCard title="Airports in Dataset" subtitle={`${ds?.airportCount || 8} monitored airports`}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
            {loading ? (
              <div className="skeleton-pulse" style={{ height: '2rem', width: '100%' }} />
            ) : (ds?.airports || []).map((a) => (
              <span key={a.code || a} className="trend-badge" style={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {a.code || a} {a.city ? `· ${a.city}` : ''}
              </span>
            ))}
          </div>
        </StateCard>
      </div>

      {/* Booking Windows */}
      {ds?.bookingWindows && (
        <StateCard title="Booking Horizons" subtitle="Advance booking windows in the dataset">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
            {ds.bookingWindows.map((bw) => (
              <span key={bw} className="trend-badge up">{bw}</span>
            ))}
          </div>
        </StateCard>
      )}
    </div>
  );
}
