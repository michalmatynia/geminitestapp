'use client';

import { useState, useEffect, type JSX } from 'react';

const KEY = 'arcana-cookie-consent';

export function CookieConsent(): JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(KEY)) {
      const t = setTimeout(() => setVisible(true), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-6 md:px-12 py-5"
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.1)',
        animation: 'slideUpFade 0.4s ease both',
      }}
    >
      <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          <div
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center mt-0.5"
            style={{ border: '1px solid var(--border)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--accent)' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.82rem',
              fontWeight: 300,
              color: 'var(--muted)',
              lineHeight: 1.75,
              maxWidth: '640px',
            }}
          >
            We use cookies to remember your preferences, understand how you use ARCANA, and improve your experience.{' '}
            <a
              href="/values"
              className="underline underline-offset-2 hover:text-[var(--fg)] transition-colors"
            >
              Privacy policy
            </a>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-12 sm:ml-0">
          <button
            onClick={decline}
            className="type-label px-5 py-2.5 hover:text-[var(--fg)] transition-colors"
            style={{ color: 'var(--muted)' }}
          >
            Essential only
          </button>
          <button
            onClick={accept}
            className="type-label px-6 py-2.5 transition-all duration-200 hover:opacity-90"
            style={{ background: 'var(--fg)', color: 'var(--bg)' }}
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
