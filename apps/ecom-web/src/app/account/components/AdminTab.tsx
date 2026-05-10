'use client';

import { useState, useEffect, type JSX } from 'react';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { AdminCmsEditor } from '@/components/AdminCmsEditor';
import { type EcomLocale } from '@/lib/locales';
import type { AccountAdminContent, AccountOrdersContent } from '@/data/accountContent';
import type { Order } from '@/lib/orders';
import { formatAdminOrderDate, formatAdminEventDate } from './date-utils';
import { inpostFulfillmentStatus, retryMessage, refreshMessage, type InpostFulfillResponse, type InpostRefreshResponse } from './inpost-utils';

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

const STATUS_COLORS: Record<'delivered' | 'in-transit' | 'processing' | 'pending_payment' | 'cancelled', string> = {
  delivered: 'rgba(120,160,90,1)',
  'in-transit': 'rgba(180,130,60,1)',
  processing: 'var(--muted)',
  pending_payment: 'rgba(180,130,60,0.8)',
  cancelled: 'var(--accent)',
};

export function AdminTab({
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
        if (data.error !== undefined && data.error.length > 0) { setError(data.error); return; }
        setAdminUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => setError(content.loadUsersError))
      .finally(() => setLoading(false));
  }, [content.loadUsersError]);

  useEffect(() => {
    let cancelled = false;
    setAdminOrdersLoading(true);
    fetch('/api/orders/admin?carrier=inpost&limit=12')
      .then((res) => res.json())
      .then((data: AdminOrdersResponse) => {
        if (cancelled) return;
        if (data.error !== undefined && data.error.length > 0) {
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
      const data = (await response.json().catch(() => ({}))) as InpostFulfillResponse;
      setRetryNotice(retryMessage(data, locale));
      if (data.shipment !== undefined) {
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
      const data = (await response.json().catch(() => ({}))) as InpostRefreshResponse;
      setRetryNotice(refreshMessage(data, locale));
      if (data.shipment !== undefined) {
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
        className='mb-8 px-6 py-5'
        style={{
          border: '1px solid rgba(210,116,102,0.28)',
          background: 'rgba(210,116,102,0.04)',
        }}
      >
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
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
            className='btn-primary flex-shrink-0 justify-center'
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
          <div className='type-label' style={{ color: 'var(--muted)' }}>{content.registeredUsersLabel}</div>
        </div>
      </div>

      <div
        className='mb-8'
        style={{
          border: '1px solid rgba(210,116,102,0.2)',
          background: 'rgba(210,116,102,0.03)',
        }}
      >
        <div
          className='px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3'
          style={{ borderBottom: '1px solid rgba(210,116,102,0.16)' }}
        >
          <div>
            <div className='type-label' style={{ color: 'var(--coral-red)', marginBottom: '0.35rem' }}>
              {locale === 'pl' ? 'Realizacja InPost' : 'InPost fulfillment'}
            </div>
            <p className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
              {adminOrderTotal} {locale === 'pl' ? 'zamówień z dostawą InPost' : 'orders using InPost delivery'}
            </p>
          </div>
          {retryNotice.length > 0 && (
            <div className='type-label' style={{ color: 'var(--accent)', lineHeight: 1.6 }}>
              {retryNotice}
            </div>
          )}
        </div>

        {adminOrdersLoading && (
          <div className='type-label px-5 py-4' style={{ color: 'var(--muted)' }}>
            {content.loadingLabel}
          </div>
        )}
        {!adminOrdersLoading && adminOrdersError.length > 0 && (
          <div className='type-label px-5 py-4' style={{ color: 'var(--coral-red)' }}>
            {adminOrdersError}
          </div>
        )}
        {!adminOrdersLoading && adminOrdersError.length === 0 && adminOrders.length === 0 && (
          <div className='type-label px-5 py-4' style={{ color: 'var(--muted)' }}>
            {locale === 'pl' ? 'Brak zamówień InPost.' : 'No InPost orders yet.'}
          </div>
        )}
        {!adminOrdersLoading && adminOrdersError.length === 0 && adminOrders.length > 0 && (
          <div>
            {adminOrders.map((order, index) => {
              const canRetry = order.status === 'processing'
                && order.shippingCarrier === 'inpost'
                && order.inpostPoint !== undefined
                && order.inpostShipment?.shipmentId === undefined
                && order.inpostShipment?.trackingNumber === undefined;
              const canRefresh = order.inpostShipment?.trackingNumber !== undefined;
              const labelHref = `/api/orders/${encodeURIComponent(order.orderId)}/inpost/label?format=A6`;
              const status = inpostFulfillmentStatus(order, locale);
              const pointLabel = order.inpostPoint?.name ?? (locale === 'pl' ? 'Brak paczkomatu' : 'No pickup point');
              const latestEventTime = formatAdminEventDate(order.inpostShipment?.eventTimestamp, locale);
              return (
                <div
                  key={order.orderId}
                  className='px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'
                  style={{ borderTop: index === 0 ? 'none' : '1px solid rgba(210,116,102,0.12)' }}
                >
                  <div className='min-w-0'>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--fg)', marginBottom: '0.35rem' }}>
                      {order.orderId}
                    </div>
                    <div className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
                      {formatAdminOrderDate(order.createdAt, locale)} · {order.email} · {pointLabel}
                    </div>
                    {order.inpostShipment?.trackingNumber !== undefined && (
                      <div className='type-label mt-1' style={{ color: 'var(--accent)' }}>
                        {locale === 'pl' ? 'Tracking' : 'Tracking'}: {order.inpostShipment.trackingNumber}
                      </div>
                    )}
                    {order.inpostShipment?.eventCode !== undefined && (
                      <div className='type-label mt-1' style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
                        {locale === 'pl' ? 'Ostatni event' : 'Latest event'}: {order.inpostShipment.eventCode}
                        {latestEventTime.length > 0 ? ` / ${latestEventTime}` : ''}
                      </div>
                    )}
                    {order.inpostShipment?.error !== undefined && (
                      <div className='type-label mt-1' style={{ color: 'var(--coral-red)', lineHeight: 1.6 }}>
                        {order.inpostShipment.error}
                      </div>
                    )}
                  </div>
                  <div className='flex items-center gap-3 flex-wrap lg:justify-end'>
                    <span
                      className='type-label px-3 py-1.5'
                      style={{ background: 'var(--bg)', color: STATUS_COLORS[order.status], border: '1px solid rgba(210,116,102,0.16)' }}
                    >
                      {orderStatuses[order.status]}
                    </span>
                    <span className='type-label px-3 py-1.5' style={{ color: 'var(--muted)', border: '1px solid rgba(210,116,102,0.16)' }}>
                      {status}
                    </span>
                    {canRefresh && (
                      <button
                        type='button'
                        className='btn-ghost'
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
                        className='btn-ghost'
                        href={labelHref}
                        target='_blank'
                        rel='noreferrer'
                        style={{ fontSize: '0.72rem' }}
                      >
                        {locale === 'pl' ? 'Etykieta PDF' : 'Label PDF'}
                      </a>
                    )}
                    <button
                      type='button'
                      className='btn-ghost'
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
        {!loading && error.length === 0 && adminUsers.length === 0 && (
          <div className='type-label' style={{ color: 'var(--muted)', padding: '1rem 0' }}>{content.noUsersLabel}</div>
        )}
        {!loading && error.length === 0 && adminUsers.length > 0 && (
          <div style={{ border: '1px solid rgba(210,116,102,0.2)', overflow: 'hidden' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr auto',
              gap: '1rem',
              padding: '0.65rem 1rem',
              background: 'rgba(210,116,102,0.06)',
              borderBottom: '1px solid rgba(210,116,102,0.2)',
            }}>
              {content.tableHeaders.map((h) => (
                <div key={h} className='type-label' style={{ color: 'var(--coral-red)', fontSize: '0.6rem', letterSpacing: '0.12em' }}>{h}</div>
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
                  {u.createdAt !== undefined ? new Date(u.createdAt).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
