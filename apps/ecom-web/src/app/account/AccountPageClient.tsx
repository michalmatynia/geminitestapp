'use client';

import { useState, useEffect, type JSX } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { AuthModal } from '@/components/AuthModal';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { AdminCmsEditor } from '@/components/AdminCmsEditor';
import type { AccountAdminContent, AccountContent } from '@/data/accountContent';

interface Order {
  id: string;
  date: string;
  status: 'delivered' | 'in-transit' | 'processing';
  total: string;
  items: { name: string; qty: number; price: string }[];
}

const MOCK_ORDERS: Order[] = [
  {
    id: 'ARC-2026-0047',
    date: '28 April 2026',
    status: 'delivered',
    total: '€ 1,240',
    items: [
      { name: 'Amphora Vessel', qty: 1, price: '€ 640' },
      { name: 'Walnut Serving Tray', qty: 2, price: '€ 600' },
    ],
  },
  {
    id: 'ARC-2026-0031',
    date: '12 March 2026',
    status: 'delivered',
    total: '€ 890',
    items: [
      { name: 'Cognac Leather Tote', qty: 1, price: '€ 890' },
    ],
  },
  {
    id: 'ARC-2025-0198',
    date: '9 November 2025',
    status: 'delivered',
    total: '€ 2,180',
    items: [
      { name: 'Obsidian Wool Overcoat', qty: 1, price: '€ 1,850' },
      { name: 'Sand Wool Scarf', qty: 1, price: '€ 330' },
    ],
  },
];

const STATUS_COLORS: Record<Order['status'], string> = {
  delivered: 'rgba(120,160,90,1)',
  'in-transit': 'rgba(180,130,60,1)',
  processing: 'var(--muted)',
};

const MOCK_ORDER_PL: Record<string, { date: string; itemNames: string[] }> = {
  'ARC-2026-0047': {
    date: '28 kwietnia 2026',
    itemNames: ['Naczynie amforowe', 'Taca z orzecha'],
  },
  'ARC-2026-0031': {
    date: '12 marca 2026',
    itemNames: ['Koniakowa torba skórzana'],
  },
  'ARC-2025-0198': {
    date: '9 listopada 2025',
    itemNames: ['Obsydianowy płaszcz wełniany', 'Piaskowy szalik wełniany'],
  },
};

function getDisplayOrders(locale: string): Order[] {
  if (locale !== 'pl') return MOCK_ORDERS;
  return MOCK_ORDERS.map((order) => {
    const translation = MOCK_ORDER_PL[order.id];
    if (!translation) return order;
    return {
      ...order,
      date: translation.date,
      items: order.items.map((item, index) => ({
        ...item,
        name: translation.itemNames[index] ?? item.name,
      })),
    };
  });
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

type Tab = 'overview' | 'orders' | 'settings' | 'admin';

function AdminTab({ content }: { content: AccountAdminContent }): JSX.Element {
  const locale = useLocale();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/admin/users')
      .then((res) => res.json())
      .then((data: { users?: AdminUser[]; total?: number; error?: string }) => {
        if (data.error) { setError(data.error); return; }
        setAdminUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setError(content.loadUsersError))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.8rem',
          fontWeight: 300,
          color: 'var(--fg)',
        }}>
          {content.title}
        </h2>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          letterSpacing: '0.14em',
          color: 'var(--coral-red)',
          border: '1px solid rgba(210,116,102,0.4)',
          padding: '0.2rem 0.5rem',
          textTransform: 'uppercase',
        }}>
          {content.badgeLabel}
        </span>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{
          padding: '1.5rem',
          border: '1px solid rgba(210,116,102,0.25)',
          background: 'rgba(210,116,102,0.04)',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.2rem',
            fontWeight: 300,
            color: 'var(--coral-red)',
            lineHeight: 1,
            marginBottom: '0.5rem',
          }}>
            {loading ? '—' : total}
          </div>
          <div className="type-label" style={{ color: 'var(--muted)' }}>{content.registeredUsersLabel}</div>
        </div>
      </div>

      <AdminCmsEditor />

      {/* Users table */}
      <div style={{ borderTop: '1px solid rgba(210,116,102,0.2)' }}>
        <div className="type-label" style={{ color: 'var(--coral-red)', marginBottom: '1rem', marginTop: '1.5rem' }}>
          {content.recentRegistrationsLabel}
        </div>
        {loading && (
          <div className="type-label" style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.loadingLabel}</div>
        )}
        {error && (
          <div className="type-label" style={{ color: 'var(--coral-red)', padding: '1rem 0' }}>{error}</div>
        )}
        {!loading && !error && adminUsers.length === 0 && (
          <div className="type-label" style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.noUsersLabel}</div>
        )}
        {!loading && !error && adminUsers.length > 0 && (
          <div style={{ border: '1px solid rgba(210,116,102,0.2)', overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: '1rem',
              padding: '0.65rem 1rem',
              background: 'rgba(210,116,102,0.06)',
              borderBottom: '1px solid rgba(210,116,102,0.2)',
            }}>
              {content.tableHeaders.map((h) => (
                <div key={h} className="type-label" style={{ color: 'var(--coral-red)', fontSize: '0.6rem', letterSpacing: '0.12em' }}>{h}</div>
              ))}
            </div>
            {adminUsers.map((u) => (
              <div
                key={u.id}
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
                  {u.name}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AccountPageClient({ content }: { content: AccountContent }): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const { total: wishlistCount } = useWishlist();
  const { user, loading, logout } = useAuth();
  const orders = getDisplayOrders(locale);

  const tabs: { id: Tab; label: string }[] = [
    ...content.tabs
      .filter((tab) => tab.id !== 'admin' || user?.isSuperAdmin)
      .map((tab) => ({ id: tab.id, label: tab.label })),
  ];

  const displayName = user?.name ?? (locale === 'pl' ? 'Gość' : 'Guest');
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const firstLastInitial = displayName.split(' ').length > 1
    ? `${displayName.split(' ')[0]} ${displayName.split(' ').slice(-1)[0][0]}.`
    : displayName;

  if (loading) {
    return (
      <>
        <SiteNav />
        <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="type-label" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>{content.loadingLabel}</div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SiteNav />
        <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            border: '1px solid rgba(171,217,208,0.15)',
            padding: '3rem 2rem',
            background: 'linear-gradient(160deg, #0B0D21 0%, #01000D 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* top glow line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5 }} />
            {/* corner brackets */}
            <div style={{ position: 'absolute', top: 8, right: 8, width: 12, height: 12, borderTop: '1px solid rgba(171,217,208,0.4)', borderRight: '1px solid rgba(171,217,208,0.4)' }} />
            <div style={{ position: 'absolute', bottom: 8, left: 8, width: 12, height: 12, borderBottom: '1px solid rgba(171,217,208,0.4)', borderLeft: '1px solid rgba(171,217,208,0.4)' }} />

            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '0.3em', color: 'var(--accent)', textShadow: '0 0 20px rgba(171,217,208,0.4)', marginBottom: '0.25rem' }}>
              {content.signedOut.brandName}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.2em', color: 'rgba(171,217,208,0.3)', marginBottom: '2rem' }}>
              {content.signedOut.brandSuffix}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 300, color: 'var(--fg)', marginBottom: '0.75rem' }}>
              {content.signedOut.title}
            </h1>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 300, color: 'var(--muted-teal)', marginBottom: '2rem', lineHeight: 1.7 }}>
              {content.signedOut.body}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setAuthModalOpen(true)}
              >
                {content.signedOut.signInLabel}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <a href={localizedHref(content.signedOut.backToShopHref)} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {content.signedOut.backToShopLabel}
              </a>
            </div>
          </div>
        </main>
        <SiteFooter />
        <AuthModal open={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  return (
    <>
      <SiteNav />
      <main style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh' }}>

        {/* Header */}
        <div
          className="px-8 md:px-16 py-14 relative overflow-hidden"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className="absolute right-0 top-0 bottom-0 flex items-center pr-12 pointer-events-none select-none"
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(5rem, 14vw, 13rem)',
                fontWeight: 300,
                color: 'transparent',
                WebkitTextStroke: '1px var(--border)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
              }}
            >
              {content.header.watermark}
            </span>
          </div>
          <div className="relative z-10 max-w-screen-2xl mx-auto">
            <div className="type-label mb-3" style={{ color: 'var(--accent)' }}>{content.header.eyebrow}</div>
            <h1 className="type-display-lg" style={{ color: 'var(--fg)' }}>
              {content.header.welcomePrefix} {user.name.split(' ')[0]}
            </h1>
            <p className="type-label mt-2" style={{ color: 'var(--muted)' }}>
              {user.isSuperAdmin ? `${content.header.superAdminPrefix} · ` : ''}{orders.length} {content.header.ordersLabel}
            </p>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-8 md:px-16 py-12">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16">

            {/* Sidebar */}
            <aside className="md:w-56 flex-shrink-0">
              <div className="flex items-center gap-4 mb-8 pb-8" style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #c4a882 0%, #8b6b47 100%)',
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    fontWeight: 300,
                    color: '#fff',
                  }}
                >
                  {initials}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 300, color: 'var(--fg)' }}>
                    {firstLastInitial}
                  </div>
                  <div className="type-label" style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>
                    {user.isSuperAdmin ? content.sidebar.superAdminRoleLabel : content.sidebar.memberRoleLabel}
                  </div>
                </div>
              </div>

              <nav className="flex flex-col gap-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full text-left py-3 px-4 type-label transition-all duration-200"
                    style={{
                      color: activeTab === tab.id ? 'var(--fg)' : tab.id === 'admin' ? 'var(--coral-red)' : 'var(--muted)',
                      background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
                      borderLeft: `2px solid ${activeTab === tab.id ? (tab.id === 'admin' ? 'var(--coral-red)' : 'var(--fg)') : 'transparent'}`,
                    }}
                  >
                    {tab.label}
                  </button>
                ))}

                <div className="mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
                  <a
                    href={localizedHref('/wishlist')}
                    className="flex items-center justify-between w-full py-3 px-4 type-label transition-colors hover:text-[var(--fg)]"
                    style={{ color: 'var(--muted)' }}
                  >
                    <span>{content.sidebar.wishlistLabel}</span>
                    {wishlistCount > 0 && (
                      <span
                        className="w-5 h-5 flex items-center justify-center text-[10px]"
                        style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
                      >
                        {wishlistCount}
                      </span>
                    )}
                  </a>
                  <button
                    onClick={() => void logout()}
                    className="block w-full text-left py-3 px-4 type-label transition-colors hover:text-[var(--fg)]"
                    style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {content.sidebar.signOutLabel}
                  </button>
                </div>
              </nav>
            </aside>

            {/* Main content */}
            <div className="flex-1 min-w-0">

              {/* Overview tab */}
              {activeTab === 'overview' && (
                <div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {content.overview.stats.map((stat) => (
                      <div
                        key={stat.key}
                        className="px-6 py-8"
                        style={{ border: '1px solid var(--border)' }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: '2.2rem',
                            fontWeight: 300,
                            color: 'var(--fg)',
                            lineHeight: 1,
                            marginBottom: '0.5rem',
                          }}
                        >
                          {stat.key === 'orders'
                            ? orders.length.toString()
                            : stat.key === 'wishlist'
                              ? wishlistCount.toString()
                              : stat.fallbackValue ?? ''}
                        </div>
                        <div className="type-label" style={{ color: 'var(--muted)' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mb-6">
                    <div className="type-label mb-6" style={{ color: 'var(--accent)' }}>{content.overview.recentOrderLabel}</div>
                    <div style={{ border: '1px solid var(--border)' }}>
                      <div
                        className="flex items-center justify-between px-6 py-5"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--fg)', marginBottom: '0.25rem' }}>
                            {orders[0].id}
                          </div>
                          <div className="type-label" style={{ color: 'var(--muted)' }}>{orders[0].date}</div>
                        </div>
                        <div className="text-right">
                          <div
                            className="type-label px-3 py-1.5 inline-block mb-1"
                            style={{ background: 'var(--surface)', color: STATUS_COLORS[orders[0].status] }}
                          >
                            {content.orders.statuses[orders[0].status]}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
                            {orders[0].total}
                          </div>
                        </div>
                      </div>
                      {orders[0].items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between px-6 py-4"
                          style={{ borderBottom: i < orders[0].items.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <div className="flex items-center gap-3">
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>
                              ×{item.qty}
                            </div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 300, color: 'var(--fg)' }}>
                              {item.name}
                            </div>
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--muted)' }}>
                            {item.price}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="type-label flex items-center gap-2 transition-colors hover:text-[var(--fg)]"
                    style={{ color: 'var(--muted)' }}
                  >
                    {content.overview.viewAllOrdersLabel}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Orders tab */}
              {activeTab === 'orders' && (
                <div>
                  <h2
                    className="mb-8"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 300, color: 'var(--fg)' }}
                  >
                    {content.orders.title}
                  </h2>
                  <div className="flex flex-col gap-4">
                    {orders.map((order) => (
                      <div key={order.id} style={{ border: '1px solid var(--border)' }}>
                        <div
                          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-6 py-5"
                          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
                        >
                          <div className="flex items-center gap-5">
                            <div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--fg)' }}>
                                {order.id}
                              </div>
                              <div className="type-label mt-1" style={{ color: 'var(--muted)' }}>{order.date}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-5">
                            <span
                              className="type-label px-3 py-1.5"
                              style={{ background: 'var(--bg)', color: STATUS_COLORS[order.status], border: '1px solid var(--border)' }}
                            >
                              {content.orders.statuses[order.status]}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--fg)' }}>
                              {order.total}
                            </span>
                          </div>
                        </div>
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-6 py-4"
                            style={{ borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-10 h-12 flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, var(--border), var(--surface))' }}
                              />
                              <div>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 300, color: 'var(--fg)' }}>
                                  {item.name}
                                </div>
                                <div className="type-label" style={{ color: 'var(--muted)', marginTop: '0.2rem' }}>
                                  {content.orders.qtyLabel} {item.qty}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--muted)' }}>
                              {item.price}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Settings tab */}
              {activeTab === 'settings' && (
                <div>
                  <h2
                    className="mb-8"
                    style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 300, color: 'var(--fg)' }}
                  >
                    {content.settings.title}
                  </h2>
                  <div className="flex flex-col gap-8">
                    <div>
                      <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>{content.settings.personalDetailsLabel}</div>
                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { label: content.settings.fullNameLabel, value: user.name, type: 'text' },
                          { label: content.settings.emailLabel, value: user.email, type: 'email' },
                        ].map((field) => (
                          <div key={field.label}>
                            <label className="type-label block mb-2" style={{ color: 'var(--muted)' }}>{field.label}</label>
                            <input
                              type={field.type}
                              defaultValue={field.value}
                              className="w-full px-4 py-3"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--fg)',
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.875rem',
                                fontWeight: 300,
                                outline: 'none',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>{content.settings.defaultShippingAddressLabel}</div>
                      <div
                        className="px-6 py-5 flex items-start justify-between gap-4"
                        style={{ border: '1px solid var(--border)' }}
                      >
                        <div
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.875rem',
                            fontWeight: 300,
                            color: 'var(--fg)',
                            lineHeight: 1.85,
                          }}
                        >
                          {user.name}<br />
                          {content.settings.defaultShippingAddressLines.map((line) => (
                            <span key={line}>
                              {line}<br />
                            </span>
                          ))}
                        </div>
                        <button className="btn-ghost flex-shrink-0" style={{ fontSize: '0.72rem' }}>
                          {content.settings.editLabel}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="type-label mb-5" style={{ color: 'var(--accent)' }}>{content.settings.communicationPreferencesLabel}</div>
                      <div className="flex flex-col gap-3">
                        {content.settings.preferences.map((pref) => (
                          <label key={pref.label} className="flex items-center gap-4 cursor-pointer group">
                            <input
                              type="checkbox"
                              defaultChecked={pref.checked}
                              className="w-4 h-4 accent-[var(--fg)]"
                            />
                            <span
                              className="type-label group-hover:text-[var(--fg)] transition-colors"
                              style={{ color: 'var(--muted)' }}
                            >
                              {pref.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <button className="btn-primary">{content.settings.saveChangesLabel}</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin tab */}
              {activeTab === 'admin' && user.isSuperAdmin && <AdminTab content={content.admin} />}

            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
