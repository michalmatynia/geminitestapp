import { type JSX } from 'react';
import type { AccountOrdersContent } from '@/data/accountContent';
import type { EcomLocale } from '@/lib/locales';
import type { Order } from '@/lib/orders';
import { toDisplayOrder, type DisplayOrder } from './order-utils';

const STATUS_COLORS: Record<DisplayOrder['status'], string> = {
  delivered: 'rgba(120,160,90,1)',
  'in-transit': 'rgba(180,130,60,1)',
  processing: 'var(--muted)',
  pending_payment: 'rgba(180,130,60,0.85)',
  cancelled: 'var(--coral-red)',
};

interface OrdersTabProps {
  content: AccountOrdersContent;
  locale: EcomLocale;
  orders: Order[];
  highlightedOrderId?: string;
}

interface OrderCardProps {
  content: AccountOrdersContent;
  order: DisplayOrder;
  isHighlighted?: boolean;
}

function OrderCardHeader({ content, order }: OrderCardProps): JSX.Element {
  const statusLabel = content.statuses[order.status];
  return (
    <div className='p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4' style={{ borderBottom: '1px solid var(--border)' }}>
      <div className='min-w-0'>
        <div className='type-label mb-2' style={{ color: 'var(--muted)' }}>{content.orderNumberLabel}</div>
        <h3 className='m-0' style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', letterSpacing: '0.08em', color: 'var(--fg)', overflowWrap: 'anywhere' }}>
          {order.id}
        </h3>
        <p className='type-label mt-2' style={{ color: 'var(--muted)' }}>{order.date}</p>
      </div>
      <div className='flex items-center gap-3 flex-wrap lg:justify-end'>
        <span
          className='type-label px-3 py-1.5'
          style={{ color: STATUS_COLORS[order.status], border: '1px solid rgba(171,217,208,0.16)', background: 'var(--bg)' }}
        >
          {statusLabel}
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--fg)', whiteSpace: 'nowrap' }}>
          {order.total}
        </span>
      </div>
    </div>
  );
}

function OrderItemImage({ imageUrl, name }: { imageUrl?: string; name: string }): JSX.Element {
  if (imageUrl !== undefined && imageUrl.trim().length > 0) {
    return (
      <img
        src={imageUrl}
        alt=''
        className='w-14 h-14 object-cover flex-shrink-0'
        style={{ border: '1px solid rgba(171,217,208,0.14)', background: 'var(--surface)' }}
      />
    );
  }
  return (
    <div
      className='w-14 h-14 flex-shrink-0 flex items-center justify-center'
      style={{
        border: '1px solid rgba(171,217,208,0.14)',
        background: 'var(--surface)',
        color: 'var(--muted)',
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
      }}
    >
      {name.trim().slice(0, 1).toUpperCase()}
    </div>
  );
}

function OrderShippingBlock({ content, order }: OrderCardProps): JSX.Element {
  return (
    <div>
      <div className='type-label mb-2' style={{ color: 'var(--muted)' }}>
        {content.shippingLabel}
      </div>
      <p className='m-0' style={{ color: 'var(--fg)', lineHeight: 1.7, overflowWrap: 'anywhere' }}>
        {order.shippingLine}
      </p>
      {order.trackingNumber !== undefined && (
        <p className='type-label mt-2' style={{ color: 'var(--accent)' }}>
          {content.trackingLabel}:{' '}
          {order.trackingUrl !== undefined ? (
            <a href={order.trackingUrl} target='_blank' rel='noreferrer' style={{ color: 'var(--accent)' }}>
              {order.trackingNumber}
            </a>
          ) : order.trackingNumber}
        </p>
      )}
    </div>
  );
}

function OrderItemsBlock({ content, order }: OrderCardProps): JSX.Element {
  return (
    <div>
      <div className='type-label mb-3' style={{ color: 'var(--muted)' }}>
        {content.itemsLabel}
      </div>
      <div className='grid gap-3'>
        {order.items.map((item) => (
          <div key={`${order.id}-${item.id}`} className='flex items-center gap-4 min-w-0'>
            <OrderItemImage imageUrl={item.imageUrl} name={item.name} />
            <div className='min-w-0 flex-1'>
              <div style={{ color: 'var(--fg)', overflowWrap: 'anywhere' }}>{item.name}</div>
              <div className='type-label mt-1' style={{ color: 'var(--muted)' }}>
                {content.qtyLabel} {item.qty}
              </div>
            </div>
            <div style={{ color: 'var(--fg)', whiteSpace: 'nowrap' }}>
              {item.price}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ content, order, isHighlighted = false }: OrderCardProps): JSX.Element {
  return (
    <article
      style={{
        border: `1px solid ${isHighlighted ? 'var(--accent)' : 'var(--border)'}`,
        background: isHighlighted ? 'rgba(171,217,208,0.07)' : 'rgba(171,217,208,0.03)',
      }}
    >
      <OrderCardHeader content={content} order={order} />
      <div className='p-5 grid gap-5'>
        <OrderShippingBlock content={content} order={order} />
        <OrderItemsBlock content={content} order={order} />
      </div>
    </article>
  );
}

export function OrdersTab({ content, locale, orders, highlightedOrderId = '' }: OrdersTabProps): JSX.Element {
  const displayOrders = orders.map((order) => toDisplayOrder(order, locale));
  return (
    <section>
      <div className='flex items-center justify-between gap-4 mb-6'>
        <h2 className='type-display-sm' style={{ color: 'var(--fg)' }}>
          {content.title}
        </h2>
      </div>

      {displayOrders.length === 0 ? (
        <div className='type-label p-5' style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}>
          {content.emptyLabel}
        </div>
      ) : (
        <div className='grid gap-5'>
          {displayOrders.map((order) => (
            <OrderCard key={order.id} content={content} order={order} isHighlighted={order.id === highlightedOrderId} />
          ))}
        </div>
      )}
    </section>
  );
}
