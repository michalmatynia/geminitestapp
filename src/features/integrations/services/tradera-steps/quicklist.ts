import type { TraderaExecutionStep } from '@/shared/contracts/integrations/listings';
import {
  QUICKLIST_SUCCESS_MESSAGES,
  getLastEventPayload,
  getStepStatus,
  hasAnyEventPrefix,
  hasEvent,
  hasRuntimeBrowserCleanupLog,
  markPendingStepsAfter,
  markStep,
  quicklistStepTemplates,
  readBoolean,
  readNumber,
  readString,
  readStringArray,
  resolveQuicklistCompletedStepIds,
  resolveQuicklistFailureStepId,
  toRecord,
} from '../../utils/tradera-execution-steps';

type TraderaListingAction = 'list' | 'relist' | 'sync';

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
  const browserCleanupCompleted = hasRuntimeBrowserCleanupLog(logs);
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
      ? ` Ignored titles: ${ 
        duplicateNonExactIgnoredTitlesPreview.join(', ') 
        }${duplicateNonExactIgnoredTitlesRemainingCount > 0
          ? `, +${  String(duplicateNonExactIgnoredTitlesRemainingCount)  } more`
          : '' 
        }.`
      : '';
  const duplicateNonExactIgnoredMessage =
    duplicateNonExactIgnoredCount && duplicateNonExactIgnoredCount > 0
      ? `Duplicate search ignored ${ 
        String(duplicateNonExactIgnoredCount) 
        } non-exact title match(es); deep inspection only runs on exact title matches.${ 
        duplicateNonExactIgnoredTitlesSuffix}`
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

  if (browserCleanupCompleted) {
    markStep(steps, 'browser_close', {
      status: 'success',
      message: QUICKLIST_SUCCESS_MESSAGES['browser_close'],
    });
  }

  return steps;
};
