/* eslint-disable @typescript-eslint/strict-boolean-expressions,max-lines-per-function */
'use client';

import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
  type ReactNode,
  type JSX,
} from 'react';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
};

type ToastAction =
  | { type: 'ADD'; toast: Toast }
  | { type: 'REMOVE'; id: string };

function toastReducer(state: Toast[], action: ToastAction): Toast[] {
  switch (action.type) {
    case 'ADD':
      return [action.toast, ...state].slice(0, 5);
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

type ToastContextValue = {
  toasts: Toast[];
  toast: (opts: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const dismiss = useCallback((id: string) => dispatch({ type: 'REMOVE', id }), []);

  const toast = useCallback(
    (opts: Omit<Toast, 'id'>): string => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      dispatch({ type: 'ADD', toast: { ...opts, id } });
      return id;
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }): JSX.Element {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration ?? 3500);
    return () => clearTimeout(timer);
  }, [t.id, t.duration, onDismiss]);

  const icons: Record<ToastType, JSX.Element> = {
    success: (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
        <path d='M20 6L9 17l-5-5' />
      </svg>
    ),
    error: (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
        <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
      </svg>
    ),
    info: (
      <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
        <circle cx='12' cy='12' r='10' /><line x1='12' y1='8' x2='12' y2='12' /><line x1='12' y1='16' x2='12.01' y2='16' />
      </svg>
    ),
  };

  const accent: Record<ToastType, string> = {
    success: '#4A7C5A',
    error: 'var(--accent)',
    info: '#5A7A9C',
  };

  return (
    <div
      role='alert'
      aria-live='polite'
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.875rem',
        padding: '1rem 1.25rem',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accent[t.type]}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        animation: 'toastIn 0.4s cubic-bezier(0.16,1,0.3,1) both',
        maxWidth: '360px',
        width: '100%',
      }}
    >
      <span style={{ color: accent[t.type], flexShrink: 0, marginTop: '0.05rem' }}>
        {icons[t.type]}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg)', marginBottom: t.message ? '0.25rem' : 0 }}>
          {t.title}
        </p>
        {t.message && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.82rem', fontWeight: 300, color: 'var(--muted)', lineHeight: 1.5 }}>
            {t.message}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(t.id)}
        aria-label='Dismiss'
        style={{ color: 'var(--muted)', flexShrink: 0, lineHeight: 1 }}
      >
        <svg width='13' height='13' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'>
          <line x1='18' y1='6' x2='6' y2='18' /><line x1='6' y1='6' x2='18' y2='18' />
        </svg>
      </button>
    </div>
  );
}

export function ToastContainer(): JSX.Element {
  const { toasts, dismiss } = useToast();
  return (
    <div
      aria-label='Notifications'
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.625rem',
        pointerEvents: toasts.length === 0 ? 'none' : 'auto',
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}
