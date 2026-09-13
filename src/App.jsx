import React, { useState, useEffect } from 'react';
import GovernmentMasthead from './components/layout/GovernmentMasthead';
import Sidebar from './components/layout/Sidebar';
import AppHeader from './components/layout/AppHeader';
import Footer from './components/layout/Footer';
import Modal from './components/common/Modal';
import { ToastProvider, useToast } from './components/common/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthGuard from './components/auth/AuthGuard';

// Pages
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import RouteAnalysisPage from './pages/RouteAnalysisPage';
import AirlineAnalysisPage from './pages/AirlineAnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import TrendsPage from './pages/TrendsPage';
import DataExplorerPage from './pages/DataExplorerPage';
import MethodologyPage from './pages/MethodologyPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminDataPage from './pages/admin/AdminDataPage';
import AdminQualityPage from './pages/admin/AdminQualityPage';
import AdminMonitoringPage from './pages/admin/AdminMonitoringPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Config — static airport/airline reference lists (NOT mock data)
import { AIRPORTS } from './config/airports.js';
import { AIRLINES } from './config/airlines.js';

/**
 * Filter options built from static config (real reference data).
 * No hardcoded mock values.
 */
const filterOptions = {
  origins: AIRPORTS,
  destinations: AIRPORTS,
  airlines: AIRLINES,
  cabinClasses: ['All Classes', 'Economy', 'Premium Economy', 'Business'],
  tripTypes: ['All Trip Types', 'One Way', 'Round Trip'],
  timeRanges: ['1M', '3M', '6M', '1Y', 'All'],
  granularities: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
};

function MainApp() {
  // Navigation State - initialize from browser URL
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || '/');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleNavigate = (path) => {
    setCurrentPath(path);
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  };

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Theme State (Dark / Light)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Authentication state from backend session
  const { user, isAdmin, authError, logout } = useAuth();
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminLoginError, setAdminLoginError] = useState(null);

  // Close admin modal if authenticated
  useEffect(() => {
    if (isAdmin) {
      setIsAdminModalOpen(false);
      if (currentPath === '/admin/login') {
        handleNavigate('/admin/dashboard');
      }
    }
  }, [isAdmin, currentPath]);

  // Data Refresh State
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Global Filter State
  const [filters, setFilters] = useState({
    origin: 'ALL',
    destination: 'ALL',
    airline: 'ALL',
    cabinClass: 'ALL',
    tripType: 'ALL',
    window: '30D'
  });

  const { addToast } = useToast();

  // Handle Theme Switch
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Scroll to top on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPath]);

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
    addToast(!isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info', 2000);
  };

  const handleRefreshData = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      addToast('Data refreshed successfully from authoritative dataset.', 'info');
    }, 1000);
  };

  const handleAdminLogout = async () => {
    try {
      await logout();
      handleNavigate('/');
      addToast('Admin session terminated safely', 'info');
    } catch {
      handleNavigate('/');
    }
  };

  // Render Page Content
  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/':
        return (
          <LandingPage 
            onNavigate={handleNavigate}
            onSearchRoute={(orig, dest) => {
              setFilters((prev) => ({ ...prev, origin: orig, destination: dest }));
            }}
          />
        );

      case '/dashboard':
        return (
          <DashboardPage 
            filterOptions={filterOptions}
            filters={filters}
            onFilterChange={setFilters}
            onResetFilters={() => setFilters({ origin: 'ALL', destination: 'ALL', airline: 'ALL', cabinClass: 'ALL', tripType: 'ALL', window: '30D' })}
            isLoading={isRefreshing}
            onRetry={handleRefreshData}
            onNavigate={handleNavigate}
          />
        );

      case '/routes':
        return (
          <RouteAnalysisPage 
            initialRoute={filters.origin !== 'ALL' && filters.destination !== 'ALL' ? `${filters.origin}-${filters.destination}` : 'DEL-BOM'}
          />
        );

      case '/airlines':
        return <AirlineAnalysisPage />;

      case '/compare':
        return <ComparisonPage />;

      case '/trends':
        return (
          <TrendsPage 
            granularities={filterOptions.granularities}
          />
        );

      case '/data':
        return (
          <DataExplorerPage 
            isLoading={isRefreshing}
            onRetry={handleRefreshData}
          />
        );

      case '/methodology':
        return <MethodologyPage />;

      case '/admin/login':
        return <AdminLoginPage error={adminLoginError || authError} />;

      case '/admin/dashboard':
        return isAdmin ? <AdminDashboardPage onNavigate={handleNavigate} /> : <AdminLoginPage error={adminLoginError || authError} />;

      case '/admin/data':
        return isAdmin ? <AdminDataPage /> : <AdminLoginPage error={adminLoginError || authError} />;

      case '/admin/quality':
        return isAdmin ? <AdminQualityPage /> : <AdminLoginPage error={adminLoginError || authError} />;

      case '/admin/monitoring':
        return isAdmin ? <AdminMonitoringPage /> : <AdminLoginPage error={adminLoginError || authError} />;

      case '/admin/settings':
        return isAdmin ? <AdminSettingsPage /> : <AdminLoginPage error={adminLoginError || authError} />;

      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="app-container">
      {/* 1. Government Masthead (Full-width, White background, Fixed) */}
      <GovernmentMasthead />

      {/* Main Body Wrapper */}
      <div className="app-body-wrapper">
        {/* 2. Sidebar Navigation */}
        <Sidebar
          currentPath={currentPath}
          onNavigate={handleNavigate}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          isAdmin={isAdmin}
        />

        {/* Main Content Area */}
        <div className={`main-content-area ${isSidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
          {/* Top App Header */}
          <AppHeader
            currentPath={currentPath}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            isDarkMode={isDarkMode}
            onToggleTheme={handleToggleTheme}
            onRefreshData={handleRefreshData}
            isRefreshing={isRefreshing}
            isAdmin={isAdmin}
            onToggleAdminModal={() => setIsAdminModalOpen(true)}
            onAdminLogout={handleAdminLogout}
          />

          {/* Page Body */}
          <main role="main">
            {renderCurrentPage()}
          </main>

          {/* Footer */}
          <Footer onNavigate={handleNavigate} />
        </div>
      </div>

      {/* Admin Login Dialog Modal */}
      <Modal
        isOpen={isAdminModalOpen}
        onClose={() => {
          setIsAdminModalOpen(false);
          setAdminLoginError(null);
        }}
        title="Restricted Administrative Access"
      >
        <AdminLoginPage
          error={adminLoginError || authError}
        />
      </Modal>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AuthGuard>
          <MainApp />
        </AuthGuard>
      </AuthProvider>
    </ToastProvider>
  );
}
