import { access, stat } from 'node:fs/promises';
import path from 'node:path';

import { chromium, devices, type BrowserContextOptions, type Page } from 'playwright';

import { normalizeTraderaListingFormUrl, TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { decryptSecret } from '@/features/integrations/server';
import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import type {
  IntegrationConnectionRecord,
  PlaywrightRelistBrowserMode,
  ProductListing,
} from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';
import { internalError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import {
  LOGIN_SUCCESS_SELECTOR,
  LOGIN_FORM_SELECTOR,
  USERNAME_SELECTORS,
  PASSWORD_SELECTORS,
  LOGIN_BUTTON_SELECTORS,
  TRADERA_AUTH_ERROR_SELECTORS,
  TRADERA_CAPTCHA_HINTS,
  TRADERA_COOKIE_ACCEPT_SELECTORS,
  TRADERA_MANUAL_VERIFICATION_TEXT_HINTS,
  TRADERA_MANUAL_VERIFICATION_URL_HINTS,
  TITLE_SELECTORS,
  DESCRIPTION_SELECTORS,
  PRICE_SELECTORS,
  SUBMIT_SELECTORS,
} from './config';
import {
  findVisibleLocator,
  extractExternalListingId,
  captureTraderaListingDebugArtifacts,
} from './utils';
import {
  resolveAppBaseUrl,
  toAbsoluteUrl,
} from '@/shared/lib/files/services/storage/file-storage-service';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { getIntegrationRepository } from '../integration-repository';
import {
  runPlaywrightListingScript,
  type PlaywrightExecutionSettingsSummary,
} from '../playwright-listing/runner';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';
import { resolveTraderaCategoryMappingResolutionForProduct } from './category-mapping';
import { resolveTraderaShippingGroupResolutionForProduct } from './shipping-group';

export type TraderaBrowserListingResult = {
  externalListingId: string;
  listingUrl?: string;
  simulated?: boolean;
  metadata?: Record<string, unknown>;
};

type TraderaAuthState = {
  successVisible: boolean;
  loginFormVisible: boolean;
  currentUrl: string;
  loggedIn: boolean;
  errorText: string;
  captchaDetected: boolean;
  manualVerificationDetected: boolean;
};

const resolveProductImageUrls = (product: ProductWithImages): string[] => {
  const urls = new Set<string>();
  (product.imageLinks ?? []).forEach((v) => { const t = v.trim(); if (t) urls.add(t); });
  (product.images ?? []).forEach((image) => {
    [image.imageFile?.publicUrl, image.imageFile?.url, image.imageFile?.thumbnailUrl, image.imageFile?.filepath]
      .forEach((c) => { const t = typeof c === 'string' ? c.trim() : ''; if (t) urls.add(t); });
  });
  return Array.from(urls);
};

const MIN_TRADERA_IMAGE_BYTES = 10_240;

const toAbsolutePublicFilePath = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return null;
  return path.join(process.cwd(), 'public', trimmed.replace(/^\/+/, ''));
};

const resolveLocalProductImagePaths = async (
  product: ProductWithImages
): Promise<string[]> => {
  const candidates = new Set<string>();

  (product.images ?? []).forEach((image) => {
    const filepath = image.imageFile?.filepath;
    if (typeof filepath === 'string' && filepath.trim()) {
      const absolutePath = toAbsolutePublicFilePath(filepath);
      if (absolutePath) {
        candidates.add(absolutePath);
      }
    }
  });

  const validPaths: string[] = [];
  for (const candidate of candidates) {
    try {
      await access(candidate);
      const stats = await stat(candidate);
      if (stats.isFile() && stats.size >= MIN_TRADERA_IMAGE_BYTES) {
        validPaths.push(candidate);
      }
    } catch {
      // Ignore missing or unreadable image files and fall back to URL downloads.
    }
  }

  return validPaths;
};

const CURRENT_MANAGED_TRADERA_QUICKLIST_MARKER = 'tradera-quicklist-default:v47';
const TRADERA_HEADED_FAILURE_HOLD_OPEN_MS = 10_000;

const includesAnyHint = (value: string, hints: readonly string[]): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return hints.some((hint) => normalized.includes(hint));
};

const acceptTraderaCookies = async (page: Page): Promise<void> => {
  for (const selector of TRADERA_COOKIE_ACCEPT_SELECTORS) {
    const locator = page.locator(selector).first();
    const visible = await locator.isVisible().catch(() => false);
    if (!visible) continue;
    await locator.click().catch(() => undefined);
    await page.waitForTimeout(500).catch(() => undefined);
    return;
  }
};

const readVisibleLocatorText = async (page: Page, selectors: readonly string[]): Promise<string> => {
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

const readTraderaAuthState = async (page: Page): Promise<TraderaAuthState> => {
  const successVisible = await page
    .locator(LOGIN_SUCCESS_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
  const loginFormVisible = await page
    .locator(LOGIN_FORM_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
  const currentUrl = page.url().trim();
  const normalizedUrl = currentUrl.toLowerCase();
  const errorText = await readVisibleLocatorText(page, TRADERA_AUTH_ERROR_SELECTORS);
  const normalizedErrorText = errorText.toLowerCase();
  const captchaDetected =
    includesAnyHint(normalizedErrorText, TRADERA_CAPTCHA_HINTS) ||
    includesAnyHint(normalizedUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS.filter((hint) =>
      hint.includes('captcha')
    ));
  const manualVerificationDetected =
    captchaDetected ||
    includesAnyHint(normalizedErrorText, TRADERA_MANUAL_VERIFICATION_TEXT_HINTS) ||
    includesAnyHint(normalizedUrl, TRADERA_MANUAL_VERIFICATION_URL_HINTS);
  const loggedIn =
    successVisible ||
    (!loginFormVisible &&
      (normalizedUrl.includes('/my/') ||
        normalizedUrl.includes('/my?') ||
        normalizedUrl.includes('/selling')));

  return {
    successVisible,
    loginFormVisible,
    currentUrl,
    loggedIn,
    errorText,
    captchaDetected,
    manualVerificationDetected,
  };
};

const buildTraderaAuthRequiredError = ({
  hasStoredSession,
  authState,
}: {
  hasStoredSession: boolean;
  authState: TraderaAuthState;
}) =>
  internalError(
    hasStoredSession
      ? authState.captchaDetected
        ? 'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification (captcha). Refresh the saved browser session.'
        : authState.manualVerificationDetected
          ? 'AUTH_REQUIRED: Stored Tradera session expired and Tradera requires manual verification. Refresh the saved browser session.'
          : 'AUTH_REQUIRED: Stored Tradera session expired or requires manual verification.'
      : authState.captchaDetected
        ? 'AUTH_REQUIRED: Tradera login requires manual verification (captcha).'
        : authState.manualVerificationDetected
          ? 'AUTH_REQUIRED: Tradera login requires manual verification.'
          : 'AUTH_REQUIRED: Tradera login failed or requires manual verification.',
    {
      currentUrl: authState.currentUrl,
      errorText: authState.errorText || null,
      successVisible: authState.successVisible,
      loginFormVisible: authState.loginFormVisible,
      captchaDetected: authState.captchaDetected,
      manualVerificationDetected: authState.manualVerificationDetected,
      hasStoredSession,
    }
  );

const buildTraderaScriptInput = async ({
  product,
  listing,
  systemSettings,
  connection,
}: {
  product: ProductWithImages;
  listing: ProductListing;
  systemSettings: TraderaSystemSettings;
  connection: IntegrationConnectionRecord;
}): Promise<Record<string, unknown>> => {
  const title = product.name_en || product.name_pl || product.name_de || product.sku || `Listing ${listing.productId}`;
  const description = product.description_en || product.description_pl || product.description_de || title;
  const appBaseUrl = resolveAppBaseUrl();
  const images = resolveProductImageUrls(product).map((u) => toAbsoluteUrl(u, appBaseUrl));
  const localImagePaths = await resolveLocalProductImagePaths(product);
  const categoryMapping = await resolveTraderaCategoryMappingResolutionForProduct({
    connectionId: connection.id,
    product,
  });
  const shippingGroupResolution = await resolveTraderaShippingGroupResolutionForProduct({
    product,
  });
  const mappedCategory = categoryMapping.mapping;
  const shippingGroup = shippingGroupResolution.shippingGroup;
  // Credentials passed in-memory only — never written to disk or job queue
  const username = connection.username ?? null;
  const password = connection.password ? decryptSecret(connection.password) : null;

  return {
    product, bundle: product, entityJson: JSON.stringify(product),
    productId: product.id, listingId: listing.id,
    integrationId: listing.integrationId, connectionId: listing.connectionId,
    baseProductId: product.baseProductId ?? product.id,
    sku: product.sku ?? null, title, description,
    price: typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null,
    localImagePaths,
    images, imageUrls: images, username, password,
    appBaseUrl,
    ...(mappedCategory
      ? {
        traderaCategory: {
          externalId: mappedCategory.externalCategoryId,
          name: mappedCategory.externalCategoryName,
          path: mappedCategory.externalCategoryPath,
          segments: mappedCategory.pathSegments,
          internalCategoryId: mappedCategory.internalCategoryId,
          catalogId: mappedCategory.catalogId,
        },
      }
      : {}),
    durationHours: listing.relistPolicy?.durationHours ?? null,
    autoRelistEnabled: listing.relistPolicy?.enabled ?? null,
    autoRelistLeadMinutes: listing.relistPolicy?.leadMinutes ?? null,
    templateId: listing.relistPolicy?.templateId ?? null,
    traderaConfig: { listingFormUrl: systemSettings.listingFormUrl },
    traderaCategoryMapping: {
      reason: categoryMapping.reason,
      matchScope: categoryMapping.matchScope,
      internalCategoryId: categoryMapping.internalCategoryId,
      productCatalogIds: categoryMapping.productCatalogIds,
      matchingMappingCount: categoryMapping.matchingMappingCount,
      validMappingCount: categoryMapping.validMappingCount,
      catalogMatchedMappingCount: categoryMapping.catalogMatchedMappingCount,
    },
    traderaShipping: {
      shippingGroupId: shippingGroupResolution.shippingGroupId,
      shippingGroupName: shippingGroup?.name ?? null,
      shippingGroupCatalogId: shippingGroup?.catalogId ?? null,
      shippingCondition: shippingGroupResolution.shippingCondition,
      reason: shippingGroupResolution.reason,
    },
  };
};

const usesLegacyDefaultTraderaQuickListScript = (script: string | null | undefined): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    normalized.includes('await import(\'node:fs/promises\')') &&
    normalized.includes('tradera-quicklist')
  );
};

const isManagedTraderaQuickListScript = (script: string | null | undefined): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    normalized.includes('const ACTIVE_URL = \'https://www.tradera.com/en/my/listings?tab=active\';') &&
    normalized.includes('log?.(\'tradera.quicklist.start\'') &&
    normalized.includes('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.')
  );
};

const usesStaleManagedDefaultTraderaQuickListScript = (
  script: string | null | undefined
): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    isManagedTraderaQuickListScript(normalized) &&
    !normalized.includes(CURRENT_MANAGED_TRADERA_QUICKLIST_MARKER)
  );
};

const resolveEffectiveTraderaListingScript = (
  connection: IntegrationConnectionRecord
): { script: string; source: 'connection' | 'default-fallback' | 'legacy-default-refresh' } => {
  const configured = connection.playwrightListingScript?.trim() ?? '';
  if (!configured) {
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      source: 'default-fallback',
    };
  }

  if (usesLegacyDefaultTraderaQuickListScript(configured)) {
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      source: 'legacy-default-refresh',
    };
  }

  if (usesStaleManagedDefaultTraderaQuickListScript(configured)) {
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      source: 'legacy-default-refresh',
    };
  }

  return {
    script: configured,
    source: 'connection',
  };
};

const resolveResultBrowserMode = (
  requestedBrowserMode: PlaywrightRelistBrowserMode,
  effectiveBrowserMode: 'headless' | 'headed' | undefined
): 'headless' | 'headed' | null =>
  effectiveBrowserMode ??
  (requestedBrowserMode === 'headed'
    ? 'headed'
    : requestedBrowserMode === 'headless'
      ? 'headless'
      : null);

const buildPlaywrightExecutionMetadata = ({
  connection,
  settings,
  effectiveBrowserMode,
}: {
  connection: IntegrationConnectionRecord;
  settings: {
    slowMo: number;
    timeout: number;
    navigationTimeout: number;
    humanizeMouse: boolean;
    mouseJitter: number;
    clickDelayMin: number;
    clickDelayMax: number;
    inputDelayMin: number;
    inputDelayMax: number;
    actionDelayMin: number;
    actionDelayMax: number;
    proxyEnabled: boolean;
    emulateDevice: boolean;
    deviceName: string;
  };
  effectiveBrowserMode: 'headless' | 'headed';
}): {
  playwrightPersonaId: string | null;
  playwrightSettings: PlaywrightExecutionSettingsSummary;
} => ({
  playwrightPersonaId: connection.playwrightPersonaId?.trim() || null,
  playwrightSettings: {
    headless: effectiveBrowserMode === 'headless',
    slowMo: settings.slowMo,
    timeout: settings.timeout,
    navigationTimeout: settings.navigationTimeout,
    humanizeMouse: settings.humanizeMouse,
    mouseJitter: settings.mouseJitter,
    clickDelayMin: settings.clickDelayMin,
    clickDelayMax: settings.clickDelayMax,
    inputDelayMin: settings.inputDelayMin,
    inputDelayMax: settings.inputDelayMax,
    actionDelayMin: settings.actionDelayMin,
    actionDelayMax: settings.actionDelayMax,
    proxyEnabled: settings.proxyEnabled,
    emulateDevice: settings.emulateDevice,
    deviceName: settings.deviceName,
  },
});

const runTraderaBrowserListingScripted = async ({
  listing,
  connection,
  systemSettings,
  browserMode,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist';
  browserMode: PlaywrightRelistBrowserMode;
}): Promise<TraderaBrowserListingResult> => {
  const normalizedListingFormUrl = normalizeTraderaListingFormUrl(systemSettings.listingFormUrl);
  const { script, source: scriptSource } = resolveEffectiveTraderaListingScript(connection);
  const resolvedPlaywrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const requestedExecutionMetadata = buildPlaywrightExecutionMetadata({
    connection,
    settings: resolvedPlaywrightSettings,
    effectiveBrowserMode:
      browserMode === 'headed'
        ? 'headed'
        : browserMode === 'headless'
          ? 'headless'
          : resolvedPlaywrightSettings.headless
            ? 'headless'
            : 'headed',
  });

  if (
    scriptSource === 'legacy-default-refresh' &&
    connection.playwrightListingScript !== DEFAULT_TRADERA_QUICKLIST_SCRIPT
  ) {
    try {
      const integrationRepository = await getIntegrationRepository();
      await integrationRepository.updateConnection(connection.id, {
        playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      });
    } catch (error) {
      logClientError(error);
    }
  }

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(listing.productId);
  if (!product) {
    throw notFoundError('Product not found', { productId: listing.productId });
  }

  let result;
  let scriptInput: Record<string, unknown> | null = null;
  try {
    scriptInput = await buildTraderaScriptInput({
      product,
      listing,
      systemSettings,
      connection,
    });
    result = await runPlaywrightListingScript({
      script,
      input: scriptInput,
      connection,
      browserMode,
      disableStartUrlBootstrap: true,
      failureHoldOpenMs:
        browserMode === 'headed' ? TRADERA_HEADED_FAILURE_HOLD_OPEN_MS : undefined,
    });
  } catch (error) {
    if (isAppError(error)) {
      throw error.withMeta({
        scriptMode: 'scripted',
        scriptSource,
        requestedBrowserMode: browserMode,
        listingFormUrl: normalizedListingFormUrl,
        ...requestedExecutionMetadata,
      });
    }

    const rawMeta =
      error &&
      typeof error === 'object' &&
      'meta' in error &&
      error['meta'] &&
      typeof error['meta'] === 'object'
        ? (error['meta'] as Record<string, unknown>)
        : null;

    throw internalError(
      error instanceof Error ? error.message : 'Tradera scripted listing failed.',
      {
        ...(rawMeta ?? {}),
        scriptMode: 'scripted',
        scriptSource,
        requestedBrowserMode: browserMode,
        listingFormUrl: normalizedListingFormUrl,
        ...requestedExecutionMetadata,
      }
    ).withCause(error);
  }

  if (!result.externalListingId) {
    throw internalError(
      `Tradera scripted listing did not return an external listing id (run ${result.runId}).`,
      {
        scriptMode: 'scripted',
        scriptSource,
        requestedBrowserMode: browserMode,
        listingFormUrl: normalizedListingFormUrl,
        runId: result.runId,
        rawResult: result.rawResult,
        latestStage:
          typeof result.rawResult?.['stage'] === 'string' ? result.rawResult['stage'] : null,
        latestStageUrl:
          typeof result.rawResult?.['currentUrl'] === 'string'
            ? result.rawResult['currentUrl']
            : null,
        publishVerified: result.publishVerified,
        ...requestedExecutionMetadata,
      }
    );
  }

  if (result.publishVerified === false) {
    throw internalError(
      `Tradera scripted listing reported an unverified publish result (run ${result.runId}).`,
      {
        scriptMode: 'scripted',
        scriptSource,
        requestedBrowserMode: browserMode,
        listingFormUrl: normalizedListingFormUrl,
        runId: result.runId,
        rawResult: result.rawResult,
        latestStage:
          typeof result.rawResult?.['stage'] === 'string' ? result.rawResult['stage'] : null,
        latestStageUrl:
          typeof result.rawResult?.['currentUrl'] === 'string'
            ? result.rawResult['currentUrl']
            : null,
        publishVerified: result.publishVerified,
        ...requestedExecutionMetadata,
      }
    );
  }

  return {
    externalListingId: result.externalListingId,
    ...(result.listingUrl ? { listingUrl: result.listingUrl } : {}),
    metadata: {
      scriptMode: 'scripted',
      scriptSource,
      runId: result.runId,
      requestedBrowserMode: browserMode,
      listingFormUrl: normalizedListingFormUrl,
      browserMode: resolveResultBrowserMode(browserMode, result.effectiveBrowserMode),
      playwrightPersonaId: result.personaId,
      playwrightSettings: result.executionSettings,
      rawResult: result.rawResult,
      latestStage:
        typeof result.rawResult?.['stage'] === 'string' ? result.rawResult['stage'] : null,
      latestStageUrl:
        typeof result.rawResult?.['currentUrl'] === 'string'
          ? result.rawResult['currentUrl']
          : null,
      publishVerified: result.publishVerified,
      categoryMappingReason:
        scriptInput &&
        typeof scriptInput['traderaCategoryMapping'] === 'object' &&
        scriptInput['traderaCategoryMapping'] &&
        typeof (scriptInput['traderaCategoryMapping'] as Record<string, unknown>)['reason'] === 'string'
          ? ((scriptInput['traderaCategoryMapping'] as Record<string, unknown>)['reason'] as string)
          : null,
      categoryMatchScope:
        scriptInput &&
        typeof scriptInput['traderaCategoryMapping'] === 'object' &&
        scriptInput['traderaCategoryMapping'] &&
        typeof (scriptInput['traderaCategoryMapping'] as Record<string, unknown>)['matchScope'] === 'string'
          ? ((scriptInput['traderaCategoryMapping'] as Record<string, unknown>)['matchScope'] as string)
          : null,
      categoryInternalCategoryId:
        scriptInput &&
        typeof scriptInput['traderaCategoryMapping'] === 'object' &&
        scriptInput['traderaCategoryMapping'] &&
        typeof (scriptInput['traderaCategoryMapping'] as Record<string, unknown>)['internalCategoryId'] === 'string'
          ? ((scriptInput['traderaCategoryMapping'] as Record<string, unknown>)['internalCategoryId'] as string)
          : null,
      categoryId:
        scriptInput &&
        typeof scriptInput['traderaCategory'] === 'object' &&
        scriptInput['traderaCategory'] &&
        typeof (scriptInput['traderaCategory'] as Record<string, unknown>)['externalId'] === 'string'
          ? ((scriptInput['traderaCategory'] as Record<string, unknown>)['externalId'] as string)
          : null,
      categoryPath:
        scriptInput &&
        typeof scriptInput['traderaCategory'] === 'object' &&
        scriptInput['traderaCategory'] &&
        typeof (scriptInput['traderaCategory'] as Record<string, unknown>)['path'] === 'string'
          ? ((scriptInput['traderaCategory'] as Record<string, unknown>)['path'] as string)
          : null,
      categorySource:
        scriptInput &&
        typeof scriptInput['traderaCategory'] === 'object' &&
        scriptInput['traderaCategory']
          ? 'categoryMapper'
          : 'fallback',
      shippingGroupId:
        scriptInput &&
        typeof scriptInput['traderaShipping'] === 'object' &&
        scriptInput['traderaShipping'] &&
        typeof (scriptInput['traderaShipping'] as Record<string, unknown>)['shippingGroupId'] ===
          'string'
          ? ((scriptInput['traderaShipping'] as Record<string, unknown>)['shippingGroupId'] as string)
          : null,
      shippingGroupName:
        scriptInput &&
        typeof scriptInput['traderaShipping'] === 'object' &&
        scriptInput['traderaShipping'] &&
        typeof (scriptInput['traderaShipping'] as Record<string, unknown>)[
          'shippingGroupName'
        ] === 'string'
          ? ((scriptInput['traderaShipping'] as Record<string, unknown>)['shippingGroupName'] as string)
          : null,
      shippingCondition:
        scriptInput &&
        typeof scriptInput['traderaShipping'] === 'object' &&
        scriptInput['traderaShipping'] &&
        typeof (scriptInput['traderaShipping'] as Record<string, unknown>)[
          'shippingCondition'
        ] === 'string'
          ? ((scriptInput['traderaShipping'] as Record<string, unknown>)['shippingCondition'] as string)
          : null,
      shippingConditionSource:
        scriptInput &&
        typeof scriptInput['traderaShipping'] === 'object' &&
        scriptInput['traderaShipping'] &&
        typeof (scriptInput['traderaShipping'] as Record<string, unknown>)['shippingCondition'] ===
          'string'
          ? 'shippingGroup'
          : 'default',
      shippingConditionReason:
        scriptInput &&
        typeof scriptInput['traderaShipping'] === 'object' &&
        scriptInput['traderaShipping'] &&
        typeof (scriptInput['traderaShipping'] as Record<string, unknown>)['reason'] === 'string'
          ? ((scriptInput['traderaShipping'] as Record<string, unknown>)['reason'] as string)
          : null,
    },
  };
};

export const ensureLoggedIn = async (
  page: Page,
  connection: IntegrationConnectionRecord,
  listingFormUrl: string
): Promise<void> => {
  const normalizedListingFormUrl = normalizeTraderaListingFormUrl(listingFormUrl);
  const hasStoredSession = Boolean(connection.playwrightStorageState?.trim());
  const sessionCheckUrl = 'https://www.tradera.com/en/my/listings?tab=active';

  await page.goto(sessionCheckUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await acceptTraderaCookies(page);
  const initialAuthState = await readTraderaAuthState(page);
  if (initialAuthState.loggedIn) {
    await page.goto(normalizedListingFormUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await acceptTraderaCookies(page);
    return;
  }

  if (hasStoredSession) {
    throw buildTraderaAuthRequiredError({
      hasStoredSession: true,
      authState: initialAuthState,
    });
  }

  await page.goto('https://www.tradera.com/login', {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await acceptTraderaCookies(page);
  await page.waitForSelector(LOGIN_FORM_SELECTOR, {
    state: 'attached',
    timeout: 20_000,
  });

  const usernameInput = await findVisibleLocator(page, USERNAME_SELECTORS);
  const passwordInput = await findVisibleLocator(page, PASSWORD_SELECTORS);
  if (!usernameInput || !passwordInput) {
    throw internalError('Unable to locate Tradera login inputs.');
  }

  const decryptedPassword = decryptSecret(connection.password ?? '');
  await usernameInput.fill(connection.username ?? '');
  await passwordInput.fill(decryptedPassword);

  const submitButton = await findVisibleLocator(page, LOGIN_BUTTON_SELECTORS);
  if (!submitButton) {
    throw internalError('Unable to locate Tradera login submit button.');
  }

  await Promise.allSettled([
    page.waitForNavigation({
      waitUntil: 'domcontentloaded',
      timeout: 20_000,
    }),
    submitButton.click(),
  ]);
  await page.waitForTimeout(1500).catch(() => undefined);
  await acceptTraderaCookies(page);

  const postLoginAuthState = await readTraderaAuthState(page);
  if (!postLoginAuthState.loggedIn) {
    throw buildTraderaAuthRequiredError({
      hasStoredSession: false,
      authState: postLoginAuthState,
    });
  }

  await page.goto(normalizedListingFormUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await acceptTraderaCookies(page);
  const listingAuthState = await readTraderaAuthState(page);
  if (!listingAuthState.loggedIn && (listingAuthState.loginFormVisible || listingAuthState.manualVerificationDetected)) {
    throw buildTraderaAuthRequiredError({
      hasStoredSession: false,
      authState: listingAuthState,
    });
  }
};

export const runTraderaBrowserListing = async ({
  listing,
  connection,
  systemSettings,
  source,
  action,
  browserMode,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist';
  browserMode: PlaywrightRelistBrowserMode;
}): Promise<TraderaBrowserListingResult> => {
  if (connection.traderaBrowserMode === 'scripted' || browserMode !== 'connection_default') {
    return runTraderaBrowserListingScripted({
      listing,
      connection,
      systemSettings,
      source,
      action,
      browserMode,
    });
  }

  const listingFormUrl = normalizeTraderaListingFormUrl(systemSettings.listingFormUrl);
  const storageState = parsePersistedStorageState(connection.playwrightStorageState);
  const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
  const effectiveHeadless = playwrightSettings.headless;
  const emulateDevice = playwrightSettings.emulateDevice;
  const deviceName = playwrightSettings.deviceName;
  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName] ? devices[deviceName] : null;

  const browser = await chromium.launch({
    headless: effectiveHeadless,
    slowMo: playwrightSettings.slowMo,
    ...(playwrightSettings.proxyEnabled && playwrightSettings.proxyServer
      ? {
        proxy: {
          server: playwrightSettings.proxyServer,
          ...(playwrightSettings.proxyUsername
            ? { username: playwrightSettings.proxyUsername }
            : {}),
          ...(playwrightSettings.proxyPassword
            ? { password: playwrightSettings.proxyPassword }
            : {}),
        },
      }
      : {}),
  });

  const deviceContextOptions: BrowserContextOptions = deviceProfile
    ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
    : {};

  const context = await browser.newContext({
    ...deviceContextOptions,
    ...(storageState ? { storageState } : {}),
  });
  context.setDefaultTimeout(playwrightSettings.timeout);
  context.setDefaultNavigationTimeout(playwrightSettings.navigationTimeout);

  const page = await context.newPage();
  try {
    await ensureLoggedIn(page, connection, listingFormUrl);

    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (!product) {
      throw notFoundError('Product not found', { productId: listing.productId });
    }

    const title =
      product.name_en ||
      product.name_pl ||
      product.name_de ||
      product.sku ||
      `Listing ${listing.productId}`;
    const description =
      product.description_en || product.description_pl || product.description_de || title;
    const priceValue =
      typeof product.price === 'number' && Number.isFinite(product.price)
        ? String(product.price)
        : '1';

    const titleInput = await findVisibleLocator(page, TITLE_SELECTORS);
    const descriptionInput = await findVisibleLocator(page, DESCRIPTION_SELECTORS);
    const priceInput = await findVisibleLocator(page, PRICE_SELECTORS);
    const submitButton = await findVisibleLocator(page, SUBMIT_SELECTORS);

    if (!titleInput || !descriptionInput || !priceInput || !submitButton) {
      throw internalError(
        'Tradera listing form selectors were not found. Update Tradera selector settings.'
      );
    }

    await titleInput.fill(title);
    await descriptionInput.fill(description);
    await priceInput.fill(priceValue);

    const previousUrl = page.url();
    await Promise.allSettled([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 25_000,
      }),
      submitButton.click(),
    ]);

    const finalUrl = page.url();
    const externalListingId = extractExternalListingId(finalUrl);
    if (externalListingId) {
      return {
        externalListingId,
        listingUrl: finalUrl,
        metadata: {
          scriptMode: 'builtin',
          requestedBrowserMode: browserMode,
          listingFormUrl,
          browserMode: effectiveHeadless ? 'headless' : 'headed',
          ...buildPlaywrightExecutionMetadata({
            connection,
            settings: playwrightSettings,
            effectiveBrowserMode: effectiveHeadless ? 'headless' : 'headed',
          }),
          publishVerified: true,
        },
      };
    }

    if (systemSettings.allowSimulatedSuccess) {
      const maybeListingUrl = finalUrl !== previousUrl ? finalUrl : null;
      return {
        externalListingId: `sim-${Date.now()}`,
        simulated: true,
        metadata: {
          scriptMode: 'builtin',
          requestedBrowserMode: browserMode,
          listingFormUrl,
          browserMode: effectiveHeadless ? 'headless' : 'headed',
          ...buildPlaywrightExecutionMetadata({
            connection,
            settings: playwrightSettings,
            effectiveBrowserMode: effectiveHeadless ? 'headless' : 'headed',
          }),
          publishVerified: true,
          simulated: true,
        },
        ...(maybeListingUrl ? { listingUrl: maybeListingUrl } : {}),
      };
    }

    throw internalError(
      `Failed to resolve Tradera listing id after ${action} (source: ${source}).`
    );
  } catch (error) {
    logClientError(error);
    const debugArtifacts = await captureTraderaListingDebugArtifacts(page, listing.id, action);
    if (debugArtifacts) {
      if (isAppError(error)) {
        throw error.withMeta({ debugArtifacts });
      }
      const message = error instanceof Error ? error.message : String(error);
      throw internalError(message, { debugArtifacts }).withCause(error);
    }
    throw error;
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
};
