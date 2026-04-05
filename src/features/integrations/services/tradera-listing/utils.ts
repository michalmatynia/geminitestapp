import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { Page } from 'playwright';

import { TraderaFailureCategory } from './config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export const classifyTraderaFailure = (message: string): TraderaFailureCategory => {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes('auth_required') ||
    normalized.includes('login failed') ||
    normalized.includes('manual verification') ||
    normalized.includes('captcha') ||
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
  if (category === 'AUTH') {
    return 'Tradera login requires manual verification. Open login window and retry.';
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
  action: 'list' | 'relist'
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
    if ((await locator.count()) === 0) continue;
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
};

export const buildCanonicalTraderaListingUrl = (externalListingId: string): string =>
  `https://www.tradera.com/item/${externalListingId}`;

export const extractExternalListingId = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url, 'https://www.tradera.com');
    const pathname = parsedUrl.pathname || '';
    const match = pathname.match(/\/(?:item|listing)\/(\d{6,})(?:[/?#]|$)/i);
    if (!match?.[1]) return null;
    return match[1];
  } catch {
    const match = url.match(/(?:^|\/)(?:item|listing)\/(\d{6,})(?:[/?#]|$)/i);
    if (!match?.[1]) return null;
    return match[1];
  }
};

export const includesAnyHint = (value: string, hints: readonly string[]): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return hints.some((hint) => normalized.includes(hint));
};

export const readVisibleLocatorText = async (page: Page, selectors: readonly string[]): Promise<string> => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;
    const text = await locator.innerText().catch(() => '');
    if (text.trim()) {
      return text.trim();
    }
  }
  return '';
};
