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

export function inpostFulfillmentStatus(order: Order, locale: EcomLocale): string {
  const hasTracking = order.inpostShipment?.trackingNumber !== undefined && order.inpostShipment.trackingNumber.length > 0;
  const hasShipmentId = order.inpostShipment?.shipmentId !== undefined && order.inpostShipment.shipmentId.length > 0;
  
  if (hasTracking || hasShipmentId) {
    return locale === 'pl' ? 'Etykieta utworzona' : 'Shipment created';
  }
  
  const hasError = order.inpostShipment?.error !== undefined && order.inpostShipment.error.length > 0;
  if (hasError) {
    return locale === 'pl' ? 'Błąd InPost' : 'InPost error';
  }
  if (order.status !== 'processing') {
    return locale === 'pl' ? 'Czeka na płatność' : 'Waiting for payment';
  }
  return locale === 'pl' ? 'Gotowe do nadania' : 'Ready to fulfill';
}

export function retryMessage(data: InpostFulfillResponse, locale: EcomLocale): string {
  const hasError = data.error !== undefined && data.error.length > 0;
  if (hasError) return data.error;
  
  const created = data.created === true;
  if (created) return locale === 'pl' ? 'Przesyłka InPost została utworzona.' : 'InPost shipment created.';

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

export function refreshMessage(data: InpostRefreshResponse, locale: EcomLocale): string {
  const hasError = data.error !== undefined && data.error.length > 0;
  if (hasError) return data.error;
  
  const refreshed = data.refreshed === true;
  if (refreshed) return locale === 'pl' ? 'Status InPost został odświeżony.' : 'InPost status refreshed.';

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
