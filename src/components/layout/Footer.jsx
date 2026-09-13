import React from 'react';

export default function Footer({ onNavigate }) {
  return (
    <footer className="app-footer" role="contentinfo">
      <div className="footer-inner">
        <div className="footer-top-grid">
          <div>
            <div className="footer-col-title">Air Fare Index (AFI)</div>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: '#94a3b8', maxWidth: '320px' }}>
              An official economic and price index initiative by the Ministry of Statistics and Programme Implementation (MoSPI), Government of India, monitoring spatial and temporal airfare movements across the Indian civil aviation market.
            </p>
          </div>

          <div>
            <div className="footer-col-title">Statistical Navigation</div>
            <ul className="footer-nav-list">
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/')}>Platform Overview</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/dashboard')}>National KPI Dashboard</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/routes')}>Route-Level Price Indices</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/airlines')}>Airline Pricing Dispersion</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/data')}>Observation Microdata Explorer</button></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Standards & Governance</div>
            <ul className="footer-nav-list">
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/methodology')}>Laspeyres & Fisher Formulation</button></li>
              <li><button style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textAlign: 'left', padding: 0 }} onClick={() => onNavigate('/methodology')}>Data Cleansing & Outlier Rules</button></li>
              <li><a href="https://www.mospi.gov.in" target="_blank" rel="noopener noreferrer">MoSPI Official Website</a></li>
              <li><a href="https://data.gov.in" target="_blank" rel="noopener noreferrer">Open Government Data (OGD)</a></li>
              <li><a href="https://www.civilaviation.gov.in" target="_blank" rel="noopener noreferrer">Ministry of Civil Aviation</a></li>
            </ul>
          </div>

          <div>
            <div className="footer-col-title">Statutory Disclaimer</div>
            <div className="footer-disclaimer-card">
              <strong>STATISTICAL SYSTEM ONLY:</strong> This platform is solely for macro-economic research, inflation measurement, and policy analysis. It is <strong>NOT</strong> an airline ticketing platform, booking service, or commercial reservation system. Fares displayed represent audited statistical observations and weighted index calculations.
            </div>
          </div>
        </div>

        <div className="footer-bottom-row">
          <div>
            © {new Date().getFullYear()} Ministry of Statistics and Programme Implementation (MoSPI), Government of India. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', color: '#64748b' }}>
            <span>Privacy Policy</span>
            <span>Terms of Statistical Use</span>
            <span>Hyperlinking Policy</span>
            <span>Accessibility Statement</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
