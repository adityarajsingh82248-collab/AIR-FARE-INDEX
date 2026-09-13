import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  PlaneTakeoff, 
  Building2, 
  GitCompare, 
  TrendingUp, 
  Database, 
  BookOpen, 
  ShieldCheck, 
  Server, 
  Sliders, 
  ChevronLeft, 
  ChevronRight,
  Home,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

export default function Sidebar({
  currentPath,
  onNavigate,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  isAdmin
}) {
  // Handle ESC key for closing mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, setIsMobileOpen]);

  const publicNavItems = [
    { id: '/', label: 'Overview', icon: Home },
    { id: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: '/routes', label: 'Route Analysis', icon: PlaneTakeoff },
    { id: '/airlines', label: 'Airline Analysis', icon: Building2 },
    { id: '/compare', label: 'Comparison', icon: GitCompare },
    { id: '/methodology', label: 'Methodology', icon: BookOpen },
  ];

  const adminNavItems = [
    { id: '/admin/dashboard', label: 'Admin Dashboard', icon: ShieldCheck },
    { id: '/admin/data', label: 'Data Management', icon: FileSpreadsheet },
    { id: '/admin/quality', label: 'Data Quality', icon: CheckCircle2 },
    { id: '/admin/monitoring', label: 'Monitoring', icon: Server },
    { id: '/admin/settings', label: 'Settings', icon: Sliders },
  ];

  const handleNavClick = (path) => {
    onNavigate(path);
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside 
        className={`app-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Application Navigation Sidebar"
      >
        {/* Brand header in sidebar */}
        <div className="sidebar-brand">
          <div className="brand-logo-area">
            <div className="brand-icon-box">
              <PlaneTakeoff size={18} />
            </div>
            {!isCollapsed && (
              <div>
                <div className="brand-title">Air Fare Index</div>
                <div className="brand-sub">MoSPI Analytics</div>
              </div>
            )}
          </div>

          <button 
            type="button"
            className="sidebar-collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation list */}
        <ul className="sidebar-nav-list" role="menu">
          {!isCollapsed && <li className="nav-section-label">Public Analytics</li>}
          {publicNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.id;
            return (
              <li key={item.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={18} className="nav-icon" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              </li>
            );
          })}

          {/* Admin Navigation Group - Rendered only when isAdmin is true */}
          {isAdmin && (
            <>
              <li style={{ height: '1px', background: 'var(--border-color)', margin: '0.75rem 0' }} role="separator" />
              {!isCollapsed && <li className="nav-section-label">Admin Controls</li>}
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.id;
                return (
                  <li key={item.id} role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.id)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={18} className="nav-icon" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </button>
                  </li>
                );
              })}
            </>
          )}
        </ul>

        {/* Footer info in sidebar */}
        {!isCollapsed && (
          <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
            <span>v1.4 Official Release</span>
            <div>Base Year: 2022 = 100</div>
          </div>
        )}
      </aside>
    </>
  );
}
