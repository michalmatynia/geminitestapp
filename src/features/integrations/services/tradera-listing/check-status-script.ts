import { STATUS_CHECK_CONSTANTS } from './status-check-partials/constants';
import { STATUS_CHECK_CORE_LOGIC } from './status-check-partials/core-logic';

/**
 * Tradera listing status-check script.
 *
 * Verifies listing state from the authenticated seller listing sections instead
 * of trusting the public item page. The search order is:
 * 1. Active listings
 * 2. Unsold items
 * 3. Your sold items
 *
 * Candidate matching mirrors the duplicate-link flow:
 * - exact English title search
 * - confirm by description first
 * - fall back to Product ID match
 */
export const TRADERA_CHECK_STATUS_SCRIPT = String.raw`export default async function run({
  page,
  input,
  emit,
  log,
}) {
` + STATUS_CHECK_CONSTANTS + STATUS_CHECK_CORE_LOGIC + String.raw`
  const {
    listingUrl = null,
    externalListingId = null,
    searchTitle = null,
    duplicateSearchTitle = null,
    rawDescriptionEn = null,
    baseProductId = null,
  } = input || {};
  const resolvedSearchTitle = searchTitle || duplicateSearchTitle || null;

  const executionSteps = [
    { id: 'browser_preparation', label: 'Browser preparation',       status: 'pending' },
    { id: 'browser_open',        label: 'Open browser',              status: 'pending' },
    { id: 'cookie_accept',       label: 'Accept cookies',            status: 'pending' },
    { id: 'auth_check',          label: 'Validate Tradera session',  status: 'pending' },
    { id: 'overview_open',       label: 'Open Tradera overview',     status: 'pending' },
    { id: 'search_active',       label: 'Search active listings',    status: 'pending' },
    { id: 'inspect_active',      label: 'Inspect active candidate',  status: 'pending' },
    { id: 'search_unsold',       label: 'Search unsold items',       status: 'pending' },
    { id: 'inspect_unsold',      label: 'Inspect unsold candidate',  status: 'pending' },
    { id: 'search_sold',         label: 'Search sold items',         status: 'pending' },
    { id: 'inspect_sold',        label: 'Inspect sold candidate',    status: 'pending' },
    { id: 'resolve_status',      label: 'Resolve listing status',    status: 'pending' },
    { id: 'browser_close',       label: 'Close browser',             status: 'pending' },
  ];

  const updateStep = (id, status, message = null) => {
    const step = executionSteps.find((s) => s.id === id);
    if (step) {
      step.status = status;
      if (message) step.message = message;
      emit('steps', executionSteps);
    }
  };

  const skipStep = (id, message = null) => updateStep(id, 'skipped', message);

  const failActiveStep = (message = null) => {
    const activeStep = executionSteps.find((s) => s.status === 'running');
    if (activeStep) {
      updateStep(activeStep.id, 'error', message);
    }
  };

  const waitForPageIdle = async (ms = 1_000) => {
    await wait(ms);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  };

  const waitForCondition = async (condition, { timeoutMs = 5_000, intervalMs = 100 } = {}) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await condition()) return true;
      await wait(intervalMs);
    }
    return false;
  };

  const acceptCookies = async () => {
    const accepted = await dismissCookiesIfPresent();
    if (accepted) {
      updateStep('cookie_accept', 'success', 'Cookies accepted.');
    } else if (executionSteps.find((s) => s.id === 'cookie_accept').status === 'pending') {
      updateStep('cookie_accept', 'success', 'No cookie banner detected.');
    }
  };

  const extractListingId = (url) => {
    if (!url) return null;
    const match = url.match(/\/(?:item|listing)\/(\d+)/);
    return match ? match[1] : null;
  };

  updateStep('browser_preparation', 'success', 'Browser settings were prepared.');
  updateStep('browser_open', 'success', 'Browser was opened successfully.');

  if (!resolvedSearchTitle) {
    skipStep('auth_check', 'Skipped because no searchable English title was available.');
    updateStep('overview_open', 'error', 'No English title was available for Tradera section search.');
    skipStep('cookie_accept', 'Skipped because no searchable English title was available.');
    skipStep('search_active', 'Skipped because no searchable English title was available.');
    skipStep('inspect_active', 'Skipped because no searchable English title was available.');
    skipStep('search_unsold', 'Skipped because no searchable English title was available.');
    skipStep('inspect_unsold', 'Skipped because no searchable English title was available.');
    skipStep('search_sold', 'Skipped because no searchable English title was available.');
    skipStep('inspect_sold', 'Skipped because no searchable English title was available.');
    skipStep('resolve_status', 'Skipped because no searchable English title was available.');
    updateStep('browser_close', 'success', 'Browser was closed.');
    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'unknown',
      error: 'No English title available to search Tradera overview sections.',
      executionSteps,
    });
    return;
  }

  try {
    if (log) {
      log('tradera.check_status.start', {
        listingUrl,
        externalListingId,
        searchTitle: resolvedSearchTitle,
        baseProductId,
      });
    }

    updateStep('auth_check', 'running', 'Checking whether the stored Tradera session is still valid.');
    updateStep('overview_open', 'running', 'Opening Tradera seller overview.');
    await page.goto(INITIAL_SECTION_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await acceptCookies();
    const normalizedUrl = page.url().trim().toLowerCase();
    if (normalizedUrl.includes('/login')) {
      updateStep('auth_check', 'error', 'Stored Tradera session redirected to the Tradera login page.');
      skipStep('overview_open', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('search_active', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('inspect_active', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('search_unsold', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('inspect_unsold', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('search_sold', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('inspect_sold', 'Skipped because Tradera seller overview could not be accessed.');
      skipStep('resolve_status', 'Skipped because Tradera seller overview could not be accessed.');
      updateStep('browser_close', 'success', 'Browser was closed.');
      emit('result', {
        publishVerified: false,
        listingUrl,
        externalListingId,
        status: 'unknown',
        error: 'Stored Tradera session redirected to login before seller overview could be accessed.',
        executionSteps,
      });
      return;
    }
    updateStep('auth_check', 'success', 'Stored Tradera session could access the seller overview.');
    updateStep('overview_open', 'success', 'Tradera seller overview opened successfully.');

    let matchedResult = null;
    for (const section of SECTIONS) {
      if (matchedResult) {
        skipStep(section.searchStepId, 'Skipped because the listing was already matched in ' + matchedResult.sectionLabel + '.');
        skipStep(section.inspectStepId, 'Skipped because the listing was already matched in ' + matchedResult.sectionLabel + '.');
        continue;
      }

      matchedResult = await searchSection(section);
    }

    updateStep('resolve_status', 'running', 'Resolving the final Tradera status from the verified section match.');

    if (matchedResult) {
      updateStep(
        'resolve_status',
        'success',
        'Resolved Tradera status as ' +
          matchedResult.canonicalStatus +
          ' from ' +
          matchedResult.sectionLabel +
          ' with raw tag "' +
          matchedResult.rawStatusTag +
          '".'
      );

      if (log) {
        log('tradera.check_status.status_detected', {
          status: matchedResult.canonicalStatus,
          rawStatusTag: matchedResult.rawStatusTag,
          verificationSection: matchedResult.sectionId,
          verificationMatchStrategy: matchedResult.matchStrategy,
          finalUrl: matchedResult.listingUrl,
          matchedProductId: matchedResult.matchedProductId,
        });
      }

      updateStep('browser_close', 'success', 'Browser was closed.');
      emit('result', {
        publishVerified: false,
        listingUrl: matchedResult.listingUrl || listingUrl,
        externalListingId: matchedResult.listingId || externalListingId,
        status: matchedResult.canonicalStatus,
        verificationSection: matchedResult.sectionId,
        verificationMatchStrategy: matchedResult.matchStrategy,
        verificationRawStatusTag: matchedResult.rawStatusTag,
        verificationMatchedProductId: matchedResult.matchedProductId,
        verificationSearchTitle: resolvedSearchTitle,
        verificationCandidateCount: matchedResult.candidateCount,
        executionSteps,
      });
      return;
    }

    updateStep(
      'resolve_status',
      'success',
      'The listing was not found in Active listings, Unsold items, or Your sold items, so it was treated as removed.'
    );

    if (log) {
      log('tradera.check_status.status_detected', {
        status: 'removed',
        rawStatusTag: 'removed',
        verificationSection: null,
        verificationMatchStrategy: null,
        finalUrl: listingUrl,
      });
    }

    updateStep('browser_close', 'success', 'Browser was closed.');
    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'removed',
      verificationSection: null,
      verificationMatchStrategy: null,
      verificationRawStatusTag: 'removed',
      verificationMatchedProductId: null,
      verificationSearchTitle: resolvedSearchTitle,
      verificationCandidateCount: 0,
      executionSteps,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failActiveStep(msg);
    if (log) {
      log('tradera.check_status.failed', { error: msg });
      log('error', '[check-status] error: ' + msg);
    }
    updateStep('browser_close', 'success', 'Browser was closed.');
    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'unknown',
      error: msg,
      executionSteps,
    });
  }
}`;
