import React, { useState, useEffect } from 'react';
import StateCard from '../../components/common/StateCard';
import adminApi from '../../services/api/admin';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  Clock, 
  ChevronRight,
  Server,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

/**
 * AdminDashboardPage — View
 * ──────────────────────────
 * Renders the real PostgreSQL administrative metrics and audit logs.
 * No mock data. Displays live database counts and real audit event stream.
 */
export default function AdminDashboardPage({ onNavigate }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adminApi.getDashboardStats();
      if (res && res.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Unable to connect to administrative metrics service.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const stats = dashboardData?.stats;
  const recentActivity = dashboardData?.recentActivity || [];

  return (
    <div className="page-inner-container">
      <div className="page-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="hero-eyebrow" style={{ fontSize: '0.7rem' }}>Protected Admin Console</span>
          </div>
          <h1 className="page-title">Administrative Operations &amp; Database Health</h1>
          <p className="page-subtitle">
            Authenticated administrator view. Live PostgreSQL metrics, user management status, and security audit log stream.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={fetchStats}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh Metrics</span>
          </button>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => onNavigate('/admin/data')}
          >
            <span>Manage Ingestion Batches</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          background: 'var(--color-danger-subtle)', 
          border: '1px solid var(--color-danger)', 
          borderRadius: '8px', 
          padding: '0.75rem 1rem', 
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--color-danger)'
        }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '0.85rem' }}>{error}</span>
        </div>
      )}

      {/* Real PostgreSQL Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Total Registered Users */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Registered Accounts</span>
            <span className="trend-badge" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
              <Users size={12} />
              <span>PostgreSQL</span>
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem' }}>
            {isLoading ? '...' : (stats ? stats.totalUsers : 'Not available')}
          </div>
          <span className="kpi-context">Total user records in database</span>
        </div>

        {/* Active Accounts */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Active Users</span>
            <span className="trend-badge" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--color-success)' }}>
              <UserCheck size={12} />
              <span>Verified</span>
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem', color: 'var(--color-success)' }}>
            {isLoading ? '...' : (stats ? stats.activeUsers : 'Not available')}
          </div>
          <span className="kpi-context">Users with active authentication status</span>
        </div>

        {/* Admin Accounts */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Administrators</span>
            <span className="trend-badge" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--color-primary)' }}>
              <ShieldCheck size={12} />
              <span>Privileged</span>
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>
            {isLoading ? '...' : (stats ? stats.adminCount : 'Not available')}
          </div>
          <span className="kpi-context">Accounts holding ADMIN privileges</span>
        </div>

        {/* New Users (Last 30 Days) */}
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">New Users (30D)</span>
            <span className="trend-badge" style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-secondary)' }}>
              <Clock size={12} />
              <span>Recent</span>
            </span>
          </div>
          <div className="kpi-value" style={{ fontSize: '1.75rem' }}>
            {isLoading ? '...' : (stats ? stats.newUsers30d : 'Not available')}
          </div>
          <span className="kpi-context">Registrations in previous 30 days</span>
        </div>
      </div>

      {/* Real Audit Log Stream & Administrative Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
        <div className="afi-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Security Audit Event Stream</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Immutable audit records from PostgreSQL audit_logs table
              </p>
            </div>
            <span className="trend-badge" style={{ fontSize: '0.7rem' }}>
              {recentActivity.length} Events
            </span>
          </div>

          {recentActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              No audit events logged yet. Events are recorded on login, logout, and user modifications.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto' }}>
              {recentActivity.map((log) => (
                <div 
                  key={log.id} 
                  style={{ 
                    padding: '0.75rem', 
                    borderRadius: '6px', 
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {log.action}
                    </span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    Actor: {log.user_email || log.user_name || 'System'}
                  </div>
                  {log.ip_address && (
                    <div style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                      IP: {log.ip_address}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <StateCard
          title="Administrative Operations"
          subtitle="Direct controls for pipeline execution and calibration"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.75rem' }}>
            <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Batch Ingestion Trigger</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Manually invoke asynchronous pull from civil aviation data streams.
              </p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('/admin/data')}
              >
                Go to Batch Importer
              </button>
            </div>

            <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>Outlier Rule Calibration</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                Review prices quarantined under 3.5σ threshold before publish.
              </p>
              <button 
                type="button" 
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigate('/admin/quality')}
              >
                Inspect Quarantined Fares
              </button>
            </div>
          </div>
        </StateCard>
      </div>
    </div>
  );
}
