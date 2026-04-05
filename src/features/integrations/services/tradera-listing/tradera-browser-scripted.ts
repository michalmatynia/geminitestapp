import { normalizeTraderaListingFormUrl, type TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { internalError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';

import { getIntegrationRepository } from '../integration-repository';
import {
  runPlaywrightListingScript,
} from '../playwright-listing/runner';
import { DEFAULT_TRADERA_QUICKLIST_SCRIPT } from './default-script';
import {
  resolveAppBaseUrl,
  toAbsoluteUrl,
} from '@/shared/lib/files/services/storage/file-storage-service';
import {
  extractExternalListingId,
} from './utils';
import { resolveTraderaListingPriceForProduct } from './price';
import { buildTraderaPricingMetadata } from './pricing-metadata';
import { buildTraderaListingDescription } from './description';
import {
  resolveProductImageUrls,
  resolveLocalProductImagePaths,
  resolveScriptInputImageDiagnostics,
} from './tradera-browser-images';
import type { TraderaBrowserListingResult } from './browser-types';
import { validateTraderaQuickListProductConfig } from './preflight';

export const CURRENT_MANAGED_TRADERA_QUICKLIST_MARKER = 'tradera-quicklist-default:v85';
export const TRADERA_HEADED_FAILURE_HOLD_OPEN_MS = 30_000;
export const TRADERA_SCRIPTED_LISTING_TIMEOUT_MS = 240_000;
export const TRADERA_IMAGE_SETTLE_TIMEOUT_MESSAGE_PREFIX =
  'FAIL_IMAGE_SET_INVALID: Tradera image upload step did not finish. Last state: ';
const MANAGED_TRADERA_QUICKLIST_DESKTOP_DEVICE_NAME = 'Desktop Chrome';
const MANAGED_TRADERA_QUICKLIST_MARKER_PATTERN = /tradera-quicklist-default:v\d+/;
const COMPATIBLE_LEGACY_MANAGED_TRADERA_QUICKLIST_MARKERS = new Set([
  'tradera-quicklist-default:v76',
]);

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const parseImageSettleState = (message: string): Record<string, unknown> | null => {
  if (!message.startsWith(TRADERA_IMAGE_SETTLE_TIMEOUT_MESSAGE_PREFIX)) {
    return null;
  }

  const rawPayload = message.slice(TRADERA_IMAGE_SETTLE_TIMEOUT_MESSAGE_PREFIX.length).trim();
  if (!rawPayload) return null;

  try {
    const parsed = JSON.parse(rawPayload) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const usesLegacyDefaultTraderaQuickListScript = (script: string | null | undefined): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    normalized.includes('await import(\'node:fs/promises\')') &&
    normalized.includes('tradera-quicklist')
  );
};

const extractManagedTraderaQuickListMarker = (
  script: string | null | undefined
): string | null => {
  const normalized = typeof script === 'string' ? script : '';
  return MANAGED_TRADERA_QUICKLIST_MARKER_PATTERN.exec(normalized)?.[0] ?? null;
};

const isManagedTraderaQuickListScript = (script: string | null | undefined): boolean => {
  const normalized = typeof script === 'string' ? script : '';
  return (
    extractManagedTraderaQuickListMarker(normalized) !== null ||
    normalized.includes(
      'const ACTIVE_URL = \'https://www.tradera.com/en/my/listings?tab=active\';'
    ) &&
    normalized.includes('FAIL_SELL_PAGE_INVALID: Tradera create listing page did not load.')
  );
};

const usesStaleManagedDefaultTraderaQuickListScript = (
  script: string | null | undefined
): boolean => {
  if (!isManagedTraderaQuickListScript(script)) {
    return false;
  }

  const marker = extractManagedTraderaQuickListMarker(script);
  if (marker) {
    if (marker === CURRENT_MANAGED_TRADERA_QUICKLIST_MARKER) {
      return script !== DEFAULT_TRADERA_QUICKLIST_SCRIPT;
    }

    return !COMPATIBLE_LEGACY_MANAGED_TRADERA_QUICKLIST_MARKERS.has(marker);
  }

  return script !== DEFAULT_TRADERA_QUICKLIST_SCRIPT;
};

const buildManagedQuicklistRuntimeSettingsOverrides = (
  script: string
): Partial<PlaywrightSettings> | undefined => {
  if (!isManagedTraderaQuickListScript(script)) {
    return undefined;
  }

  return {
    emulateDevice: false,
    deviceName: MANAGED_TRADERA_QUICKLIST_DESKTOP_DEVICE_NAME,
  };
};

const buildManagedQuicklistScriptMetadata = ({
  script,
  scriptSource,
}: {
  script: string;
  scriptSource:
    | 'connection'
    | 'default-fallback'
    | 'legacy-default-refresh'
    | 'invalid-connection-fallback'
    | 'runtime-default-refresh';
}): {
  scriptKind: 'managed' | 'custom';
  scriptMarker: string | null;
  scriptStoredOnConnection: boolean;
} => {
  const scriptMarker = extractManagedTraderaQuickListMarker(script);
  const scriptKind = isManagedTraderaQuickListScript(script) ? 'managed' : 'custom';

  return {
    scriptKind,
    scriptMarker,
    scriptStoredOnConnection: scriptSource === 'connection',
  };
};

const shouldRetryWithManagedDefaultScript = ({
  scriptSource,
  error,
}: {
  scriptSource: string;
  error: unknown;
}): boolean => {
  if (scriptSource !== 'connection') {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('currentImageUploadSource is not defined');
};

const resolveManagedTraderaScript = async ({
  connection,
}: {
  connection: IntegrationConnectionRecord;
}): Promise<{
  script: string;
  scriptSource:
    | 'connection'
    | 'default-fallback'
    | 'legacy-default-refresh'
    | 'invalid-connection-fallback'
    | 'runtime-default-refresh';
  scriptValidationError?: string;
}> => {
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
    const integrationRepository = await getIntegrationRepository();
    await integrationRepository.updateConnection(connection.id, {
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
    return {
      script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      scriptSource: 'legacy-default-refresh',
    };
  }

  const validation = validatePlaywrightNodeScript(connectionScript);
  if (!validation.ok) {
    const integrationRepository = await getIntegrationRepository();
    await integrationRepository.updateConnection(connection.id, {
      playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
    });
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

export const buildTraderaScriptInput = async ({
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
  const title =
    product.name_en || product.name_pl || product.name_de || product.sku || `Listing ${listing.productId}`;
  const description = buildTraderaListingDescription({
    rawDescription: product.description_en || product.description_pl || product.description_de,
    fallbackTitle: title,
    baseProductId: product.baseProductId ?? product.id,
    sku: product.sku,
  });
  const appBaseUrl = resolveAppBaseUrl();
  const imageUrls = resolveProductImageUrls(product).map((url) => toAbsoluteUrl(url, appBaseUrl));
  const localImagePaths = await resolveLocalProductImagePaths(product);
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
  const shippingGroup = shippingGroupResolution.shippingGroup;
  const mappedCategory = categoryMapping.mapping;

  return {
    productId: product.id,
    listingId: listing.id,
    integrationId: listing.integrationId,
    connectionId: listing.connectionId,
    baseProductId: product.baseProductId ?? product.id,
    sku: product.sku ?? null,
    title,
    description,
    price: priceResolution.listingPrice,
    imageUrls,
    images: imageUrls,
    localImagePaths,
    appBaseUrl,
    traderaPricing: pricingMetadata,
    traderaConfig: {
      listingFormUrl: normalizeTraderaListingFormUrl(systemSettings.listingFormUrl),
    },
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
  browserMode,
  systemSettings,
  scriptSource,
  scriptValidationError,
  runtimeSettingsOverrides,
}: {
  result: Awaited<ReturnType<typeof runPlaywrightListingScript>>;
  script: string;
  scriptInput: Record<string, unknown>;
  browserMode: PlaywrightRelistBrowserMode;
  systemSettings: TraderaSystemSettings;
  scriptSource:
    | 'connection'
    | 'default-fallback'
    | 'legacy-default-refresh'
    | 'invalid-connection-fallback'
    | 'runtime-default-refresh';
  scriptValidationError?: string;
  runtimeSettingsOverrides?: Partial<PlaywrightSettings>;
}): Record<string, unknown> => {
  const traderaCategory = scriptInput['traderaCategory'];
  const traderaCategoryMapping = scriptInput['traderaCategoryMapping'];
  const traderaShipping = scriptInput['traderaShipping'];
  const traderaPricing =
    scriptInput['traderaPricing'] && typeof scriptInput['traderaPricing'] === 'object'
      ? (scriptInput['traderaPricing'] as Record<string, unknown>)
      : null;
  const imageDiagnostics = resolveScriptInputImageDiagnostics(scriptInput);
  const rawCategoryPath =
    typeof result.rawResult['categoryPath'] === 'string' ? result.rawResult['categoryPath'] : null;
  const rawCategorySource =
    typeof result.rawResult['categorySource'] === 'string'
      ? result.rawResult['categorySource']
      : null;
  const resolvedCategorySource =
    rawCategorySource === 'categoryMapper' || rawCategorySource === 'fallback'
      ? rawCategorySource
      : traderaCategory && typeof traderaCategory === 'object'
        ? 'categoryMapper'
        : 'fallback';
  const resolvedCategoryId =
    resolvedCategorySource === 'categoryMapper' && traderaCategory && typeof traderaCategory === 'object'
      ? (traderaCategory as Record<string, unknown>)['externalId'] ?? null
      : null;
  const resolvedCategoryPath =
    rawCategoryPath ??
    (resolvedCategorySource === 'categoryMapper' &&
    traderaCategory &&
    typeof traderaCategory === 'object'
      ? ((traderaCategory as Record<string, unknown>)['path'] ?? null)
      : null);
  const effectiveBrowserMode =
    typeof result.effectiveBrowserMode === 'string'
      ? result.effectiveBrowserMode
      : result.executionSettings.headless
        ? 'headless'
        : 'headed';
  const scriptMarker = extractManagedTraderaQuickListMarker(script);
  const scriptKind: 'managed' | 'custom' = isManagedTraderaQuickListScript(script)
    ? 'managed'
    : 'custom';
  const scriptStoredOnConnection = scriptSource === 'connection';

  return {
    scriptMode: 'scripted',
    scriptSource,
    scriptKind,
    scriptMarker,
    scriptStoredOnConnection,
    runId: result.runId,
    requestedBrowserMode: browserMode,
    listingFormUrl: normalizeTraderaListingFormUrl(systemSettings.listingFormUrl),
    browserMode: effectiveBrowserMode,
    playwrightPersonaId: result.personaId,
    playwrightSettings: result.executionSettings,
    ...(traderaPricing ?? {}),
    ...(
      runtimeSettingsOverrides?.emulateDevice === false &&
      runtimeSettingsOverrides?.deviceName === MANAGED_TRADERA_QUICKLIST_DESKTOP_DEVICE_NAME
        ? {
            managedQuicklistDesktopMode: true,
          }
        : {}
    ),
    ...(scriptValidationError
      ? {
          scriptValidationError,
        }
      : {}),
    rawResult: result.rawResult,
    latestStage:
      typeof result.rawResult['stage'] === 'string' ? result.rawResult['stage'] : null,
    latestStageUrl:
      typeof result.rawResult['currentUrl'] === 'string' ? result.rawResult['currentUrl'] : null,
    publishVerified: result.publishVerified,
    imageInputSource: imageDiagnostics.imageInputSource,
    imageUploadSource:
      typeof result.rawResult['imageUploadSource'] === 'string'
        ? result.rawResult['imageUploadSource']
        : null,
    localImagePathCount: imageDiagnostics.localImagePathCount,
    imageUrlCount: imageDiagnostics.imageUrlCount,
    categoryMappingReason:
      traderaCategoryMapping && typeof traderaCategoryMapping === 'object'
        ? (traderaCategoryMapping as Record<string, unknown>)['reason'] ?? null
        : null,
    categoryMatchScope:
      traderaCategoryMapping && typeof traderaCategoryMapping === 'object'
        ? (traderaCategoryMapping as Record<string, unknown>)['matchScope'] ?? null
        : null,
    categoryInternalCategoryId:
      traderaCategoryMapping && typeof traderaCategoryMapping === 'object'
        ? (traderaCategoryMapping as Record<string, unknown>)['internalCategoryId'] ?? null
        : null,
    categoryId: resolvedCategoryId,
    categoryPath: resolvedCategoryPath,
    categorySource: resolvedCategorySource,
    shippingGroupId:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['shippingGroupId'] ?? null
        : null,
    shippingGroupName:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['shippingGroupName'] ?? null
        : null,
    shippingGroupSource:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['shippingGroupSource'] ?? null
        : null,
    shippingCondition:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['shippingCondition'] ?? null
        : null,
    shippingPriceEur:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['shippingPriceEur'] ?? null
        : null,
    shippingConditionSource:
      traderaShipping &&
      typeof traderaShipping === 'object' &&
      typeof (traderaShipping as Record<string, unknown>)['shippingCondition'] === 'string'
        ? 'shippingGroup'
        : 'default',
    shippingConditionReason:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['reason'] ?? null
        : null,
    matchedCategoryRuleIds:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['matchedCategoryRuleIds'] ?? []
        : [],
    matchingShippingGroupIds:
      traderaShipping && typeof traderaShipping === 'object'
        ? (traderaShipping as Record<string, unknown>)['matchingShippingGroupIds'] ?? []
        : [],
  };
};

export const runTraderaBrowserListingScripted = async ({
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
  const productRepository = await getProductRepository();
  const product = await productRepository.getProductById(listing.productId);
  if (!product) {
    throw notFoundError('Product not found', { productId: listing.productId });
  }

  const scriptInput = await buildTraderaScriptInput({
    product,
    listing,
    systemSettings,
    connection,
  });
  const { script, scriptSource, scriptValidationError } = await resolveManagedTraderaScript({
    connection,
  });
  const normalizedListingFormUrl = normalizeTraderaListingFormUrl(systemSettings.listingFormUrl);

  const executeListingScript = async ({
    script,
    scriptSource,
    scriptValidationError,
  }: {
    script: string;
    scriptSource:
      | 'connection'
      | 'default-fallback'
      | 'legacy-default-refresh'
      | 'invalid-connection-fallback'
      | 'runtime-default-refresh';
    scriptValidationError?: string;
  }): Promise<TraderaBrowserListingResult> => {
    const runtimeSettingsOverrides = buildManagedQuicklistRuntimeSettingsOverrides(script);
    const result = await runPlaywrightListingScript({
      script,
      input: scriptInput,
      connection,
      timeoutMs: TRADERA_SCRIPTED_LISTING_TIMEOUT_MS,
      browserMode,
      disableStartUrlBootstrap: true,
      failureHoldOpenMs: browserMode === 'headed' ? TRADERA_HEADED_FAILURE_HOLD_OPEN_MS : undefined,
      runtimeSettingsOverrides,
    });

    const externalListingId =
      result.externalListingId ??
      (typeof result.listingUrl === 'string'
        ? extractExternalListingId(result.listingUrl)
        : null);
    if (!externalListingId && result.publishVerified !== true) {
      throw internalError(
        `Tradera scripted listing run ${result.runId} finished without an external listing ID.`,
        {
          scriptMode: 'scripted',
          scriptSource,
          ...buildManagedQuicklistScriptMetadata({ script, scriptSource }),
          requestedBrowserMode: browserMode,
          listingFormUrl: normalizedListingFormUrl,
          runId: result.runId,
          rawResult: result.rawResult,
          publishVerified: result.publishVerified,
        }
      );
    }

    return {
      externalListingId,
      listingUrl: result.listingUrl ?? undefined,
      metadata: buildSuccessMetadata({
        result,
        script,
        scriptInput,
        browserMode,
        systemSettings,
        scriptSource,
        scriptValidationError,
        runtimeSettingsOverrides,
      }),
    };
  };

  try {
    return await executeListingScript({
      script,
      scriptSource,
      scriptValidationError,
    });
  } catch (error) {
    if (shouldRetryWithManagedDefaultScript({ scriptSource, error })) {
      const integrationRepository = await getIntegrationRepository();
      await integrationRepository.updateConnection(connection.id, {
        playwrightListingScript: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
      });
      return await executeListingScript({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        scriptSource: 'runtime-default-refresh',
      });
    }

    const imageSettleState =
      error instanceof Error ? parseImageSettleState(error.message) : null;

    if (isAppError(error)) {
      error.meta = {
        ...error.meta,
        scriptMode: 'scripted',
        scriptSource,
        ...buildManagedQuicklistScriptMetadata({ script, scriptSource }),
        requestedBrowserMode: browserMode,
        listingFormUrl: normalizedListingFormUrl,
        imageSettleState,
        ...(scriptValidationError
          ? {
              scriptValidationError,
            }
          : {}),
      };
      throw error;
    }

    if (error instanceof Error) {
      const metadataCarrier = error as Error & { meta?: Record<string, unknown> };
      metadataCarrier.meta = {
        ...(metadataCarrier.meta ?? {}),
        scriptMode: 'scripted',
        scriptSource,
        ...buildManagedQuicklistScriptMetadata({ script, scriptSource }),
        requestedBrowserMode: browserMode,
        listingFormUrl: normalizedListingFormUrl,
        imageSettleState,
        ...(scriptValidationError
          ? {
              scriptValidationError,
            }
          : {}),
      };
      throw metadataCarrier;
    }

    throw internalError('Scripted listing failed', {
      cause: error,
      scriptMode: 'scripted',
      scriptSource,
      ...buildManagedQuicklistScriptMetadata({ script, scriptSource }),
      requestedBrowserMode: browserMode,
      listingFormUrl: normalizedListingFormUrl,
      imageSettleState,
      ...(scriptValidationError
        ? {
            scriptValidationError,
          }
        : {}),
    });
  }
};
