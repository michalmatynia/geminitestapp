import { normalizeTraderaListingFormUrl, type TraderaSystemSettings } from '@/features/integrations/constants/tradera';
import { validatePlaywrightNodeScript } from '@/features/ai/ai-paths/services/playwright-node-runner.parser';
import type { IntegrationConnectionRecord } from '@/shared/contracts/integrations/repositories';
import type { BrowserListingResultDto, PlaywrightRelistBrowserMode, ProductListing } from '@/shared/contracts/integrations/listings';
import type { PlaywrightSettings } from '@/shared/contracts/playwright';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { internalError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { getParameterRepository } from '@/features/products/server';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { resolveMarketplaceAwareProductCopy } from '@/shared/lib/products/utils/marketplace-content-overrides';

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
import {
  parseTraderaParameterMapperCatalogJson,
  parseTraderaParameterMapperRulesJson,
  resolveTraderaParameterMapperSelections,
} from './parameter-mapper';
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

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const resolveExistingListingUrl = (listing: ProductListing): string | null => {
  const marketplaceData = toRecord(listing.marketplaceData);
  const directListingUrl = toTrimmedString(marketplaceData['listingUrl']);
  if (directListingUrl) {
    return directListingUrl;
  }

  const traderaData = toRecord(marketplaceData['tradera']);
  const nestedListingUrl = toTrimmedString(traderaData['listingUrl']);
  if (nestedListingUrl) {
    return nestedListingUrl;
  }

  return listing.externalListingId ? buildCanonicalTraderaListingUrl(listing.externalListingId) : null;
};

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

const resolveTraderaFailureHoldOpenMs = ({
  action,
  browserMode,
}: {
  action: 'list' | 'relist' | 'sync';
  browserMode: PlaywrightRelistBrowserMode;
}): number | undefined => {
  if (browserMode !== 'headed') {
    return undefined;
  }

  return action === 'list' ? TRADERA_HEADED_FAILURE_HOLD_OPEN_MS : undefined;
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
      playwrightListingScript: null,
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
      playwrightListingScript: null,
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
  const imageUrls = imageUploadPlan.imageUrls.map((url) => toAbsoluteUrl(url, appBaseUrl));
  const localImagePaths = imageUploadPlan.localImagePaths;
  // Duplicate search only uses English names — Tradera is a Swedish/English marketplace
  // and Polish-only terms return no results, causing spurious duplicate detection failures.
  const englishTitle =
    typeof product.name_en === 'string' && product.name_en.trim()
      ? product.name_en.trim()
      : null;
  const duplicateSearchTerms = buildDuplicateSearchTerms(englishTitle ? [englishTitle] : []);
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
  const parameterMapperCategory =
    connection.traderaCategoryStrategy === 'top_suggested' ? null : mappedCategory;
  const parameterMapperRules = parseTraderaParameterMapperRulesJson(
    connection.traderaParameterMapperRulesJson
  );
  const parameterMapperCatalogEntries = parseTraderaParameterMapperCatalogJson(
    connection.traderaParameterMapperCatalogJson
  );
  const shouldResolveParameterMapperSelections = Boolean(
    parameterMapperCategory &&
      parameterMapperRules.length > 0 &&
      parameterMapperCatalogEntries.length > 0
  );
  const catalogId = toTrimmedString(product.catalogId);
  const parameterDefinitions = shouldResolveParameterMapperSelections && catalogId
    ? await (await getParameterRepository()).listParameters({ catalogId })
    : [];
  const traderaParameterMapperSelections = shouldResolveParameterMapperSelections
    ? resolveTraderaParameterMapperSelections({
        product,
        mappedCategory: parameterMapperCategory,
        rules: parameterMapperRules,
        catalogEntries: parameterMapperCatalogEntries,
        parameters: parameterDefinitions,
      })
    : [];
  const existingListingUrl = resolveExistingListingUrl(listing);

  return {
    productId: product.id,
    listingId: listing.id,
    integrationId: listing.integrationId,
    connectionId: listing.connectionId,
    listingAction: action,
    syncSkipImages: action === 'sync' && syncSkipImages === true,
    existingExternalListingId: listing.externalListingId ?? null,
    existingListingUrl,
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
      strategy: imageUploadPlan.imageOrderStrategy,
      imageCount: imageUploadPlan.imageCount,
      localImageCoverageCount: imageUploadPlan.localImageCoverageCount,
    },
    appBaseUrl,
    traderaPricing: pricingMetadata,
    traderaConfig: {
      listingFormUrl: normalizeTraderaListingFormUrl(systemSettings.listingFormUrl),
    },
    categoryStrategy: connection.traderaCategoryStrategy === 'top_suggested' ? 'top_suggested' : 'mapper',
    // Only pass traderaCategory when using the mapper strategy — top_suggested ignores it
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
    ...(traderaParameterMapperSelections.length > 0
      ? {
          traderaExtraFieldSelections: traderaParameterMapperSelections.map((selection) => ({
            fieldLabel: selection.fieldLabel,
            fieldKey: selection.fieldKey,
            optionLabel: selection.optionLabel,
            parameterId: selection.parameterId,
            parameterName: selection.parameterName,
            sourceValue: selection.sourceValue,
          })),
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
  const duplicateLinked = result.rawResult['duplicateLinked'] === true;
  const duplicateMatchStrategy =
    typeof result.rawResult['duplicateMatchStrategy'] === 'string'
      ? result.rawResult['duplicateMatchStrategy']
      : null;
  const duplicateMatchedProductId =
    typeof result.rawResult['duplicateMatchedProductId'] === 'string'
      ? result.rawResult['duplicateMatchedProductId']
      : null;
  const duplicateSearchTitle =
    typeof result.rawResult['duplicateSearchTitle'] === 'string'
      ? result.rawResult['duplicateSearchTitle']
      : null;
  const duplicateCandidateCount =
    typeof result.rawResult['duplicateCandidateCount'] === 'number'
      ? result.rawResult['duplicateCandidateCount']
      : null;
  const rawCategoryPath =
    typeof result.rawResult['categoryPath'] === 'string' ? result.rawResult['categoryPath'] : null;
  const rawCategorySource =
    typeof result.rawResult['categorySource'] === 'string'
      ? result.rawResult['categorySource']
      : null;
  const resolvedCategorySource =
    duplicateLinked && !rawCategorySource
      ? null
      : rawCategorySource === 'categoryMapper' ||
          rawCategorySource === 'fallback' ||
          rawCategorySource === 'autofill'
        ? rawCategorySource
        : traderaCategory && typeof traderaCategory === 'object'
          ? 'categoryMapper'
          : 'fallback';
  const resolvedCategoryId =
    resolvedCategorySource === 'categoryMapper' && traderaCategory && typeof traderaCategory === 'object'
      ? (traderaCategory as Record<string, unknown>)['externalId'] ?? null
      : null;
  const resolvedCategoryPath =
    duplicateLinked && !rawCategoryPath
      ? null
      : rawCategoryPath ??
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
    ...(duplicateLinked
      ? {
          duplicateLinked: true,
        }
      : {}),
    ...(duplicateMatchStrategy
      ? {
          duplicateMatchStrategy,
        }
      : {}),
    ...(duplicateMatchedProductId
      ? {
          duplicateMatchedProductId,
        }
      : {}),
    ...(duplicateSearchTitle
      ? {
          duplicateSearchTitle,
        }
      : {}),
    ...(typeof duplicateCandidateCount === 'number'
      ? {
          duplicateCandidateCount,
        }
      : {}),
    ...(Array.isArray(result.logs) && result.logs.length > 0
      ? {
          executionSteps: buildTraderaQuicklistExecutionSteps({
            action,
            rawResult: result.rawResult,
            logs: result.logs,
          }),
        }
      : {}),
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

  const scriptInput = await buildTraderaScriptInput({
    product,
    listing,
    systemSettings,
    connection,
    action,
    syncSkipImages,
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
  }): Promise<BrowserListingResultDto> => {
    const runtimeSettingsOverrides = buildManagedQuicklistRuntimeSettingsOverrides(script);
    const failureHoldOpenMs = resolveTraderaFailureHoldOpenMs({ action, browserMode });
    const result = await runPlaywrightListingScript({
      script,
      input: scriptInput,
      connection,
      timeoutMs: TRADERA_SCRIPTED_LISTING_TIMEOUT_MS,
      browserMode,
      disableStartUrlBootstrap: true,
      ...(typeof failureHoldOpenMs === 'number' ? { failureHoldOpenMs } : {}),
      runtimeSettingsOverrides,
    });

    const externalListingId =
      result.externalListingId ??
      (action === 'sync' ? listing.externalListingId ?? null : null) ??
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
        action,
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
        playwrightListingScript: null,
      });
      return await executeListingScript({
        script: DEFAULT_TRADERA_QUICKLIST_SCRIPT,
        scriptSource: 'runtime-default-refresh',
      });
    }

    const imageSettleState =
      error instanceof Error ? parseImageSettleState(error.message) : null;
    const rawMetadata =
      error instanceof Error && 'meta' in error
        ? toRecord((error as Error & { meta?: unknown }).meta)
        : {};
    const rawResult = toRecord(rawMetadata['rawResult']);
    const rawLogs = Array.isArray(rawMetadata['logs'])
      ? rawMetadata['logs'].filter((entry): entry is string => typeof entry === 'string')
      : [];
    const executionSteps = buildTraderaQuicklistExecutionSteps({
      action,
      rawResult,
      logs: rawLogs,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    const sanitizedMetadata: Record<string, unknown> = {
      ...rawMetadata,
      ...(rawLogs.length > 0
        ? {
            logTail:
              rawMetadata['logTail'] ??
              rawLogs.slice(-12),
          }
        : {}),
      ...(executionSteps.length > 0
        ? {
            executionSteps,
          }
        : {}),
    };
    delete sanitizedMetadata['logs'];

    if (isAppError(error)) {
      error.meta = {
        ...sanitizedMetadata,
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
        ...sanitizedMetadata,
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

const TRADERA_CHECK_STATUS_TIMEOUT_MS = 60_000;

export const runTraderaBrowserCheckStatus = async ({
  listing,
  connection,
  browserMode,
}: {
  listing: ProductListing;
  connection: IntegrationConnectionRecord;
  browserMode: PlaywrightRelistBrowserMode;
}): Promise<BrowserListingResultDto> => {
  const toRecord = (v: unknown): Record<string, unknown> =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

  const marketplaceData = toRecord(listing.marketplaceData);
  const traderaData = toRecord(marketplaceData['tradera']);
  const lastExec = toRecord(traderaData['lastExecution']);

  const resolvedListingUrl: string | null =
    (typeof traderaData['listingUrl'] === 'string' && traderaData['listingUrl'].trim()
      ? traderaData['listingUrl']
      : null) ??
    (typeof lastExec['listingUrl'] === 'string' && lastExec['listingUrl'].trim()
      ? lastExec['listingUrl']
      : null) ??
    (typeof marketplaceData['listingUrl'] === 'string' && marketplaceData['listingUrl'].trim()
      ? marketplaceData['listingUrl']
      : null) ??
    (listing.externalListingId ? buildCanonicalTraderaListingUrl(listing.externalListingId) : null);

  let verificationBaseProductId: string | null = null;
  let verificationDescriptionEn: string | null = null;
  let verificationSearchTerms: string[] = [];

  try {
    const productRepository = await getProductRepository();
    const product = await productRepository.getProductById(listing.productId);
    if (product) {
      const resolvedCopy = resolveMarketplaceAwareProductCopy({
        product,
        integrationId: listing.integrationId,
        preferredLocales: ['en', 'pl', 'de'],
      });
      const englishTitle =
        typeof product.name_en === 'string' && product.name_en.trim()
          ? product.name_en.trim()
          : null;
      verificationSearchTerms = buildDuplicateSearchTerms(
        englishTitle ? [englishTitle] : [resolvedCopy.title]
      );
      verificationBaseProductId = product.baseProductId ?? product.id;
      verificationDescriptionEn = toTrimmedString(resolvedCopy.description) || null;
    }
  } catch {
    verificationSearchTerms = [];
    verificationBaseProductId = null;
    verificationDescriptionEn = null;
  }

  if (!resolvedListingUrl && verificationSearchTerms.length === 0) {
    return {
      externalListingId: listing.externalListingId ?? null,
      listingUrl: undefined,
      metadata: {
        checkedStatus: null,
        checkStatusError: 'No listing URL or searchable product title available to check status.',
      },
    };
  }

  const result = await runPlaywrightListingScript({
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
    timeoutMs: TRADERA_CHECK_STATUS_TIMEOUT_MS,
    browserMode,
    disableStartUrlBootstrap: true,
  });

  const checkedStatus =
    typeof result.rawResult['status'] === 'string' && result.rawResult['status'].trim()
      ? result.rawResult['status'].trim()
      : null;
  const checkStatusError =
    typeof result.rawResult['error'] === 'string' ? result.rawResult['error'] : null;
  const executionSteps = resolveTraderaCheckStatusExecutionStepsFromResult(result.rawResult);
  const verificationSection =
    typeof result.rawResult['verificationSection'] === 'string'
      ? result.rawResult['verificationSection']
      : null;
  const verificationMatchStrategy =
    typeof result.rawResult['verificationMatchStrategy'] === 'string'
      ? result.rawResult['verificationMatchStrategy']
      : null;
  const verificationRawStatusTag =
    typeof result.rawResult['verificationRawStatusTag'] === 'string'
      ? result.rawResult['verificationRawStatusTag']
      : null;
  const verificationMatchedProductId =
    typeof result.rawResult['verificationMatchedProductId'] === 'string'
      ? result.rawResult['verificationMatchedProductId']
      : null;
  const verificationSearchTitle =
    typeof result.rawResult['verificationSearchTitle'] === 'string'
      ? result.rawResult['verificationSearchTitle']
      : null;
  const verificationCandidateCount =
    typeof result.rawResult['verificationCandidateCount'] === 'number'
      ? result.rawResult['verificationCandidateCount']
      : null;

  return {
    externalListingId: result.externalListingId ?? listing.externalListingId ?? null,
    listingUrl: result.listingUrl ?? resolvedListingUrl ?? undefined,
    metadata: {
      checkedStatus,
      checkStatusError,
      requestedBrowserMode: browserMode,
      runId: result.runId,
      ...(verificationSection
        ? {
            verificationSection,
          }
        : {}),
      ...(verificationMatchStrategy
        ? {
            verificationMatchStrategy,
          }
        : {}),
      ...(verificationRawStatusTag
        ? {
            verificationRawStatusTag,
          }
        : {}),
      ...(verificationMatchedProductId
        ? {
            verificationMatchedProductId,
          }
        : {}),
      ...(verificationSearchTitle
        ? {
            verificationSearchTitle,
          }
        : {}),
      ...(typeof verificationCandidateCount === 'number'
        ? {
            verificationCandidateCount,
          }
        : {}),
      ...(executionSteps.length > 0
        ? {
            executionSteps,
          }
        : {}),
    },
  };
};
