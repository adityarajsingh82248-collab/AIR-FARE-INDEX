import React, { useState, useEffect } from 'react';
import StateCard from '../components/common/StateCard';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { 
  PlaneTakeoff, 
  ArrowRight,
  Plane,
  AlertCircle
} from 'lucide-react';
import { useRouteData } from '../hooks/useRouteData.js';
import { fetchRouteIndex } from '../services/api/indexApi.js';
import { AIRPORTS } from '../config/airports.js';

/**
 * RouteAnalysisPage — View
 * ─────────────────────────
 * Renders route-level analysis for a selected origin-destination pair.
 *
 * Data sources:
 *   1. Aviationstack → flight schedule data (via useRouteData)
 *   2. /api/index/route → real fare + index data from modeltest dataset
 *
 * No mock data. No hardcoded fare values.
 */
export default function RouteAnalysisPage({
  initialRoute = 'DEL-BOM'
}) {
  const [selectedOrigin, setSelectedOrigin] = useState('DEL');
  const [selectedDest, setSelectedDest] = useState('BOM');

  // Index/fare data from real dataset
  const [fareData, setFareData] = useState(null);
  const [fareLoading, setFareLoading] = useState(false);
  const [fareError, setFareError] = useState(null);

  const hasRouteSelected = Boolean(
    selectedOrigin && selectedDest && selectedOrigin !== selectedDest
  );

  const { data: routeData, isLoading, isError, error, refetch } = useRouteData(
    hasRouteSelected ? selectedOrigin : null,
    hasRouteSelected ? selectedDest : null
  );

  // Fetch real fare data from modeltest dataset whenever route changes
  useEffect(() => {
    if (!hasRouteSelected) {
      setFareData(null);
      return;
    }

    let cancelled = false;
    setFareLoading(true);
    setFareError(null);

    fetchRouteIndex(`${selectedOrigin}-${selectedDest}`)
      .then((data) => {
        if (!cancelled) setFareData(data);
      })
      .catch((err) => {
        if (!cancelled) setFareError(err);
      })
      .finally(() => {
        if (!cancelled) setFareLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedOrigin, selectedDest, hasRouteSelected]);

  // Chart data
  const bookingWindowData = (fareData?.bookingWindowSeries || [])
    .filter((r) => r.avgFare != null)
    .map((r) => ({ label: r.booking_window, avgFare: r.avgFare, index_value: r.index_value }));

  const airlineDispersionData = (fareData?.airlineBreakdown || [])
    .filter((a) => a.avgFare != null)
    .sort((a, b) => b.avgFare - a.avgFare)
    .map((a) => ({ label: a.airline, value: a.avgFare }));

  const fmtFare = (n) =>
    n != null ? `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(n))}` : '—';

  const getFlightPrice = (flight) => {
    if (!fareData) return null;
    const IATA_MAP = {
      '6E': 'IndiGo',
      'AI': 'Air India',
      'IX': 'Air India Express',
      'QP': 'Akasa Air',
      'SG': 'SpiceJet',
    };
    const code = flight.iataCode || flight.flightNumber?.slice(0, 2)?.toUpperCase();
    const mappedName = IATA_MAP[code];
    const flightAirlineLower = (flight.airline || '').toLowerCase();
    const mappedLower = (mappedName || '').toLowerCase();

    const carrierMatch = fareData.airlineBreakdown?.find((a) => {
      const aLower = (a.airline || '').toLowerCase();
      return (
        (mappedLower && aLower.includes(mappedLower)) ||
        (flightAirlineLower && (aLower.includes(flightAirlineLower) || flightAirlineLower.includes(aLower)))
      );
    });

    if (carrierMatch && carrierMatch.avgFare) {
      return carrierMatch.avgFare;
    }

    return fareData.avgFare || null;
  };

  const indexValue = fareData?.index_value;
  const indexLabel = indexValue != null ? indexValue.toFixed(2) : null;

  return (
    <div className="page-inner-container">
      {/* Title */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Route-Level Price Analysis</h1>
          <p className="page-subtitle">
            Deep-dive index tracking, historical fare curves, and carrier price dispersion for specific domestic city pairs.
          </p>
        </div>
      </div>

      {/* Filter Bar for Route */}
      <div className="filter-bar-container" style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <PlaneTakeoff size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Select Route Pair for Analysis</span>
        </div>

        <div className="filter-bar-grid">
          <div className="filter-group">
            <label className="filter-label" htmlFor="route-orig">Origin Airport</label>
            <select
              id="route-orig"
              className="form-select"
              value={selectedOrigin}
              onChange={(e) => setSelectedOrigin(e.target.value)}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code}) — {airport.name.split('(')[0].trim()}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label" htmlFor="route-dest">Destination Airport</label>
            <select
              id="route-dest"
              className="form-select"
              value={selectedDest}
              onChange={(e) => setSelectedDest(e.target.value)}
            >
              {AIRPORTS.map((airport) => (
                <option key={airport.code} value={airport.code}>
                  {airport.city} ({airport.code}) — {airport.name.split('(')[0].trim()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!hasRouteSelected ? (
        <StateCard
          state="empty"
          emptyMessage="Please select differing Origin and Destination airports to view route analytics."
        />
      ) : (
        <>
          {/* Selected Route Header Strip */}
          <div className="afi-card" style={{ background: 'var(--color-primary-subtle)', borderColor: 'var(--color-primary-border)', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="brand-icon-box" style={{ width: '42px', height: '42px' }}>
                <PlaneTakeoff size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {selectedOrigin} → {selectedDest} Corridor
                </h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {fareData
                    ? `${fareData.totalObservations} observation${fareData.totalObservations !== 1 ? 's' : ''} · ${fareData.airlineBreakdown?.length || 0} carrier${fareData.airlineBreakdown?.length !== 1 ? 's' : ''}`
                    : fareLoading
                    ? 'Loading fare data…'
                    : isLoading
                    ? 'Loading…'
                    : routeData
                    ? `${routeData.totalFlights} flight${routeData.totalFlights !== 1 ? 's' : ''} · ${routeData.airlines.length} carrier${routeData.airlines.length !== 1 ? 's' : ''}`
                    : 'No data'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              {fareData && (
                <>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Avg Fare</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {fmtFare(fareData.avgFare)}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Route Index (AFI)</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: indexLabel ? 'var(--color-primary)' : 'var(--text-tertiary)' }}>
                      {indexLabel || 'Base Period'}
                    </span>
                  </div>
                </>
              )}
              {!fareData && !fareLoading && (
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>Route Index (AFI)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>
                    {fareError ? 'No data for route' : '—'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {fareData && (
            <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="kpi-card">
                <span className="kpi-label">Average Fare</span>
                <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{fmtFare(fareData.avgFare)}</div>
                <span className="kpi-context">Median-based representative price</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Minimum Fare</span>
                <div className="kpi-value" style={{ fontSize: '1.4rem', color: '#10b981' }}>{fmtFare(fareData.minFare)}</div>
                <span className="kpi-context">Lowest observed Economy quote</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Maximum Fare</span>
                <div className="kpi-value" style={{ fontSize: '1.4rem', color: '#f59e0b' }}>{fmtFare(fareData.maxFare)}</div>
                <span className="kpi-context">Highest observed Economy quote</span>
              </div>
              <div className="kpi-card">
                <span className="kpi-label">Observations</span>
                <div className="kpi-value" style={{ fontSize: '1.4rem' }}>{fareData.totalObservations}</div>
                <span className="kpi-context">Valid Economy records on corridor</span>
              </div>
              {fareData.avgLoadFactor != null && (
                <div className="kpi-card">
                  <span className="kpi-label">Avg Load Factor</span>
                  <div className="kpi-value" style={{ fontSize: '1.4rem' }}>
                    {(fareData.avgLoadFactor * 100).toFixed(1)}%
                  </div>
                  <span className="kpi-context">Seat utilization across aircraft</span>
                </div>
              )}
              {fareData.avgDemandScore != null && (
                <div className="kpi-card">
                  <span className="kpi-label">Demand Score</span>
                  <div className="kpi-value" style={{ fontSize: '1.4rem' }}>
                    {fareData.avgDemandScore.toFixed(2)}
                  </div>
                  <span className="kpi-context">Normalized route demand metric</span>
                </div>
              )}
            </div>
          )}

          {/* Flight List from Aviationstack */}
          {isLoading ? (
            <StateCard state="loading" title="Active Flights on Corridor" />
          ) : isError ? (
            <StateCard
              title="Active Flights on Corridor"
              state="error"
              errorMessage={error?.message || 'Failed to fetch flight data from Aviationstack.'}
              onRetry={refetch}
            />
          ) : routeData?.hasData ? (
            <StateCard
              title="Active Flights & Current Airfare on Corridor"
              subtitle={`Active flights & current economy pricing for ${selectedOrigin} → ${selectedDest}`}
            >
              <div className="table-scroll-wrap" style={{ marginTop: '0.75rem' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Flight No.</th>
                      <th>Airline</th>
                      <th>Origin</th>
                      <th>Destination</th>
                      <th>Departure</th>
                      <th>Arrival</th>
                      <th>Current Pricing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routeData.flights.map((flight, idx) => {
                      const price = getFlightPrice(flight);
                      return (
                        <tr key={`${flight.flightNumber}-${idx}`}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{flight.flightNumber}</td>
                          <td>{flight.airline || flight.iataCode || '—'}</td>
                          <td style={{ fontWeight: 600 }}>{flight.origin}</td>
                          <td style={{ fontWeight: 600 }}>{flight.destination}</td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {flight.departureTime
                              ? new Date(flight.departureTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                            {flight.arrivalTime
                              ? new Date(flight.arrivalTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td>
                            {price ? (
                              <span
                                className="trend-badge up"
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 700,
                                  background: 'rgba(16,185,129,0.12)',
                                  color: '#10b981',
                                  borderColor: 'rgba(16,185,129,0.25)',
                                }}
                              >
                                {fmtFare(price)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                                {fmtFare(fareData?.avgFare)}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </StateCard>
          ) : (
            <StateCard
              title="Active Flights on Corridor"
              state="empty"
              emptyMessage={`No live flights found for ${selectedOrigin} → ${selectedDest}. Aviationstack may not return results for this corridor.`}
            />
          )}

          {/* Charts — from real modeltest dataset */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginTop: '1.5rem' }}>
            {/* Fare by Booking Window */}
            <StateCard
              title="Fare by Advance Booking Window"
              subtitle={`Economy fare trend for ${selectedOrigin}–${selectedDest} by lead time (modeltest data)`}
            >
              {fareLoading ? (
                <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
              ) : bookingWindowData.length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <LineChart
                    data={bookingWindowData}
                    xKey="label"
                    lines={[
                      { key: 'avgFare', color: '#3b82f6', name: 'Avg Fare (₹)' },
                    ]}
                    height={200}
                    formatTooltipValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  {fareError ? 'Route not in monitored dataset. Available airports: DEL, BOM, BLR, HYD, MAA, CCU, AMD, GOI.' : 'No data available'}
                </div>
              )}
            </StateCard>

            {/* Airline Pricing Dispersion */}
            <StateCard
              title="Airline Pricing Dispersion on Route"
              subtitle={`Average carrier fares on ${selectedOrigin}–${selectedDest} corridor`}
            >
              {fareLoading ? (
                <div className="skeleton-pulse" style={{ height: 200, borderRadius: 'var(--radius-md)', marginTop: '0.75rem' }} />
              ) : airlineDispersionData.length > 0 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <BarChart
                    data={airlineDispersionData}
                    xKey="label"
                    yKey="value"
                    height={200}
                    multiColor
                    formatValue={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`}
                  />
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  {fareError ? 'Route not in monitored dataset.' : 'No airline data for this route'}
                </div>
              )}
            </StateCard>
          </div>
        </>
      )}
    </div>
  );
}
