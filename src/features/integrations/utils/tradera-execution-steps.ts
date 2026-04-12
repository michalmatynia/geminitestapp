import type { TraderaExecutionStep } from '@/shared/contracts/integrations/listings';

type TraderaListingAction = 'list' | 'relist' | 'sync';

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

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const readString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

const createStep = (
  id: string,
  label: string,
  message: string | null = null
): TraderaExecutionStep => ({
  id,
  label,
  status: 'pending',
  message,
});

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

const hasEvent = (logs: readonly string[] | null | undefined, event: string): boolean =>
  (logs ?? []).some((entry) => parseUserLogEvent(entry).event === event);

const hasAnyEventPrefix = (
  logs: readonly string[] | null | undefined,
  prefix: string
): boolean => (logs ?? []).some((entry) => {
  const parsed = parseUserLogEvent(entry);
  return typeof parsed.event === 'string' && parsed.event.startsWith(prefix);
});

const getEventPayload = (
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

const markStep = (
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

const markPendingStepsAfter = (
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

const quicklistStepTemplates = (
  action: TraderaListingAction
): TraderaExecutionStep[] => [
  createStep('start', 'Initialize automation'),
  createStep('auth', 'Validate Tradera session'),
  ...(action === 'sync'
    ? []
    : [createStep('duplicate', 'Check duplicate listings')]),
  createStep(
    'editor',
    action === 'sync' ? 'Open existing listing editor' : 'Open listing editor'
  ),
  createStep('images', 'Prepare listing images'),
  createStep('fields', 'Fill listing fields'),
  createStep('category', 'Select category and attributes'),
  createStep('delivery', 'Configure delivery'),
  createStep(
    'publish',
    action === 'sync' ? 'Save and verify listing' : 'Publish and verify listing'
  ),
];

const QUICKLIST_SUCCESS_MESSAGES: Record<string, string> = {
  start: 'Execution bootstrapped successfully.',
  auth: 'Stored Tradera session was accepted.',
  duplicate: 'No conflicting Tradera listing blocked the run.',
  editor: 'The Tradera listing editor became ready.',
  images: 'Listing images were prepared successfully.',
  fields: 'Core listing fields were filled successfully.',
  category: 'Category and listing attributes were resolved.',
  delivery: 'Delivery settings were applied successfully.',
  publish: 'The listing was published and verified successfully.',
};

const resolveQuicklistCompletedStepIds = (
  action: TraderaListingAction,
  stage: string | null
): string[] => {
  const orderedStepIds = quicklistStepTemplates(action).map((step) => step.id);
  const byStage: Record<string, string[]> = {
    started: ['start'],
    active_loaded: ['start', 'auth'],
    sync_target_loaded: ['start', 'auth'],
    duplicate_checked: ['start', 'auth', 'duplicate'],
    duplicate_linked: ['start', 'auth', 'duplicate'],
    sell_page_ready: ['start', 'auth', 'duplicate', 'editor'],
    draft_cleared: ['start', 'auth', 'duplicate', 'editor'],
    images_uploaded: ['start', 'auth', 'duplicate', 'editor', 'images'],
    images_preserved: ['start', 'auth', 'duplicate', 'editor', 'images'],
    fields_filled: ['start', 'auth', 'duplicate', 'editor', 'images', 'fields'],
    listing_format_selected: ['start', 'auth', 'duplicate', 'editor', 'images', 'fields'],
    category_selected: ['start', 'auth', 'duplicate', 'editor', 'images', 'fields', 'category'],
    listing_attributes_selected: [
      'start',
      'auth',
      'duplicate',
      'editor',
      'images',
      'fields',
      'category',
    ],
    delivery_configured: [
      'start',
      'auth',
      'duplicate',
      'editor',
      'images',
      'fields',
      'category',
      'delivery',
    ],
    publish_clicked: [
      'start',
      'auth',
      'duplicate',
      'editor',
      'images',
      'fields',
      'category',
      'delivery',
    ],
    publish_verified: [
      'start',
      'auth',
      'duplicate',
      'editor',
      'images',
      'fields',
      'category',
      'delivery',
      'publish',
    ],
  };

  const completed = stage ? byStage[stage] ?? [] : [];
  return completed.filter((stepId) => orderedStepIds.includes(stepId));
};

const resolveQuicklistFailureStepId = ({
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

  if (
    normalizedError.includes('AUTH_REQUIRED') ||
    normalizedError.includes('AUTH') ||
    hasEvent(logs, 'tradera.quicklist.auth.final')
  ) {
    if (normalizedError.includes('AUTH_REQUIRED') || normalizedError.includes('AUTH')) {
      return 'auth';
    }
  }

  if (
    normalizedError.includes('FAIL_SELL_PAGE_INVALID') ||
    hasEvent(logs, 'tradera.quicklist.navigation.unexpected') ||
    hasEvent(logs, 'tradera.quicklist.click_blocked') ||
    hasEvent(logs, 'tradera.quicklist.sell_page.recover_failed')
  ) {
    return 'editor';
  }

  if (
    normalizedError.includes('FAIL_IMAGE') ||
    hasEvent(logs, 'tradera.quicklist.image.upload_error') ||
    hasEvent(logs, 'tradera.quicklist.image.settle_timeout') ||
    hasEvent(logs, 'tradera.quicklist.sell_page.image_step_invalid')
  ) {
    return 'images';
  }

  if (normalizedError.includes('FAIL_SHIPPING_SET')) {
    return 'delivery';
  }

  if (normalizedError.includes('FAIL_PUBLISH_VALIDATION')) {
    return 'publish';
  }

  switch (stage) {
    case 'started':
      return 'auth';
    case 'active_loaded':
    case 'sync_target_loaded':
    case 'duplicate_checked':
      return action === 'sync' ? 'editor' : 'editor';
    case 'sell_page_ready':
    case 'draft_cleared':
    case 'images_uploaded':
    case 'images_preserved':
      return 'fields';
    case 'fields_filled':
    case 'listing_format_selected':
      return 'category';
    case 'category_selected':
    case 'listing_attributes_selected':
      return 'delivery';
    case 'delivery_configured':
    case 'publish_clicked':
      return 'publish';
    default:
      return 'publish';
  }
};

export const buildTraderaQuicklistExecutionSteps = ({
  action,
  rawResult,
  logs,
  errorMessage,
}: {
  action: TraderaListingAction;
  rawResult: Record<string, unknown> | null | undefined;
  logs?: readonly string[] | null;
  errorMessage?: string | null;
}): TraderaExecutionStep[] => {
  const steps = quicklistStepTemplates(action);
  const rawResultRecord = toRecord(rawResult);
  const stage = readString(rawResultRecord['stage']);
  const duplicateMatchStrategy = readString(rawResultRecord['duplicateMatchStrategy']);
  const duplicateLinked =
    rawResultRecord['duplicateLinked'] === true ||
    Boolean(duplicateMatchStrategy) ||
    stage === 'duplicate_linked' ||
    hasEvent(logs, 'tradera.quicklist.duplicate.linked');
  const publishVerified =
    rawResultRecord['publishVerified'] === true || stage === 'publish_verified';
  const duplicateLinkedMessage =
    duplicateMatchStrategy === 'existing-linked-record'
      ? 'A previously linked Tradera listing record was reused instead of creating a duplicate.'
      : duplicateMatchStrategy === 'exact-title-single-candidate'
        ? 'Relist linked the single exact-title Tradera candidate instead of creating a new listing.'
        : 'An existing linked Tradera listing was reused instead of creating a duplicate.';

  const completedStepIds = resolveQuicklistCompletedStepIds(action, stage);
  for (const stepId of completedStepIds) {
    markStep(steps, stepId, {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES[stepId] ?? null,
    });
  }

  if (hasAnyEventPrefix(logs, 'tradera.quicklist.start')) {
    markStep(steps, 'start', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['start'],
    });
  }
  if (hasEvent(logs, 'tradera.quicklist.auth.initial')) {
    markStep(steps, 'auth', {
      status: 'running',
      message: 'Checking whether the stored Tradera session is still valid.',
    });
  }
  if (hasEvent(logs, 'tradera.quicklist.auth.final')) {
    markStep(steps, 'auth', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['auth'],
    });
  }
  if (
    hasAnyEventPrefix(logs, 'tradera.quicklist.sell_page.') ||
    hasAnyEventPrefix(logs, 'tradera.quicklist.sync.')
  ) {
    markStep(steps, 'editor', {
      status: steps.find((step) => step.id === 'editor')?.status === 'success' ? 'success' : 'running',
      message:
        steps.find((step) => step.id === 'editor')?.status === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['editor']
          : 'Preparing the Tradera listing editor.',
    });
  }
  if (hasAnyEventPrefix(logs, 'tradera.quicklist.duplicate.')) {
    markStep(steps, 'duplicate', {
      status:
        steps.find((step) => step.id === 'duplicate')?.status === 'success' || duplicateLinked
          ? 'success'
          : 'running',
      message: duplicateLinked ? duplicateLinkedMessage : 'Duplicate listing guard completed.',
    });
  }
  if (hasEvent(logs, 'tradera.quicklist.duplicate.skipped')) {
    markStep(steps, 'duplicate', {
      status: 'skipped',
      message: 'Duplicate guard was skipped for this run.',
    });
  }
  if (duplicateLinked) {
    markStep(steps, 'duplicate', {
      status: 'success',
      message: duplicateLinkedMessage,
    });
    markPendingStepsAfter(
      steps,
      'duplicate',
      'Skipped because an existing linked Tradera listing was reused.'
    );
    return steps;
  }

  if (hasEvent(logs, 'tradera.quicklist.image.relist_preserved')) {
    markStep(steps, 'images', {
      status: 'success',
      message: 'Existing listing images were preserved.',
    });
  } else if (hasEvent(logs, 'tradera.quicklist.image.skipped')) {
    markStep(steps, 'images', {
      status: 'skipped',
      message: 'Image upload was skipped for this run.',
    });
  } else if (hasAnyEventPrefix(logs, 'tradera.quicklist.image.')) {
    markStep(steps, 'images', {
      status: steps.find((step) => step.id === 'images')?.status === 'success' ? 'success' : 'running',
      message:
        steps.find((step) => step.id === 'images')?.status === 'success'
          ? steps.find((step) => step.id === 'images')?.message ?? QUICKLIST_SUCCESS_MESSAGES['images']
          : 'Preparing listing images for upload.',
    });
  }

  if (
    hasAnyEventPrefix(logs, 'tradera.quicklist.field.') ||
    hasAnyEventPrefix(logs, 'tradera.quicklist.listing_format.')
  ) {
    markStep(steps, 'fields', {
      status: steps.find((step) => step.id === 'fields')?.status === 'success' ? 'success' : 'running',
      message:
        steps.find((step) => step.id === 'fields')?.status === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['fields']
          : 'Filling Tradera form fields.',
    });
  }

  if (
    hasAnyEventPrefix(logs, 'tradera.quicklist.category.') ||
    hasAnyEventPrefix(logs, 'tradera.quicklist.category_extra_field.')
  ) {
    markStep(steps, 'category', {
      status:
        steps.find((step) => step.id === 'category')?.status === 'success'
          ? 'success'
          : 'running',
      message:
        steps.find((step) => step.id === 'category')?.status === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['category']
          : 'Resolving category and listing attributes.',
    });
  }

  if (hasAnyEventPrefix(logs, 'tradera.quicklist.delivery.')) {
    markStep(steps, 'delivery', {
      status:
        steps.find((step) => step.id === 'delivery')?.status === 'success'
          ? 'success'
          : 'running',
      message:
        steps.find((step) => step.id === 'delivery')?.status === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['delivery']
          : 'Applying Tradera delivery settings.',
    });
  }

  if (hasAnyEventPrefix(logs, 'tradera.quicklist.publish.')) {
    markStep(steps, 'publish', {
      status: publishVerified ? 'success' : 'running',
      message: publishVerified
        ? QUICKLIST_SUCCESS_MESSAGES['publish']
        : 'Publish flow reached the final verification stage.',
    });
  }

  if (publishVerified) {
    markStep(steps, 'publish', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['publish'],
    });
  }

  const normalizedErrorMessage = readString(errorMessage);
  if (normalizedErrorMessage) {
    const failedStepId = resolveQuicklistFailureStepId({
      action,
      errorMessage: normalizedErrorMessage,
      stage,
      logs,
    });
    markStep(steps, failedStepId, {
      status: 'error',
      message: normalizedErrorMessage,
    });
    markPendingStepsAfter(steps, failedStepId, 'Not reached because an earlier step failed.');
  } else if (stage === 'publish_clicked') {
    markStep(steps, 'publish', {
      status: 'running',
      message: 'Publish action was triggered and is awaiting verification.',
    });
  }

  return steps;
};

export const readTraderaExecutionSteps = (value: unknown): TraderaExecutionStep[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const record = toRecord(entry);
    const id = readString(record['id']);
    const label = readString(record['label']);
    const status = readString(record['status']);
    if (!id || !label || !status || !isTraderaExecutionStepStatus(status)) {
      return [];
    }
    return [
      {
        id,
        label,
        status,
        message: readString(record['message']),
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

  return {
    action: readString(lastExecution['action']),
    steps: readTraderaExecutionSteps(metadata['executionSteps']),
    ok: typeof lastExecution['ok'] === 'boolean' ? lastExecution['ok'] : null,
    error: readString(lastExecution['error']),
  };
};

export const resolveTraderaCheckStatusExecutionStepsFromResult = (
  rawResult: Record<string, unknown> | null | undefined
): TraderaExecutionStep[] => {
  const resultRecord = toRecord(rawResult);
  return readTraderaExecutionSteps(resultRecord['executionSteps']);
};

export const getTraderaExecutionLogPayload = (
  logs: readonly string[] | null | undefined,
  event: string
): Record<string, unknown> | null => getEventPayload(logs, event);
