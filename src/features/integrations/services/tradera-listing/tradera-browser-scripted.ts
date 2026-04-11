import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  normalizeTraderaListingFormUrl,
  type TraderaSystemSettings,
} from '@/features/integrations/constants/tradera';
import {
  createTraderaListingStatusScrapePlaywrightInstance,
  createTraderaScriptedListingPlaywrightInstance,
} from '@/features/playwright/server/instances';
import {
  buildPlaywrightListingResult,
  buildPlaywrightScriptListingMetadata,
} from '@/features/playwright/server/listing-result';
import { runPlaywrightListingScript } from '@/features/playwright/server/programmable';
import { buildPlaywrightEngineRunFailureMeta } from '@/features/playwright/server/run-result';
import { runPlaywrightScrapeScript } from '@/features/playwright/server/scrape';
import { validatePlaywrightEngineScript } from '@/features/playwright/server/runtime';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type {
  BrowserListingResultDto,
  PlaywrightRelistBrowserMode,
  ProductListing,
} from '@/shared/contracts/integrations/listings';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { internalError, notFoundError } from '@/shared/errors/app-error';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';

import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';
import {
  resolveAppBaseUrl,
  toAbsoluteUrl,
} from '@/shared/lib/files/services/storage/file-storage-service';
import {
  extractExternalListingId,
  buildCanonicalTraderaListingUrl,
} from './utils';
import {
  buildTraderaQuicklistExecutionSteps,
  resolveTraderaCheckStatusExecutionStepsFromResult,
} from '@/features/integrations/utils/tradera-execution-steps';
import { resolveTraderaListingPriceForProduct } from './price';
import { buildTraderaPricingMetadata } from './pricing-metadata';
import { buildTraderaListingDescription } from './description';
import {
  resolveTraderaProductImageUploadPlan,
  resolveScriptInputImageDiagnostics,
} from './tradera-browser-images';
import { validateTraderaQuickListProductConfig } from './preflight';
import {
  extractManagedTraderaQuickListMarker,
  isManagedTraderaQuickListScript,
  usesLegacyDefaultTraderaQuickListScript,
  usesStaleManagedDefaultTraderaQuickListScript,
} from './managed-script';
import { TRADERA_CHECK_STATUS_SCRIPT } from './check-status-script';

export const TRADERA_HEADED_FAILURE_HOLD_OPEN_MS = 30_000;
export const TRADERA_SCRIPTED_LISTING_TIMEOUT_MS = 240_000;
export const TRADERA_IMAGE_SETTLE_TIMEOUT_MESSAGE_PREFIX =
  'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ';
const MANAGED_TRADERA_QUICKLIST_DESKTOP_DEVICE_NAME = 'Desktop Chrome';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeDuplicateSearchTitle = (value: unknown): string | null => {
  const normalized = toTrimmedString(value).replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
};

const buildDuplicateSearchTerms = (values: unknown[]): string[] => {
  const terms: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const normalized = normalizeDuplicateSearchTitle(value);
    if (!normalized) {
      continue;
    }

    const dedupeKey = normalized.toLowerCase();
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    terms.push(normalized);
  }

  return terms;
};

type ScriptSource =
  | 'connection'
  | 'default-fallback'
  | 'legacy-default-refresh'
  | 'invalid-connection-fallback';

const TRADERA_CHECK_STATUS_TIMEOUT_MS = 60_000;
const TRADERA_CHECK_STATUS_RUNTIME_SETTINGS_OVERRIDES: Partial<PlaywrightSettings> = {
  slowMo: 0,
  humanizeMouse: false,
  mouseJitter: 0,
  clickDelayMin: 0,
  clickDelayMax: 0,
  inputDelayMin: 0,
  inputDelayMax: 0,
  actionDelayMin: 0,
  actionDelayMax: 0,
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const resolveExistingListingUrl = (listing: ProductListing): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const directListingUrl = toTrimmedString(marketplaceData['listingUrl']);
  if (directListingUrl) return directListingUrl;

  const traderaData = toRecord(marketplaceData['tradera']);
  const nestedListingUrl = toTrimmedString(traderaData['listingUrl']);
  if (nestedListingUrl) return nestedListingUrl;

  return listing.externalListingId ? buildCanonicalTraderaListingUrl(listing.externalListingId) : null;
};

const resolveManagedTraderaScript = (
  connection: IntegrationConnectionRecord
): {
  script: string;
  scriptSource: ScriptSource;
  scriptValidationError?: string;
} => {
  const connectionScript = toTrimmedString(connection.playwrightListingScript);
  if (!connectionScript) {
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      scriptSource: 'default-fallback',
    };
  }

  if (
    usesLegacyDefaultTraderaQuickListScript(connectionScript) ||
    usesStaleManagedDefaultTraderaQuickListScript(connectionScript)
  ) {
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      scriptSource: 'legacy-default-refresh',
    };
  }

  const validation = validatePlaywrightEngineScript(connectionScript);
  if (!validation.ok) {
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      scriptSource: 'invalid-connection-fallback',
      scriptValidationError: validation.error.message,
    };
  }

  return {
    script: connectionScript,
    scriptSource: 'connection',
  };
};

const buildManagedQuicklistRuntimeSettingsOverrides = (
  script: string
): Partial<PlaywrightSettings> | undefined =>
  isManagedTraderaQuickListScript(script)
    ? {
        emulateDevice: false,
        deviceName: MANAGED_TRADERA_QUICKLIST_DESKTOP_DEVICE_NAME,
      }
    : undefined;

const buildTraderaScriptInput = async ({
  product,
  listing,
  systemSettings,
  connection,
  action,
  syncSkipImages,
}: {
  product: ProductWithImages;
  listing: ProductListing;
  systemSettings: TraderaSystemSettings;
  connection: IntegrationConnectionRecord;
  action: 'list' | 'relist' | 'sync';
  syncSkipImages?: boolean;
}): Promise<Record<string, unknown>> => {
  const resolvedCopy = resolveMarketplaceAwareProductCopy({
    product,
    integrationId: listing.integrationId,
    preferredLocales: ['en', 'pl', 'de'],
  });
  const title = resolvedCopy.title;
  const description = buildTraderaListingDescription({
    rawDescription: resolvedCopy.description,
    fallbackTitle: title,
    baseProductId: product.baseProductId ?? product.id,
    sku: product.sku,
    ean: product.ean,
    gtin: product.gtin,
  });
  const appBaseUrl = resolveAppBaseUrl();
  const imageUploadPlan = await resolveTraderaProductImageUploadPlan(product);
  const shouldSkipImages = action === 'sync' && syncSkipImages === true;
  const imageUrls = shouldSkipImages
    ? []
    : imageUploadPlan.imageUrls.map((url) => toAbsoluteUrl(url, appBaseUrl));
  const localImagePaths = shouldSkipImages ? [] : imageUploadPlan.localImagePaths;
  const priceResolution = await resolveTraderaListingPriceForProduct({
    product,
    targetCurrencyCode: 'EUR',
  });
  const pricingMetadata = buildTraderaPricingMetadata(priceResolution);

  if (
    priceResolution.listingPrice === null ||
    !priceResolution.resolvedToTargetCurrency ||
    toTrimmedString(priceResolution.listingCurrencyCode).toUpperCase() !== 'EUR'
  ) {
    throw internalError('FAIL_PRICE_RESOLUTION: Tradera listing price could not be resolved to EUR.', {
      mode: 'scripted',
      productId: product.id,
      listingId: listing.id,
      connectionId: listing.connectionId,
      ...pricingMetadata,
    });
  }

  const { categoryMapping, shippingGroupResolution } =
    await validateTraderaQuickListProductConfig({
      product,
      connection,
    });
  const mappedCategory = categoryMapping.mapping;
  const shippingGroup = shippingGroupResolution.shippingGroup;
  const englishTitle = toTrimmedString(product.name_en);
  const duplicateSearchTerms = buildDuplicateSearchTerms(englishTitle ? [englishTitle] : [title]);

  return {
    productId: product.id,
    listingId: listing.id,
    integrationId: listing.integrationId,
    connectionId: listing.connectionId,
    listingAction: action,
    syncSkipImages: shouldSkipImages,
    existingExternalListingId: listing.externalListingId ?? null,
    existingListingUrl: resolveExistingListingUrl(listing),
    baseProductId: product.baseProductId ?? product.id,
    sku: product.sku ?? null,
    stock: product.stock,
    quantity: product.stock ?? 1,
    ean: product.ean ?? null,
    gtin: product.gtin ?? null,
    brand: product.producers?.[0]?.producer?.name ?? null,
    weight: product.weight ?? null,
    width: product.sizeWidth ?? null,
    length: product.length ?? null,
    height: product.sizeLength ?? null,
    duplicateSearchTitle: duplicateSearchTerms[0] ?? null,
    duplicateSearchTerms,
    rawDescriptionEn: toTrimmedString(resolvedCopy.description) || null,
    title,
    description,
    price: priceResolution.listingPrice,
    imageUrls,
    images: imageUrls,
    localImagePaths,
    traderaImageOrder: {
      strategy: shouldSkipImages ? 'none' : imageUploadPlan.imageOrderStrategy,
      imageCount: imageUrls.length,
      localImageCoverageCount: shouldSkipImages ? 0 : imageUploadPlan.localImageCoverageCount,
    },
    appBaseUrl,
    traderaPricing: pricingMetadata,
    traderaConfig: {
      listingFormUrl: normalizeTraderaListingFormUrl(systemSettings.listingFormUrl),
    },
    categoryStrategy: connection.traderaCategoryStrategy === 'top_suggested' ? 'top_suggested' : 'mapper',
    ...(mappedCategory && connection.traderaCategoryStrategy !== 'top_suggested'
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
      shippingGroupSource: shippingGroupResolution.shippingGroupSource,
      shippingCondition: shippingGroupResolution.shippingCondition,
      shippingPriceEur: shippingGroupResolution.shippingPriceEur,
      reason: shippingGroupResolution.reason,
      matchedCategoryRuleIds: shippingGroupResolution.matchedCategoryRuleIds,
      matchingShippingGroupIds: shippingGroupResolution.matchingShippingGroupIds,
    },
  };
};

const buildSuccessMetadata = ({
  result,
  script,
  scriptInput,
  action,
  browserMode,
  systemSettings,
  scriptSource,
  scriptValidationError,
  runtimeSettingsOverrides,
}: {
  result: Awaited<ReturnType<typeof runPlaywrightListingScript>>;
  script: string;
  scriptInput: Record<string, unknown>;
  action: 'list' | 'relist' | 'sync';
  browserMode: PlaywrightRelistBrowserMode;
  systemSettings: TraderaSystemSettings;
  scriptSource: ScriptSource;
  scriptValidationError?: string;
  runtimeSettingsOverrides?: Partial<PlaywrightSettings>;
}): Record<string, unknown> => {
  const traderaPricing = toRecord(scriptInput['traderaPricing']);
  const imageDiagnostics = resolveScriptInputImageDiagnostics(scriptInput);
  const executionSteps = buildTraderaQuicklistExecutionSteps({
    action,
    rawResult: result.rawResult,
    logs: result.logs ?? [],
  });

  return buildPlaywrightScriptListingMetadata({
    result,
    requestedBrowserMode: browserMode,
    additional: {
      scriptMode: 'scripted',
      scriptSource,
      scriptKind: isManagedTraderaQuickListScript(script) ? 'managed' : 'custom',
      scriptMarker: extractManagedTraderaQuickListMarker(script),
      scriptStoredOnConnection: scriptSource === 'connection',
      listingFormUrl: normalizeTraderaListingFormUrl(systemSettings.listingFormUrl),
      ...(runtimeSettingsOverrides?.emulateDevice === false &&
      runtimeSettingsOverrides.deviceName === MANAGED_TRADERA_QUICKLIST_DESKTOP_DEVICE_NAME
        ? { managedQuicklistDesktopMode: true }
        : {}),
      ...(scriptValidationError ? { scriptValidationError } : {}),
      ...(executionSteps.length > 0 ? { executionSteps } : {}),
      ...traderaPricing,
      imageInputSource: imageDiagnostics.imageInputSource,
      imageUploadSource:
        typeof result.rawResult['imageUploadSource'] === 'string'
          ? result.rawResult['imageUploadSource']
          : null,
      localImagePathCount: imageDiagnostics.localImagePathCount,
      imageUrlCount: imageDiagnostics.imageUrlCount,
    },
  });
};

const runTraderaScriptedListingForProduct = async ({
  product,
  listing,
  connection,
  systemSettings,
  action,
  browserMode,
  syncSkipImages,
}: {
  product: ProductWithImages;
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  action: 'list' | 'relist' | 'sync';
  browserMode: PlaywrightRelistBrowserMode;
  syncSkipImages?: boolean;
}): Promise<BrowserListingResultDto> => {
  const scriptInput = await buildTraderaScriptInput({
    product,
    listing,
    systemSettings,
    connection,
    action,
    syncSkipImages,
  });
  const { script, scriptSource, scriptValidationError } = resolveManagedTraderaScript(connection);
  const runtimeSettingsOverrides = buildManagedQuicklistRuntimeSettingsOverrides(script);
  const result = await runPlaywrightListingScript({
    script,
    input: scriptInput,
    connection,
    instance: createTraderaScriptedListingPlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId: listing.id,
    }),
    timeoutMs: TRADERA_SCRIPTED_LISTING_TIMEOUT_MS,
    browserMode,
    disableStartUrlBootstrap: true,
    ...(browserMode === 'headed' && action === 'list'
      ? { failureHoldOpenMs: TRADERA_HEADED_FAILURE_HOLD_OPEN_MS }
      : {}),
    runtimeSettingsOverrides,
  });

  const externalListingId =
    result.externalListingId ??
    (typeof result.listingUrl === 'string' ? extractExternalListingId(result.listingUrl) : null) ??
    (action === 'sync' ? listing.externalListingId ?? null : null);
  if (!externalListingId && result.publishVerified !== true) {
    throw internalError(
      `Tradera scripted listing run ${result.runId} finished without an external listing ID.`,
      {
        scriptMode: 'scripted',
        scriptSource,
        requestedBrowserMode: browserMode,
        runId: result.runId,
        rawResult: result.rawResult,
        publishVerified: result.publishVerified,
      }
    );
  }

  return buildPlaywrightListingResult({
    externalListingId,
    listingUrl: result.listingUrl ?? undefined,
    metadata: buildSuccessMetadata({
      result,
      script,
      scriptInput,
      action,
      browserMode,
      systemSettings,
      scriptSource,
      scriptValidationError,
      runtimeSettingsOverrides,
    }),
  });
};

export async function listTraderaProductScripted(
  product: ProductWithImages,
  connection: IntegrationConnectionRecord,
  options: {
    browserMode: PlaywrightRelistBrowserMode;
    systemSettings?: TraderaSystemSettings | null;
  }
): Promise<BrowserListingResultDto> {
  const listing = {
    id: product.id,
    productId: product.id,
    integrationId: connection.integrationId,
    connectionId: connection.id,
    externalListingId: null,
    marketplaceData: null,
  } as ProductListing;

  return runTraderaScriptedListingForProduct({
    product,
    listing,
    connection,
    systemSettings: options.systemSettings ?? DEFAULT_TRADERA_SYSTEM_SETTINGS,
    action: 'list',
    browserMode: options.browserMode,
  });
}

export const runTraderaBrowserListingScripted = async ({
  listing,
  connection,
  systemSettings,
  action,
  browserMode,
  syncSkipImages,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  systemSettings: TraderaSystemSettings;
  source: 'manual' | 'scheduler' | 'api';
  action: 'list' | 'relist' | 'sync';
  browserMode: PlaywrightRelistBrowserMode;
  syncSkipImages?: boolean;
}): Promise<BrowserListingResultDto> => {
  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(listing.productId);
  if (!product) {
    throw notFoundError('Product not found', { productId: listing.productId });
  }

  return runTraderaScriptedListingForProduct({
    product,
    listing,
    connection,
    systemSettings,
    action,
    browserMode,
    syncSkipImages,
  });
};

export const runTraderaBrowserCheckStatus = async ({
  listing,
  connection,
  browserMode,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  browserMode: PlaywrightRelistBrowserMode;
}): Promise<BrowserListingResultDto> => {
  const resolvedListingUrl = resolveExistingListingUrl(listing);
  let verificationSearchTerms: string[] = [];
  let verificationBaseProductId: string | null = null;
  let verificationDescriptionEn: string | null = null;

  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(listing.productId);
  if (product) {
    const resolvedCopy = resolveMarketplaceAwareProductCopy({
      product,
      integrationId: listing.integrationId,
      preferredLocales: ['en', 'pl', 'de'],
    });
    const englishTitle = toTrimmedString(product.name_en);
    verificationSearchTerms = buildDuplicateSearchTerms(englishTitle ? [englishTitle] : [resolvedCopy.title]);
    verificationBaseProductId = product.baseProductId ?? product.id;
    verificationDescriptionEn = toTrimmedString(resolvedCopy.description) || null;
  }

  if (!resolvedListingUrl && verificationSearchTerms.length === 0) {
    return buildPlaywrightListingResult({
      externalListingId: listing.externalListingId ?? null,
      metadata: {
        checkedStatus: null,
        checkStatusError: 'No listing URL or searchable product title available to check status.',
      },
    });
  }

  const result = await runPlaywrightScrapeScript({
    script: TRADERA_CHECK_STATUS_SCRIPT,
    input: {
      listingUrl: resolvedListingUrl,
      externalListingId: listing.externalListingId ?? null,
      duplicateSearchTitle: verificationSearchTerms[0] ?? null,
      duplicateSearchTerms: verificationSearchTerms,
      rawDescriptionEn: verificationDescriptionEn,
      baseProductId: verificationBaseProductId,
    },
    connection,
    instance: createTraderaListingStatusScrapePlaywrightInstance({
      connectionId: connection.id,
      integrationId: connection.integrationId,
      listingId: listing.id,
    }),
    timeoutMs: TRADERA_CHECK_STATUS_TIMEOUT_MS,
    browserMode,
    runtimeSettingsOverrides: TRADERA_CHECK_STATUS_RUNTIME_SETTINGS_OVERRIDES,
  });

  if (result.run.status === 'failed') {
    throw internalError(result.run.error ?? 'Tradera live status check failed.', {
      ...buildPlaywrightEngineRunFailureMeta(result.run, {
        includeRawResult: true,
      }),
      logs: Array.isArray(result.run.logs) ? result.run.logs : [],
    });
  }

  const rawResult = result.rawResult;
  const resolvedExternalListingId =
    toTrimmedString(rawResult['externalListingId']) || listing.externalListingId || null;
  const resolvedResultListingUrl = toTrimmedString(rawResult['listingUrl']) || resolvedListingUrl || null;
  const checkedStatus = toTrimmedString(rawResult['status']) || null;
  const checkStatusError = toTrimmedString(rawResult['error']) || null;
  const executionSteps = resolveTraderaCheckStatusExecutionStepsFromResult(rawResult);

  return buildPlaywrightListingResult({
    externalListingId: resolvedExternalListingId,
    listingUrl: resolvedResultListingUrl ?? undefined,
    metadata: {
      checkedStatus,
      checkStatusError,
      requestedBrowserMode: browserMode,
      runId: result.runId,
      ...(executionSteps.length > 0 ? { executionSteps } : {}),
      verificationSection: toTrimmedString(rawResult['verificationSection']) || null,
      verificationMatchStrategy: toTrimmedString(rawResult['verificationMatchStrategy']) || null,
      verificationRawStatusTag: toTrimmedString(rawResult['verificationRawStatusTag']) || null,
      verificationMatchedProductId: toTrimmedString(rawResult['verificationMatchedProductId']) || null,
      verificationSearchTitle: toTrimmedString(rawResult['verificationSearchTitle']) || null,
      verificationCandidateCount:
        typeof rawResult['verificationCandidateCount'] === 'number'
          ? rawResult['verificationCandidateCount']
          : null,
    },
  });
};

export async function validateTraderaListingScript(script: string): Promise<{
  isValid: boolean;
  error?: string;
}> {
  const validation = validatePlaywrightEngineScript(script);
  return validation.ok ? { isValid: true } : { isValid: false, error: validation.error.message };
}
