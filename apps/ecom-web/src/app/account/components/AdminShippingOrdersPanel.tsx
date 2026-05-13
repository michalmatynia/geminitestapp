import { type FormEvent, type JSX } from 'react';
import { type EcomLocale } from '@/lib/locales';
import type { AccountAdminContent, AccountOrdersContent } from '@/data/accountContent';
import type { Order } from '@/lib/orders';
import { getOrderTrackingNumber } from '@/lib/order-shipping';
import { formatAdminOrderDate } from './date-utils';

type OrderStatus = Order['status'];

const FULFILLMENT_STATUSES: OrderStatus[] = ['processing', 'in-transit', 'delivered', 'cancelled'];

interface FulfillmentPayload {
  status: OrderStatus;
  trackingNumber: string;
  trackingUrl: string;
}

interface AdminShippingOrdersPanelProps {
  content: AccountAdminContent;
  locale: EcomLocale;
  orderStatuses: AccountOrdersContent['statuses'];
  orders: Order[];
  loading: boolean;
  error: string;
  notice: string;
  savingOrderId: string;
  onSave: (orderId: string, payload: FulfillmentPayload) => void;
}

interface AdminShippingOrderRowProps {
  locale: EcomLocale;
  order: Order;
  orderStatuses: AccountOrdersContent['statuses'];
  isSaving: boolean;
  isFirst: boolean;
  onSave: (orderId: string, payload: FulfillmentPayload) => void;
}

function submitFulfillmentForm(
  event: FormEvent<HTMLFormElement>,
  orderId: string,
  onSave: (orderId: string, payload: FulfillmentPayload) => void,
): void {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  onSave(orderId, {
    status: String(form.get('status') ?? 'processing') as OrderStatus,
    trackingNumber: String(form.get('trackingNumber') ?? '').trim(),
    trackingUrl: String(form.get('trackingUrl') ?? '').trim(),
  });
}

function saveButtonLabel(locale: EcomLocale, isSaving: boolean): string {
  if (isSaving) return locale === 'pl' ? 'Zapisuję...' : 'Saving...';
  return locale === 'pl' ? 'Zapisz' : 'Save';
}

// eslint-disable-next-line complexity
function AdminShippingOrderRow({
  locale,
  order,
  orderStatuses,
  isSaving,
  isFirst,
  onSave,
}: AdminShippingOrderRowProps): JSX.Element {
  const trackingNumber = getOrderTrackingNumber(order) ?? '';
  const rowBorderTop = isFirst ? 'none' : '1px solid rgba(210,116,102,0.12)';
  return (
    <form
      className='px-5 py-4 grid gap-4'
      style={{ borderTop: rowBorderTop }}
      onSubmit={(event) => submitFulfillmentForm(event, order.orderId, onSave)}
    >
      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3'>
        <div className='min-w-0'>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--fg)', marginBottom: '0.35rem' }}>
            {order.orderId}
          </div>
          <div className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
            {formatAdminOrderDate(order.createdAt, locale)} · {order.email} · {order.shippingMethod}
          </div>
        </div>
        <span className='type-label px-3 py-1.5' style={{ color: 'var(--muted)', border: '1px solid rgba(210,116,102,0.16)' }}>
          {order.shippingCarrier ?? 'manual'}
        </span>
      </div>

      <div className='grid gap-3 md:grid-cols-[minmax(140px,180px)_1fr_1fr_auto] md:items-end'>
        <label className='grid gap-1 type-label' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Status' : 'Status'}
          <select name='status' defaultValue={order.status} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', padding: '0.65rem' }}>
            {FULFILLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>{orderStatuses[status]}</option>
            ))}
          </select>
        </label>
        <label className='grid gap-1 type-label' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Numer trackingu' : 'Tracking number'}
          <input name='trackingNumber' defaultValue={trackingNumber} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', padding: '0.65rem' }} />
        </label>
        <label className='grid gap-1 type-label' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Link trackingu' : 'Tracking link'}
          <input name='trackingUrl' defaultValue={order.shipment?.trackingUrl ?? ''} style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', padding: '0.65rem' }} />
        </label>
        <button type='submit' className='btn-ghost' disabled={isSaving} style={{ fontSize: '0.72rem', opacity: isSaving ? 0.5 : 1 }}>
          {saveButtonLabel(locale, isSaving)}
        </button>
      </div>
    </form>
  );
}

// eslint-disable-next-line complexity
export function AdminShippingOrdersPanel({
  content,
  locale,
  orderStatuses,
  orders,
  loading,
  error,
  notice,
  savingOrderId,
  onSave,
}: AdminShippingOrdersPanelProps): JSX.Element {
  const visibleOrders = orders.filter((order) => order.shippingCarrier !== 'inpost');
  const hasNoOrders = visibleOrders.length === 0 && error.length === 0 && !loading;
  return (
    <div className='mb-8' style={{ border: '1px solid rgba(210,116,102,0.2)', background: 'rgba(210,116,102,0.03)' }}>
      <div className='px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3' style={{ borderBottom: '1px solid rgba(210,116,102,0.16)' }}>
        <div>
          <div className='type-label' style={{ color: 'var(--coral-red)', marginBottom: '0.35rem' }}>
            {locale === 'pl' ? 'Realizacja Poczta Polska / DPD' : 'Poczta Polska / DPD fulfillment'}
          </div>
          <p className='type-label' style={{ color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>
            {visibleOrders.length} {locale === 'pl' ? 'zamówień do ręcznej obsługi' : 'orders ready for manual tracking'}
          </p>
        </div>
        {notice.length > 0 && (
          <div className='type-label' style={{ color: 'var(--accent)', lineHeight: 1.6 }}>
            {notice}
          </div>
        )}
      </div>
      {loading && <div className='type-label px-5 py-4' style={{ color: 'var(--muted)' }}>{content.loadingLabel}</div>}
      {!loading && error.length > 0 && <div className='type-label px-5 py-4' style={{ color: 'var(--coral-red)' }}>{error}</div>}
      {hasNoOrders && (
        <div className='type-label px-5 py-4' style={{ color: 'var(--muted)' }}>
          {locale === 'pl' ? 'Brak zamówień Poczta Polska / DPD.' : 'No Poczta Polska / DPD orders yet.'}
        </div>
      )}
      {!loading && error.length === 0 && visibleOrders.map((order, index) => (
        <AdminShippingOrderRow
          key={order.orderId}
          locale={locale}
          order={order}
          orderStatuses={orderStatuses}
          isSaving={savingOrderId === order.orderId}
          isFirst={index === 0}
          onSave={onSave}
        />
      ))}
    </div>
  );
}
