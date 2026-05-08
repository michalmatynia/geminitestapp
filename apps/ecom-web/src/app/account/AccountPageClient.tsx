'use client';

import { useState, useEffect, type JSX } from 'react';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { AuthModal } from '@/components/AuthModal';
import { SiteNav } from '@/components/SiteNav';
import { SiteFooter } from '@/components/SiteFooter';
import { AdminCmsEditor } from '@/components/AdminCmsEditor';
import { formatPrice, type EcomLocale } from '@/lib/locales';
import type { AccountAdminContent, AccountContent, AccountOrdersContent } from '@/data/accountContent';
import type { Order } from '@/lib/orders';

interface DisplayOrder {
  id: string;
  date: string;
  status: 'delivered' | 'in-transit' | 'processing' | 'pending_payment' | 'cancelled';
  total: string;
  shippingLine: string;
  trackingNumber?: string;
  items: { name: string; qty: number; price: string; imageUrl?: string }[];
}

const STATUS_COLORS: Record<DisplayOrder['status'], string> = {
  delivered: 'rgba(120,160,90,1)',
  'in-transit': 'rgba(180,130,60,1)',
  processing: 'var(--muted)',
  pending_payment: 'rgba(180,130,60,0.8)',
  cancelled: 'var(--accent)',
};

function toDisplayOrder(order: Order, locale: string): DisplayOrder {
  return {
    id: order.orderId,
    date: new Date(order.createdAt).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    status: order.status,
    total: formatPrice(order.total, locale === 'pl' ? 'pl' : 'en'),
    shippingLine: [order.shippingMethod, order.inpostPoint?.name].filter(Boolean).join(' / '),
    trackingNumber: order.inpostShipment?.trackingNumber,
    items: order.items.map((item) => ({
      name: item.name,
      qty: item.quantity,
      price: formatPrice(item.price * item.quantity, locale === 'pl' ? 'pl' : 'en'),
      imageUrl: item.imageUrl,
    })),
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

interface AdminOrdersResponse {
  orders?: Order[];
  total?: number;
  error?: string;
}

interface InpostFulfillResponse {
  created?: boolean;
  skippedReason?: string;
  shipment?: Order['inpostShipment'];
  error?: string;
}

interface InpostRefreshResponse {
  refreshed?: boolean;
  skippedReason?: string;
  shipment?: Order['inpostShipment'];
  error?: string;
}

type Tab = 'overview' | 'orders' | 'settings' | 'admin';

function formatAdminOrderDate(value: string, locale: EcomLocale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '-';
  return date.toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAdminEventDate(value: string | undefined, locale: EcomLocale): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function inpostFulfillmentStatus(order: Order, locale: EcomLocale): string {
  if (order.inpostShipment?.trackingNumber || order.inpostShipment?.shipmentId) {
    return locale === 'pl' ? 'Etykieta utworzona' : 'Shipment created';
  }
  if (order.inpostShipment?.error) {
    return locale === 'pl' ? 'Błąd InPost' : 'InPost error';
  }
  if (order.status !== 'processing') {
    return locale === 'pl' ? 'Czeka na płatność' : 'Waiting for payment';
  }
  return locale === 'pl' ? 'Gotowe do nadania' : 'Ready to fulfill';
}

function retryMessage(data: InpostFulfillResponse, locale: EcomLocale): string {
  if (data.error) return data.error;
  if (data.created) return locale === 'pl' ? 'Przesyłka InPost została utworzona.' : 'InPost shipment created.';

  switch (data.skippedReason) {
    case 'already_fulfilled':
      return locale === 'pl' ? 'Przesyłka już istnieje.' : 'Shipment already exists.';
    case 'not_configured':
      return locale === 'pl' ? 'Brakuje konfiguracji InPost.' : 'InPost is not configured.';
    case 'not_ready':
      return locale === 'pl' ? 'Zamówienie nie jest jeszcze opłacone.' : 'Order is not ready for fulfillment.';
    case 'missing_point':
      return locale === 'pl' ? 'Brakuje wybranego paczkomatu.' : 'Pickup point is missing.';
    case 'not_inpost':
      return locale === 'pl' ? 'To nie jest zamówienie InPost.' : 'This is not an InPost order.';
    default:
      return locale === 'pl' ? 'Bez zmian.' : 'No changes.';
  }
}

function refreshMessage(data: InpostRefreshResponse, locale: EcomLocale): string {
  if (data.error) return data.error;
  if (data.refreshed) return locale === 'pl' ? 'Status InPost został odświeżony.' : 'InPost status refreshed.';

  switch (data.skippedReason) {
    case 'not_configured':
      return locale === 'pl' ? 'Brakuje konfiguracji InPost.' : 'InPost is not configured.';
    case 'missing_tracking':
      return locale === 'pl' ? 'Brakuje numeru trackingowego.' : 'Tracking number is missing.';
    case 'not_inpost':
      return locale === 'pl' ? 'To nie jest zamówienie InPost.' : 'This is not an InPost order.';
    default:
      return locale === 'pl' ? 'Bez zmian.' : 'No changes.';
  }
}

function AdminTab({
  content,
  orderStatuses,
  availableLocales,
}: {
  content: AccountAdminContent;
  orderStatuses: AccountOrdersContent['statuses'];
  availableLocales: EcomLocale[];
}): JSX.Element {
  const locale = useLocale();
  const localizedHref = useLocalizedHref();
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminOrderTotal, setAdminOrderTotal] = useState(0);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(true);
  const [adminOrdersError, setAdminOrdersError] = useState('');
  const [retryingOrderId, setRetryingOrderId] = useState('');
  const [refreshingOrderId, setRefreshingOrderId] = useState('');
  const [retryNotice, setRetryNotice] = useState('');

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

  useEffect(() => {
    let cancelled = false;
    setAdminOrdersLoading(true);
    fetch('/api/orders/admin?carrier=inpost&limit=12')
      .then((res) => res.json())
      .then((data: AdminOrdersResponse) => {
        if (cancelled) return;
        if (data.error) {
          setAdminOrdersError(data.error);
          return;
        }
        setAdminOrders(data.orders ?? []);
        setAdminOrderTotal(data.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) setAdminOrdersError(locale === 'pl' ? 'Nie można wczytać zamówień InPost.' : 'Could not load InPost orders.');
      })
      .finally(() => {
        if (!cancelled) setAdminOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  async function retryInpostFulfillment(orderId: string): Promise<void> {
    setRetryingOrderId(orderId);
    setRetryNotice('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/inpost/fulfill`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({})) as InpostFulfillResponse;
      setRetryNotice(retryMessage(data, locale));
      if (data.shipment) {
        setAdminOrders((orders) => orders.map((order) => (
          order.orderId === orderId
            ? { ...order, inpostShipment: data.shipment }
            : order
        )));
      }
    } catch {
      setRetryNotice(locale === 'pl' ? 'Nie udało się połączyć z API InPost.' : 'Could not reach the InPost fulfillment API.');
    } finally {
      setRetryingOrderId('');
    }
  }

  async function refreshInpostStatus(orderId: string): Promise<void> {
    setRefreshingOrderId(orderId);
    setRetryNotice('');
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/inpost/refresh`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({})) as InpostRefreshResponse;
      setRetryNotice(refreshMessage(data, locale));
      if (data.shipment) {
        setAdminOrders((orders) => orders.map((order) => (
          order.orderId === orderId
            ? { ...order, inpostShipment: data.shipment }
            : order
        )));
      }
    } catch {
      setRetryNotice(locale === 'pl' ? 'Nie udało się odświeżyć statusu InPost.' : 'Could not refresh the InPost status.');
    } finally {
      setRefreshingOrderId('');
    }
  }

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

      <div
        className="mb-8 px-6 py-5"
        style={{
          border: '1px solid rgba(210,116,102,0.28)',
          background: 'rgba(210,116,102,0.04)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.9rem',
              fontWeight: 300,
              color: 'var(--muted)',
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            {content.cmsLinkDescription}
          </p>
          <a
            href={localizedHref('/cms')}
            className="btn-primary flex-shrink-0 justify-center"
            style={{
              background: 'rgba(210,116,102,0.16)',
              color: 'var(--coral-red)',
              border: '1px solid rgba(210,116,102,0.45)',
            }}
          >
            {content.cmsLinkLabel}
          </a>
        </div>
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

      <div
        className="mb-8"
        style={{
          border: '1px solid rgba(210,116,102,0.2)',
          background: 'rgba(210,116,102,0.03)',
        }}
      >
        <div
          className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ borderBottom: '1px solid rgba(210,116,102,0.16)' }}
        >
          <div>
            <div className="type-label" style={{ color: 'var(--coral-red)', marginBottom: '0.35rem' }}>
              {locale === 'pl' ? 'Realizacja InPost' : 'InPost fulfillment'}
            </div>
            <p className="type-label" style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              {adminOrderTotal} {locale === 'pl' ? 'zamówień z dostawą InPost' : 'orders using InPost delivery'}
            </p>
          </div>
          {retryNotice && (
            <div className="type-label" style={{ color: 'var(--accent)', lineHeight: 1.6 }}>
              {retryNotice}
            </div>
          )}
        </div>

        {adminOrdersLoading && (
          <div className="type-label px-5 py-4" style={{ color: 'var(--muted)' }}>
            {content.loadingLabel}
          </div>
        )}
        {!adminOrdersLoading && adminOrdersError && (
          <div className="type-label px-5 py-4" style={{ color: 'var(--coral-red)' }}>
            {adminOrdersError}
          </div>
        )}
        {!adminOrdersLoading && !adminOrdersError && adminOrders.length === 0 && (
          <div className="type-label px-5 py-4" style={{ color: 'var(--muted)' }}>
            {locale === 'pl' ? 'Brak zamówień InPost.' : 'No InPost orders yet.'}
          </div>
        )}
        {!adminOrdersLoading && !adminOrdersError && adminOrders.length > 0 && (
          <div>
            {adminOrders.map((order, index) => {
              const canRetry = order.status === 'processing'
                && order.shippingCarrier === 'inpost'
                && Boolean(order.inpostPoint)
                && !order.inpostShipment?.shipmentId
                && !order.inpostShipment?.trackingNumber;
              const canRefresh = Boolean(order.inpostShipment?.trackingNumber);
              const labelHref = `/api/orders/${encodeURIComponent(order.orderId)}/inpost/label?format=A6`;
              const status = inpostFulfillmentStatus(order, locale);
              const pointLabel = order.inpostPoint?.name ?? (locale === 'pl' ? 'Brak paczkomatu' : 'No pickup point');
              const latestEventTime = formatAdminEventDate(order.inpostShipment?.eventTimestamp, locale);
              return (
                <div
                  key={order.orderId}
                  className="px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  style={{ borderTop: index === 0 ? 'none' : '1px solid rgba(210,116,102,0.12)' }}
                >
                  <div className="min-w-0">
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--fg)', marginBottom: '0.35rem' }}>
                      {order.orderId}
                    </div>
                    <div className="type-label" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                      {formatAdminOrderDate(order.createdAt, locale)} · {order.email} · {pointLabel}
                    </div>
                    {order.inpostShipment?.trackingNumber && (
                      <div className="type-label mt-1" style={{ color: 'var(--accent)' }}>
                        {locale === 'pl' ? 'Tracking' : 'Tracking'}: {order.inpostShipment.trackingNumber}
                      </div>
                    )}
                    {order.inpostShipment?.eventCode && (
                      <div className="type-label mt-1" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                        {locale === 'pl' ? 'Ostatni event' : 'Latest event'}: {order.inpostShipment.eventCode}
                        {latestEventTime ? ` / ${latestEventTime}` : ''}
                      </div>
                    )}
                    {order.inpostShipment?.error && (
                      <div className="type-label mt-1" style={{ color: 'var(--coral-red)', lineHeight: 1.6 }}>
                        {order.inpostShipment.error}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap lg:justify-end">
                    <span
                      className="type-label px-3 py-1.5"
                      style={{ background: 'var(--bg)', color: STATUS_COLORS[order.status], border: '1px solid rgba(210,116,102,0.16)' }}
                    >
                      {orderStatuses[order.status]}
                    </span>
                    <span className="type-label px-3 py-1.5" style={{ color: 'var(--muted)', border: '1px solid rgba(210,116,102,0.16)' }}>
                      {status}
                    </span>
                    {canRefresh && (
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={refreshingOrderId === order.orderId}
                        onClick={() => void refreshInpostStatus(order.orderId)}
                        style={{
                          fontSize: '0.72rem',
                          opacity: refreshingOrderId === order.orderId ? 0.45 : 1,
                        }}
                      >
                        {refreshingOrderId === order.orderId
                          ? (locale === 'pl' ? 'Odświeżam...' : 'Refreshing...')
                          : (locale === 'pl' ? 'Odśwież status' : 'Refresh status')}
                      </button>
                    )}
                    {canRefresh && (
                      <a
                        className="btn-ghost"
                        href={labelHref}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.72rem' }}
                      >
                        {locale === 'pl' ? 'Etykieta PDF' : 'Label PDF'}
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={!canRetry || retryingOrderId === order.orderId}
                      onClick={() => void retryInpostFulfillment(order.orderId)}
                      style={{
                        fontSize: '0.72rem',
                        opacity: !canRetry || retryingOrderId === order.orderId ? 0.45 : 1,
                      }}
                    >
                      {retryingOrderId === order.orderId
                        ? (locale === 'pl' ? 'Nadaję...' : 'Creating...')
                        : (locale === 'pl' ? 'Nadaj InPost' : 'Create shipment')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdminCmsEditor availableLocales={availableLocales} />

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
    if (!user) {
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

                {user.isSuperAdmin && (
                  <a
                    href={localizedHref('/cms')}
                    className="w-full text-left py-3 px-4 type-label transition-all duration-200"
                    style={{
                      color: 'var(--coral-red)',
                      background: 'rgba(210,116,102,0.06)',
                      borderLeft: '2px solid rgba(210,116,102,0.5)',
                      display: 'block',
                    }}
                  >
                    {content.admin.cmsLinkLabel}
                  </a>
                )}

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
                            : stat.key === 'items'
                              ? purchasedItemCount.toString()
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
                    {ordersLoading && (
                      <div className="type-label" style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.loadingLabel}</div>
                    )}
                    {!ordersLoading && !displayOrders[0] && (
                      <div className="type-label" style={{ color: 'var(--muted)', padding: '1rem 0' }}>{noOrdersLabel}</div>
                    )}
                    {!ordersLoading && displayOrders[0] && (
                      <div style={{ border: '1px solid var(--border)' }}>
                        <div
                          className="flex items-center justify-between px-6 py-5"
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.1em', color: 'var(--fg)', marginBottom: '0.25rem' }}>
                              {displayOrders[0].id}
                            </div>
                            <div className="type-label" style={{ color: 'var(--muted)' }}>{displayOrders[0].date}</div>
                          </div>
                          <div className="text-right">
                            <div
                              className="type-label px-3 py-1.5 inline-block mb-1"
                              style={{ background: 'var(--surface)', color: STATUS_COLORS[displayOrders[0].status] }}
                            >
                              {content.orders.statuses[displayOrders[0].status]}
                            </div>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--fg)' }}>
                              {displayOrders[0].total}
                            </div>
                          </div>
                        </div>
                        {displayOrders[0].items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-6 py-4"
                            style={{ borderBottom: i < displayOrders[0].items.length - 1 ? '1px solid var(--border)' : 'none' }}
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
                    )}
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
                    {ordersLoading && (
                      <div className="type-label" style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.loadingLabel}</div>
                    )}
                    {!ordersLoading && displayOrders.length === 0 && (
                      <div className="type-label" style={{ color: 'var(--muted)', padding: '1rem 0' }}>{noOrdersLabel}</div>
                    )}
                    {!ordersLoading && displayOrders.map((order) => (
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
                        {(order.shippingLine || order.trackingNumber) && (
                          <div
                            className="px-6 py-3 type-label"
                            style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', lineHeight: 1.7 }}
                          >
                            {order.shippingLine && (
                              <span>{locale === 'pl' ? 'Dostawa' : 'Shipping'}: {order.shippingLine}</span>
                            )}
                            {order.trackingNumber && (
                              <span style={{ marginLeft: order.shippingLine ? '1rem' : 0, color: 'var(--accent)' }}>
                                {locale === 'pl' ? 'Tracking' : 'Tracking'}: {order.trackingNumber}
                              </span>
                            )}
                          </div>
                        )}
                        {order.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-6 py-4"
                            style={{ borderBottom: i < order.items.length - 1 ? '1px solid var(--border)' : 'none' }}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="w-10 h-12 flex-shrink-0"
                                style={{
                                  background: item.imageUrl
                                    ? `url(${item.imageUrl}) center / cover`
                                    : 'linear-gradient(135deg, var(--border), var(--surface))',
                                }}
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
