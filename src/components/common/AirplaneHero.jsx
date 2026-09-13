import React, { useState } from 'react';
import { ArrowRight, BookOpen, Compass, Search, PlaneTakeoff, ShieldCheck, Activity } from 'lucide-react';

export default function AirplaneHero({
  onExploreDashboard,
  onViewMethodology,
  onSearchRoute,
  airportOptions = []
}) {
  const [origin, setOrigin] = useState('DEL');
  const [destination, setDestination] = useState('BOM');

  const handleRouteSubmit = (e) => {
    e.preventDefault();
    if (onSearchRoute) {
      onSearchRoute(origin, destination);
    }
  };

  return (
    <section className="airplane-hero-section" aria-label="Air Fare Index Hero Banner">
      {/* Left Column: Official Headings, Summary, Route Lookup & CTAs */}
      <div className="hero-left-content">
        <div className="hero-eyebrow">
          <ShieldCheck size={15} />
          <span>Official National Statistics • MoSPI</span>
        </div>

        <h1 className="hero-title">
          National <span className="accent-text">Air Fare Index</span> (AFI)
        </h1>

        <p className="hero-description">
          A standardized, empirical price index monitoring temporal and spatial airfare movements across India’s civil aviation network. Built for macro-economic inflation measurement, price volatility assessment, and evidence-based policy formulation.
        </p>

        {/* Route Index Quick Lookup Widget */}
        <div className="hero-route-widget">
          <div className="widget-title">
            <Compass size={15} style={{ color: 'var(--color-primary)' }} />
            <span>Check Route Price Index</span>
          </div>

          <form onSubmit={handleRouteSubmit}>
            <div className="route-inputs-row">
              <div className="filter-group">
                <label className="filter-label" htmlFor="hero-origin">Origin Hub</label>
                <select
                  id="hero-origin"
                  className="form-select"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                >
                  <option value="DEL">Delhi (DEL)</option>
                  <option value="BOM">Mumbai (BOM)</option>
                  <option value="BLR">Bengaluru (BLR)</option>
                  <option value="HYD">Hyderabad (HYD)</option>
                  <option value="MAA">Chennai (MAA)</option>
                  <option value="CCU">Kolkata (CCU)</option>
                  <option value="AMD">Ahmedabad (AMD)</option>
                  <option value="GOI">Goa (GOI)</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label" htmlFor="hero-destination">Destination Hub</label>
                <select
                  id="hero-destination"
                  className="form-select"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                >
                  <option value="BOM">Mumbai (BOM)</option>
                  <option value="DEL">Delhi (DEL)</option>
                  <option value="BLR">Bengaluru (BLR)</option>
                  <option value="HYD">Hyderabad (HYD)</option>
                  <option value="MAA">Chennai (MAA)</option>
                  <option value="CCU">Kolkata (CCU)</option>
                  <option value="AMD">Ahmedabad (AMD)</option>
                  <option value="GOI">Goa (GOI)</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Search size={16} />
              <span>Query Route Index ({origin} → {destination})</span>
            </button>
          </form>
        </div>

        {/* CTAs */}
        <div className="hero-cta-group">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onExploreDashboard}
          >
            <span>Explore Dashboard</span>
            <ArrowRight size={16} />
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={onViewMethodology}
          >
            <BookOpen size={16} />
            <span>View Methodology</span>
          </button>
        </div>
      </div>

      {/* Right Column: Ascending Commercial Airplane Illustration with Animated Paths & Data Overlay */}
      <div className="hero-visual-wrapper">
        <div className="airplane-image-container floating-airplane-card">
          <img 
            src="/assets/hero-airplane.jpg" 
            alt="Commercial airliner ascending with flight trajectory data points" 
            className="airplane-hero-img"
          />

          {/* SVG Animated Dash Flight Trajectory Arc */}
          <svg 
            className="flight-path-svg" 
            viewBox="0 0 500 300" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path 
              d="M 30 260 C 140 220, 240 180, 440 60" 
              stroke="#38bdf8" 
              strokeWidth="2.5" 
              strokeLinecap="round"
              className="animated-dash-line"
              opacity="0.8"
            />
            <circle cx="440" cy="60" r="5" fill="#38bdf8" />
            <circle cx="440" cy="60" r="10" stroke="#38bdf8" strokeWidth="1.5" opacity="0.5" />
          </svg>

          {/* Floating Data Point Chips */}
          <div className="flight-data-chip chip-status">
            <span className="live-indicator-dot" />
            <span>MoSPI Ingestion: <strong>Active (T+0)</strong></span>
          </div>

          <div className="flight-data-chip chip-del-bom">
            <PlaneTakeoff size={14} style={{ color: '#38bdf8' }} />
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.68rem', display: 'block' }}>Key Benchmark Corridor</span>
              <strong>DEL ⇄ BOM: Index 146.2 (+5.1%)</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
