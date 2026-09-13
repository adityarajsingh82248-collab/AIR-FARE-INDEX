import React, { useState, useEffect } from 'react';
import StateCard from '../components/common/StateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { Building2 } from 'lucide-react';
import { AIRLINES } from '../config/airlines.js';
import { fetchAirlineIndex } from '../services/api/indexApi.js';

/**
 * AirlineAnalysisPage — View
 * ───────────────────────────
 * Renders carrier-specific price analysis.
 * All data sourced from the authoritative dataset (airfare_index_upgraded_8airports.csv)
 * via /api/index/airlines.
 *
 * 5 airlines: Air India (AI), Air India Express (IX), Akasa Air (QP), IndiGo (6E), SpiceJet (SG)
 * No mock data. No hardcoded AFI or fare values.
 */

// Map IATA code → dataset airline name (matches column 'airline' in airfare_observations)
const IATA_TO_DATASET = {
  '6E': 'IndiGo',
  'AI': 'Air India',
  'IX': 'Air India Express',
  'QP': 'Akasa Air',
  'SG': 'SpiceJet',
};

const DATASET_AIRLINES = Object.values(IATA_TO_DATASET);

export default function AirlineAnalysisPage() {
  const [selectedAirlineId, setSelectedAirlineId] = useState('6E');
  const [indexData, setIndexData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentAirline = AIRLINES.find((a) => a.id === selectedAirlineId) || AIRLINES[1];
  const datasetAirlineName = IATA_TO_DATASET[selectedAirlineId] || null;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAirlineIndex({ airline: datasetAirlineName })
      .then((data) => {
        if (!cancelled) setIndexData(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedAirlineId, datasetAirlineName]);

  const fmtFare = (n) =>
    n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` : 'N/A';

  const fmtIndex = (n) => (n != null ? n.toFixed(2) : 'N/A');

  // Selected airline data from the all-airlines summary
  const selectedSummary = indexData?.airlineSummaries?.find(
    (s) => s.airline === datasetAirlineName
  );

  // National overall avg fare for comparison
  const nationalAvgFare = indexData?.airlineSummaries?.length
    ? indexData.airlineSummaries.reduce((s, a) => s + (a.avgFare || 0), 0) / indexData.airlineSummaries.length
    : null;

  const vsNational =
    selectedSummary?.avgFare != null && nationalAvgFare != null
      ? ((selectedSummary.avgFare - nationalAvgFare) / nationalAvgFare) * 100
      : null;

  // Chart data: all airlines for the national comparison chart
  const airlineComparisonData = (indexData?.airlineSummaries || [])
    .filter((a) => a.avgFare != null)
    .sort((a, b) => b.avgFare - a.avgFare)
    .map((a) => ({ label: a.airline, value: a.avgFare }));

  // Corridor fare sample for selected airline
  const corridorData = (indexData?.routeBreakdown || [])
    .filter((r) => r.avgFare != null)
    .sort((a, b) => b.avgFare - a.avgFare)
    .map((r) => ({ label: r.route, value: r.avgFare }));

  const isDatasetAirline = DATASET_AIRLINES.includes(datasetAirlineName);

  return (
    <div className="page-inner-container">
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Airline Pricing &amp; Index Dynamics</h1>
          <p className="page-subtitle">
            Carrier-specific price indices, fare benchmarks against national aggregates, and corridor distribution.
          </p>
        </div>
      </div>

      {/* Airline Selector Bar */}
      <div className="filter-bar-container">
        <div className="filter-group" style={{ maxWidth: '400px' }}>
          <label className="filter-label" htmlFor="carrier-select">Select Scheduled Carrier</label>
          <select
            id="carrier-select"
            className="form-select"
            value={selectedAirlineId}
            onChange={(e) => setSelectedAirlineId(e.target.value)}
          >
            {AIRLINES.filter((a) => a.id !== 'all').map((airline) => (
              <option key={airline.id} value={airline.id}>
                {airline.fullName || airline.name}
                {DATASET_AIRLINES.includes(IATA_TO_DATASET[airline.id]) ? '' : ' (not in dataset)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Carrier Banner */}
      <div className="afi-card" style={{ background: 'var(--color-primary-subtle)', borderColor: 'var(--color-primary-border)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="brand-icon-box" style={{ width: '44px', height: '44px' }}>
            <Building2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{currentAirline.fullName || currentAirline.name}</h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              IATA: {currentAirline.iata} {!isDatasetAirline && '· Not in monitored dataset'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Carrier AFI</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: selectedSummary?.avgIndex != null ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
              {loading ? '—' : isDatasetAirline ? fmtIndex(selectedSummary?.avgIndex) : 'N/A'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>vs National Avg Fare</span>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: vsNational == null ? 'var(--text-tertiary)' : vsNational > 0 ? '#f59e0b' : '#10b981',
              }}
            >
              {loading
                ? '—'
                : vsNational != null
                ? `${vsNational > 0 ? '+' : ''}${vsNational.toFixed(1)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="kpi-grid">
        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <span className="kpi-label">Average Observed Fare</span>
          <div className="kpi-value" style={{ fontSize: '1.3rem', color: isDatasetAirline && selectedSummary?.avgFare ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {loading ? '—' : isDatasetAirline ? fmtFare(selectedSummary?.avgFare) : 'N/A'}
          </div>
          <span className="kpi-context">Across carrier domestic network (Economy)</span>
        </div>

        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <span className="kpi-label">Average Load Factor</span>
          <div className="kpi-value" style={{ fontSize: '1.3rem', color: isDatasetAirline && selectedSummary?.avgLoadFactor ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {loading ? '—' : isDatasetAirline && selectedSummary?.avgLoadFactor != null ? `${(selectedSummary.avgLoadFactor * 100).toFixed(1)}%` : 'N/A'}
          </div>
          <span className="kpi-context">Audited seat utilization across carrier network</span>
        </div>

        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <span className="kpi-label">Network Reach</span>
          <div className="kpi-value" style={{ fontSize: '1.3rem', color: isDatasetAirline && selectedSummary?.routeCount ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {loading ? '—' : isDatasetAirline ? (selectedSummary?.routeCount ?? 'N/A') : 'N/A'}
          </div>
          <span className="kpi-context">Distinct monitored city pair operations</span>
        </div>

        <div className={`kpi-card ${loading ? 'skeleton-pulse' : ''}`}>
          <span className="kpi-label">Monthly Observations</span>
          <div className="kpi-value" style={{ fontSize: '1.3rem', color: isDatasetAirline && selectedSummary?.sampleCount ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
            {loading ? '—' : isDatasetAirline ? (selectedSummary?.sampleCount ?? 'N/A') : 'N/A'}
          </div>
          <span className="kpi-context">Aggregated raw Economy quotes (2026-09)</span>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Carrier vs National Baseline */}
        <StateCard
          title="Carrier Average Fare vs National Average"
          subtitle="Average Economy fare by airline across all monitored routes"
        >
          {loading ? (
            <div className="skeleton-pulse" style={{ height: 220, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
          ) : airlineComparisonData.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <BarChart
                data={airlineComparisonData}
                xKey="label"
                yKey="value"
                height={220}
                multiColor
                formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              {error ? 'Could not load airline data. Is the backend running?' : 'No data available'}
            </div>
          )}
        </StateCard>

        {/* Corridor Fare Sample */}
        <StateCard
          title="Corridor Fare Sample"
          subtitle={`Economy fare averages per route — ${isDatasetAirline ? (currentAirline.fullName || currentAirline.name) : 'Airline not in dataset'}`}
        >
          {loading ? (
            <div className="skeleton-pulse" style={{ height: 220, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
          ) : corridorData.length > 0 ? (
            <div style={{ marginTop: '0.75rem' }}>
              <BarChart
                data={corridorData}
                xKey="label"
                yKey="value"
                height={220}
                color="#10b981"
                formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
              {!isDatasetAirline
                ? 'This airline is not in the monitored dataset. Dataset contains: IndiGo, Air India, SpiceJet.'
                : 'No route data for this airline'}
            </div>
          )}
        </StateCard>
      </div>
    </div>
  );
}
