import type { EcomLocale } from '@/lib/locales';
import type { InpostPoint, InpostShipment, OrderShipment, ShippingCarrier } from '@/lib/orders';

interface OrderShippingDetailsOptions {
  includeTracking?: boolean;
}

export interface OrderShippingDisplayInput {
  shippingMethod: string;
  shippingCarrier?: ShippingCarrier;
  inpostPoint?: InpostPoint;
  inpostShipment?: InpostShipment;
  shipment?: OrderShipment;
}

const CARRIER_LABELS: Record<ShippingCarrier, Record<EcomLocale, string>> = {
  manual: {
    en: 'Store arranged delivery',
    pl: 'Dostawa organizowana przez sklep',
  },
  inpost: {
    en: 'InPost',
    pl: 'InPost',
  },
  poczta_polska: {
    en: 'Poczta Polska',
    pl: 'Poczta Polska',
  },
  dpd: {
    en: 'DPD',
    pl: 'DPD',
  },
};

function appendUnique(lines: string[], value: string): void {
  const text = value.trim();
  if (text.length === 0) return;
  if (lines.some((line) => line.toLowerCase() === text.toLowerCase())) return;
  lines.push(text);
}

function includesCarrierLabel(method: string, carrierLabel: string): boolean {
  const normalizedMethod = method.toLowerCase();
  const normalizedCarrier = carrierLabel.toLowerCase();
  return normalizedMethod.includes(normalizedCarrier);
}

export function formatShippingCarrierLabel(
  carrier: ShippingCarrier | undefined,
  locale: EcomLocale,
): string {
  return CARRIER_LABELS[carrier ?? 'manual'][locale];
}

function inpostPointLine(order: OrderShippingDisplayInput, locale: EcomLocale): string {
  if (order.inpostPoint === undefined) return '';
  const label = locale === 'pl' ? 'Paczkomat' : 'Paczkomat';
  return `${label} ${order.inpostPoint.name}`;
}

function inpostAddressLine(order: OrderShippingDisplayInput): string {
  if (order.inpostPoint === undefined) return '';
  return [
    order.inpostPoint.addressLine1,
    order.inpostPoint.addressLine2,
    `${order.inpostPoint.postCode ?? ''} ${order.inpostPoint.city ?? ''}`.trim(),
  ].filter((line): line is string => line !== undefined && line.trim().length > 0).join(', ');
}

// eslint-disable-next-line complexity
export function getOrderShippingDetails(
  order: OrderShippingDisplayInput,
  locale: EcomLocale,
  options: OrderShippingDetailsOptions = {},
): string[] {
  const lines: string[] = [];
  const includeTracking = options.includeTracking ?? true;
  const method = order.shippingMethod.trim();
  const carrierLabel = formatShippingCarrierLabel(order.shippingCarrier, locale);
  appendUnique(lines, method);
  if (!includesCarrierLabel(method, carrierLabel)) appendUnique(lines, carrierLabel);
  appendUnique(lines, inpostPointLine(order, locale));
  appendUnique(lines, inpostAddressLine(order));
  const trackingNumber = order.shipment?.trackingNumber ?? order.inpostShipment?.trackingNumber;
  if (includeTracking && trackingNumber !== undefined) {
    const trackingLabel = locale === 'pl' ? 'Tracking' : 'Tracking';
    appendUnique(lines, `${trackingLabel}: ${trackingNumber}`);
  }
  return lines;
}

export function getOrderTrackingNumber(order: OrderShippingDisplayInput): string | undefined {
  return order.shipment?.trackingNumber ?? order.inpostShipment?.trackingNumber;
}

function safeTrackingUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const text = value.trim();
  if (text.length === 0) return undefined;
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function getOrderTrackingUrl(order: OrderShippingDisplayInput): string | undefined {
  return safeTrackingUrl(order.shipment?.trackingUrl) ?? safeTrackingUrl(order.inpostShipment?.shipmentUrl);
}

export function getOrderShippingSummary(
  order: OrderShippingDisplayInput,
  locale: EcomLocale,
  options: OrderShippingDetailsOptions = {},
): string {
  return getOrderShippingDetails(order, locale, options).join(' / ');
}
