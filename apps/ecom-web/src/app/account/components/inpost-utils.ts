import { type EcomLocale } from '@/lib/locales';
import type { Order } from '@/lib/orders';

export interface InpostFulfillResponse {
  created?: boolean;
  skippedReason?: string;
  shipment?: Order['inpostShipment'];
  error?: string;
}

export interface InpostRefreshResponse {
  refreshed?: boolean;
  skippedReason?: string;
  shipment?: Order['inpostShipment'];
  error?: string;
}

const INPOST_FULFILLMENT_MESSAGES_BY_LOCALE: Record<
  EcomLocale,
  {
    shipped: string;
    error: string;
    waiting: string;
    ready: string;
  }
> = {
  pl: {
    shipped: 'Etykieta utworzona',
    error: 'Błąd InPost',
    waiting: 'Czeka na płatność',
    ready: 'Gotowe do nadania',
  },
  en: {
    shipped: 'Shipment created',
    error: 'InPost error',
    waiting: 'Waiting for payment',
    ready: 'Ready to fulfill',
  },
};

export function inpostFulfillmentStatus(order: Order, locale: EcomLocale): string {
  const messages = INPOST_FULFILLMENT_MESSAGES_BY_LOCALE[locale];
  const inpostShipment = order.inpostShipment;
  const hasShipmentLabel = Boolean(inpostShipment?.trackingNumber) || Boolean(inpostShipment?.shipmentId);

  if (hasShipmentLabel) {
    return messages.shipped;
  }
  if (inpostShipment?.error !== undefined) {
    return messages.error;
  }
  if (order.status === 'processing') {
    return messages.ready;
  }
  return messages.waiting;
}

export function retryMessage(data: InpostFulfillResponse, locale: EcomLocale): string {
  if (typeof data.error === 'string' && data.error.length > 0) return data.error;
  if (data.created === true) return locale === 'pl' ? 'Przesyłka InPost została utworzona.' : 'InPost shipment created.';

  const reason = data.skippedReason;
  const messages: Record<string, string> = locale === 'pl'
    ? {
      already_fulfilled: 'Przesyłka już istnieje.',
      not_configured: 'Brakuje konfiguracji InPost.',
      not_ready: 'Zamówienie nie jest jeszcze opłacone.',
      missing_point: 'Brakuje wybranego paczkomatu.',
      not_inpost: 'To nie jest zamówienie InPost.',
      default: 'Bez zmian.',
    }
    : {
      already_fulfilled: 'Shipment already exists.',
      not_configured: 'InPost is not configured.',
      not_ready: 'Order is not ready for fulfillment.',
      missing_point: 'Pickup point is missing.',
      not_inpost: 'This is not an InPost order.',
      default: 'No changes.',
    };

  if (reason === undefined) return messages.default;
  return messages[reason];
}

export function refreshMessage(data: InpostRefreshResponse, locale: EcomLocale): string {
  if (typeof data.error === 'string' && data.error.length > 0) return data.error;
  if (data.refreshed === true) return locale === 'pl' ? 'Status InPost został odświeżony.' : 'InPost status refreshed.';

  const reason = data.skippedReason;
  const messages: Record<string, string> = locale === 'pl'
    ? {
      not_configured: 'Brakuje konfiguracji InPost.',
      missing_tracking: 'Brakuje numeru trackingowego.',
      not_inpost: 'To nie jest zamówienie InPost.',
      default: 'Bez zmian.',
    }
    : {
      not_configured: 'InPost is not configured.',
      missing_tracking: 'Tracking number is missing.',
      not_inpost: 'This is not an InPost order.',
      default: 'No changes.',
    };

  if (reason === undefined) return messages.default;
  return messages[reason];
}
