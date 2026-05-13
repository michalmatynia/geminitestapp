import type { Order } from '@/lib/orders';
import { formatPrice } from '@/lib/locales';
import { getOrderShippingSummary, getOrderTrackingNumber, getOrderTrackingUrl } from '@/lib/order-shipping';

export interface DisplayOrder {
  id: string;
  date: string;
  status: 'delivered' | 'in-transit' | 'processing' | 'pending_payment' | 'cancelled';
  total: string;
  shippingLine: string;
  trackingNumber?: string;
  trackingUrl?: string;
  items: { id: string; name: string; qty: number; price: string; imageUrl?: string }[];
}

const orderCurrencyCode = (order: Order): string =>
  order.items.find((item) => (item.currencyCode ?? '').trim() !== '')?.currencyCode ?? 'PLN';

export function toDisplayOrder(order: Order, locale: string): DisplayOrder {
  const currencyCode = orderCurrencyCode(order);
  const displayLocale = locale === 'pl' ? 'pl' : 'en';
  return {
    id: order.orderId,
    date: new Date(order.createdAt).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    status: order.status,
    total: formatPrice(order.total, displayLocale, currencyCode),
    shippingLine: getOrderShippingSummary(order, displayLocale, { includeTracking: false }),
    trackingNumber: getOrderTrackingNumber(order),
    trackingUrl: getOrderTrackingUrl(order),
    items: order.items.map((item) => ({
      id: `${item.productId}-${item.slug}-${item.size}`,
      name: item.name,
      qty: item.quantity,
      price: formatPrice(item.price * item.quantity, displayLocale, item.currencyCode),
      imageUrl: item.imageUrl,
    })),
  };
}
