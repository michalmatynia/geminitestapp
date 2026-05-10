import { type JSX } from 'react';
import type { Order } from '@/lib/orders';
import { formatPrice, type EcomLocale } from '@/lib/locales';

export interface DisplayOrder {
  id: string;
  date: string;
  status: 'delivered' | 'in-transit' | 'processing' | 'pending_payment' | 'cancelled';
  total: string;
  shippingLine: string;
  trackingNumber?: string;
  items: { name: string; qty: number; price: string; imageUrl?: string }[];
}

export function toDisplayOrder(order: Order, locale: string): DisplayOrder {
  return {
    id: order.orderId,
    date: new Date(order.createdAt).toLocaleDateString(locale === 'pl' ? 'pl-PL' : 'en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    status: order.status,
    total: formatPrice(order.total, locale === 'pl' ? 'pl' : 'en'),
    shippingLine: [order.shippingMethod, order.inpostPoint?.name ?? ''].filter(s => s !== null && s !== undefined && s.length > 0).join(' / '),
    trackingNumber: order.inpostShipment?.trackingNumber,
    items: order.items.map((item) => ({
      name: item.name,
      qty: item.quantity,
      price: formatPrice(item.price * item.quantity, locale === 'pl' ? 'pl' : 'en'),
      imageUrl: item.imageUrl,
    })),
  };
}
