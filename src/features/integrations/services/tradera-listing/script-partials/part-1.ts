import { TRADERA_SELECTOR_REGISTRY_RUNTIME } from '@/shared/lib/browser-execution/selectors/tradera';
import { generateTraderaQuicklistBrowserStepsInit } from '@/shared/lib/browser-execution';

const TRADERA_QUICKLIST_STEPS_INIT = generateTraderaQuicklistBrowserStepsInit();

export const PART_1 = String.raw`
export default async function run({
  page,
  input,
  emit,
  artifacts,
  log,
  helpers,
}) {
  // tradera-quicklist-default:v143
  const ACTIVE_URL = 'https://www.tradera.com/en/my/listings?tab=active';
  const DIRECT_SELL_URL = 'https://www.tradera.com/en/selling/new';
  const LEGACY_SELL_URL = 'https://www.tradera.com/en/selling?redirectToNewIfNoDrafts';
  const configuredSellUrl =
    typeof input?.traderaConfig?.listingFormUrl === 'string' &&
    input.traderaConfig.listingFormUrl.trim()
      ? input.traderaConfig.listingFormUrl.trim()
      : null;
  const normalizedConfiguredSellUrl =
    configuredSellUrl === LEGACY_SELL_URL ? DIRECT_SELL_URL : configuredSellUrl;
  const TRADERA_ALLOWED_PAGE_HOSTS = ['www.tradera.com', 'tradera.com'];
  const SELL_URL_CANDIDATES = Array.from(
    new Set(
      [normalizedConfiguredSellUrl, DIRECT_SELL_URL, LEGACY_SELL_URL].filter(
        (value) => typeof value === 'string' && value.trim().length > 0
      )
    )
  );

${TRADERA_SELECTOR_REGISTRY_RUNTIME}

  const VALIDATION_MESSAGE_IGNORE_FIELDS = ['__next-route-announcer__', 'next-route-announcer'];
  const TRANSIENT_VALIDATION_MESSAGE_PATTERNS = [
    /^(loading|laddar)(?:\.{1,3})?$/i,
  ];

  const toText = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;
  const toNumber = (value) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  const toUniqueTextList = (values, limit = 8) => {
    const rawValues = Array.isArray(values) ? values : [values];
    const maxItems =
      typeof limit === 'number' && Number.isFinite(limit) && limit > 0
        ? Math.max(1, Math.floor(limit))
        : 8;
    const seen = new Set();
    const result = [];

    for (const value of rawValues) {
      const normalized = normalizeWhitespace(toText(value));
      if (!normalized) {
        continue;
      }

      const dedupeKey = normalized.toLowerCase();
      if (seen.has(dedupeKey)) {
        continue;
      }

      seen.add(dedupeKey);
      result.push(normalized);
      if (result.length >= maxItems) {
        break;
      }
    }

    return result;
  };
  const hasPublishActionHint = (value) => {
    const normalized = normalizeWhitespace(value).toLowerCase();
    if (!normalized) {
      return false;
    }

    return PUBLISH_ACTION_LABEL_HINTS.some((hint) => normalized.includes(hint));
  };
  const normalizePriceValue = (value) => {
    const normalized = String(value || '')
      .replace(/\s+/g, '')
      .replace(/[^\d,.-]/g, '')
      .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed.toFixed(2) : normalized;
  };

  const baseProductId = toText(input?.baseProductId) || toText(input?.productId) || 'product';
  const requestedListingAction = toText(input?.listingAction);
  const listingAction =
    requestedListingAction === 'relist' || requestedListingAction === 'sync'
      ? requestedListingAction
      : 'list';
  const syncSkipImages = listingAction === 'sync' && input?.syncSkipImages === true;
  const existingExternalListingId = toText(input?.existingExternalListingId);
  const existingListingUrl = toText(input?.existingListingUrl);
  const rawDescriptionEn = toText(input?.rawDescriptionEn);
  const allowDuplicateLinking = true;
  const sku = toText(input?.sku);
  const username = toText(input?.username);
  const password = toText(input?.password);
  const title = toText(input?.title) || 'Listing ' + baseProductId;
  const duplicateSearchTerms = toUniqueTextList(
    Array.isArray(input?.duplicateSearchTerms)
      ? input.duplicateSearchTerms
      : [input?.duplicateSearchTitle]
  );
  const duplicateSearchTitle = duplicateSearchTerms[0] || null;
  const PRODUCT_ID_PATTERN = /(item reference|product id)\s*:/i;
  const SKU_REFERENCE_PATTERN = /\bsku\s*:/i;
  const rawDescription = (toText(input?.description) || title).replace(/\s+$/g, '');
  const referenceLines = [
    !PRODUCT_ID_PATTERN.test(rawDescription) ? 'Product ID: ' + baseProductId : null,
    sku && !SKU_REFERENCE_PATTERN.test(rawDescription) ? 'SKU: ' + sku : null,
  ].filter(Boolean);
  const description =
    referenceLines.length > 0 ? rawDescription + ' | ' + referenceLines.join(' | ') : rawDescription;
  const price = toNumber(input?.price) ?? 1;
  const quantity = toNumber(input?.quantity) || toNumber(input?.stock) || 1;
  const ean = toText(input?.ean) || toText(input?.gtin);
  const brand = toText(input?.brand) || toText(input?.producer);
  const weight = toNumber(input?.weight);
  const width = toNumber(input?.width);
  const length = toNumber(input?.length);
  const height = toNumber(input?.height);
  const categoryStrategy = toText(input?.categoryStrategy) === 'top_suggested' ? 'top_suggested' : 'mapper';
  const mappedCategorySegments = Array.isArray(input?.traderaCategory?.segments)
    ? input.traderaCategory.segments
        .map((value) => toText(value))
        .filter((value) => typeof value === 'string')
    : [];
  const mappedCategoryPath =
    mappedCategorySegments.length > 0
      ? mappedCategorySegments.join(' > ')
      : toText(input?.traderaCategory?.path) || toText(input?.traderaCategory?.name);
  const mappedCategoryExternalId = toText(input?.traderaCategory?.externalId);
  const configuredExtraFieldSelections = Array.isArray(input?.traderaExtraFieldSelections)
    ? input.traderaExtraFieldSelections
        .map((entry) => ({
          fieldLabel: toText(entry?.fieldLabel),
          fieldKey: toText(entry?.fieldKey),
          optionLabel: toText(entry?.optionLabel),
          parameterId: toText(entry?.parameterId),
          parameterName: toText(entry?.parameterName),
          sourceValue: toText(entry?.sourceValue),
        }))
        .filter((entry) => entry.fieldLabel && entry.optionLabel)
    : [];
  let selectedCategoryPath = null;
  let selectedCategorySource = null;
  let selectedCategoryFallbackReason = null;
  const configuredDeliveryOptionLabel = toText(input?.traderaShipping?.shippingCondition);
  const configuredDeliveryPriceEur = toNumber(input?.traderaShipping?.shippingPriceEur);
  const configuredShippingGroupName = toText(input?.traderaShipping?.shippingGroupName);
  const requiresConfiguredDeliveryOption = Boolean(configuredDeliveryOptionLabel);

  ${TRADERA_QUICKLIST_STEPS_INIT}

  const normalizeStepStatus = (status) => {
    if (status === 'completed') return 'success';
    if (status === 'failed') return 'error';
    return status;
  };

  const updateStep = (id, status, info) => {
    const step = executionSteps.find((s) => s.id === id);
    if (!step) return;
    step.status = normalizeStepStatus(status);
    if (info !== undefined && info !== null) {
      step.info = typeof info === 'object' ? info : { message: String(info) };
    }
    if (typeof emit === 'function') {
      try { emit('steps', executionSteps); } catch {}
    }
  };

  const skipStep = (id, reason) => {
    updateStep(id, 'skipped', reason !== undefined ? { reason: String(reason) } : null);
  };

  const failCurrentStep = (errorMessage) => {
    const active = executionSteps.find((s) => s.status === 'running');
    if (!active) return;
    active.status = 'error';
    if (errorMessage) {
      active.info = { ...(active.info || {}), error: String(errorMessage).slice(0, 400) };
    }
    if (typeof emit === 'function') {
      try { emit('steps', executionSteps); } catch {}
    }
  };
`;
