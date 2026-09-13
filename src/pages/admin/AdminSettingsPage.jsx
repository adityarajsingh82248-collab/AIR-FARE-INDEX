import React, { useState } from 'react';
import StateCard from '../../components/common/StateCard';
import { Sliders, Lock, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../components/common/ToastContext';

export default function AdminSettingsPage() {
  const [outlierThreshold, setOutlierThreshold] = useState('3.5');
  const [batchInterval, setBatchInterval] = useState('15');
  const [enableAutoQuarantine, setEnableAutoQuarantine] = useState(true);
  const [notificationEmail, setNotificationEmail] = useState('alerts-afi@mospi.gov.in');

  const { addToast } = useToast();

  const handleSaveSettings = (e) => {
    e.preventDefault();
    addToast('Administrative system configurations updated successfully', 'success');
  };

  return (
    <div className="page-inner-container">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Statistical Pipeline Settings & Governance</h1>
          <p className="page-subtitle">
            Configure data ingestion thresholds, aggregation intervals, and security encryption parameters.
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveSettings}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
          
          {/* Card 1: Statistical Parameters */}
          <div className="afi-card">
            <h2 className="afi-card-title" style={{ marginBottom: '1rem' }}>
              Statistical Validation Thresholds
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="filter-group">
                <label className="filter-label" htmlFor="outlier-sigma">Outlier Sigma Ceiling (σ)</label>
                <input
                  id="outlier-sigma"
                  type="number"
                  step="0.1"
                  className="form-input"
                  value={outlierThreshold}
                  onChange={(e) => setOutlierThreshold(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Quotes exceeding this distance from the corridor median are sent to quarantine.
                </span>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="batch-interval">Ingestion Polling Frequency (Minutes)</label>
                <input
                  id="batch-interval"
                  type="number"
                  className="form-input"
                  value={batchInterval}
                  onChange={(e) => setBatchInterval(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  Interval for checking new airline tariff feeds.
                </span>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={enableAutoQuarantine}
                  onChange={(e) => setEnableAutoQuarantine(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                  Enable automatic anomaly quarantine (Recommended)
                </span>
              </label>
            </div>
          </div>

          {/* Card 2: Sensitive Server-Managed Fields (Read-Only) */}
          <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 className="afi-card-title">
                Core Cryptographic & Ingestion Keys
              </h2>
              <span className="trend-badge down" style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
                <Lock size={12} />
                <span>Read-Only</span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="filter-group">
                <label className="filter-label">Official Base Period Identifier</label>
                <input
                  type="text"
                  className="form-input"
                  value="BASE-YEAR-2022-CY (DGCA WEIGHTS V2.1)"
                  disabled
                  style={{ background: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Amadeus NDC Ingestion Endpoint</label>
                <input
                  type="text"
                  className="form-input"
                  value="https://ndc.api.amadeus.gov.in/v2/fares/stream (TLS 1.3)"
                  disabled
                  style={{ background: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Database Shard Cluster</label>
                <input
                  type="text"
                  className="form-input"
                  value="mospi-afi-prod-delhi-dc01 (Replication Active)"
                  disabled
                  style={{ background: 'var(--bg-surface)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                />
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Note: Core cryptographic credentials and base period weights can only be modified through MoSPI National Informatics Centre (NIC) hardware security modules.
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            <span>Save Configuration Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
