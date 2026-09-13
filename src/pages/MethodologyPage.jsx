import React, { useState } from 'react';
import { 
  BookOpen, 
  Database, 
  Filter, 
  Layers, 
  Calculator, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  CheckCircle,
  FileSpreadsheet,
  Globe
} from 'lucide-react';

export default function MethodologyPage() {
  const [activeSection, setActiveSection] = useState('sources');

  const sections = [
    { id: 'sources', title: 'Data Sources', icon: Database },
    { id: 'collection', title: 'Data Collection', icon: Globe },
    { id: 'cleaning', title: 'Data Cleaning', icon: Filter },
    { id: 'normalization', title: 'Fare Normalization', icon: Layers },
    { id: 'classification', title: 'Classification', icon: FileSpreadsheet },
    { id: 'weighting', title: 'Weighting Schema', icon: Layers },
    { id: 'base-period', title: 'Base Period', icon: Clock },
    { id: 'calculation', title: 'Index Calculation', icon: Calculator },
    { id: 'aggregation', title: 'Spatial Aggregation', icon: Calculator },
    { id: 'validation', title: 'Audit & Validation', icon: ShieldCheck },
    { id: 'limitations', title: 'Methodological Limitations', icon: AlertTriangle },
    { id: 'coverage', title: 'Network Coverage', icon: Globe },
    { id: 'frequency', title: 'Update Frequency', icon: Clock }
  ];

  const scrollTo = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="page-inner-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 className="page-title">Statistical Methodology & Standards</h1>
          <p className="page-subtitle">
            Technical formulation, data sanitation standards, Laspeyres weighting protocols, and governance framework.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2rem', alignItems: 'flex-start' }}>
          
          {/* Sticky In-Page Side Nav (Desktop) / Top Tabs (Mobile) */}
          <nav 
            className="afi-card" 
            style={{ 
              position: 'sticky', 
              top: 'calc(var(--masthead-height) + var(--appheader-height) + 1.5rem)', 
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              maxHeight: 'calc(100vh - 180px)',
              overflowY: 'auto'
            }}
            aria-label="Methodology Section Navigation"
          >
            <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Documentation Index
            </div>
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => scrollTo(s.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: isActive ? 'var(--color-primary-subtle)' : 'transparent',
                    color: isActive ? 'var(--color-primary-dark)' : 'var(--text-secondary)',
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={14} />
                  <span>{s.title}</span>
                </button>
              );
            })}
          </nav>

          {/* Methodology Content Blocks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* 1. Data Sources */}
            <section id="sources" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Database size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>1. Data Sources</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.25rem' }}>
                The Air Fare Index captures passenger flight pricing through three high-volume automated data conduits:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>Global Distribution Systems (GDS)</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Direct multi-host feeds collecting published published tariffs across domestic carriers.</p>
                </div>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>Direct Carrier NDC APIs</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Server-to-server real-time inventory queries for Low-Cost Carriers (LCCs) and Full-Service Carriers (FSCs).</p>
                </div>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.35rem' }}>Online Travel Portals (OTAs)</div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Secondary benchmark audit sampling to capture consumer-facing retail transaction dynamics.</p>
                </div>
              </div>
            </section>

            {/* 2. Data Collection */}
            <section id="collection" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Globe size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>2. Data Collection Protocol</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Automated querying runs on a round-the-clock sampling cadence. Quotes are collected across systematic advance purchase intervals (T+1, T+7, T+15, T+30, and T+45 days) to accurately represent dynamic yield-management curves rather than static snapshot pricing.
              </p>
            </section>

            {/* 3. Data Cleaning */}
            <section id="cleaning" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Filter size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>3. Data Cleaning & Outlier Scrubbing</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
                Every raw quote passes through an automated validation layer designed to eliminate data anomalies:
              </p>
              <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.875rem' }}>
                <li><strong>Outlier Bounds:</strong> Prices deviating by more than ±3.5 standard deviations from the 30-day moving corridor median are quarantined.</li>
                <li><strong>Duplicate De-biasing:</strong> Identical quotes generated within a 60-second window across multiple aggregation streams are deduplicated.</li>
                <li><strong>Error Pruning:</strong> Null airport codes, corrupted fare breakdowns, or negative base fares are automatically discarded.</li>
              </ul>
            </section>

            {/* 4. Fare Normalization */}
            <section id="normalization" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Layers size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>4. Fare Normalization</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Fares are decomposed into two core statistical components: <em>Base Passenger Fare</em> (including airline fuel surcharges) and <em>Statutory Non-Airline Taxes</em> (User Development Fee, Passenger Service Fee, GST). The primary Air Fare Index tracks base passenger transportation expenditure to isolate genuine carrier pricing shifts from statutory fiscal changes.
              </p>
            </section>

            {/* 5. Classification */}
            <section id="classification" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <FileSpreadsheet size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>5. Classification Standards</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                Routes are categorized into Trunk Corridors (High Density), Tier-II Metro Connectors, Regional Connectivity Scheme (UDAN) Sectors, and Remote Island/Hilly Corridors in alignment with Ministry of Civil Aviation (MoCA) Route Dispersal Guidelines (RDG).
              </p>
            </section>

            {/* 6. Weighting & Base Period */}
            <section id="weighting" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Clock size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>6. Weighting Schema & Base Period</h2>
              </div>
              <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)', borderLeft: '4px solid var(--color-primary)', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Official Base Period: Calendar Year 2022 = 100.0</div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Base weights are established utilizing full-year audited passenger embarkation numbers published by the Directorate General of Civil Aviation (DGCA).
                </p>
              </div>
            </section>

            {/* 7. Index Calculation */}
            <section id="calculation" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Calculator size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>7. Index Calculation Formulation</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1rem' }}>
                The core national aggregate index is synthesized using the standard modified Laspeyres price index formulation:
              </p>
              <div style={{ background: 'var(--bg-surface-elevated)', padding: '1.25rem', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', fontSize: '1.05rem', color: 'var(--color-primary-dark)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                I(t) = [ ∑ ( P(i, t) * Q(i, 0) ) / ∑ ( P(i, 0) * Q(i, 0) ) ] × 100
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.75rem', textAlign: 'center' }}>
                Where P(i,t) represents the geometric mean price for corridor i in period t, and Q(i,0) represents the base-period passenger volume weight.
              </p>
            </section>

            {/* 8. Limitations & Quality */}
            <section id="limitations" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}>
                  <AlertTriangle size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>8. Methodological Scope & Limitations</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                The index measures scheduled domestic commercial air passenger tariffs. It explicitly excludes chartered flights, cargo freight, non-scheduled executive aviation, and corporate bulk contract discounts not accessible to the general public.
              </p>
            </section>

            {/* 9. Network Coverage */}
            <section id="coverage" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Globe size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>9. Network & Geographic Coverage</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', marginBottom: '1.25rem' }}>
                The authoritative Air Fare Index monitors 8 major domestic aviation hubs, spanning 56 bidirectional scheduled routes across 5 commercial scheduled carriers.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Monitored Hubs</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>8 Airports</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>DEL, BOM, BLR, HYD, MAA, CCU, AMD, GOI</div>
                </div>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Route Matrix</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>56 City-Pairs</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>100% directional corridor coverage</div>
                </div>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Carriers</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>5 Airlines</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>IndiGo, Air India, SpiceJet, Akasa Air, Air India Express</div>
                </div>
                <div className="afi-card" style={{ background: 'var(--bg-surface-elevated)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Booking Windows</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.25rem' }}>5 Horizons</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>T+1, T+7, T+15, T+30, T+45 days</div>
                </div>
              </div>
            </section>

            {/* 10. Update Frequency */}
            <section id="frequency" className="afi-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div className="state-icon-box" style={{ width: '36px', height: '36px', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
                  <Clock size={18} />
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>10. Publication & Update Frequency</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                The official National Air Fare Index is computed continuously and aggregated into monthly statistical releases following statistical audit and quality-control verification.
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
