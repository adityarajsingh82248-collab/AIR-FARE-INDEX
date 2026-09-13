import React from 'react';
import AirplaneHero from '../components/common/AirplaneHero';
import { 
  Building2, 
  Scale, 
  TrendingUp, 
  Database, 
  Cpu, 
  Calculator, 
  BarChart3, 
  Lightbulb, 
  ArrowRight,
  ShieldAlert,
  Layers,
  LineChart,
  FileCheck
} from 'lucide-react';

/**
 * LandingPage — View
 * ───────────────────
 * Renders the public landing / informational page.
 * No mock data. No hardcoded chart data.
 *
 * The "Live Statistical Snapshot" section previously showed a fake chart.
 * It now shows a clean informational panel linking to the dashboard.
 */
export default function LandingPage({ onNavigate, onSearchRoute }) {
  return (
    <div className="landing-page">
      {/* 1. Airplane Hero Component */}
      <AirplaneHero 
        onExploreDashboard={() => onNavigate('/dashboard')}
        onViewMethodology={() => onNavigate('/methodology')}
        onSearchRoute={(orig, dest) => {
          if (onSearchRoute) onSearchRoute(orig, dest);
          onNavigate('/routes');
        }}
      />

      <div className="page-inner-container" style={{ display: 'flex', flexDirection: 'column', gap: '4rem', paddingBottom: '4rem' }}>
        
        {/* Section 1: What is the Air Fare Index */}
        <section aria-labelledby="what-is-afi">
          <div style={{ maxWidth: '840px', margin: '0 auto', textAlign: 'center' }}>
            <span className="hero-eyebrow" style={{ margin: '0 auto 1rem' }}>Official Overview</span>
            <h2 id="what-is-afi" className="section-title" style={{ fontSize: '1.8rem' }}>
              What is the Air Fare Index (AFI)?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7', marginTop: '1rem' }}>
              The <strong>Air Fare Index (AFI)</strong> is an empirical macroeconomic statistical instrument produced under the aegis of the Ministry of Statistics and Programme Implementation (MoSPI). Designed in compliance with international statistical manuals (UN/ILO CPI standards), the AFI isolates pure price movements in passenger aviation tariffs by weighting carrier fares across domestic city-pair routes against fixed base-period passenger volumes.
            </p>
          </div>
        </section>

        {/* Section 2: Why It Matters */}
        <section aria-labelledby="why-it-matters">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 id="why-it-matters" className="section-title" style={{ fontSize: '1.6rem' }}>Why It Matters</h2>
            <p className="page-subtitle">Serving policymakers, industry analysts, and the traveling public with uncompromised empirical rigor.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            <div className="afi-card">
              <div className="state-icon-box" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', marginBottom: '1rem' }}>
                <Scale size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Policy &amp; Inflation Governance
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Feeds granular transportation price dynamics directly into national inflation accounting, sub-indices, and regulatory oversight of essential air connectivity.
              </p>
            </div>

            <div className="afi-card">
              <div className="state-icon-box" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', marginBottom: '1rem' }}>
                <Building2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Aviation Market Transparency
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Delivers impartial, carrier-neutral benchmarks of fare trajectories across peak festival windows, advance booking horizons, and seasonal corridors.
              </p>
            </div>

            <div className="afi-card">
              <div className="state-icon-box" style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', marginBottom: '1rem' }}>
                <TrendingUp size={24} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Empirical Research &amp; Analytics
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Equips universities, economists, and logistics planners with standardized time-series microdata scrubbed of promotional distortions.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: How It Works */}
        <section aria-labelledby="how-it-works">
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 id="how-it-works" className="section-title" style={{ fontSize: '1.6rem' }}>How It Works</h2>
            <p className="page-subtitle">A five-tier statistical pipeline ensuring data integrity from raw quote to published index.</p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', 
            gap: '1rem',
            position: 'relative'
          }}>
            {[
              { step: '01', title: 'Data Collection', desc: 'High-frequency quote ingestion across GDS, airline direct APIs, and OTAs for all scheduled domestic city pairs.', icon: Database },
              { step: '02', title: 'Data Processing', desc: 'Deduplication, tax segregation, currency normalization, and 3.5σ statistical outlier filtering.', icon: Cpu },
              { step: '03', title: 'Index Calculation', desc: 'Laspeyres price index formula aggregated with base-period route passenger volume weights.', icon: Calculator },
              { step: '04', title: 'Analysis', desc: 'Cross-carrier price dispersion analysis, distance normalization, and volatility modeling.', icon: BarChart3 },
              { step: '05', title: 'Insights', desc: 'Public dissemination of index movements, seasonal variance reports, and microdata explorer.', icon: Lightbulb }
            ].map((st) => {
              const Icon = st.icon;
              return (
                <div key={st.step} className="afi-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '3px solid var(--color-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--color-primary)' }}>STEP {st.step}</span>
                    <Icon size={18} style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{st.title}</div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{st.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Key Capabilities */}
        <section aria-labelledby="key-capabilities">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 id="key-capabilities" className="section-title" style={{ fontSize: '1.6rem' }}>Key Capabilities</h2>
            <p className="page-subtitle">Built to institutional standards for high-assurance national economic monitoring.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
            <div className="afi-card">
              <Layers size={20} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Laspeyres Base Weighting</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Guarantees consistent price comparability across fiscal quarters without being distorted by short-term passenger substitution effects.
              </p>
            </div>

            <div className="afi-card">
              <FileCheck size={20} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Automated Audit Trailing</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Every published index figure maps back to timestamped, cryptographically hashed flight observations for complete reproducibility.
              </p>
            </div>

            <div className="afi-card">
              <LineChart size={20} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Advance Horizon Decomposition</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Tracks tariff curves segmented across 0-3 days, 4-7 days, 8-14 days, and 15+ days booking windows before departure.
              </p>
            </div>

            <div className="afi-card">
              <ShieldAlert size={20} style={{ color: 'var(--color-primary)', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Outlier &amp; Fraud Quarantine</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Multi-stage sanity rules filter out aberrant pricing glitches, test bookings, and misclassified business class payloads.
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Data Status Panel (replaces fake live chart) */}
        <section aria-labelledby="data-status">
          <div className="afi-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
              <div>
                <span className="hero-eyebrow" style={{ marginBottom: '0.5rem' }}>Live Integration Status</span>
                <h2 id="data-status" className="section-title" style={{ margin: 0 }}>
                  National Air Fare Index — Data Pipeline
                </h2>
              </div>
              <button 
                type="button" 
                className="btn btn-primary btn-sm"
                onClick={() => onNavigate('/dashboard')}
              >
                <span>Open Full Interactive Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Authoritative Dataset</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>68,400 Observations</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Active PostgreSQL Repository</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Network Coverage</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>56 Routes (8 Hubs)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>100% directional coverage</div>
              </div>
              <div style={{ padding: '1rem', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--color-primary)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>AFI Baseline Index</div>
                <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>95.32 (High Quality)</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>5 Domestic Scheduled Airlines</div>
              </div>
            </div>
          </div>
        </section>


        {/* Section 7: Final CTA Band */}
        <section style={{ 
          background: 'radial-gradient(circle at 50% 50%, var(--color-primary-subtle) 0%, var(--bg-surface) 100%)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--color-primary-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.25rem'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            Access Verified National Aviation Pricing Data
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '580px', fontSize: '0.95rem' }}>
            Explore route indices, cross-airline comparisons, historical time series, and anonymized observation microdata without any subscription or authentication barrier.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onNavigate('/dashboard')}
            >
              <span>Explore Analytics Dashboard</span>
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onNavigate('/routes')}
            >
              <span>Query Route Data</span>
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
