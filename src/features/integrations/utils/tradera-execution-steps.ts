import type { TraderaExecutionStep } from '@/shared/contracts/integrations/listings';
import {
  buildActionSteps,
  type ActionSequenceKey,
  TRADERA_QUICKLIST_LABEL_OVERRIDES,
  TRADERA_QUICKLIST_PUBLISH_LABELS,
} from '@/shared/lib/browser-execution';

type TraderaListingAction = 'list' | 'relist' | 'sync';

import { buildTraderaQuicklistExecutionSteps } from '../services/tradera-steps/quicklist';
import { resolveTraderaCheckStatusExecutionStepsFromResult, getTraderaExecutionLogPayload } from '../services/tradera-steps/helpers';
export {
  buildTraderaQuicklistExecutionSteps,
  getTraderaExecutionLogPayload,
  resolveTraderaCheckStatusExecutionStepsFromResult,
};
const EXECUTION_STEP_STATUS_VALUES = new Set([
  'pending',
  'running',
  'success',
  'error',
  'skipped',
]);

const isTraderaExecutionStepStatus = (
  value: string
): value is TraderaExecutionStep['status'] =>
  EXECUTION_STEP_STATUS_VALUES.has(value as TraderaExecutionStep['status']);

export const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

export const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const normalizeQuicklistAction = (
  value: string | null
): TraderaListingAction | null =>
  value === 'list' || value === 'relist' || value === 'sync' ? value : null;

const normalizeExecutionStepStatus = (value: string | null): TraderaExecutionStep['status'] | null => {
  if (value === 'completed') return 'success';
  if (value === 'failed') return 'error';
  return value && isTraderaExecutionStepStatus(value) ? value : null;
};

const readExecutionStepMessage = (record: Record<string, unknown>): string | null => {
  const directMessage = readString(record['message']);
  if (directMessage) {
    return directMessage;
  }

  const info = toRecord(record['info']);
  return readString(info['message']) ?? readString(info['reason']) ?? readString(info['error']);
};

const countResolvedExecutionSteps = (
  steps: readonly TraderaExecutionStep[]
): number => steps.reduce((count, step) => count + (step.status === 'pending' ? 0 : 1), 0);

export const pickMostInformativeTraderaExecutionSteps = (
  candidates: readonly TraderaExecutionStep[][]
): TraderaExecutionStep[] => {
  let bestSteps: TraderaExecutionStep[] = [];
  let bestResolvedCount = 0;

  for (const candidate of candidates) {
    if (candidate.length === 0) continue;
    const resolvedCount = countResolvedExecutionSteps(candidate);
    if (bestSteps.length === 0 || resolvedCount > bestResolvedCount) {
      bestSteps = candidate;
      bestResolvedCount = resolvedCount;
    }
  }

  return bestSteps;
};


const parseUserLogEvent = (
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
    const parsed = JSON.parse(payloadText) as unknown;
    return { event, payload: toRecord(parsed) };
  } catch {
    return { event, payload: null };
  }
};

export const hasEvent = (logs: readonly string[] | null | undefined, event: string): boolean =>
  (logs ?? []).some((entry) => parseUserLogEvent(entry).event === event);

export const hasAnyEventPrefix = (
  logs: readonly string[] | null | undefined,
  prefix: string
): boolean => (logs ?? []).some((entry) => {
  const parsed = parseUserLogEvent(entry);
  return typeof parsed.event === 'string' && parsed.event.startsWith(prefix);
});

export const hasRuntimeBrowserCleanupLog = (
  logs: readonly string[] | null | undefined
): boolean =>
  (logs ?? []).some(
    (entry) =>
      entry.includes('[runtime] Browser context closed.') ||
      entry.includes('[runtime] Browser disconnected.')
  );

export const getEventPayload = (
  logs: readonly string[] | null | undefined,
  event: string
): Record<string, unknown> | null => {
  for (const entry of logs ?? []) {
    const parsed = parseUserLogEvent(entry);
    if (parsed.event === event) {
      return parsed.payload;
    }
  }
  return null;
};

export const getLastEventPayload = (
  logs: readonly string[] | null | undefined,
  event: string
): Record<string, unknown> | null => {
  let match: Record<string, unknown> | null = null;
  for (const entry of logs ?? []) {
    const parsed = parseUserLogEvent(entry);
    if (parsed.event === event) {
      match = parsed.payload;
    }
  }
  return match;
};

export const markStep = (
  steps: TraderaExecutionStep[],
  stepId: string,
  patch: Partial<Pick<TraderaExecutionStep, 'status' | 'message'>>
): void => {
  const target = steps.find((step) => step.id === stepId);
  if (!target) return;
  if (patch.status) {
    target.status = patch.status;
  }
  if (patch.message !== undefined) {
    target.message = patch.message ?? null;
  }
};

export const markPendingStepsAfter = (
  steps: TraderaExecutionStep[],
  stepId: string,
  message: string
): void => {
  const index = steps.findIndex((step) => step.id === stepId);
  if (index === -1) return;
  for (const step of steps.slice(index + 1)) {
    if (step.status === 'pending') {
      step.status = 'skipped';
      step.message = message;
    }
  }
};

export const getStepStatus = (
  steps: TraderaExecutionStep[],
  stepId: string
): TraderaExecutionStep['status'] | null =>
  steps.find((step) => step.id === stepId)?.status ?? null;

const QUICKLIST_SEQUENCE_KEYS: Record<TraderaListingAction, ActionSequenceKey> = {
  list:   'tradera_quicklist_list',
  relist: 'tradera_quicklist_relist',
  sync:   'tradera_quicklist_sync',
};

export const quicklistStepTemplates = (action: TraderaListingAction): TraderaExecutionStep[] => {
  const steps = buildActionSteps(QUICKLIST_SEQUENCE_KEYS[action]);
  const publishLabels = TRADERA_QUICKLIST_PUBLISH_LABELS[action];

  for (const step of steps) {
    const override = TRADERA_QUICKLIST_LABEL_OVERRIDES[step.id];
    if (override !== undefined) step.label = override;
    if (step.id === 'publish') step.label = publishLabels.publish;
    if (step.id === 'publish_verify') step.label = publishLabels.publish_verify;
  }

  return steps;
};

export const QUICKLIST_SUCCESS_MESSAGES: Record<string, string> = {
  browser_preparation: 'Browser settings were prepared.',
  browser_open: 'Browser was opened successfully.',
  cookie_accept: 'Cookie consent was handled.',
  auth_check: 'Stored Tradera session was accepted.',
  auth_login: 'Automated login succeeded.',
  auth_manual: 'Manual login restored the Tradera session.',
  sync_check: 'Sync target listing was loaded.',
  duplicate_check: 'Duplicate search completed.',
  deep_duplicate_check: 'Deep duplicate inspection completed.',
  sell_page_open: 'The Tradera listing editor became ready.',
  image_cleanup: 'Draft images were cleared for fresh upload.',
  image_upload: 'Listing images were uploaded successfully.',
  title_fill: 'Title was entered.',
  description_fill: 'Description was entered.',
  listing_format_select: 'Listing format was selected.',
  price_set: 'Price was set.',
  category_select: 'Category was selected.',
  attribute_select: 'Listing attributes were applied.',
  shipping_set: 'Delivery settings were applied successfully.',
  publish: 'The publish action was submitted successfully.',
  publish_verify: 'The listing was published and verified successfully.',
  browser_close: 'Browser was closed.',
};

export const resolveQuicklistCompletedStepIds = (
  action: TraderaListingAction,
  stage: string | null
): string[] => {
  const orderedStepIds = quicklistStepTemplates(action).map((step) => step.id);

  // Common prefix steps completed once the browser opens
  const bootstrapped = ['browser_preparation', 'browser_open'];
  // Auth steps completed once the active/sync page was loaded
  const authed = [...bootstrapped, 'cookie_accept', 'auth_check'];

  const byStage: Record<string, string[]> =
    action === 'sync'
      ? {
          started: bootstrapped,
          active_loaded: authed,
          sync_target_loaded: [...authed, 'sync_check'],
          images_uploaded: [...authed, 'sync_check', 'image_upload'],
          images_preserved: [...authed, 'sync_check', 'image_upload'],
          fields_filled: [...authed, 'sync_check', 'image_upload', 'title_fill', 'description_fill'],
          listing_format_selected: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
          ],
          category_selected: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
          ],
          listing_attributes_selected: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
          ],
          delivery_configured: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
          ],
          publish_clicked: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
            'publish',
          ],
          publish_verified: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
            'publish',
            'publish_verify',
            'browser_close',
          ],
          sync_verified: [
            ...authed,
            'sync_check',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
            'publish',
            'publish_verify',
            'browser_close',
          ],
        }
      : {
          started: bootstrapped,
          active_loaded: authed,
          duplicate_checked: [...authed, 'duplicate_check'],
          duplicate_linked: [...authed, 'duplicate_check'],
          sell_page_ready: [...authed, 'duplicate_check', 'deep_duplicate_check', 'sell_page_open'],
          draft_cleared: [...authed, 'duplicate_check', 'deep_duplicate_check', 'sell_page_open', 'image_cleanup'],
          images_uploaded: [...authed, 'duplicate_check', 'deep_duplicate_check', 'sell_page_open', 'image_cleanup', 'image_upload'],
          images_preserved: [...authed, 'duplicate_check', 'deep_duplicate_check', 'sell_page_open', 'image_cleanup', 'image_upload'],
          fields_filled: [...authed, 'duplicate_check', 'deep_duplicate_check', 'sell_page_open', 'image_cleanup', 'image_upload', 'title_fill', 'description_fill'],
          listing_format_selected: [
            ...authed,
            'duplicate_check',
            'deep_duplicate_check',
            'sell_page_open',
            'image_cleanup',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
          ],
          category_selected: [
            ...authed,
            'duplicate_check',
            'deep_duplicate_check',
            'sell_page_open',
            'image_cleanup',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
          ],
          listing_attributes_selected: [
            ...authed,
            'duplicate_check',
            'deep_duplicate_check',
            'sell_page_open',
            'image_cleanup',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
          ],
          delivery_configured: [
            ...authed,
            'duplicate_check',
            'deep_duplicate_check',
            'sell_page_open',
            'image_cleanup',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
          ],
          publish_clicked: [
            ...authed,
            'duplicate_check',
            'deep_duplicate_check',
            'sell_page_open',
            'image_cleanup',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
            'publish',
          ],
          publish_verified: [
            ...authed,
            'duplicate_check',
            'deep_duplicate_check',
            'sell_page_open',
            'image_cleanup',
            'image_upload',
            'title_fill',
            'description_fill',
            'listing_format_select',
            'price_set',
            'category_select',
            'attribute_select',
            'shipping_set',
            'publish',
            'publish_verify',
            'browser_close',
          ],
        };

  const completed = stage ? byStage[stage] ?? [] : [];
  return completed.filter((stepId) => orderedStepIds.includes(stepId));
};

export const resolveQuicklistFailureStepId = ({
  action,
  errorMessage,
  stage,
  logs,
}: {
  action: TraderaListingAction;
  errorMessage: string | null;
  stage: string | null;
  logs: readonly string[] | null | undefined;
}): string => {
  const normalizedError = (errorMessage ?? '').toUpperCase();
  const normalizedErrorText = (errorMessage ?? '').trim().toLowerCase();
  const authInitialState = getLastEventPayload(logs, 'tradera.quicklist.auth.initial');
  const manualLoginWasNeeded = readBoolean(authInitialState?.['loggedIn']) === false;

  if (normalizedError.includes('AUTH_REQUIRED') || normalizedError.includes('AUTH')) {
    return manualLoginWasNeeded ? 'auth_manual' : 'auth_check';
  }

  if (
    normalizedError.includes('FAIL_SELL_PAGE_INVALID') ||
    hasEvent(logs, 'tradera.quicklist.navigation.unexpected') ||
    hasEvent(logs, 'tradera.quicklist.click_blocked') ||
    hasEvent(logs, 'tradera.quicklist.sell_page.recover_failed')
  ) {
    return action === 'sync' ? 'sync_check' : 'sell_page_open';
  }

  if (normalizedError.includes('FAIL_IMAGE_SET_INVALID') && stage === 'sell_page_ready') {
    return 'image_cleanup';
  }

  if (
    normalizedError.includes('FAIL_IMAGE') ||
    hasEvent(logs, 'tradera.quicklist.image.upload_error') ||
    hasEvent(logs, 'tradera.quicklist.image.settle_timeout') ||
    hasEvent(logs, 'tradera.quicklist.sell_page.image_step_invalid')
  ) {
    return 'image_upload';
  }

  if (normalizedError.includes('FAIL_DUPLICATE')) {
    return hasEvent(logs, 'tradera.quicklist.duplicate.inspect')
      ? 'deep_duplicate_check'
      : 'duplicate_check';
  }

  if (
    normalizedError.includes('FAIL_CATEGORY') ||
    normalizedErrorText.includes('category mapping') ||
    normalizedErrorText.includes('map the category') ||
    normalizedErrorText.includes('mapped category') ||
    normalizedErrorText.includes('tradera category')
  ) {
    return 'category_select';
  }

  if (normalizedError.includes('FAIL_EXTRA_FIELD')) {
    return 'attribute_select';
  }

  if (
    normalizedError.includes('FAIL_PRICE_SET') ||
    normalizedError.includes('FAIL_QUANTITY_SET')
  ) {
    return 'price_set';
  }

  if (
    normalizedError.includes('FAIL_EAN_SET') ||
    normalizedError.includes('FAIL_BRAND_SET')
  ) {
    return 'title_fill';
  }

  if (
    normalizedError.includes('FAIL_SHIPPING_SET') ||
    normalizedErrorText.includes('shipping group') ||
    normalizedErrorText.includes('shipping price in eur') ||
    normalizedErrorText.includes('tradera shipping price') ||
    normalizedErrorText.includes('delivery settings') ||
    normalizedErrorText.includes('delivery could not')
  ) {
    return 'shipping_set';
  }

  if (normalizedError.includes('FAIL_PUBLISH_VALIDATION')) {
    return stage === 'publish_clicked' ||
      hasEvent(logs, 'tradera.quicklist.publish.click_result') ||
      hasEvent(logs, 'tradera.quicklist.publish.verified_direct') ||
      hasEvent(logs, 'tradera.quicklist.publish.recovered_via_active_listings')
      ? 'publish_verify'
      : 'publish';
  }

  switch (stage) {
    case 'started':
      return 'auth_check';
    case 'active_loaded':
      return action === 'sync' ? 'sync_check' : 'duplicate_check';
    case 'sync_target_loaded':
      return 'sync_check';
    case 'duplicate_checked':
    case 'duplicate_linked':
      return 'sell_page_open';
    case 'sell_page_ready':
      return 'image_cleanup';
    case 'draft_cleared':
      return 'image_upload';
    case 'images_uploaded':
    case 'images_preserved':
      return 'title_fill';
    case 'fields_filled':
      return 'listing_format_select';
    case 'listing_format_selected':
      return 'category_select';
    case 'category_selected':
      return 'attribute_select';
    case 'listing_attributes_selected':
      return 'shipping_set';
    case 'delivery_configured':
      return 'publish';
    case 'publish_clicked':
      return 'publish_verify';
    default:
      return 'publish_verify';
  }
};

export const readTraderaExecutionSteps = (value: unknown): TraderaExecutionStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const record = toRecord(entry);
    const id = readString(record['id']);
    const label = readString(record['label']);
    const status = normalizeExecutionStepStatus(readString(record['status']));
    if (!id || !label || !status) {
      return [];
    }
    return [
      {
        id,
        label,
        status,
        message: readExecutionStepMessage(record),
      },
    ];
  });
};

export const resolveTraderaExecutionStepsFromMarketplaceData = (
  marketplaceData: unknown
): {
  action: string | null;
  steps: TraderaExecutionStep[];
  ok: boolean | null;
  error: string | null;
} => {
  const marketplaceRecord = toRecord(marketplaceData);
  const traderaData = toRecord(marketplaceRecord['tradera']);
  const lastExecution = toRecord(traderaData['lastExecution']);
  const metadata = toRecord(lastExecution['metadata']);
  const rawResult = toRecord(metadata['rawResult']);
  const action =
    readString(lastExecution['action']) ??
    readString(metadata['action']) ??
    readString(rawResult['listingAction']) ??
    readString(rawResult['action']);
  const quicklistAction = normalizeQuicklistAction(action);
  const persistedSteps = readTraderaExecutionSteps(metadata['executionSteps']);
  const rawExecutionSteps = readTraderaExecutionSteps(rawResult['executionSteps']);
  const logs = readStringArray(metadata['logTail']);
  const errorMessage = readString(lastExecution['error']);
  const ok = typeof lastExecution['ok'] === 'boolean' ? lastExecution['ok'] : null;
  const metadataLatestStage = readString(metadata['latestStage']);
  const metadataDuplicateMatchStrategy = readString(metadata['duplicateMatchStrategy']);
  const metadataDuplicateLinked = readBoolean(metadata['duplicateLinked']);
  const rawStage = readString(rawResult['stage']);
  const rawDuplicateMatchStrategy = readString(rawResult['duplicateMatchStrategy']);
  const rawDuplicateLinked = readBoolean(rawResult['duplicateLinked']);
  const effectiveRawResult: Record<string, unknown> = { ...rawResult };
  const effectiveStage = metadataLatestStage ?? rawStage;
  if (effectiveStage !== null) {
    effectiveRawResult['stage'] = effectiveStage;
  }
  const effectiveDuplicateMatchStrategy =
    metadataDuplicateMatchStrategy ?? rawDuplicateMatchStrategy;
  if (effectiveDuplicateMatchStrategy !== null) {
    effectiveRawResult['duplicateMatchStrategy'] = effectiveDuplicateMatchStrategy;
  }
  if (rawDuplicateLinked !== null || metadataDuplicateLinked !== null) {
    effectiveRawResult['duplicateLinked'] = metadataDuplicateLinked ?? rawDuplicateLinked;
  }

  let derivedSteps: TraderaExecutionStep[] = [];
  if (quicklistAction !== null) {
    derivedSteps = buildTraderaQuicklistExecutionSteps({
      action: quicklistAction,
      rawResult: effectiveRawResult,
      logs,
      errorMessage,
    });
  } else if (
    rawExecutionSteps.length > 0 ||
    action === 'check_status' ||
    action === 'move_to_unsold'
  ) {
    derivedSteps = rawExecutionSteps;
  }

  let steps: TraderaExecutionStep[];
  if (quicklistAction !== null) {
    steps = pickMostInformativeTraderaExecutionSteps([
      persistedSteps,
      rawExecutionSteps,
      derivedSteps,
    ]);
  } else if (persistedSteps.length > 0) {
    steps = persistedSteps;
  } else if (rawExecutionSteps.length > 0) {
    steps = rawExecutionSteps;
  } else {
    steps = derivedSteps;
  }

  return {
    action,
    steps,
    ok,
    error: errorMessage,
  };
};
