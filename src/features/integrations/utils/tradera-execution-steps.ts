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

const readBoolean = (value: unknown): boolean | null =>
  typeof value === 'boolean' ? value : null;

const readNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const readStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

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

const getLastEventPayload = (
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

const getStepStatus = (
  steps: TraderaExecutionStep[],
  stepId: string
): TraderaExecutionStep['status'] | null =>
  steps.find((step) => step.id === stepId)?.status ?? null;

const quicklistStepTemplates = (
  action: TraderaListingAction
): TraderaExecutionStep[] => [
  createStep('browser_preparation', 'Browser preparation'),
  createStep('browser_open', 'Open browser'),
  createStep('cookie_accept', 'Accept cookies'),
  createStep('auth_check', 'Validate Tradera session'),
  createStep('auth_login', 'Automated login'),
  createStep('auth_manual', 'Complete manual Tradera login'),
  ...(action === 'sync'
    ? [createStep('sync_check', 'Load sync target listing')]
    : [
        createStep('duplicate_check', 'Search for duplicate listings'),
        createStep('deep_duplicate_check', 'Inspect duplicate candidates'),
        createStep('sell_page_open', 'Open listing editor'),
        createStep('image_cleanup', 'Clear draft images'),
      ]),
  createStep('image_upload', 'Upload listing images'),
  createStep('title_fill', 'Enter title'),
  createStep('description_fill', 'Enter description'),
  createStep('listing_format_select', 'Choose listing format'),
  createStep('price_set', 'Set price'),
  createStep('category_select', 'Select category'),
  createStep('attribute_select', 'Apply listing attributes'),
  createStep('shipping_set', 'Configure delivery'),
  createStep(
    'publish',
    action === 'sync' ? 'Save listing changes' : action === 'relist' ? 'Relist' : 'Publish listing'
  ),
  createStep(
    'publish_verify',
    action === 'sync' ? 'Verify saved listing' : 'Verify published listing'
  ),
  createStep('browser_close', 'Close browser'),
];

const QUICKLIST_SUCCESS_MESSAGES: Record<string, string> = {
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

const resolveQuicklistCompletedStepIds = (
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

  if (normalizedError.includes('FAIL_CATEGORY')) {
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

  if (normalizedError.includes('FAIL_SHIPPING_SET')) {
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
    rawResultRecord['publishVerified'] === true ||
    stage === 'publish_verified' ||
    stage === 'sync_verified';
  const authInitialState = getLastEventPayload(logs, 'tradera.quicklist.auth.initial');
  const authFinalState = getLastEventPayload(logs, 'tradera.quicklist.auth.final');
  const duplicateResultPayload = getLastEventPayload(
    logs,
    'tradera.quicklist.duplicate.result'
  );
  const manualLoginWasNeeded = readBoolean(authInitialState?.['loggedIn']) === false;
  const manualLoginRecovered =
    manualLoginWasNeeded && readBoolean(authFinalState?.['loggedIn']) === true;
  const duplicateInspectionRan = hasEvent(logs, 'tradera.quicklist.duplicate.inspect');
  const duplicateSearchSkipped = hasEvent(logs, 'tradera.quicklist.duplicate.skipped');
  const duplicateNonExactIgnoredPayload = getLastEventPayload(
    logs,
    'tradera.quicklist.duplicate.non_exact_ignored'
  );
  const duplicateResultFound = readBoolean(duplicateResultPayload?.['duplicateFound']) === true;
  const duplicateNonExactIgnoredCount =
    readNumber(duplicateNonExactIgnoredPayload?.['fallbackCandidateCount']) ??
    readNumber(rawResultRecord['duplicateIgnoredNonExactCandidateCount']);
  const duplicateNonExactIgnoredTitles = (
    readStringArray(duplicateNonExactIgnoredPayload?.['ignoredCandidateTitles']).length > 0
      ? readStringArray(duplicateNonExactIgnoredPayload?.['ignoredCandidateTitles'])
      : readStringArray(rawResultRecord['duplicateIgnoredCandidateTitles'])
  );
  const duplicateNonExactIgnoredTitlesPreview = duplicateNonExactIgnoredTitles.slice(0, 3);
  const duplicateNonExactIgnoredTitlesRemainingCount = Math.max(
    0,
    duplicateNonExactIgnoredTitles.length - duplicateNonExactIgnoredTitlesPreview.length
  );
  const duplicateNonExactIgnoredTitlesSuffix =
    duplicateNonExactIgnoredTitlesPreview.length > 0
      ? ' Ignored titles: ' +
        duplicateNonExactIgnoredTitlesPreview.join(', ') +
        (duplicateNonExactIgnoredTitlesRemainingCount > 0
          ? ', +' + String(duplicateNonExactIgnoredTitlesRemainingCount) + ' more'
          : '') +
        '.'
      : '';
  const duplicateNonExactIgnoredMessage =
    duplicateNonExactIgnoredCount && duplicateNonExactIgnoredCount > 0
      ? 'Duplicate search ignored ' +
        String(duplicateNonExactIgnoredCount) +
        ' non-exact title match(es); deep inspection only runs on exact title matches.' +
        duplicateNonExactIgnoredTitlesSuffix
      : null;
  const duplicateLinkedMessage =
    duplicateMatchStrategy === 'existing-linked-record'
      ? 'A previously linked Tradera listing record was reused instead of creating a duplicate.'
      : duplicateMatchStrategy === 'exact-title-single-candidate'
        ? 'Relist linked the single exact-title Tradera candidate instead of creating a new listing.'
        : 'An existing linked Tradera listing was reused instead of creating a duplicate.';
  const duplicateInspectionLinkedMessage =
    duplicateMatchStrategy === 'title+description'
      ? 'Deep duplicate inspection matched the existing Tradera listing by title and description.'
      : duplicateMatchStrategy === 'title+product-id'
        ? 'Deep duplicate inspection matched the existing Tradera listing by title and product ID.'
        : duplicateLinkedMessage;
  const duplicateInspectionSkippedMessage =
    duplicateMatchStrategy === 'exact-title-single-candidate'
      ? 'Skipped because a single exact-title candidate was enough to link the Tradera listing.'
      : duplicateMatchStrategy === 'existing-linked-record' ||
          duplicateMatchStrategy === 'existing-listing-id+visible-candidate'
        ? 'Skipped because the duplicate was resolved directly from an existing linked Tradera listing.'
        : 'Skipped because duplicate search did not require deep candidate inspection.';

  const completedStepIds = resolveQuicklistCompletedStepIds(action, stage);
  for (const stepId of completedStepIds) {
    markStep(steps, stepId, {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES[stepId] ?? null,
    });
  }

  // browser_preparation and browser_open are always completed once the script starts
  if (hasAnyEventPrefix(logs, 'tradera.quicklist.start')) {
    markStep(steps, 'browser_preparation', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['browser_preparation'],
    });
    markStep(steps, 'browser_open', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['browser_open'],
    });
  }

  if (authInitialState) {
    // Once auth.initial fires, cookie acceptance already ran and session was checked
    markStep(steps, 'cookie_accept', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['cookie_accept'],
    });
    markStep(steps, 'auth_check', {
      status: 'success',
      message: manualLoginWasNeeded
        ? 'Stored Tradera session needs login recovery.'
        : QUICKLIST_SUCCESS_MESSAGES['auth_check'],
    });

    if (!manualLoginWasNeeded) {
      markStep(steps, 'auth_login', {
        status: 'skipped',
        message: 'Stored session was already valid; login was not needed.',
      });
      markStep(steps, 'auth_manual', {
        status: 'skipped',
        message: 'Stored session was already valid; manual login was not needed.',
      });
    } else {
      markStep(steps, 'auth_login', {
        status: manualLoginRecovered ? 'success' : 'running',
        message: manualLoginRecovered
          ? QUICKLIST_SUCCESS_MESSAGES['auth_login']
          : 'Automated login in progress.',
      });
      markStep(steps, 'auth_manual', {
        status: manualLoginRecovered ? 'skipped' : 'running',
        message: manualLoginRecovered
          ? 'Automated login succeeded; manual login was not needed.'
          : 'Manual Tradera login is in progress.',
      });
    }
  }

  if (manualLoginRecovered) {
    markStep(steps, 'auth_check', {
      status: 'success',
      message: 'Stored Tradera session check completed and required login recovery.',
    });
    markStep(steps, 'auth_login', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['auth_login'],
    });
    markStep(steps, 'auth_manual', {
      status: 'skipped',
      message: 'Automated login succeeded; manual login was not needed.',
    });
  }

  if (
    getStepStatus(steps, 'auth_check') === 'success' &&
    getStepStatus(steps, 'auth_login') === 'pending' &&
    !manualLoginWasNeeded &&
    !manualLoginRecovered
  ) {
    markStep(steps, 'auth_login', {
      status: 'skipped',
      message: 'Stored session was already valid; login was not needed.',
    });
    markStep(steps, 'auth_manual', {
      status: 'skipped',
      message: 'Stored session was already valid; manual login was not needed.',
    });
  }

  if (action === 'sync') {
    if (
      hasAnyEventPrefix(logs, 'tradera.quicklist.sync.') ||
      stage === 'sync_target_loaded'
    ) {
      markStep(steps, 'sync_check', {
        status: getStepStatus(steps, 'sync_check') === 'success' ? 'success' : 'running',
        message:
          getStepStatus(steps, 'sync_check') === 'success'
            ? QUICKLIST_SUCCESS_MESSAGES['sync_check']
            : 'Loading the sync target Tradera listing.',
      });
    }
  } else {
    if (
      hasAnyEventPrefix(logs, 'tradera.quicklist.sell_page.')
    ) {
      markStep(steps, 'sell_page_open', {
        status: getStepStatus(steps, 'sell_page_open') === 'success' ? 'success' : 'running',
        message:
          getStepStatus(steps, 'sell_page_open') === 'success'
            ? QUICKLIST_SUCCESS_MESSAGES['sell_page_open']
            : 'Opening the Tradera listing editor.',
      });
    }

    if (duplicateSearchSkipped) {
      markStep(steps, 'duplicate_check', {
        status: 'skipped',
        message: 'Duplicate search was skipped for this run.',
      });
      markStep(steps, 'deep_duplicate_check', {
        status: 'skipped',
        message: 'Deep duplicate inspection was skipped because duplicate search did not run.',
      });
    } else if (hasAnyEventPrefix(logs, 'tradera.quicklist.duplicate.')) {
      const duplicateSearchResolved =
        duplicateLinked ||
        Boolean(duplicateResultPayload) ||
        stage === 'duplicate_checked' ||
        stage === 'duplicate_linked';
      markStep(steps, 'duplicate_check', {
        status: duplicateSearchResolved ? 'success' : 'running',
        message: duplicateLinked
          ? duplicateLinkedMessage
          : duplicateSearchResolved
            ? duplicateNonExactIgnoredMessage ||
              'Duplicate search completed without blocking the Tradera run.'
            : 'Searching Tradera listings for duplicates.',
      });

      if (duplicateInspectionRan) {
        markStep(steps, 'deep_duplicate_check', {
          status:
            duplicateLinked || Boolean(duplicateResultPayload) ? 'success' : 'running',
          message:
            duplicateLinked || duplicateResultFound
              ? duplicateInspectionLinkedMessage
              : duplicateResultPayload
                ? 'Deep duplicate inspection cleared the candidate listings.'
                : 'Inspecting duplicate candidates.',
        });
      } else if (duplicateLinked || Boolean(duplicateResultPayload) || stage === 'duplicate_checked') {
        markStep(steps, 'deep_duplicate_check', {
          status: 'skipped',
          message: duplicateLinked
            ? duplicateInspectionSkippedMessage
            : duplicateNonExactIgnoredMessage
              ? 'Skipped because only non-exact title matches were found.'
              : 'Skipped because duplicate search did not require deep candidate inspection.',
        });
      }
    }
  }

  if (duplicateLinked) {
    markStep(steps, 'duplicate_check', {
      status: 'success',
      message: duplicateLinkedMessage,
    });
    if (duplicateInspectionRan) {
      markStep(steps, 'deep_duplicate_check', {
        status: 'success',
        message: duplicateInspectionLinkedMessage,
      });
    } else {
      markStep(steps, 'deep_duplicate_check', {
        status: 'skipped',
        message: duplicateInspectionSkippedMessage,
      });
    }
    markPendingStepsAfter(
      steps,
      'deep_duplicate_check',
      'Skipped because an existing linked Tradera listing was reused.'
    );
    return steps;
  }

  if (hasEvent(logs, 'tradera.quicklist.image.relist_preserved')) {
    markStep(steps, 'image_upload', {
      status: 'success',
      message: 'Existing listing images were preserved.',
    });
  } else if (hasEvent(logs, 'tradera.quicklist.image.skipped')) {
    markStep(steps, 'image_upload', {
      status: 'skipped',
      message: 'Image upload was skipped for this run.',
    });
  } else if (hasAnyEventPrefix(logs, 'tradera.quicklist.image.initial_cleanup')) {
    markStep(steps, 'image_cleanup', {
      status: getStepStatus(steps, 'image_cleanup') === 'success' ? 'success' : 'running',
      message:
        getStepStatus(steps, 'image_cleanup') === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['image_cleanup']
          : 'Clearing existing draft images.',
    });
  } else if (hasAnyEventPrefix(logs, 'tradera.quicklist.image.')) {
    if (action !== 'sync') {
      markStep(steps, 'image_cleanup', {
        status: getStepStatus(steps, 'image_cleanup') === 'success' ? 'success' : 'running',
        message:
          getStepStatus(steps, 'image_cleanup') === 'success'
            ? QUICKLIST_SUCCESS_MESSAGES['image_cleanup']
            : 'Clearing existing draft images.',
      });
    }
    markStep(steps, 'image_upload', {
      status: getStepStatus(steps, 'image_upload') === 'success' ? 'success' : 'running',
      message:
        getStepStatus(steps, 'image_upload') === 'success'
          ? steps.find((step) => step.id === 'image_upload')?.message ??
            QUICKLIST_SUCCESS_MESSAGES['image_upload']
          : 'Uploading listing images.',
    });
  }

  if (
    hasAnyEventPrefix(logs, 'tradera.quicklist.field.') ||
    hasAnyEventPrefix(logs, 'tradera.quicklist.listing_format.')
  ) {
    const fieldStepIds = ['title_fill', 'description_fill'] as const;
    const fieldsResolved = fieldStepIds.some((id) => getStepStatus(steps, id) === 'success');
    const fieldsStatus = fieldsResolved ? 'success' : 'running';
    const fieldsMsg = fieldsResolved ? null : 'Filling Tradera form fields.';
    for (const id of fieldStepIds) {
      if (getStepStatus(steps, id) !== 'success') {
        markStep(steps, id, { status: fieldsStatus, message: fieldsMsg });
      }
    }

    const listingFormatTouched = hasAnyEventPrefix(logs, 'tradera.quicklist.listing_format.');
    if (listingFormatTouched && getStepStatus(steps, 'listing_format_select') !== 'success') {
      markStep(steps, 'listing_format_select', {
        status: 'running',
        message: 'Choosing the Tradera listing format.',
      });
    }

    const priceResolved = getStepStatus(steps, 'price_set') === 'success';
    if (!priceResolved) {
      markStep(steps, 'price_set', {
        status: listingFormatTouched ? 'running' : fieldsStatus,
        message: listingFormatTouched ? 'Setting the Tradera price.' : fieldsMsg,
      });
    }
  }

  if (
    hasAnyEventPrefix(logs, 'tradera.quicklist.category.') ||
    hasAnyEventPrefix(logs, 'tradera.quicklist.category_extra_field.')
  ) {
    markStep(steps, 'category_select', {
      status: getStepStatus(steps, 'category_select') === 'success' ? 'success' : 'running',
      message:
        getStepStatus(steps, 'category_select') === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['category_select']
          : 'Selecting the Tradera category.',
    });
  }

  if (hasAnyEventPrefix(logs, 'tradera.quicklist.category_extra_field.')) {
    markStep(steps, 'attribute_select', {
      status: getStepStatus(steps, 'attribute_select') === 'success' ? 'success' : 'running',
      message:
        getStepStatus(steps, 'attribute_select') === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['attribute_select']
          : 'Applying category-specific listing attributes.',
    });
  }

  if (hasAnyEventPrefix(logs, 'tradera.quicklist.delivery.')) {
    markStep(steps, 'shipping_set', {
      status: getStepStatus(steps, 'shipping_set') === 'success' ? 'success' : 'running',
      message:
        getStepStatus(steps, 'shipping_set') === 'success'
          ? QUICKLIST_SUCCESS_MESSAGES['shipping_set']
          : 'Applying Tradera delivery settings.',
    });
  }

  if (hasAnyEventPrefix(logs, 'tradera.quicklist.publish.')) {
    markStep(steps, 'publish', {
      status:
        getStepStatus(steps, 'publish') === 'success' ||
        stage === 'publish_clicked' ||
        publishVerified
          ? 'success'
          : 'running',
      message:
        getStepStatus(steps, 'publish') === 'success' ||
        stage === 'publish_clicked' ||
        publishVerified
          ? QUICKLIST_SUCCESS_MESSAGES['publish']
          : 'Preparing the publish action.',
    });
    markStep(steps, 'publish_verify', {
      status: publishVerified ? 'success' : 'running',
      message: publishVerified
        ? QUICKLIST_SUCCESS_MESSAGES['publish_verify']
        : 'Waiting for Tradera publish verification.',
    });
    if (publishVerified) {
      markStep(steps, 'browser_close', {
        status: 'success',
        message: QUICKLIST_SUCCESS_MESSAGES['browser_close'],
      });
    }
  }

  if (publishVerified) {
    markStep(steps, 'publish', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['publish'],
    });
    markStep(steps, 'publish_verify', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['publish_verify'],
    });
    markStep(steps, 'browser_close', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['browser_close'],
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
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['publish'],
    });
    markStep(steps, 'publish_verify', {
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
  const action = readString(lastExecution['action']);
  const persistedSteps = readTraderaExecutionSteps(metadata['executionSteps']);
  const rawResult = toRecord(metadata['rawResult']);
  const logs = readStringArray(metadata['logTail']);
  const errorMessage = readString(lastExecution['error']);

  let derivedSteps: TraderaExecutionStep[] = [];
  if (persistedSteps.length === 0) {
    if (action === 'check_status') {
      derivedSteps = readTraderaExecutionSteps(rawResult['executionSteps']);
    } else if (action === 'list' || action === 'relist' || action === 'sync') {
      derivedSteps = buildTraderaQuicklistExecutionSteps({
        action,
        rawResult,
        logs,
        errorMessage,
      });
    }
  }

  return {
    action,
    steps: persistedSteps.length > 0 ? persistedSteps : derivedSteps,
    ok: typeof lastExecution['ok'] === 'boolean' ? lastExecution['ok'] : null,
    error: errorMessage,
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
