import React from 'react';
import { AlertCircle, FolderX, RefreshCw } from 'lucide-react';

export default function StateCard({
  title,
  subtitle,
  action,
  state = 'populated', // 'loading' | 'empty' | 'error' | 'populated'
  errorMessage = 'Failed to load statistical dataset from aggregator.',
  emptyMessage = 'No observations found matching the selected criteria.',
  onRetry,
  children,
  className = '',
  skeletonHeight = '220px'
}) {
  return (
    <div className={`afi-card ${className}`}>
      {(title || action) && (
        <div className="afi-card-header">
          <div>
            {title && <h3 className="afi-card-title">{title}</h3>}
            {subtitle && <p className="page-subtitle" style={{ fontSize: '0.78rem' }}>{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}

      {state === 'loading' && (
        <div className="skeleton-pulse" style={{ height: skeletonHeight, width: '100%', borderRadius: 'var(--radius-md)' }} />
      )}

      {state === 'empty' && (
        <div className="state-container">
          <div className="state-icon-box">
            <FolderX size={24} />
          </div>
          <div className="state-title">No Data Available</div>
          <div className="state-desc">{emptyMessage}</div>
        </div>
      )}

      {state === 'error' && (
        <div className="state-container">
          <div className="state-icon-box" style={{ background: 'var(--color-danger-subtle)', color: 'var(--color-danger)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="state-title">Dataset Error</div>
          <div className="state-desc">{errorMessage}</div>
          {onRetry && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onRetry}
              style={{ marginTop: '0.5rem' }}
            >
              <RefreshCw size={14} />
              <span>Retry Pipeline Query</span>
            </button>
          )}
        </div>
      )}

      {state === 'populated' && children}
    </div>
  );
}
