'use client';

import { type JSX } from 'react';
import type { EcomLocale } from '@/lib/locales';

interface Subscriber {
  email: string;
  subscribedAt: string;
}

interface AdminNewsletterPanelProps {
  locale: EcomLocale;
  loading: boolean;
  error: string;
  subscribers: Subscriber[];
}

function exportCsv(subscribers: Subscriber[]): void {
  const rows = ['email,subscribedAt', ...subscribers.map((s) => `${s.email},${s.subscribedAt}`)];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AdminNewsletterPanel({ locale, loading, error, subscribers }: AdminNewsletterPanelProps): JSX.Element {
  const isEmpty = subscribers.length === 0 && error.length === 0 && !loading;
  const showList = subscribers.length > 0 && error.length === 0 && !loading;
  const loadingLabel = locale === 'pl' ? 'Ładowanie…' : 'Loading…';
  const noSubscribersLabel = locale === 'pl' ? 'Brak subskrybentów.' : 'No subscribers yet.';
  const headingLabel = locale === 'pl' ? 'Subskrybenci newslettera' : 'Newsletter subscribers';
  const exportLabel = locale === 'pl' ? 'Eksportuj CSV' : 'Export CSV';
  const emailHeader = 'Email';
  const dateHeader = locale === 'pl' ? 'Data' : 'Date';

  return (
    <div style={{ borderTop: '1px solid rgba(210,116,102,0.2)', marginTop: '2rem', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div className='type-label' style={{ color: 'var(--coral-red)' }}>
          {headingLabel}
          {!loading && subscribers.length > 0 && (
            <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>({subscribers.length})</span>
          )}
        </div>
        {showList && (
          <button
            onClick={() => { exportCsv(subscribers); }}
            className='type-label'
            style={{
              color: 'var(--coral-red)',
              border: '1px solid rgba(210,116,102,0.4)',
              padding: '0.2rem 0.75rem',
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            {exportLabel}
          </button>
        )}
      </div>

      {loading && (
        <div className='type-label' style={{ color: 'var(--muted)', padding: '1rem 0' }}>{loadingLabel}</div>
      )}
      {!loading && error.length > 0 && (
        <div className='type-label' style={{ color: 'var(--coral-red)', padding: '1rem 0' }}>{error}</div>
      )}
      {isEmpty && (
        <div className='type-label' style={{ color: 'var(--muted)', padding: '1rem 0' }}>{noSubscribersLabel}</div>
      )}
      {showList && (
        <div style={{ border: '1px solid rgba(210,116,102,0.2)', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '1rem',
            padding: '0.65rem 1rem',
            background: 'rgba(210,116,102,0.06)',
            borderBottom: '1px solid rgba(210,116,102,0.2)',
          }}>
            {[emailHeader, dateHeader].map((h) => (
              <div key={h} className='type-label' style={{ color: 'var(--coral-red)', fontSize: '0.6rem', letterSpacing: '0.12em' }}>{h}</div>
            ))}
          </div>
          {subscribers.map((sub) => {
            const date = new Date(sub.subscribedAt).toLocaleDateString(
              locale === 'pl' ? 'pl-PL' : 'en-GB',
              { day: '2-digit', month: 'short', year: 'numeric' },
            );
            return (
              <div
                key={sub.email}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid rgba(210,116,102,0.1)',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sub.email}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {date}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
