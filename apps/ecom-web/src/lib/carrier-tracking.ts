import type { ShippingCarrier } from '@/lib/orders';
import {
  readDpdProviderSettings,
  readPocztaPolskaProviderSettings,
} from '@/lib/providerSettings';

const DEFAULT_DPD_TRACKING_URL_TEMPLATE =
  'https://tracktrace.dpd.com.pl/parcelDetails?p1={trackingNumber}&typ=1';
const DEFAULT_POCZTA_POLSKA_TRACKING_URL_TEMPLATE =
  'https://emonitoring.poczta-polska.pl/?numer={trackingNumber}';

function trackingToken(value: string): string {
  return value.trim().replace(/\s+/g, '');
}

function applyTrackingUrlTemplate(template: string, token: string): string | undefined {
  const normalizedTemplate = template.trim();
  if (normalizedTemplate.length === 0) return undefined;

  const encodedToken = encodeURIComponent(token);
  const url = normalizedTemplate
    .replaceAll('{trackingNumber}', encodedToken)
    .replaceAll('{tracking}', encodedToken)
    .replaceAll('{tracking_number}', encodedToken);

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function resolveTrackingUrlTemplate(carrier: ShippingCarrier): Promise<string | undefined> {
  if (carrier === 'dpd') {
    const settings = await readDpdProviderSettings();
    if (settings === null) return DEFAULT_DPD_TRACKING_URL_TEMPLATE;
    return settings.enabled ? settings.trackingUrlTemplate : undefined;
  }

  if (carrier === 'poczta_polska') {
    const settings = await readPocztaPolskaProviderSettings();
    if (settings === null) return DEFAULT_POCZTA_POLSKA_TRACKING_URL_TEMPLATE;
    return settings.enabled ? settings.trackingUrlTemplate : undefined;
  }

  return undefined;
}

export async function buildCarrierTrackingUrl(
  carrier: ShippingCarrier | undefined,
  trackingNumber: string,
): Promise<string | undefined> {
  const token = trackingToken(trackingNumber);
  if (token.length === 0) return undefined;
  if (carrier === undefined) return undefined;

  const template = await resolveTrackingUrlTemplate(carrier);
  return template === undefined ? undefined : applyTrackingUrlTemplate(template, token);
}
