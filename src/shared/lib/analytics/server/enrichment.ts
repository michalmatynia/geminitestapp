import 'server-only';

import type { NextRequest } from 'next/server';

import type { AnalyticsEventCreateInput } from '@/shared/contracts/analytics';

const normalizeOptionalString = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const toRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

export function deriveAnalyticsReferrerHost(referrer: string | null | undefined): string | undefined {
  const normalized = normalizeOptionalString(referrer);
  if (!normalized) return undefined;

  try {
    return new URL(normalized).host || undefined;
  } catch {
    return undefined;
  }
}

export function parseAnalyticsUserAgent(
  userAgent: string | null | undefined
): AnalyticsEventCreateInput['ua'] | undefined {
  const normalized = normalizeOptionalString(userAgent);
  if (!normalized) return undefined;

  const lower = normalized.toLowerCase();
  const isBot =
    /(bot|crawler|spider|crawling|slurp|preview|facebookexternalhit|whatsapp|discordbot|headless|puppeteer|playwright)/.test(
      lower
    );

  const browser = (() => {
    if (lower.includes('edg/')) return 'Edge';
    if (lower.includes('opr/') || lower.includes('opera')) return 'Opera';
    if (lower.includes('firefox/') || lower.includes('fxios/')) return 'Firefox';
    if (lower.includes('headlesschrome')) return 'Headless Chrome';
    if (lower.includes('chrome/') || lower.includes('crios/')) return 'Chrome';
    if (lower.includes('safari/') && !lower.includes('chrome/') && !lower.includes('crios/')) {
      return 'Safari';
    }
    if (lower.includes('trident/') || lower.includes('msie')) return 'Internet Explorer';
    if (lower.includes('curl/')) return 'cURL';
    if (lower.includes('postmanruntime/')) return 'Postman';
    return 'Unknown';
  })();

  const os = (() => {
    if (lower.includes('iphone') || lower.includes('ipad') || lower.includes('ipod')) return 'iOS';
    if (lower.includes('android')) return 'Android';
    if (lower.includes('windows nt')) return 'Windows';
    if (lower.includes('cros')) return 'ChromeOS';
    if (lower.includes('mac os x') || lower.includes('macintosh')) return 'macOS';
    if (lower.includes('linux')) return 'Linux';
    return 'Unknown';
  })();

  const device = (() => {
    if (isBot) return 'bot';
    if (
      lower.includes('ipad') ||
      lower.includes('tablet') ||
      lower.includes('playbook') ||
      lower.includes('silk') ||
      (lower.includes('android') && !lower.includes('mobile'))
    ) {
      return 'tablet';
    }
    if (
      lower.includes('mobile') ||
      lower.includes('iphone') ||
      lower.includes('ipod') ||
      lower.includes('iemobile') ||
      lower.includes('opera mini')
    ) {
      return 'mobile';
    }
    return 'desktop';
  })();

  return {
    browser,
    os,
    device,
    isBot,
  };
}

export function buildAnalyticsRequestMeta(req: NextRequest): Record<string, unknown> | undefined {
  const requestMeta = {
    host: normalizeOptionalString(req.headers.get('host')),
    forwardedHost: normalizeOptionalString(req.headers.get('x-forwarded-host')),
    forwardedProto: normalizeOptionalString(req.headers.get('x-forwarded-proto')),
    forwardedPort: normalizeOptionalString(req.headers.get('x-forwarded-port')),
  };

  return Object.values(requestMeta).some((value) => value !== undefined)
    ? requestMeta
    : undefined;
}

export function mergeAnalyticsMeta(
  clientMeta: unknown,
  requestMeta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  const merged = { ...(toRecord(clientMeta) ?? {}) };

  if (requestMeta) {
    merged['request'] = requestMeta;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}
