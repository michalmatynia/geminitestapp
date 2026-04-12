import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { Page } from 'playwright';

import { TraderaFailureCategory } from './config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

type LocatorLike = {
  count?: () => Promise<number>;
  isVisible?: () => Promise<boolean>;
  innerText?: () => Promise<string>;
};

export const classifyTraderaFailure = (message: string): TraderaFailureCategory => {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes('auth_required') ||
    normalized.includes('auth_state_timeout') ||
    normalized.includes('login failed') ||
    normalized.includes('manual verification') ||
    normalized.includes('captcha') ||
    normalized.includes('session validation did not resolve') ||
    normalized.includes('session check did not resolve') ||
    normalized.includes('two-factor') ||
    normalized.includes('2fa')
  ) {
    return 'AUTH';
  }
  if (
    normalized.includes('fail_sell_page_invalid') ||
    normalized.includes('unexpected navigation away from tradera') ||
    normalized.includes('external link target')
  ) {
    return 'NAVIGATION';
  }
  if (
    normalized.includes('fail_image_set_invalid') ||
    normalized.includes('category mapping') ||
    normalized.includes('fetch tradera categories') ||
    normalized.includes('map the category') ||
    normalized.includes('shipping group') ||
    normalized.includes('shipping price in eur') ||
    normalized.includes('tradera shipping price') ||
    normalized.includes('fail_category_set') ||
    normalized.includes('fail_shipping_set') ||
    normalized.includes('fail_publish_validation') ||
    normalized.includes('fail_price_set')
  ) {
    return 'FORM';
  }
  if (normalized.includes('navigation') || normalized.includes('timeout')) {
    return 'NAVIGATION';
  }
  if (normalized.includes('selector') || normalized.includes('not found')) {
    return 'SELECTOR';
  }
  if (normalized.includes('form')) {
    return 'FORM';
  }
  return 'UNKNOWN';
};

export const toUserFacingTraderaFailure = (
  category: TraderaFailureCategory,
  message: string
): string => {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes('auth_state_timeout') ||
    normalized.includes('session validation did not resolve') ||
    normalized.includes('session check did not resolve')
  ) {
    return 'Tradera session validation did not resolve. Refresh the saved browser session and retry.';
  }
  if (category === 'AUTH') {
    return 'Tradera login requires manual verification. Open login window and retry.';
  }
  if (normalized.includes('uploaded more image previews than expected')) {
    return 'Tradera image upload produced more previews than expected. Review the listing images in Tradera and retry.';
  }
  if (normalized.includes('retrying could duplicate images')) {
    return 'Tradera image upload may have partially succeeded, and retrying could duplicate images. Review the listing images in Tradera and retry.';
  }
  if (normalized.includes('retry image cleanup did not clear the previous upload state')) {
    return 'Tradera image cleanup did not finish before retrying the upload. Review the listing images in Tradera and retry.';
  }
  if (normalized.includes('fail_image_set_invalid')) {
    return 'Tradera image upload did not settle correctly. Review the listing images in Tradera and retry.';
  }
  return message;
};

export const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }
  return null;
};

export const resolveExpiry = (durationHours: number): Date => {
  const now = Date.now();
  return new Date(now + durationHours * 60 * 60 * 1000);
};

export const resolveNextRelistAt = (
  expiresAt: Date,
  autoRelistEnabled: boolean,
  leadMinutes: number
): Date | null => {
  if (!autoRelistEnabled) return null;
  return new Date(expiresAt.getTime() - leadMinutes * 60 * 1000);
};

export const captureTraderaListingDebugArtifacts = async (
  page: Page,
  listingId: string,
  action: 'list' | 'relist' | 'sync'
): Promise<string | null> => {
  try {
    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const baseDir = path.join(process.cwd(), 'playwright-debug', 'tradera');
    await mkdir(baseDir, { recursive: true });
    const prefix = `${listingId}-${action}-${now}`;
    const screenshotPath = path.join(baseDir, `${prefix}.png`);
    const htmlPath = path.join(baseDir, `${prefix}.html`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const html = await page.content();
    await writeFile(htmlPath, html, 'utf8');
    return `Screenshot: ${screenshotPath}
HTML: ${htmlPath}`;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const findVisibleLocator = async (page: Page, selectors: string[]) => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await isLocatorVisible(locator)) return locator;
  }
  return null;
};

export const buildCanonicalTraderaListingUrl = (externalListingId: string): string =>
  `https://www.tradera.com/item/${externalListingId}`;

export const resolvePersistedTraderaLinkedTarget = ({
  externalListingId,
  marketplaceData,
}: {
  externalListingId: unknown;
  marketplaceData: unknown;
}): {
  externalListingId: string | null;
  listingUrl: string | null;
} => {
  const marketplaceRecord = toRecord(marketplaceData);
  const traderaRecord = toRecord(marketplaceRecord['tradera']);
  const resolvedExternalListingId =
    (typeof marketplaceRecord['externalListingId'] === 'string' &&
    marketplaceRecord['externalListingId'].trim()
      ? marketplaceRecord['externalListingId'].trim()
      : null) ||
    (typeof traderaRecord['externalListingId'] === 'string' &&
    traderaRecord['externalListingId'].trim()
      ? traderaRecord['externalListingId'].trim()
      : null) ||
    (typeof externalListingId === 'string' && externalListingId.trim()
      ? externalListingId.trim()
      : null);
  const resolvedListingUrl =
    (typeof marketplaceRecord['listingUrl'] === 'string' && marketplaceRecord['listingUrl'].trim()
      ? marketplaceRecord['listingUrl'].trim()
      : null) ||
    (typeof traderaRecord['listingUrl'] === 'string' && traderaRecord['listingUrl'].trim()
      ? traderaRecord['listingUrl'].trim()
      : null) ||
    (resolvedExternalListingId ? buildCanonicalTraderaListingUrl(resolvedExternalListingId) : null);

  return {
    externalListingId: resolvedExternalListingId,
    listingUrl: resolvedListingUrl,
  };
};

export const extractExternalListingId = (url: string): string | null => {
  const listingIdPattern = /\/(?:item\/(?:\d+\/)?|listing\/)(\d{6,})(?:[/?#]|$)/i;
  try {
    const parsedUrl = new URL(url, 'https://www.tradera.com');
    const pathname = parsedUrl.pathname || '';
    const match = pathname.match(listingIdPattern);
    if (!match?.[1]) return null;
    return match[1];
  } catch {
    const match = url.match(listingIdPattern);
    if (!match?.[1]) return null;
    return match[1];
  }
};

export const includesAnyHint = (value: string, hints: readonly string[]): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return hints.some((hint) => normalized.includes(hint));
};

export const isLocatorVisible = async (locator: LocatorLike | null | undefined): Promise<boolean> => {
  if (!locator) return false;

  if (typeof locator.count === 'function') {
    try {
      if ((await locator.count()) === 0) return false;
    } catch {
      return false;
    }
  }

  if (typeof locator.isVisible !== 'function') return false;

  try {
    return await locator.isVisible();
  } catch {
    return false;
  }
};

export const readVisibleLocatorText = async (page: Page, selectors: readonly string[]): Promise<string> => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const visible = await isLocatorVisible(locator);
    if (!visible || typeof locator.innerText !== 'function') continue;
    const text = await locator.innerText().catch(() => '');
    if (text.trim()) {
      return text.trim();
    }
  }
  return '';
};
