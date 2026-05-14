import { type JSX } from 'react';
import { type EcomLocale } from '@/lib/locales';
import type { Order } from '@/lib/orders';
import type { AccountAdminContent, AccountOrdersContent } from '@/data/accountContent';
import { formatAdminEventDate, formatAdminOrderDate } from './date-utils';
import { inpostFulfillmentStatus } from './inpost-utils';

const STATUS_COLORS: Record<'delivered' | 'in-transit' | 'processing' | 'pending_payment' | 'cancelled', string> = {
  delivered: 'rgba(120,160,90,1)',
  'in-transit': 'rgba(180,130,60,1)',
  processing: 'var(--muted)',
  pending_payment: 'rgba(180,130,60,0.8)',
  cancelled: 'var(--accent)',
};

interface AdminInpostOrdersPanelProps {
  content: AccountAdminContent;
  locale: EcomLocale;
  orderStatuses: AccountOrdersContent['statuses'];
  adminOrders: Order[];
  adminOrderTotal: number;
  adminOrdersLoading: boolean;
  adminOrdersError: string;
  retryNotice: string;
  retryingOrderId: string;
  refreshingOrderId: string;
  onRetry: (orderId: string) => void;
  onRefresh: (orderId: string) => void;
}

interface AdminInpostOrderRowProps {
  order: Order;
  locale: EcomLocale;
  statusLabel: string;
  canRefresh: boolean;
  canRetry: boolean;
  labelHref: string;
  isRetrying: boolean;
  isRefreshing: boolean;
  isFirst: boolean;
  onRetry: (orderId: string) => void;
  onRefresh: (orderId: string) => void;
}

// eslint-disable-next-line max-lines-per-function, complexity
function AdminInpostOrderRow({
  order,
  locale,
  statusLabel,
  canRefresh,
  canRetry,
  labelHref,
  isRetrying,
  isRefreshing,
  isFirst,
  onRetry,
  onRefresh,
}: AdminInpostOrderRowProps): JSX.Element {
  const pointLabel = order.inpostPoint?.name ?? (locale === 'pl' ? 'Brak paczkomatu' : 'No pickup point');
  const status = inpostFulfillmentStatus(order, locale);
  const latestEventTime = formatAdminEventDate(order.inpostShipment?.eventTimestamp, locale);
  const rowBorderTop = isFirst ? 'none' : '1px solid rgba(210,116,102,0.12)';
  const refreshStyleOpacity = isRefreshing ? 0.45 : 1;
  const retryStyleOpacity = !canRetry || isRetrying ? 0.45 : 1;

  const getRefreshLabel = (): string => {
    if (isRefreshing) {
      return locale === 'pl' ? 'Odświeżam...' : 'Refreshing...';
    }
    return locale === 'pl' ? 'Odśwież status' : 'Refresh status';
  };

  const getRetryLabel = (): string => {
    if (isRetrying) {
      return locale === 'pl' ? 'Nadaję...' : 'Creating...';
    }
    return locale === 'pl' ? 'Nadaj InPost' : 'Create shipment';
  };

  return (
    <div
      className='px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4'
      style={{ borderTop: rowBorderTop }}
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
            Tracking:{' '}
            {order.inpostShipment.trackingUrl !== undefined ? (
              <a href={order.inpostShipment.trackingUrl} target='_blank' rel='noreferrer' style={{ color: 'var(--accent)' }}>
                {order.inpostShipment.trackingNumber}
              </a>
            ) : order.inpostShipment.trackingNumber}
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
          {statusLabel}
        </span>
        <span className='type-label px-3 py-1.5' style={{ color: 'var(--muted)', border: '1px solid rgba(210,116,102,0.16)' }}>
          {status}
        </span>
        {canRefresh && (
          <button
            type='button'
            className='btn-ghost'
            disabled={isRefreshing}
            onClick={() => { onRefresh(order.orderId); }}
            style={{
              fontSize: '0.72rem',
              opacity: refreshStyleOpacity,
            }}
          >
            {getRefreshLabel()}
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
          disabled={!canRetry || isRetrying}
          onClick={() => { onRetry(order.orderId); }}
          style={{
            fontSize: '0.72rem',
            opacity: retryStyleOpacity,
          }}
        >
          {getRetryLabel()}
        </button>
      </div>
    </div>
  );
}

// eslint-disable-next-line max-lines-per-function, complexity
export function AdminInpostOrdersPanel({
  content,
  locale,
  orderStatuses,
  adminOrders,
  adminOrderTotal,
  adminOrdersLoading,
  adminOrdersError,
  retryNotice,
  retryingOrderId,
  refreshingOrderId,
  onRetry,
  onRefresh,
}: AdminInpostOrdersPanelProps): JSX.Element {
  const orderHeader = locale === 'pl' ? 'Realizacja InPost' : 'InPost fulfillment';
  const orderDescription = locale === 'pl' ? 'zamówień z dostawą InPost' : 'orders using InPost delivery';
  const hasNoOrders = adminOrders.length === 0 && adminOrdersError.length === 0 && !adminOrdersLoading;
  const showInpostRows = adminOrders.length > 0 && adminOrdersError.length === 0 && !adminOrdersLoading;
  return (
    <div className='mb-8' style={{ border: '1px solid rgba(210,116,102,0.2)', background: 'rgba(210,116,102,0.03)' }}>
      <div className='px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3' style={{ borderBottom: '1px solid rgba(210,116,102,0.16)' }}>
        <div>
          <div className='type-label' style={{ color: 'var(--coral-red)', marginBottom: '0.35rem' }}>
            {orderHeader}
          </div>
          <p className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            {adminOrderTotal} {orderDescription}
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
      {hasNoOrders && (
        <div className='type-label px-5 py-4' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Brak zamówień InPost.' : 'No InPost orders yet.'}
        </div>
      )}
      {showInpostRows && (
        <div>
          {adminOrders.map((order, index) => {
            const canRetry = order.status === 'processing'
              && order.shippingCarrier === 'inpost'
              && order.inpostPoint !== undefined
              && order.inpostShipment?.shipmentId === undefined
              && order.inpostShipment?.trackingNumber === undefined;
            const canRefresh = order.inpostShipment?.trackingNumber !== undefined;
            const labelHref = `/api/orders/${encodeURIComponent(order.orderId)}/inpost/label?format=A6`;
            return (
              <AdminInpostOrderRow
                key={order.orderId}
                order={order}
                locale={locale}
                statusLabel={orderStatuses[order.status]}
                canRefresh={canRefresh}
                canRetry={canRetry}
                labelHref={labelHref}
                isRetrying={retryingOrderId === order.orderId}
                isRefreshing={refreshingOrderId === order.orderId}
                isFirst={index === 0}
                onRetry={onRetry}
                onRefresh={onRefresh}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
