import React, { useState } from 'react';
import { Filter, RotateCcw, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

export default function FilterBar({
  options = {},
  filters,
  onChange,
  onReset
}) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const origins = options.origins || [];
  const destinations = options.destinations || [];
  const airlines = options.airlines || [];
  const cabinClasses = options.cabinClasses || [];
  const tripTypes = options.tripTypes || [];

  const handleSelectChange = (key, val) => {
    onChange({ ...filters, [key]: val });
  };

  return (
    <div className="filter-bar-container" aria-label="Statistical Data Filters">
      {/* Mobile Toggle Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>
          <Filter size={16} style={{ color: 'var(--color-primary)' }} />
          <span>Statistical Observation Filters</span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onReset}
            title="Reset to all routes and airlines"
          >
            <RotateCcw size={13} />
            <span style={{ display: 'none', '@media (min-width: 640px)': { display: 'inline' } }}>Reset</span>
          </button>
          
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            style={{ display: 'inline-flex', '@media (min-width: 1024px)': { display: 'none' } }}
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
          >
            <SlidersHorizontal size={13} />
            {isMobileFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div 
        className="filter-bar-grid"
        style={{ 
          marginTop: '0.875rem',
          display: isMobileFiltersOpen ? 'grid' : undefined
        }}
      >
        {/* Origin */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="origin-filter">Origin Hub</label>
          <select
            id="origin-filter"
            className="form-select"
            value={filters.origin || 'ALL'}
            onChange={(e) => handleSelectChange('origin', e.target.value)}
          >
            <option value="ALL">All Domestic Hubs (Pan-India)</option>
            {origins.map((hub) => (
              <option key={hub.code} value={hub.code}>
                {hub.city} ({hub.code})
              </option>
            ))}
          </select>
        </div>

        {/* Destination */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="dest-filter">Destination Hub</label>
          <select
            id="dest-filter"
            className="form-select"
            value={filters.destination || 'ALL'}
            onChange={(e) => handleSelectChange('destination', e.target.value)}
          >
            <option value="ALL">All Domestic Hubs (Pan-India)</option>
            {destinations.map((hub) => (
              <option key={hub.code} value={hub.code}>
                {hub.city} ({hub.code})
              </option>
            ))}
          </select>
        </div>

        {/* Airline */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="airline-filter">Operating Carrier</label>
          <select
            id="airline-filter"
            className="form-select"
            value={filters.airline || 'ALL'}
            onChange={(e) => handleSelectChange('airline', e.target.value)}
          >
            {airlines.map((al) => (
              <option key={al.id} value={al.id}>
                {al.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cabin Class */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="cabin-filter">Cabin Class</label>
          <select
            id="cabin-filter"
            className="form-select"
            value={filters.cabinClass || 'ALL'}
            onChange={(e) => handleSelectChange('cabinClass', e.target.value)}
          >
            {cabinClasses.map((cls) => (
              <option key={cls} value={cls === 'All Classes' ? 'ALL' : cls}>
                {cls}
              </option>
            ))}
          </select>
        </div>

        {/* Trip Type */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="trip-filter">Booking Structure</label>
          <select
            id="trip-filter"
            className="form-select"
            value={filters.tripType || 'ALL'}
            onChange={(e) => handleSelectChange('tripType', e.target.value)}
          >
            {tripTypes.map((tt) => (
              <option key={tt} value={tt === 'All Trip Types' ? 'ALL' : tt}>
                {tt}
              </option>
            ))}
          </select>
        </div>

        {/* Observation Window */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="window-filter">Advance Horizon</label>
          <select
            id="window-filter"
            className="form-select"
            value={filters.window || 'ALL'}
            onChange={(e) => handleSelectChange('window', e.target.value)}
          >
            <option value="ALL">All Horizons (T+1 to T+45)</option>
            <option value="T+1">T+1 (1 Day Prior)</option>
            <option value="T+7">T+7 (7 Days Prior)</option>
            <option value="T+15">T+15 (15 Days Prior)</option>
            <option value="T+30">T+30 (30 Days Prior)</option>
            <option value="T+45">T+45 (45 Days Prior)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
