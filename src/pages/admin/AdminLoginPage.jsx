import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function AdminLoginPage({
  isLoading = false,
  error = null,
}) {
  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  return (
    <div style={{ 
      minHeight: '75vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      padding: '2rem 1rem' 
    }}>
      <div 
        className="afi-card" 
        style={{ 
          maxWidth: '440px', 
          width: '100%', 
          padding: '2.5rem 2rem',
          boxShadow: 'var(--shadow-dropdown)',
          borderTop: '4px solid var(--color-primary)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="state-icon-box" style={{ margin: '0 auto 1rem', background: 'var(--color-primary-subtle)', color: 'var(--color-primary)' }}>
            <ShieldCheck size={28} />
          </div>
          <span className="hero-eyebrow" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', marginBottom: '0.5rem' }}>
            Restricted Government Access
          </span>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            AFI Statistical Administration
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            MoSPI Ingestion Engine & Quality Pipeline Authentication
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ 
            background: 'var(--color-danger-subtle)', 
            border: '1px solid var(--color-danger)', 
            borderRadius: 'var(--radius-md)', 
            padding: '0.75rem 1rem', 
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: 'var(--color-danger)'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Google OAuth 2.0 Login Action */}
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.8rem 1rem',
              fontSize: '0.95rem',
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: '#ffffff',
              color: '#1f2937',
              border: '1px solid var(--border-color)',
              fontWeight: 600,
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            {/* Official Google G SVG Icon */}
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" fill="#4285F4" />
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
              <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05" />
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335" />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          Notice: Unauthorized access to this statistical system is prohibited under Information Technology Act, 2000. Public users do not require authentication.
        </div>
      </div>
    </div>
  );
}
