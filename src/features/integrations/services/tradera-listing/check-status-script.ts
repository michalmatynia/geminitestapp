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
    rawDescriptionEn = null,
    baseProductId = null,
  } = input || {};

  const executionSteps = [
    { id: 'open_overview', label: 'Open Overview', status: 'pending' },
    { id: 'accept_cookies', label: 'Accept Cookies', status: 'pending' },
    { id: 'search_active', label: 'Search Active', status: 'pending' },
    { id: 'inspect_active', label: 'Inspect Active', status: 'pending' },
    { id: 'search_unsold', label: 'Search Unsold', status: 'pending' },
    { id: 'inspect_unsold', label: 'Inspect Unsold', status: 'pending' },
    { id: 'search_sold', label: 'Search Sold', status: 'pending' },
    { id: 'inspect_sold', label: 'Inspect Sold', status: 'pending' },
    { id: 'resolve_status', label: 'Resolve Status', status: 'pending' },
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
      updateStep('accept_cookies', 'success', 'Cookies accepted.');
    } else if (executionSteps.find((s) => s.id === 'accept_cookies').status === 'pending') {
      updateStep('accept_cookies', 'success', 'No cookie banner detected.');
    }
  };

  const extractListingId = (url) => {
    if (!url) return null;
    const match = url.match(/\/(?:item|listing)\/(\d+)/);
    return match ? match[1] : null;
  };

  if (!searchTitle) {
    updateStep('open_overview', 'error', 'No English title was available for Tradera section search.');
    skipStep('accept_cookies', 'Skipped because no searchable English title was available.');
    skipStep('search_active', 'Skipped because no searchable English title was available.');
    skipStep('inspect_active', 'Skipped because no searchable English title was available.');
    skipStep('search_unsold', 'Skipped because no searchable English title was available.');
    skipStep('inspect_unsold', 'Skipped because no searchable English title was available.');
    skipStep('search_sold', 'Skipped because no searchable English title was available.');
    skipStep('inspect_sold', 'Skipped because no searchable English title was available.');
    skipStep('resolve_status', 'Skipped because no searchable English title was available.');
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
        searchTitle,
        baseProductId,
      });
    }

    updateStep('open_overview', 'running', 'Opening Tradera Active listings.');
    await page.goto(INITIAL_SECTION_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    updateStep('open_overview', 'success', 'Tradera Active listings opened successfully.');

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

      emit('result', {
        publishVerified: false,
        listingUrl: matchedResult.listingUrl || listingUrl,
        externalListingId: matchedResult.listingId || externalListingId,
        status: matchedResult.canonicalStatus,
        verificationSection: matchedResult.sectionId,
        verificationMatchStrategy: matchedResult.matchStrategy,
        verificationRawStatusTag: matchedResult.rawStatusTag,
        verificationMatchedProductId: matchedResult.matchedProductId,
        verificationSearchTitle: searchTitle,
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

    emit('result', {
      publishVerified: false,
      listingUrl,
      externalListingId,
      status: 'removed',
      verificationSection: null,
      verificationMatchStrategy: null,
      verificationRawStatusTag: 'removed',
      verificationMatchedProductId: null,
      verificationSearchTitle: searchTitle,
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
