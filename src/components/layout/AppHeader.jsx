import React, { useState, useEffect } from 'react';
import { Menu, RefreshCw, Sun, Moon, Shield, LogOut } from 'lucide-react';

function getLiveISTString() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `Today, ${timeStr} IST`;
}

export default function AppHeader({
  currentPath,
  onOpenMobileSidebar,
  isDarkMode,
  onToggleTheme,
  onRefreshData,
  isRefreshing,
  isAdmin,
  onToggleAdminModal,
  onAdminLogout
}) {
  const [lastUpdated, setLastUpdated] = useState(getLiveISTString);

  // Live timer updates the clock every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(getLiveISTString());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update immediately whenever user triggers a data refresh
  useEffect(() => {
    if (isRefreshing) {
      setLastUpdated(getLiveISTString());
    }
  }, [isRefreshing]);
  const getBreadcrumb = () => {
    switch (currentPath) {
      case '/': return 'Overview';
      case '/dashboard': return 'Dashboard';
      case '/routes': return 'Route Analysis';
      case '/airlines': return 'Airline Analysis';
      case '/compare': return 'Comparison Matrix';
      case '/trends': return 'Historical Trends';
      case '/data': return 'Data Explorer';
      case '/methodology': return 'Methodology & Standards';
      case '/admin/login': return 'Admin Access';
      case '/admin/dashboard': return 'Admin / System Dashboard';
      case '/admin/data': return 'Admin / Ingestion Batches';
      case '/admin/quality': return 'Admin / Data Quality';
      case '/admin/monitoring': return 'Admin / Health & Pipeline';
      case '/admin/settings': return 'Admin / Settings';
      default: return 'Overview';
    }
  };

  return (
    <nav className="app-header" aria-label="Main Application Header">
      <div className="header-left">
        <button 
          type="button"
          className="mobile-menu-btn"
          onClick={onOpenMobileSidebar}
          aria-label="Open Navigation Menu"
        >
          <Menu size={20} />
        </button>

        <div className="breadcrumb-trail">
          <span>Air Fare Index</span>
          <span>/</span>
          <span className="active">{getBreadcrumb()}</span>
        </div>
      </div>

      <div className="header-right">
        <span className="last-updated-text">
          Data as of: <strong>{lastUpdated}</strong>
        </span>

        {/* Refresh button */}
        <button
          type="button"
          className="header-icon-btn"
          onClick={onRefreshData}
          title="Refresh statistical dataset"
          aria-label="Refresh statistical dataset"
        >
          <RefreshCw size={16} className={isRefreshing ? 'skeleton-pulse' : ''} style={{ animation: isRefreshing ? 'flightDash 1s linear infinite' : 'none' }} />
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Admin Access / Logout */}
        {isAdmin ? (
          <button
            type="button"
            className="btn btn-sm btn-accent-tint"
            onClick={onAdminLogout}
            title="Sign out of Admin role"
          >
            <LogOut size={14} />
            <span>Admin Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onToggleAdminModal}
            title="Protected statistical administration"
          >
            <Shield size={14} />
            <span>Admin Portal</span>
          </button>
        )}
      </div>
    </nav>
  );
}
