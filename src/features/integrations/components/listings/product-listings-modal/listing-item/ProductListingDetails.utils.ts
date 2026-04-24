import {
  resolveTraderaExecutionStepsFromMarketplaceData,
} from '@/features/integrations/utils/tradera-execution-steps';
import {
  resolveDuplicateLinkedFromRunResult,
  resolveDuplicateMatchStrategyFromRunResult,
} from '@/features/integrations/utils/tradera-listing-client-utils';
import type {
  TraderaExecutionStep,
} from '@/shared/contracts/integrations/listings';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const formatTimestamp = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  const date: Date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
};

export const formatListValue = (value: string | null | undefined): string => (value ? value : '—');

export const normalizeIntegrationSlug = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

export const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

export const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

export const resolveHistoryBrowserMode = (
  fields: string[] | null | undefined
): string | null => {
  const match = (Array.isArray(fields) ? fields : []).find((field) =>
    field.startsWith('browser_mode:')
  );
  if (!match) return null;
  const value = match.slice('browser_mode:'.length).trim();
  return value || null;
};

export const resolveHistoryAction = (
  fields: string[] | null | undefined
): string | null => {
  const match = (Array.isArray(fields) ? fields : []).find((field) =>
    field.startsWith('action:')
  );
  if (!match) return null;
  const value = match.slice('action:'.length).trim();
  return value || null;
};

export const formatHistoryAction = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'sync':
      return 'Sync';
    case 'move_to_unsold':
      return 'End listing';
    case 'check_status':
      return 'Status check';
    case 'relist':
      return 'Relist';
    case 'list':
      return 'List';
    default:
      return formatListValue(value);
  }
};

export const resolveDisplayHistoryFields = (
  fields: string[] | null | undefined
): string[] =>
  Array.isArray(fields)
    ? fields.filter(
        (field) =>
          !field.startsWith('browser_mode:') &&
          !field.startsWith('action:')
      )
    : [];

export const formatTraderaDuplicateMatchStrategy = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'existing-linked-record':
      return 'Previously linked record';
    case 'existing-listing-id+visible-candidate':
      return 'Existing listing ID + visible candidate';
    case 'exact-title-single-candidate':
      return 'Exact title single candidate';
    case 'title+product-id':
      return 'Exact title + product ID';
    case 'title+description':
      return 'Exact title + description';
    case 'visible-candidate+expected-listing':
      return 'Visible candidate + expected listing';
    default:
      return formatListValue(value);
  }
};

export const formatTraderaStatusVerificationSection = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'active':
      return 'Active listings';
    case 'unsold':
      return 'Unsold items';
    case 'sold':
      return 'Sold items';
    case 'public_listing':
      return 'Public listing page';
    default:
      return formatListValue(value);
  }
};

export const formatTraderaStatusVerificationStrategy = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'title+description':
      return 'Exact title + description';
    case 'title+product-id':
      return 'Exact title + product ID';
    case 'direct-listing-page-missing':
      return 'Direct listing page missing';
    case 'direct-listing-page-reachable':
      return 'Direct listing page reachable';
    case 'seller-sections-miss':
      return 'Seller sections miss';
    default:
      return formatListValue(value);
  }
};

export const formatTraderaSyncTargetMatchStrategy = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'direct_listing_url':
      return 'Direct listing URL';
    case 'active_listings_external_listing_id':
      return 'Active listings + external ID';
    case 'active_listings_exact_title':
      return 'Active listings + exact title';
    default:
      return formatListValue(value);
  }
};

export const formatTraderaSyncImageMode = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'fields_only':
      return 'Fields only';
    case 'full':
      return 'Full update';
    default:
      return formatListValue(value);
  }
};

export const formatTraderaSyncOutcome = (
  value: string | null | undefined
): string => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'updated':
      return 'Updated';
    case 'unchanged':
      return 'Already matched';
    case 'preserved':
      return 'Preserved';
    case 'locked':
      return 'Locked on Tradera';
    case 'unavailable':
      return 'Unavailable in editor';
    case 'omitted':
      return 'Omitted by runtime manifest';
    case 'skipped':
      return 'Skipped';
    case 'failed':
      return 'Failed';
    case 'running':
      return 'Running';
    case 'pending':
      return 'Pending';
    default:
      return formatListValue(value);
  }
};

const parseTraderaUserLogEvent = (
  entry: string
): { event: string | null; payload: Record<string, unknown> | null } => {
  if (!entry.startsWith('[user] ')) {
    return { event: null, payload: null };
  }

  const body = entry.slice('[user] '.length).trim();
  if (!body) {
    return { event: null, payload: null };
  }

  const firstSpace = body.indexOf(' ');
  const event = firstSpace === -1 ? body : body.slice(0, firstSpace).trim();
  const payloadText = firstSpace === -1 ? '' : body.slice(firstSpace + 1).trim();
  if (!event) {
    return { event: null, payload: null };
  }

  if (!payloadText.startsWith('{')) {
    return { event, payload: null };
  }

  try {
    return {
      event,
      payload: toRecord(JSON.parse(payloadText) as unknown),
    };
  } catch {
    return { event, payload: null };
  }
};

const findTraderaExecutionStep = (
  steps: readonly TraderaExecutionStep[],
  stepId: string
): TraderaExecutionStep | null => steps.find((step) => step.id === stepId) ?? null;

const matchesTraderaSyncField = ({
  field,
  fieldKeys,
  fieldPrefixes,
}: {
  field: string | null;
  fieldKeys: readonly string[];
  fieldPrefixes: readonly string[];
}): boolean => {
  const normalizedField = (field ?? '').trim().toLowerCase();
  if (!normalizedField) return false;
  if (fieldKeys.some((candidate) => candidate.trim().toLowerCase() === normalizedField)) {
    return true;
  }
  return fieldPrefixes.some((prefix) => normalizedField.startsWith(prefix.trim().toLowerCase()));
};

const mapTraderaSyncReasonToOutcome = (value: string | null | undefined): string | null => {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'already-matched':
    case 'default-value':
      return 'unchanged';
    case 'disabled-on-sync':
      return 'locked';
    case 'selector-missing':
    case 'trigger-missing':
      return 'unavailable';
    case 'sync-skip-images':
      return 'preserved';
    case 'step omitted from runtime action manifest':
    case 'manifest-omitted':
      return 'omitted';
    default:
      return (value ?? '').trim() ? 'skipped' : null;
  }
};

const resolveTraderaSyncOutcomeFromStep = (
  step: TraderaExecutionStep | null,
  successOutcome: string = 'updated'
): string | null => {
  if (!step) return null;

  switch (step.status) {
    case 'success':
      return successOutcome;
    case 'error':
      return 'failed';
    case 'running':
      return 'running';
    case 'pending':
      return 'pending';
    case 'skipped':
      return mapTraderaSyncReasonToOutcome(step.message) ?? 'skipped';
    default:
      return null;
  }
};

const resolveTraderaSyncFieldOutcome = ({
  logs,
  step,
  fieldKeys,
  fieldPrefixes = [],
  successOutcome = 'updated',
}: {
  logs: readonly string[];
  step: TraderaExecutionStep | null;
  fieldKeys: readonly string[];
  fieldPrefixes?: readonly string[];
  successOutcome?: string;
}): string | null => {
  let latestSkipReason: string | null = null;

  for (const entry of logs) {
    const parsed = parseTraderaUserLogEvent(entry);
    const field = readString(parsed.payload?.['field']);
    if (
      parsed.event === 'tradera.quicklist.field.verified' &&
      matchesTraderaSyncField({ field, fieldKeys, fieldPrefixes })
    ) {
      return 'updated';
    }
    if (
      parsed.event === 'tradera.quicklist.field.selected' &&
      matchesTraderaSyncField({ field, fieldKeys, fieldPrefixes })
    ) {
      return 'updated';
    }
    if (
      parsed.event === 'tradera.quicklist.field.skipped' &&
      matchesTraderaSyncField({ field, fieldKeys, fieldPrefixes })
    ) {
      latestSkipReason = readString(parsed.payload?.['reason']);
    }
    if (
      parsed.event === 'tradera.quicklist.listing_format.skipped' &&
      fieldKeys.some((candidate) => candidate.trim().toLowerCase() === 'listing-format')
    ) {
      latestSkipReason = readString(parsed.payload?.['reason']);
    }
  }

  const mappedSkipOutcome = mapTraderaSyncReasonToOutcome(latestSkipReason);
  if (mappedSkipOutcome) {
    return mappedSkipOutcome;
  }

  return resolveTraderaSyncOutcomeFromStep(step, successOutcome);
};

const resolveTraderaSyncCategoryOutcome = ({
  step,
  categorySource,
}: {
  step: TraderaExecutionStep | null;
  categorySource: string | null;
}): string | null => {
  switch ((categorySource ?? '').trim().toLowerCase()) {
    case 'categorymapper':
    case 'fallback':
      return 'updated';
    case 'autofill':
    case 'preserved':
      return 'preserved';
    default:
      return resolveTraderaSyncOutcomeFromStep(step, 'updated');
  }
};

const resolveTraderaSyncImagesOutcome = ({
  step,
  syncImageMode,
  imageUploadSource,
}: {
  step: TraderaExecutionStep | null;
  syncImageMode: string | null;
  imageUploadSource: string | null;
}): string | null => {
  const normalizedSyncImageMode = (syncImageMode ?? '').trim().toLowerCase();
  if (normalizedSyncImageMode === 'fields_only') {
    return 'preserved';
  }
  if ((imageUploadSource ?? '').trim().toLowerCase() === 'preserved-relist') {
    return 'preserved';
  }
  return resolveTraderaSyncOutcomeFromStep(step, 'updated');
};

export const resolveTraderaStatusBadge = (
  status: string | null | undefined,
  duplicateLinked: boolean | null | undefined,
  options?: {
    checkedStatus?: string | null | undefined;
    lastAction?: string | null | undefined;
  }
): {
  status: string;
  label?: string;
} => {
  if (duplicateLinked) {
    return {
      status: 'active',
      label: 'linked',
    };
  }

  const checkedStatus = readString(options?.checkedStatus);
  if (readString(options?.lastAction) === 'check_status' && checkedStatus) {
    return {
      status: checkedStatus,
    };
  }

  return {
    status: formatListValue(status),
  };
};

export const resolveTraderaExecutionSummary = (
  marketplaceData: Record<string, unknown> | null | undefined
): {
  executedAt: string | null;
  mode: string | null;
  browserMode: string | null;
  requestedBrowserMode: string | null;
  requestedSelectorProfile: string | null;
  resolvedSelectorProfile: string | null;
  scriptSource: string | null;
  scriptKind: string | null;
  scriptMarker: string | null;
  listingFormUrl: string | null;
  pendingAction: string | null;
  pendingBrowserMode: string | null;
  pendingSelectorProfile: string | null;
  pendingRequestId: string | null;
  pendingQueuedAt: string | null;
  runId: string | null;
  errorCategory: string | null;
  requestId: string | null;
  publishVerified: boolean | null;
  listingUrl: string | null;
  latestStage: string | null;
  latestStageUrl: string | null;
  failureArtifacts: unknown;
  logTail: unknown;
  playwrightPersonaId: string | null;
  playwrightSlowMo: number | null;
  playwrightTimeout: number | null;
  playwrightNavigationTimeout: number | null;
  playwrightHumanizeMouse: boolean | null;
  playwrightClickDelayMin: number | null;
  playwrightClickDelayMax: number | null;
  playwrightInputDelayMin: number | null;
  playwrightInputDelayMax: number | null;
  playwrightActionDelayMin: number | null;
  playwrightActionDelayMax: number | null;
  categoryId: string | null;
  categoryPath: string | null;
  categorySource: string | null;
  categoryFallbackUsed: boolean | null;
  categoryMappingReason: string | null;
  categoryMatchScope: string | null;
  categoryInternalCategoryId: string | null;
  categoryMappingRecoveredFromAnotherConnection: boolean | null;
  categoryMappingSourceConnectionId: string | null;
  duplicateLinked: boolean | null;
  duplicateMatchStrategy: string | null;
  duplicateMatchedProductId: string | null;
  duplicateCandidateCount: number | null;
  duplicateSearchTitle: string | null;
  duplicateIgnoredNonExactCandidateCount: number | null;
  duplicateIgnoredCandidateTitles: string[];
  checkedStatus: string | null;
  verificationSection: string | null;
  verificationMatchStrategy: string | null;
  verificationRawStatusTag: string | null;
  verificationMatchedProductId: string | null;
  verificationSearchTitle: string | null;
  verificationCandidateCount: number | null;
  syncTargetMatchStrategy: string | null;
  syncTargetListingId: string | null;
  syncTargetListingUrl: string | null;
  syncImageMode: string | null;
  syncFieldsOnly: boolean | null;
  syncTitleOutcome: string | null;
  syncDescriptionOutcome: string | null;
  syncPricingOutcome: string | null;
  syncCategoryOutcome: string | null;
  syncAttributesOutcome: string | null;
  syncShippingOutcome: string | null;
  syncImagesOutcome: string | null;
  shippingCondition: string | null;
  shippingPriceEur: number | null;
  imageInputSource: string | null;
  imageUploadSource: string | null;
  imageUploadFallbackUsed: boolean | null;
  failureCode: string | null;
  staleDraftImages: boolean | null;
  duplicateRisk: boolean | null;
  imageRetryCleanupUnsettled: boolean | null;
  plannedImageCount: number | null;
  expectedImageUploadCount: number | null;
  observedImagePreviewCount: number | null;
  observedImagePreviewDelta: number | null;
  observedImagePreviewDescriptors: unknown;
  imagePreviewMismatch: boolean | null;
  localImagePathCount: number | null;
  imageUrlCount: number | null;
  imageSettleState: unknown;
  rawResult: unknown;
  lastSyncedAt: string | null;
  lastAction: string | null;
  executionSteps: TraderaExecutionStep[];
} => {
  const marketplaceRecord = toRecord(marketplaceData);
  const traderaData = toRecord(marketplaceRecord['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const pendingExecution = toRecord(traderaData['pendingExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawResult = toRecord(metadata['rawResult']);
  const playwrightSettings = toRecord(metadata['playwrightSettings']);
  const traderaExecutionTrace = resolveTraderaExecutionStepsFromMarketplaceData(marketplaceData);
  const executionSteps = traderaExecutionTrace.steps;
  const logTailEntries = readStringArray(metadata['logTail']);
  const latestStage =
    readString(metadata['latestStage']) ?? readString(rawResult['stage']);
  const duplicateMatchStrategy =
    readString(metadata['duplicateMatchStrategy']) ??
    readString(rawResult['duplicateMatchStrategy']);
  const syncImageMode =
    readString(metadata['syncImageMode']) ??
    readString(rawResult['syncImageMode']);
  const imageUploadSource =
    readString(metadata['imageUploadSource']) ??
    readString(rawResult['imageUploadSource']);
  const syncTitleOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncFieldOutcome({
          logs: logTailEntries,
          step: findTraderaExecutionStep(executionSteps, 'title_fill'),
          fieldKeys: ['title'],
        })
      : null;
  const syncDescriptionOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncFieldOutcome({
          logs: logTailEntries,
          step: findTraderaExecutionStep(executionSteps, 'description_fill'),
          fieldKeys: ['description'],
        })
      : null;
  const syncPricingOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncFieldOutcome({
          logs: logTailEntries,
          step:
            findTraderaExecutionStep(executionSteps, 'price_set') ??
            findTraderaExecutionStep(executionSteps, 'listing_format_select'),
          fieldKeys: ['price', 'quantity', 'listing-format'],
        })
      : null;
  const syncCategoryOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncCategoryOutcome({
          step: findTraderaExecutionStep(executionSteps, 'category_select'),
          categorySource:
            readString(metadata['categorySource']) ??
            readString(rawResult['categorySource']),
        })
      : null;
  const syncAttributesOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncFieldOutcome({
          logs: logTailEntries,
          step: findTraderaExecutionStep(executionSteps, 'attribute_select'),
          fieldKeys: [
            'ean',
            'brand',
            'weight',
            'width',
            'length',
            'height',
            'condition',
            'department',
          ],
        })
      : null;
  const syncShippingOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncFieldOutcome({
          logs: logTailEntries,
          step: findTraderaExecutionStep(executionSteps, 'shipping_set'),
          fieldKeys: ['delivery'],
          fieldPrefixes: ['delivery'],
        })
      : null;
  const syncImagesOutcome =
    traderaExecutionTrace.action === 'sync'
      ? resolveTraderaSyncImagesOutcome({
          step: findTraderaExecutionStep(executionSteps, 'image_upload'),
          syncImageMode,
          imageUploadSource,
        })
      : null;

  return {
    executedAt: readString(lastExecution['executedAt']),
    mode: readString(metadata['scriptMode']) ?? readString(metadata['mode']),
    browserMode: readString(metadata['browserMode']),
    requestedBrowserMode: readString(metadata['requestedBrowserMode']),
    requestedSelectorProfile: readString(metadata['requestedSelectorProfile']),
    resolvedSelectorProfile: readString(metadata['selectorProfileResolved']),
    scriptSource: readString(metadata['scriptSource']),
    scriptKind: readString(metadata['scriptKind']),
    scriptMarker: readString(metadata['scriptMarker']),
    listingFormUrl: readString(metadata['listingFormUrl']) ?? readString(metadata['startUrl']),
    pendingAction: readString(pendingExecution['action']),
    pendingBrowserMode: readString(pendingExecution['requestedBrowserMode']),
    pendingSelectorProfile: readString(pendingExecution['requestedSelectorProfile']),
    pendingRequestId: readString(pendingExecution['requestId']),
    pendingQueuedAt: readString(pendingExecution['queuedAt']),
    runId: readString(metadata['runId']) ?? readString(pendingExecution['runId']),
    errorCategory: readString(lastExecution['errorCategory']) ?? readString(traderaData['lastErrorCategory']),
    requestId: readString(lastExecution['requestId']),
    publishVerified: readBoolean(metadata['publishVerified']),
    listingUrl: readString(marketplaceRecord['listingUrl']),
    latestStage,
    latestStageUrl:
      readString(metadata['latestStageUrl']) ??
      readString(rawResult['currentUrl']),
    failureArtifacts: metadata['failureArtifacts'] ?? null,
    logTail: metadata['logTail'] ?? null,
    playwrightPersonaId: readString(metadata['playwrightPersonaId']),
    playwrightSlowMo: readNumber(playwrightSettings['slowMo']),
    playwrightTimeout: readNumber(playwrightSettings['timeout']),
    playwrightNavigationTimeout: readNumber(playwrightSettings['navigationTimeout']),
    playwrightHumanizeMouse: readBoolean(playwrightSettings['humanizeMouse']),
    playwrightClickDelayMin: readNumber(playwrightSettings['clickDelayMin']),
    playwrightClickDelayMax: readNumber(playwrightSettings['clickDelayMax']),
    playwrightInputDelayMin: readNumber(playwrightSettings['inputDelayMin']),
    playwrightInputDelayMax: readNumber(playwrightSettings['inputDelayMax']),
    playwrightActionDelayMin: readNumber(playwrightSettings['actionDelayMin']),
    playwrightActionDelayMax: readNumber(playwrightSettings['actionDelayMax']),
    categoryId: readString(metadata['categoryId']),
    categoryPath: readString(metadata['categoryPath']),
    categorySource: readString(metadata['categorySource']),
    categoryFallbackUsed: readBoolean(metadata['categoryFallbackUsed']),
    categoryMappingReason: readString(metadata['categoryMappingReason']),
    categoryMatchScope: readString(metadata['categoryMatchScope']),
    categoryInternalCategoryId: readString(metadata['categoryInternalCategoryId']),
    categoryMappingRecoveredFromAnotherConnection: readBoolean(
      metadata['categoryMappingRecoveredFromAnotherConnection']
    ),
    categoryMappingSourceConnectionId: readString(metadata['categoryMappingSourceConnectionId']),
    duplicateLinked:
      readBoolean(metadata['duplicateLinked']) ??
      readBoolean(rawResult['duplicateLinked']) ??
      (latestStage === 'duplicate_linked' ? true : null) ??
      (duplicateMatchStrategy ? true : null),
    duplicateMatchStrategy,
    duplicateMatchedProductId:
      readString(metadata['duplicateMatchedProductId']) ??
      readString(rawResult['duplicateMatchedProductId']),
    duplicateCandidateCount:
      readNumber(metadata['duplicateCandidateCount']) ??
      readNumber(rawResult['duplicateCandidateCount']),
    duplicateSearchTitle:
      readString(metadata['duplicateSearchTitle']) ??
      readString(rawResult['duplicateSearchTitle']),
    duplicateIgnoredNonExactCandidateCount:
      readNumber(metadata['duplicateIgnoredNonExactCandidateCount']) ??
      readNumber(rawResult['duplicateIgnoredNonExactCandidateCount']),
    duplicateIgnoredCandidateTitles: Array.isArray(
      metadata['duplicateIgnoredCandidateTitles']
    )
      ? metadata['duplicateIgnoredCandidateTitles']
          .filter((value): value is string => typeof value === 'string')
          .slice(0, 5)
      : Array.isArray(rawResult['duplicateIgnoredCandidateTitles'])
        ? rawResult['duplicateIgnoredCandidateTitles']
            .filter((value): value is string => typeof value === 'string')
            .slice(0, 5)
        : [],
    checkedStatus:
      readString(metadata['checkedStatus']) ?? readString(rawResult['status']),
    verificationSection:
      readString(metadata['verificationSection']) ??
      readString(rawResult['verificationSection']),
    verificationMatchStrategy:
      readString(metadata['verificationMatchStrategy']) ??
      readString(rawResult['verificationMatchStrategy']),
    verificationRawStatusTag:
      readString(metadata['verificationRawStatusTag']) ??
      readString(rawResult['verificationRawStatusTag']),
    verificationMatchedProductId:
      readString(metadata['verificationMatchedProductId']) ??
      readString(rawResult['verificationMatchedProductId']),
    verificationSearchTitle:
      readString(metadata['verificationSearchTitle']) ??
      readString(rawResult['verificationSearchTitle']),
    verificationCandidateCount:
      readNumber(metadata['verificationCandidateCount']) ??
      readNumber(rawResult['verificationCandidateCount']),
    syncTargetMatchStrategy:
      readString(metadata['syncTargetMatchStrategy']) ??
      readString(rawResult['syncTargetMatchStrategy']),
    syncTargetListingId:
      readString(metadata['syncTargetListingId']) ??
      readString(rawResult['syncTargetListingId']),
    syncTargetListingUrl:
      readString(metadata['syncTargetListingUrl']) ??
      readString(rawResult['syncTargetListingUrl']),
    syncImageMode,
    syncFieldsOnly:
      readBoolean(metadata['syncFieldsOnly']) ??
      (syncImageMode === 'fields_only'
        ? true
        : null),
    syncTitleOutcome,
    syncDescriptionOutcome,
    syncPricingOutcome,
    syncCategoryOutcome,
    syncAttributesOutcome,
    syncShippingOutcome,
    syncImagesOutcome,
    shippingCondition: readString(metadata['shippingCondition']),
    shippingPriceEur: readNumber(metadata['shippingPriceEur']),
    imageInputSource: readString(metadata['imageInputSource']),
    imageUploadSource,
    imageUploadFallbackUsed: readBoolean(metadata['imageUploadFallbackUsed']),
    failureCode: readString(metadata['failureCode']),
    staleDraftImages: readBoolean(metadata['staleDraftImages']),
    duplicateRisk: readBoolean(metadata['duplicateRisk']),
    imageRetryCleanupUnsettled: readBoolean(metadata['imageRetryCleanupUnsettled']),
    plannedImageCount:
      readNumber(metadata['plannedImageCount']) ??
      readNumber(metadata['uploadedImageCount']) ??
      readNumber(rawResult['imageCount']),
    expectedImageUploadCount: readNumber(metadata['expectedImageUploadCount']),
    observedImagePreviewCount:
      readNumber(metadata['observedImagePreviewCount']) ??
      readNumber(rawResult['observedPreviewCount']),
    observedImagePreviewDelta:
      readNumber(metadata['observedImagePreviewDelta']) ??
      readNumber(rawResult['observedPreviewDelta']),
    observedImagePreviewDescriptors: metadata['observedImagePreviewDescriptors'] ?? null,
    imagePreviewMismatch: readBoolean(metadata['imagePreviewMismatch']),
    localImagePathCount: readNumber(metadata['localImagePathCount']),
    imageUrlCount: readNumber(metadata['imageUrlCount']),
    imageSettleState: metadata['imageSettleState'] ?? null,
    rawResult: metadata['rawResult'] ?? null,
    lastSyncedAt: readString(traderaData['lastSyncedAt']),
    lastAction: traderaExecutionTrace.action,
    executionSteps,
  };
};

export const resolveDisplayedTraderaDuplicateSummary = ({
  persisted,
  liveRawResult,
  liveLatestStage,
}: {
  persisted: Pick<
    ReturnType<typeof resolveTraderaExecutionSummary>,
    | 'duplicateLinked'
    | 'duplicateMatchStrategy'
    | 'duplicateMatchedProductId'
    | 'duplicateCandidateCount'
    | 'duplicateSearchTitle'
    | 'duplicateIgnoredNonExactCandidateCount'
    | 'duplicateIgnoredCandidateTitles'
  >;
  liveRawResult: unknown;
  liveLatestStage: string | null | undefined;
}): {
  duplicateLinked: boolean | null;
  duplicateMatchStrategy: string | null;
  duplicateMatchedProductId: string | null;
  duplicateCandidateCount: number | null;
  duplicateSearchTitle: string | null;
  duplicateIgnoredNonExactCandidateCount: number | null;
  duplicateIgnoredCandidateTitles: string[];
} => {
  const liveResult = toRecord(liveRawResult);
  const liveMatchStrategy = resolveDuplicateMatchStrategyFromRunResult(liveResult);

  return {
    duplicateLinked: resolveDuplicateLinkedFromRunResult(liveResult, liveLatestStage)
      ? true
      : persisted.duplicateLinked,
    duplicateMatchStrategy: liveMatchStrategy ?? persisted.duplicateMatchStrategy,
    duplicateMatchedProductId:
      readString(liveResult['duplicateMatchedProductId']) ?? persisted.duplicateMatchedProductId,
    duplicateCandidateCount:
      readNumber(liveResult['duplicateCandidateCount']) ?? persisted.duplicateCandidateCount,
    duplicateSearchTitle:
      readString(liveResult['duplicateSearchTitle']) ?? persisted.duplicateSearchTitle,
    duplicateIgnoredNonExactCandidateCount:
      readNumber(liveResult['duplicateIgnoredNonExactCandidateCount']) ??
      persisted.duplicateIgnoredNonExactCandidateCount,
    duplicateIgnoredCandidateTitles: Array.isArray(liveResult['duplicateIgnoredCandidateTitles'])
      ? liveResult['duplicateIgnoredCandidateTitles'].filter(
          (value): value is string => typeof value === 'string'
        )
      : persisted.duplicateIgnoredCandidateTitles,
  };
};

export const resolvePlaywrightExecutionSummary = (
  marketplaceData: Record<string, unknown> | null | undefined
): {
  executedAt: string | null;
  browserMode: string | null;
  requestedBrowserMode: string | null;
  pendingBrowserMode: string | null;
  pendingRequestId: string | null;
  pendingQueuedAt: string | null;
  runId: string | null;
  errorCategory: string | null;
  requestId: string | null;
  publishVerified: boolean | null;
  listingUrl: string | null;
  rawResult: unknown;
} => {
  const marketplaceRecord = toRecord(marketplaceData);
  const playwrightData = toRecord(marketplaceRecord['playwright']);
  const lastExecution = toRecord(playwrightData['lastExecution']);
  const pendingExecution = toRecord(playwrightData['pendingExecution']);
  const metadata = toRecord(lastExecution['metadata']);

  return {
    executedAt: readString(lastExecution['executedAt']),
    browserMode: readString(metadata['browserMode']),
    requestedBrowserMode: readString(metadata['requestedBrowserMode']),
    pendingBrowserMode: readString(pendingExecution['requestedBrowserMode']),
    pendingRequestId: readString(pendingExecution['requestId']),
    pendingQueuedAt: readString(pendingExecution['queuedAt']),
    runId: readString(metadata['runId']),
    errorCategory: readString(lastExecution['errorCategory']) ?? readString(playwrightData['lastErrorCategory']),
    requestId: readString(lastExecution['requestId']),
    publishVerified: readBoolean(metadata['publishVerified']),
    listingUrl: readString(marketplaceRecord['listingUrl']),
    rawResult: metadata['rawResult'] ?? null,
  };
};

const VINTED_EXECUTION_STEP_STATUSES = new Set<string>([
  'pending', 'running', 'success', 'error', 'skipped',
]);

const readVintedExecutionSteps = (value: unknown): TraderaExecutionStep[] => {
  if (!Array.isArray(value)) return [];
  const steps: TraderaExecutionStep[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const id = readString(record['id']);
    const label = readString(record['label']);
    const status = readString(record['status']);
    if (!id || !label || !status || !VINTED_EXECUTION_STEP_STATUSES.has(status)) continue;
    steps.push({
      id,
      label,
      status: status as TraderaExecutionStep['status'],
      message: readString(record['message']) ?? null,
    });
  }
  return steps;
};

export const resolveVintedExecutionSummary = (
  marketplaceData: Record<string, unknown> | null | undefined
): {
  executedAt: string | null;
  browserMode: string | null;
  requestedBrowserMode: string | null;
  browserPreference: string | null;
  requestedBrowserPreference: string | null;
  browserLabel: string | null;
  pendingBrowserMode: string | null;
  pendingBrowserPreference: string | null;
  pendingRequestId: string | null;
  pendingQueuedAt: string | null;
  errorCategory: string | null;
  requestId: string | null;
  publishVerified: boolean | null;
  listingUrl: string | null;
  executionSteps: TraderaExecutionStep[];
  rawResult: unknown;
} => {
  const marketplaceRecord = toRecord(marketplaceData);
  const vintedData = toRecord(marketplaceRecord['vinted']);
  const lastExecution = toRecord(vintedData['lastExecution']);
  const pendingExecution = toRecord(vintedData['pendingExecution']);
  const metadata = toRecord(lastExecution['metadata']);

  return {
    executedAt: readString(lastExecution['executedAt']),
    browserMode: readString(metadata['browserMode']),
    requestedBrowserMode: readString(metadata['requestedBrowserMode']),
    browserPreference: readString(metadata['browserPreference']),
    requestedBrowserPreference: readString(metadata['requestedBrowserPreference']),
    browserLabel: readString(metadata['browserLabel']),
    pendingBrowserMode: readString(pendingExecution['requestedBrowserMode']),
    pendingBrowserPreference: readString(pendingExecution['requestedBrowserPreference']),
    pendingRequestId: readString(pendingExecution['requestId']),
    pendingQueuedAt: readString(pendingExecution['queuedAt']),
    errorCategory: readString(lastExecution['errorCategory']) ?? readString(vintedData['lastErrorCategory']),
    requestId: readString(lastExecution['requestId']),
    publishVerified: readBoolean(metadata['publishVerified']),
    listingUrl: readString(marketplaceRecord['listingUrl']),
    executionSteps: readVintedExecutionSteps(metadata['executionSteps']),
    rawResult: metadata['rawResult'] ?? null,
  };
};
