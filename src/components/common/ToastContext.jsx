import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const getIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />;
      case 'error': return <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />;
      case 'warning': return <AlertTriangle size={18} style={{ color: 'var(--color-warning)' }} />;
      case 'info':
      default: return <Info size={18} style={{ color: 'var(--color-primary)' }} />;
    }
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item ${toast.type}`} role="status">
            {getIcon(toast.type)}
            <div style={{ flex: 1, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {toast.message}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: '2px',
                display: 'flex',
                alignItems: 'center'
              }}
              aria-label="Dismiss Notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
