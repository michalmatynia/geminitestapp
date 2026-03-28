import { createHmac, timingSafeEqual } from 'crypto';

type FilemakerCampaignUnsubscribeTokenPayload = {
  emailAddress: string;
  campaignId: string | null;
  runId: string | null;
  deliveryId: string | null;
  redirectTo: string | null;
  scope: 'campaign' | 'all_campaigns';
  exp: number;
};

const FILEMAKER_CAMPAIGN_UNSUBSCRIBE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 180;
const DEV_FALLBACK_SIGNING_KEY = 'filemaker-campaign-unsubscribe-dev-secret-change-me';

const normalizeOptionalSecret = (value: string | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveSigningKey = (): string => {
  const configured =
    normalizeOptionalSecret(process.env['FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET']) ??
    normalizeOptionalSecret(process.env['AUTH_SECRET']) ??
    normalizeOptionalSecret(process.env['NEXTAUTH_SECRET']);
  if (configured) {
    return configured;
  }
  if (process.env['NODE_ENV'] === 'development' || process.env['NODE_ENV'] === 'test') {
    return DEV_FALLBACK_SIGNING_KEY;
  }
  throw new Error(
    'No Filemaker campaign unsubscribe signing secret is configured. Set FILEMAKER_CAMPAIGN_UNSUBSCRIBE_SECRET, AUTH_SECRET, or NEXTAUTH_SECRET.'
  );
};

const resolvePublicAppUrl = (): string =>
  (
    normalizeOptionalSecret(process.env['NEXT_PUBLIC_APP_URL']) ??
    normalizeOptionalSecret(process.env['NEXTAUTH_URL']) ??
    'http://localhost:3000'
  ).replace(/\/+$/g, '');

const base64UrlEncode = (value: string): string => Buffer.from(value).toString('base64url');

const base64UrlDecode = (value: string): string => Buffer.from(value, 'base64url').toString('utf8');

const signValue = (value: string): string =>
  createHmac('sha256', resolveSigningKey()).update(value).digest('base64url');

const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const createFilemakerCampaignUnsubscribeToken = (input: {
  emailAddress: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  redirectTo?: string | null;
  scope?: 'campaign' | 'all_campaigns';
  now?: number;
  ttlMs?: number;
}): string => {
  const now = input.now ?? Date.now();
  const payload: FilemakerCampaignUnsubscribeTokenPayload = {
    emailAddress: input.emailAddress.trim().toLowerCase(),
    campaignId: input.campaignId?.trim() || null,
    runId: input.runId?.trim() || null,
    deliveryId: input.deliveryId?.trim() || null,
    redirectTo: input.redirectTo?.trim() || null,
    scope: input.scope === 'all_campaigns' ? 'all_campaigns' : 'campaign',
    exp: now + (input.ttlMs ?? FILEMAKER_CAMPAIGN_UNSUBSCRIBE_TOKEN_TTL_MS),
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(body);
  return `${body}.${signature}`;
};

export const parseFilemakerCampaignUnsubscribeToken = (
  token: string | null | undefined,
  now: number = Date.now()
): FilemakerCampaignUnsubscribeTokenPayload | null => {
  const normalized = token?.trim();
  if (!normalized) {
    return null;
  }
  const [body, signature] = normalized.split('.');
  if (!body || !signature || !safeEqual(signValue(body), signature)) {
    return null;
  }
  try {
    const parsed = JSON.parse(base64UrlDecode(body)) as Partial<FilemakerCampaignUnsubscribeTokenPayload>;
    if (
      typeof parsed.emailAddress !== 'string' ||
      typeof parsed.exp !== 'number' ||
      parsed.exp <= now
    ) {
      return null;
    }
    return {
      emailAddress: parsed.emailAddress.trim().toLowerCase(),
      campaignId: typeof parsed.campaignId === 'string' ? parsed.campaignId.trim() || null : null,
      runId: typeof parsed.runId === 'string' ? parsed.runId.trim() || null : null,
      deliveryId:
        typeof parsed.deliveryId === 'string' ? parsed.deliveryId.trim() || null : null,
      redirectTo:
        typeof parsed.redirectTo === 'string' ? parsed.redirectTo.trim() || null : null,
      scope: parsed.scope === 'all_campaigns' ? 'all_campaigns' : 'campaign',
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
};

export const buildFilemakerCampaignUnsubscribeUrl = (input: {
  emailAddress: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  now?: number;
  ttlMs?: number;
  appUrl?: string | null;
}): string => {
  const token = createFilemakerCampaignUnsubscribeToken(input);
  const baseUrl = (input.appUrl?.trim() || resolvePublicAppUrl()).replace(/\/+$/g, '');
  return `${baseUrl}/filemaker/unsubscribe?token=${encodeURIComponent(token)}`;
};

export const buildFilemakerCampaignPreferencesUrl = (input: {
  emailAddress: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  now?: number;
  ttlMs?: number;
  appUrl?: string | null;
}): string => {
  const token = createFilemakerCampaignUnsubscribeToken(input);
  const baseUrl = (input.appUrl?.trim() || resolvePublicAppUrl()).replace(/\/+$/g, '');
  return `${baseUrl}/filemaker/preferences?token=${encodeURIComponent(token)}`;
};

export const buildFilemakerCampaignManageAllPreferencesUrl = (input: {
  emailAddress: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  now?: number;
  ttlMs?: number;
  appUrl?: string | null;
}): string => {
  const token = createFilemakerCampaignUnsubscribeToken({
    ...input,
    scope: 'all_campaigns',
  });
  const baseUrl = (input.appUrl?.trim() || resolvePublicAppUrl()).replace(/\/+$/g, '');
  return `${baseUrl}/filemaker/preferences?token=${encodeURIComponent(token)}`;
};

export const buildFilemakerCampaignOpenTrackingUrl = (input: {
  emailAddress: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  now?: number;
  ttlMs?: number;
  appUrl?: string | null;
}): string => {
  const token = createFilemakerCampaignUnsubscribeToken(input);
  const baseUrl = (input.appUrl?.trim() || resolvePublicAppUrl()).replace(/\/+$/g, '');
  return `${baseUrl}/api/filemaker/campaigns/open?token=${encodeURIComponent(token)}`;
};

export const buildFilemakerCampaignClickTrackingUrl = (input: {
  emailAddress: string;
  campaignId?: string | null;
  runId?: string | null;
  deliveryId?: string | null;
  redirectTo: string;
  now?: number;
  ttlMs?: number;
  appUrl?: string | null;
}): string => {
  const token = createFilemakerCampaignUnsubscribeToken(input);
  const baseUrl = (input.appUrl?.trim() || resolvePublicAppUrl()).replace(/\/+$/g, '');
  return `${baseUrl}/api/filemaker/campaigns/click?token=${encodeURIComponent(token)}`;
};

export const __testOnly = {
  resolvePublicAppUrl,
};
