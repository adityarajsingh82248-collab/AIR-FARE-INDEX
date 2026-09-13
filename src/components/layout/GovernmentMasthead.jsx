import React from 'react';

export default function GovernmentMasthead() {
  return (
    <header className="gov-masthead" role="banner" aria-label="Official Government Masthead">
      <div className="gov-masthead-left">
        <img 
          src="/assets/national-emblem.png" 
          alt="State Emblem of India - Ministry of Statistics and Programme Implementation" 
          className="gov-emblem-img"
          onError={(e) => {
            e.target.src = '/assets/mospi-emblem.png';
          }}
        />
        <div className="gov-masthead-text">
          <span className="gov-text-sub">Government of India</span>
          <span className="gov-text-main">Ministry of Statistics and Programme Implementation</span>
        </div>
      </div>
      
      <div className="gov-masthead-right">
        <span className="gov-tagline-badge">
          National Airfare Statistical Platform
        </span>
        <img 
          src="/assets/data-for-development-logo.png" 
          alt="Data for Development - MoSPI" 
          className="gov-dev-logo"
          onError={(e) => {
            e.target.src = '/assets/data-for-development-logo.svg';
          }}
        />
      </div>
    </header>
  );
}
