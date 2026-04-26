import { mkdir, writeFile } from 'fs/promises';
import path from 'path';

import { type Page } from 'playwright';

import { type TraderaFailureCategory } from './config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { TRADERA_TITLE_MAX_CHARACTERS } from './title-validation';

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
  if (normalized.includes('final image preview state did not stabilize after upload')) {
    return 'Tradera image previews changed after upload instead of stabilizing. Review the listing images in Tradera and retry.';
  }
  if (
    normalized.includes('draft image cleanup did not reach a clean zero state before upload') ||
    normalized.includes('draft already contained images before upload')
  ) {
    return 'Tradera still had draft images before upload. Review the listing images in Tradera and retry.';
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
  if (normalized.includes('unable to set tradera title field')) {
    return `Tradera title could not be written. Tradera allows at most ${TRADERA_TITLE_MAX_CHARACTERS} characters; shorten the marketplace title before retrying.`;
  }
  return message;
};

const parseTraderaFailureLastState = (message: string): Record<string, unknown> | null => {
  const match = message.match(/Last state:\s*(\{[\s\S]*\})\s*$/);
  if (!match?.[1]) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(match[1]);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

const toNullableNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const parseTraderaTitleLength = (message: string): number | null => {
  const match = /Tradera title is\s+(\d+)\s+characters/i.exec(message);
  if (!match?.[1]) {
    return null;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveTraderaFailureCode = ({
  isTitleLengthFailure,
  isStaleDraftImageState,
  isImagePreviewMismatch,
  isImagePreviewNotStable,
  isDuplicateRisk,
  isRetryCleanupUnsettled,
}: {
  isTitleLengthFailure: boolean;
  isStaleDraftImageState: boolean;
  isImagePreviewMismatch: boolean;
  isImagePreviewNotStable: boolean;
  isDuplicateRisk: boolean;
  isRetryCleanupUnsettled: boolean;
}): string | null => {
  if (isTitleLengthFailure) return 'tradera_title_too_long';
  if (isStaleDraftImageState) return 'image_stale_draft_state';
  if (isImagePreviewMismatch) return 'image_preview_mismatch';
  if (isImagePreviewNotStable) return 'image_preview_not_stable';
  if (isDuplicateRisk) return 'image_duplicate_risk';
  if (isRetryCleanupUnsettled) return 'image_retry_cleanup_unsettled';
  return null;
};

export const extractTraderaFailureMetadata = (message: string): Record<string, unknown> => {
  const normalized = message.trim().toLowerCase();
  const lastState = parseTraderaFailureLastState(message);
  const isTitleLengthFailure =
    (normalized.includes('tradera title is') &&
      normalized.includes('allows at most')) ||
    normalized.includes('unable to set tradera title field');
  const isStaleDraftImageState =
    normalized.includes('draft image cleanup did not reach a clean zero state before upload') ||
    normalized.includes('draft already contained images before upload');
  const isImagePreviewMismatch = normalized.includes(
    'uploaded more image previews than expected'
  );
  const isImagePreviewNotStable = normalized.includes(
    'final image preview state did not stabilize after upload'
  );
  const isDuplicateRisk = normalized.includes('retrying could duplicate images');
  const isRetryCleanupUnsettled = normalized.includes(
    'retry image cleanup did not clear the previous upload state'
  );

  const failureCode = resolveTraderaFailureCode({
    isTitleLengthFailure,
    isStaleDraftImageState,
    isImagePreviewMismatch,
    isImagePreviewNotStable,
    isDuplicateRisk,
    isRetryCleanupUnsettled,
  });

  const metadata: Record<string, unknown> = {};

  if (isTitleLengthFailure) {
    const titleLength = parseTraderaTitleLength(message);
    metadata['failureCode'] = 'tradera_title_too_long';
    metadata['titleTooLong'] = true;
    metadata['titleMaxLength'] = TRADERA_TITLE_MAX_CHARACTERS;
    if (titleLength !== null) {
      metadata['titleLength'] = titleLength;
    }
  } else if (failureCode !== null) {
    metadata['failureCode'] = failureCode;
    metadata['staleDraftImages'] = isStaleDraftImageState;
    metadata['imagePreviewMismatch'] = isImagePreviewMismatch;
    metadata['imagePreviewNotStable'] = isImagePreviewNotStable;
    metadata['duplicateRisk'] = isDuplicateRisk;
    metadata['imageRetryCleanupUnsettled'] = isRetryCleanupUnsettled;
  }

  if (!lastState) {
    return metadata;
  }

  metadata['imageUploadLastState'] = lastState;

  const expectedUploadCount = toNullableNumber(lastState['expectedUploadCount']);
  if (expectedUploadCount !== null) {
    metadata['expectedImageUploadCount'] = expectedUploadCount;
  }

  const observedPreviewCount = toNullableNumber(lastState['observedPreviewCount']);
  if (observedPreviewCount !== null) {
    metadata['observedImagePreviewCount'] = observedPreviewCount;
  }

  const observedPreviewDelta = toNullableNumber(lastState['observedPreviewDelta']);
  if (observedPreviewDelta !== null) {
    metadata['observedImagePreviewDelta'] = observedPreviewDelta;
  }

  if (Array.isArray(lastState['observedPreviewDescriptors'])) {
    metadata['observedImagePreviewDescriptors'] = lastState['observedPreviewDescriptors'];
  }

  const imageUploadPending =
    typeof lastState['imageUploadPending'] === 'boolean'
      ? lastState['imageUploadPending']
      : null;
  if (imageUploadPending !== null) {
    metadata['imageUploadPending'] = imageUploadPending;
  }

  const imageUploadErrorText =
    typeof lastState['imageUploadErrorText'] === 'string' &&
    lastState['imageUploadErrorText'].trim()
      ? lastState['imageUploadErrorText'].trim()
      : null;
  if (imageUploadErrorText) {
    metadata['imageUploadErrorText'] = imageUploadErrorText;
  }

  const imageUploadSource =
    typeof lastState['uploadSource'] === 'string' && lastState['uploadSource'].trim()
      ? lastState['uploadSource'].trim()
      : null;
  if (imageUploadSource) {
    metadata['imageUploadSource'] = imageUploadSource;
  }

  return metadata;
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

export const findVisibleLocator = async (page: Page, selectors: readonly string[]) => {
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
