import type { ShippingCarrier } from '@/lib/orders';

function trackingToken(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

export function buildCarrierTrackingUrl(
  carrier: ShippingCarrier | undefined,
  trackingNumber: string,
): string | undefined {
  const token = trackingToken(trackingNumber);
  if (token.length === 0) return undefined;

  if (carrier === 'dpd') {
    return `https://tracktrace.dpd.com.pl/parcelDetails?p1=${encodeURIComponent(token)}&typ=1`;
  }

  if (carrier === 'poczta_polska') {
    return `https://emonitoring.poczta-polska.pl/?numer=${encodeURIComponent(token)}`;
  }

  return undefined;
}
