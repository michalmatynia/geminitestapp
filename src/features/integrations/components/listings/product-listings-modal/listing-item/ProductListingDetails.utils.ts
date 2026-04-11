import {
  resolveTraderaExecutionStepsFromMarketplaceData,
} from '@/features/integrations/utils/tradera-execution-steps';
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

export const resolveDisplayHistoryFields = (
  fields: string[] | null | undefined
): string[] => (Array.isArray(fields) ? fields.filter((field) => !field.startsWith('browser_mode:')) : []);

export const resolveTraderaExecutionSummary = (
  marketplaceData: Record<string, unknown> | null | undefined
): {
  executedAt: string | null;
  mode: string | null;
  browserMode: string | null;
  requestedBrowserMode: string | null;
  scriptSource: string | null;
  scriptKind: string | null;
  scriptMarker: string | null;
  listingFormUrl: string | null;
  pendingBrowserMode: string | null;
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
  categoryMappingReason: string | null;
  categoryMatchScope: string | null;
  categoryInternalCategoryId: string | null;
  duplicateLinked: boolean | null;
  duplicateMatchStrategy: string | null;
  duplicateMatchedProductId: string | null;
  duplicateCandidateCount: number | null;
  duplicateSearchTitle: string | null;
  shippingCondition: string | null;
  shippingPriceEur: number | null;
  imageInputSource: string | null;
  imageUploadSource: string | null;
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
  const playwrightSettings = toRecord(metadata['playwrightSettings']);
  const traderaExecutionTrace = resolveTraderaExecutionStepsFromMarketplaceData(marketplaceData);

  return {
    executedAt: readString(lastExecution['executedAt']),
    mode: readString(metadata['scriptMode']) ?? readString(metadata['mode']),
    browserMode: readString(metadata['browserMode']),
    requestedBrowserMode: readString(metadata['requestedBrowserMode']),
    scriptSource: readString(metadata['scriptSource']),
    scriptKind: readString(metadata['scriptKind']),
    scriptMarker: readString(metadata['scriptMarker']),
    listingFormUrl: readString(metadata['listingFormUrl']) ?? readString(metadata['startUrl']),
    pendingBrowserMode: readString(pendingExecution['requestedBrowserMode']),
    pendingRequestId: readString(pendingExecution['requestId']),
    pendingQueuedAt: readString(pendingExecution['queuedAt']),
    runId: readString(metadata['runId']),
    errorCategory: readString(lastExecution['errorCategory']) ?? readString(traderaData['lastErrorCategory']),
    requestId: readString(lastExecution['requestId']),
    publishVerified: readBoolean(metadata['publishVerified']),
    listingUrl: readString(marketplaceRecord['listingUrl']),
    latestStage: readString(metadata['latestStage']) ?? readString(toRecord(metadata['rawResult'])['stage']),
    latestStageUrl:
      readString(metadata['latestStageUrl']) ??
      readString(toRecord(metadata['rawResult'])['currentUrl']),
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
    categoryMappingReason: readString(metadata['categoryMappingReason']),
    categoryMatchScope: readString(metadata['categoryMatchScope']),
    categoryInternalCategoryId: readString(metadata['categoryInternalCategoryId']),
    duplicateLinked: readBoolean(metadata['duplicateLinked']),
    duplicateMatchStrategy: readString(metadata['duplicateMatchStrategy']),
    duplicateMatchedProductId: readString(metadata['duplicateMatchedProductId']),
    duplicateCandidateCount: readNumber(metadata['duplicateCandidateCount']),
    duplicateSearchTitle: readString(metadata['duplicateSearchTitle']),
    shippingCondition: readString(metadata['shippingCondition']),
    shippingPriceEur: readNumber(metadata['shippingPriceEur']),
    imageInputSource: readString(metadata['imageInputSource']),
    imageUploadSource:
      readString(metadata['imageUploadSource']) ??
      readString(toRecord(metadata['rawResult'])['imageUploadSource']),
    localImagePathCount: readNumber(metadata['localImagePathCount']),
    imageUrlCount: readNumber(metadata['imageUrlCount']),
    imageSettleState: metadata['imageSettleState'] ?? null,
    rawResult: metadata['rawResult'] ?? null,
    lastSyncedAt: readString(traderaData['lastSyncedAt']),
    lastAction: traderaExecutionTrace.action,
    executionSteps: traderaExecutionTrace.steps,
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
    rawResult: metadata['rawResult'] ?? null,
  };
};
