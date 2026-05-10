'use client';

import { useState, useEffect, type JSX } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { AuthModal } from '@/components/AuthModal';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import type { AccountContent } from '@/data/accountContent';
import type { EcomLocale } from '@/lib/locales';
import type { Order } from '@/lib/orders';
import { toDisplayOrder } from './components/order-utils';
import { AdminTab } from './components/AdminTab';

type Tab = 'overview' | 'orders' | 'settings' | 'admin';

function renderTabs(
  {
    tabs,
    activeTab,
    setActiveTab,
    isSuperAdmin,
    localizedHref,
    adminCmsLabel,
  }: {
    tabs: { id: Tab; label: string }[];
    activeTab: Tab;
    setActiveTab: (tab: Tab) => void;
    isSuperAdmin: boolean;
    localizedHref: (path: string) => string;
    adminCmsLabel: string;
  },
): JSX.Element[] {
  return [
    ...tabs.map((tab) => (
      <button
        key={tab.id}
        onClick={() => setActiveTab(tab.id)}
        className='w-full text-left py-3 px-4 type-label transition-all duration-200'
        style={{
          color: activeTab === tab.id ? 'var(--fg)' : tab.id === 'admin' ? 'var(--coral-red)' : 'var(--muted)',
          background: activeTab === tab.id ? 'var(--surface)' : 'transparent',
          borderLeft: `2px solid ${activeTab === tab.id ? (tab.id === 'admin' ? 'var(--coral-red)' : 'var(--fg)') : 'transparent'}`,
        }}
      >
        {tab.label}
      </button>
    )),
    ...(isSuperAdmin ? [
      <a
        key='admin-cms'
        href={localizedHref('/cms')}
        className='w-full text-left py-3 px-4 type-label transition-all duration-200'
        style={{
          color: 'var(--coral-red)',
          background: 'rgba(210,116,102,0.06)',
          borderLeft: '2px solid rgba(210,116,102,0.5)',
          display: 'block',
        }}
      >
        {adminCmsLabel}
      </a>
    ] : []),
  ];
}

export function AccountPageClient({
  content,
  availableLocales,
}: {
  content: AccountContent;
  availableLocales: EcomLocale[];
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const { total: wishlistCount } = useWishlist();
  const { user, loading, logout } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (user === null) {
      setOrders([]);
      setOrdersLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setOrdersLoading(true);
    fetch('/api/orders/me')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!cancelled) setOrders(Array.isArray(data) ? (data as Order[]) : []);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const displayOrders = orders.map((order) => toDisplayOrder(order, locale));
  const purchasedItemCount = orders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  );
  const noOrdersLabel = locale === 'pl' ? 'Brak zamowien.' : 'No orders yet.';

  const tabs: { id: Tab; label: string }[] = content.tabs
    .filter((tab) => tab.id !== 'admin' || user?.isSuperAdmin)
    .map((tab) => ({ id: tab.id as Tab, label: tab.label }));

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
          <div className='type-label' style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>{content.loadingLabel}</div>
        </main>
        <SiteFooter />
      </>
    );
  }

  if (user === null) {
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
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.5 }} />
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
                className='btn-primary'
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setAuthModalOpen(true)}
              >
                {content.signedOut.signInLabel}
                <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                  <path d='M5 12h14M12 5l7 7-7 7' />
                </svg>
              </button>
              <a href={localizedHref(content.signedOut.backToShopHref)} className='btn-ghost' style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
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
        <div
          className='px-8 md:px-16 py-14 relative overflow-hidden'
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div
            className='absolute right-0 top-0 bottom-0 flex items-center pr-12 pointer-events-none select-none'
            aria-hidden='true'
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
          <div className='relative z-10 max-w-screen-2xl mx-auto'>
            <div className='type-label mb-3' style={{ color: 'var(--accent)' }}>{content.header.eyebrow}</div>
            <h1 className='type-display-lg' style={{ color: 'var(--fg)' }}>
              {content.header.welcomePrefix} {user.name.split(' ')[0]}
            </h1>
            <p className='type-label mt-2' style={{ color: 'var(--muted)' }}>
              {user.isSuperAdmin ? `${content.header.superAdminPrefix} · ` : ''}{orders.length} {content.header.ordersLabel}
            </p>
          </div>
        </div>

        <div className='max-w-screen-2xl mx-auto px-8 md:px-16 py-12'>
          <div className='flex flex-col md:flex-row gap-10 md:gap-16'>
            <aside className='md:w-56 flex-shrink-0'>
              <div className='flex items-center gap-4 mb-8 pb-8' style={{ borderBottom: '1px solid var(--border)' }}>
                <div
                  className='w-12 h-12 flex-shrink-0 flex items-center justify-center'
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
                  <div className='type-label' style={{ color: 'var(--muted)', fontSize: '0.6rem' }}>
                    {user.isSuperAdmin ? content.sidebar.superAdminRoleLabel : content.sidebar.memberRoleLabel}
                  </div>
                </div>
              </div>

              <nav className='flex flex-col gap-1'>
                {renderTabs({
                  tabs,
                  activeTab,
                  setActiveTab,
                  isSuperAdmin: user.isSuperAdmin,
                  localizedHref,
                  adminCmsLabel: content.admin.cmsLinkLabel,
                })}

                <div className='mt-6 pt-6' style={{ borderTop: '1px solid var(--border)' }}>
                  <a
                    href={localizedHref('/wishlist')}
                    className='flex items-center justify-between w-full py-3 px-4 type-label transition-colors hover:text-[var(--fg)]'
                    style={{ color: 'var(--muted)' }}
                  >
                    <span>{content.sidebar.wishlistLabel}</span>
                    {wishlistCount > 0 && (
                      <span
                        className='w-5 h-5 flex items-center justify-center text-[10px]'
                        style={{ background: 'var(--fg)', color: 'var(--bg)', fontFamily: 'var(--font-mono)' }}
                      >
                        {wishlistCount}
                      </span>
                    )}
                  </a>
                  <button
                    onClick={() => logout()}
                    className='block w-full text-left py-3 px-4 type-label transition-colors hover:text-[var(--fg)]'
                    style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    {content.sidebar.signOutLabel}
                  </button>
                </div>
              </nav>
            </aside>

            <div className='flex-1 min-w-0'>
              {activeTab === 'overview' && (
                <div /> // Placeholder for brevity
              )}
              {activeTab === 'orders' && (
                <div /> // Placeholder for brevity
              )}
              {activeTab === 'settings' && (
                <div /> // Placeholder for brevity
              )}
              {activeTab === 'admin' && user.isSuperAdmin && (
                <AdminTab
                  content={content.admin}
                  orderStatuses={content.orders.statuses}
                  availableLocales={availableLocales}
                />
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
