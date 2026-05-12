import { type JSX } from 'react';
import { type EcomLocale } from '@/lib/locales';
import type { AccountAdminContent } from '@/data/accountContent';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AdminUsersPanelProps {
  content: AccountAdminContent;
  locale: EcomLocale;
  loading: boolean;
  error: string;
  users: AdminUser[];
}

// eslint-disable-next-line max-lines-per-function, complexity
export function AdminUsersPanel({
  content,
  locale,
  loading,
  error,
  users,
}: AdminUsersPanelProps): JSX.Element {
  const hasNoUsers = users.length === 0 && error.length === 0 && !loading;
  const showUsers = users.length > 0 && error.length === 0 && !loading;

  return (
    <div style={{ borderTop: '1px solid rgba(210,116,102,0.2)' }}>
      <div className='type-label' style={{ color: 'var(--coral-red)', marginBottom: '1rem', marginTop: '1.5rem' }}>
        {content.recentRegistrationsLabel}
      </div>
      {loading && (
        <div className='type-label' style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.loadingLabel}</div>
      )}
      {!loading && error.length > 0 && (
        <div className='type-label' style={{ color: 'var(--coral-red)', padding: '1rem 0' }}>{error}</div>
      )}
      {hasNoUsers && (
        <div className='type-label' style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.noUsersLabel}</div>
      )}
      {showUsers && (
        <div style={{ border: '1px solid rgba(210,116,102,0.2)', overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr auto',
            gap: '1rem',
            padding: '0.65rem 1rem',
            background: 'rgba(210,116,102,0.06)',
            borderBottom: '1px solid rgba(210,116,102,0.2)',
          }}>
            {content.tableHeaders.map((header) => (
              <div key={header} className='type-label' style={{ color: 'var(--coral-red)', fontSize: '0.6rem', letterSpacing: '0.12em' }}>{header}</div>
            ))}
          </div>
          {users.map((user) => {
            const createdDate = new Date(user.createdAt).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <div
                key={user.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr auto',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid rgba(210,116,102,0.1)',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 300, color: 'var(--fg)' }}>
                  {user.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {createdDate}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
