'use client';

/* eslint-disable max-lines */

import { useState, useEffect, type JSX } from 'react';
import { useLocale, useLocalizedHref } from '@/context/LocaleContext';
import { AdminCmsEditor } from '@/components/AdminCmsEditor';
import { type EcomLocale } from '@/lib/locales';
import type { AccountAdminContent, AccountOrdersContent } from '@/data/accountContent';
import type { Order } from '@/lib/orders';
import { retryMessage, refreshMessage, type InpostFulfillResponse, type InpostRefreshResponse } from './inpost-utils';
import { AdminInpostOrdersPanel } from './AdminInpostOrdersPanel';
import { AdminShippingOrdersPanel } from './AdminShippingOrdersPanel';
import { AdminUsersPanel } from './AdminUsersPanel';

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

interface FulfillmentResponse {
  order?: Order;
  error?: string;
}

interface AdminTabProps {
  content: AccountAdminContent;
  orderStatuses: AccountOrdersContent['statuses'];
  availableLocales: EcomLocale[];
}

// eslint-disable-next-line max-lines-per-function
export function AdminTab({ content, orderStatuses, availableLocales }: AdminTabProps): JSX.Element {
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
  const [shippingOrders, setShippingOrders] = useState<Order[]>([]);
  const [shippingOrdersLoading, setShippingOrdersLoading] = useState(true);
  const [shippingOrdersError, setShippingOrdersError] = useState('');
  const [savingFulfillmentOrderId, setSavingFulfillmentOrderId] = useState('');
  const [fulfillmentNotice, setFulfillmentNotice] = useState('');
  const [retryingOrderId, setRetryingOrderId] = useState('');
  const [refreshingOrderId, setRefreshingOrderId] = useState('');
  const [retryNotice, setRetryNotice] = useState('');

  useEffect(() => {
    fetch('/api/auth/admin/users')
      .then((res) => res.json())
      .then((data: { users?: AdminUser[]; total?: number; error?: string }) => {
        if (data.error !== undefined && data.error.length > 0) {
          setError(data.error);
          return;
        }
        setAdminUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setError(content.loadUsersError);
      })
      .finally(() => {
        setLoading(false);
      });
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
        if (!cancelled) {
          setAdminOrdersError(locale === 'pl' ? 'Nie można wczytać zamówień InPost.' : 'Could not load InPost orders.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAdminOrdersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    let cancelled = false;
    setShippingOrdersLoading(true);
    fetch('/api/orders/admin?limit=24')
      .then((res) => res.json())
      .then((data: AdminOrdersResponse) => {
        if (cancelled) return;
        if (data.error !== undefined && data.error.length > 0) {
          setShippingOrdersError(data.error);
          return;
        }
        setShippingOrders(data.orders ?? []);
      })
      .catch(() => {
        if (!cancelled) {
          setShippingOrdersError(locale === 'pl' ? 'Nie można wczytać zamówień do wysyłki.' : 'Could not load fulfillment orders.');
        }
      })
      .finally(() => {
        if (!cancelled) setShippingOrdersLoading(false);
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

  const handleRetry = (orderId: string): void => {
    retryInpostFulfillment(orderId).catch(() => {
      setRetryNotice(locale === 'pl' ? 'Nie udało się rozpocząć obsługi przesyłki.' : 'Could not start shipment creation.');
    });
  };

  const handleRefresh = (orderId: string): void => {
    refreshInpostStatus(orderId).catch(() => {
      setRetryNotice(locale === 'pl' ? 'Nie udało się odświeżyć statusu InPost.' : 'Could not refresh the InPost status.');
    });
  };

  const handleFulfillmentSave = (orderId: string, payload: { status: Order['status']; trackingNumber: string; trackingUrl: string }): void => {
    setSavingFulfillmentOrderId(orderId);
    setFulfillmentNotice('');
    fetch(`/api/orders/${encodeURIComponent(orderId)}/fulfillment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as FulfillmentResponse;
        if (!response.ok || data.order === undefined) {
          throw new Error(data.error ?? 'Fulfillment update failed');
        }
        setShippingOrders((orders) => orders.map((order) => (order.orderId === orderId ? data.order as Order : order)));
        setAdminOrders((orders) => orders.map((order) => (order.orderId === orderId ? data.order as Order : order)));
        setFulfillmentNotice(locale === 'pl' ? 'Zapisano dane wysyłki.' : 'Fulfillment details saved.');
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Fulfillment update failed';
        setFulfillmentNotice(message);
      })
      .finally(() => {
        setSavingFulfillmentOrderId('');
      });
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            fontWeight: 300,
            color: 'var(--fg)',
          }}
        >
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
      <div className='mb-8 px-6 py-5' style={{ border: '1px solid rgba(210,116,102,0.28)', background: 'rgba(210,116,102,0.04)' }}>
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

      <AdminInpostOrdersPanel
        content={content}
        locale={locale}
        orderStatuses={orderStatuses}
        adminOrders={adminOrders}
        adminOrderTotal={adminOrderTotal}
        adminOrdersLoading={adminOrdersLoading}
        adminOrdersError={adminOrdersError}
        retryNotice={retryNotice}
        retryingOrderId={retryingOrderId}
        refreshingOrderId={refreshingOrderId}
        onRetry={handleRetry}
        onRefresh={handleRefresh}
      />

      <AdminShippingOrdersPanel
        content={content}
        locale={locale}
        orderStatuses={orderStatuses}
        orders={shippingOrders}
        loading={shippingOrdersLoading}
        error={shippingOrdersError}
        notice={fulfillmentNotice}
        savingOrderId={savingFulfillmentOrderId}
        onSave={handleFulfillmentSave}
      />

      <AdminCmsEditor availableLocales={availableLocales} />

      <AdminUsersPanel
        content={content}
        locale={locale}
        loading={loading}
        error={error}
        users={adminUsers}
      />
    </div>
  );
}
