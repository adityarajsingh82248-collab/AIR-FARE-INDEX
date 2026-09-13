import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLoginPage from '../../pages/admin/AdminLoginPage';
import GovernmentMasthead from '../layout/GovernmentMasthead';

/**
 * AuthGuard Component
 * ───────────────────
 * Enforces authentication before granting access to protected application functionality.
 *
 * 1. While session verification is pending: displays an accessible loading state.
 * 2. If unauthenticated: displays the authentication page with "Continue with Google".
 * 3. If authenticated: renders application children.
 */
export default function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, authError } = useAuth();

  // 1. Session verification in progress
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-app, #0f172a)', display: 'flex', flexDirection: 'column' }}>
        <GovernmentMasthead />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: '#94a3b8' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(59, 130, 246, 0.2)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <span style={{ fontSize: '0.9rem', letterSpacing: '0.025em' }}>Verifying authentication status...</span>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: Render login gate with Google OAuth over blurred homepage background
  if (!isAuthenticated) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        {/* Background: Vibrant blurred homepage content */}
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            filter: 'blur(6px) saturate(1.15) brightness(0.92)',
            transform: 'scale(1.03)',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 0,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>

        {/* Translucent glass frost overlay for optimal readability of the login card */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.32)',
            backdropFilter: 'blur(3px)',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />

        {/* Foreground: Centered Login Card */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1rem',
          }}
        >
          <AdminLoginPage error={authError} />
        </div>
      </div>
    );
  }

  // 3. Authenticated: Render protected application content
  return <>{children}</>;
}
