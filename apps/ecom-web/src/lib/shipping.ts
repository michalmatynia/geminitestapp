import type {
  CheckoutShippingMethodContent,
  ShippingZone,
} from '@/data/checkoutContent';
import type { EcomLocale } from '@/lib/locales';

function normalizeCountry(value: string): string {
  return value.trim().toLowerCase();
}

function addBusinessDays(start: Date, days: number): Date {
  const date = new Date(start);
  date.setHours(12, 0, 0, 0);

  let remaining = Math.max(0, Math.round(days));
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }

  return date;
}

function formatRangeDate(date: Date, locale: EcomLocale, includeMonth: boolean): string {
  return new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    ...(includeMonth ? { month: 'short' as const } : {}),
  }).format(date);
}

export function getZoneForCountry(zones: ShippingZone[], country: string): ShippingZone | null {
  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry.length === 0) return null;

  let catchAll: ShippingZone | null = null;

  for (const zone of zones) {
    if (zone.countries.length === 0) {
      catchAll = zone;
      continue;
    }
    if (zone.countries.some((zoneCountry) => normalizeCountry(zoneCountry) === normalizedCountry)) {
      return zone;
    }
  }

  return catchAll;
}

export function calcDeliveryRange(min: number, max: number, locale: EcomLocale): string {
  const safeMin = Math.max(1, Math.round(min));
  const safeMax = Math.max(safeMin, Math.round(max));
  const start = new Date();
  const startDate = addBusinessDays(start, safeMin);
  const endDate = addBusinessDays(start, safeMax);
  const outputLocale = locale === 'pl' ? 'pl-PL' : 'en-GB';

  if (startDate.toDateString() === endDate.toDateString()) {
    return new Intl.DateTimeFormat(outputLocale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(startDate);
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth()
    && startDate.getFullYear() === endDate.getFullYear();
  return `${formatRangeDate(startDate, locale, !sameMonth)}-${formatRangeDate(endDate, locale, true)}`;
}

export function applyFreeThreshold(
  methods: CheckoutShippingMethodContent[],
  subtotal: number,
  threshold: number,
  methodId: string,
): CheckoutShippingMethodContent[] {
  if (threshold <= 0 || subtotal < threshold) return methods;

  return methods.map((method) => (
    method.id === methodId
      ? { ...method, price: 0 }
      : method
  ));
}
