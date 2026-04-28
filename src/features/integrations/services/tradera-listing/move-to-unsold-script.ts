import { getActionStepManifest } from '@/shared/lib/browser-execution/action-constructor';
import { generateBrowserExecutionStepsInit } from '@/shared/lib/browser-execution/generate-browser-steps';
import { TRADERA_SELECTOR_REGISTRY_RUNTIME } from '@/shared/lib/browser-execution/selectors/tradera';

import { TRADERA_COOKIE_DISMISSAL_SNIPPET } from './script-partials/cookie-dismissal';

const DEFAULT_TRADERA_MOVE_TO_UNSOLD_STEPS_INIT = generateBrowserExecutionStepsInit(
  getActionStepManifest('tradera_move_to_unsold')
);

export const buildTraderaMoveToUnsoldScript = (
  selectorRegistryRuntime: string = TRADERA_SELECTOR_REGISTRY_RUNTIME,
  executionStepsInit: string = DEFAULT_TRADERA_MOVE_TO_UNSOLD_STEPS_INIT
): string =>
  String.raw`export default async function run({
  page,
  input,
  emit,
  log,
  helpers,
}) {
  const {
    listingUrl = null,
    externalListingId = null,
    searchTitle = null,
  } = input || {};
  const TARGET_URL =
    listingUrl ||
    (externalListingId ? 'https://www.tradera.com/item/' + externalListingId : null);
  const UNSOLD_URL = 'https://www.tradera.com/en/my/listings?tab=unsold';

${selectorRegistryRuntime}

  const END_LISTING_LABELS = [
    'End listing',
    'End item',
    'End sale',
    'Close listing',
    'Close item',
    'Close sale',
    'Withdraw listing',
    'Withdraw item',
    'Cancel listing',
    'Cancel item',
    'Avsluta annons',
    'Avsluta objekt',
    'Avsluta',
    'Stäng annons',
    'Stäng objekt',
    'Avbryt annons',
    'Avbryt objekt',
  ];

  const CONFIRM_END_LISTING_LABELS = [
    'End listing',
    'End item',
    'Close listing',
    'Close item',
    'Withdraw listing',
    'Cancel listing',
    'Confirm',
    'Yes',
    'OK',
    'Avsluta annons',
    'Avsluta objekt',
    'Avsluta',
    'Bekräfta',
    'Ja',
  ];

  const UNSOLD_PAGE_HINTS = [
    'unsold items',
    'unsold',
    'osålda objekt',
    'osålda',
  ];

  const ENDED_HINTS = [
    'ended',
    'closed',
    'expired',
    'cancelled',
    'canceled',
    'avslutad',
    'avslutades',
    'stängd',
    'utgången',
  ];

  ${executionStepsInit}

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const updateStep = (id, status, message = null) => {
    const step = executionSteps.find((entry) => entry.id === id);
    if (!step) return;
    step.status = status;
    if (message !== null) {
      step.message = message;
    }
    emit('steps', executionSteps);
  };

  emit('steps', executionSteps);

  const normalizeWhitespace = (value) =>
    String(value || '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizeForSearch = (value) => normalizeWhitespace(value).toLowerCase();

  const escapeRegExp = (value) =>
    String(value || '').replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');

  const readBodyText = async () =>
    normalizeWhitespace(
      await page
        .locator('body')
        .first()
        .innerText()
        .catch(() => '')
    );

  const waitForPageIdle = async (ms = 1_000) => {
    if (ms > 0) await wait(ms);
    await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
  };

  const humanClick = async (locator, options = {}) => {
    if (!locator) return false;
    const { pauseBefore = 350, pauseAfter = 500 } = options;
    if (pauseBefore > 0) await wait(pauseBefore);
    await locator.scrollIntoViewIfNeeded().catch(() => undefined);
    await locator.click({ force: true }).catch(() => undefined);
    if (pauseAfter > 0) await wait(pauseAfter);
    return true;
  };

  const firstVisible = async (selectors, root = page) => {
    for (const selector of selectors) {
      const locator = root.locator(selector).first();
      const count = await locator.count().catch(() => 0);
      if (!count) continue;
      const visible = await locator.isVisible().catch(() => false);
      if (visible) return locator;
    }
    return null;
  };

  ${TRADERA_COOKIE_DISMISSAL_SNIPPET}

  const isLoginPage = () => page.url().trim().toLowerCase().includes('/login');

  const resolveLabelLocators = (scope, label) => {
    const exactPattern = new RegExp('^' + escapeRegExp(label) + '$', 'i');
    const partialPattern = new RegExp(escapeRegExp(label), 'i');
    const escapedText = label.replace(/"/g, '\\"');

    return [
      scope.getByRole('menuitem', { name: exactPattern }).first(),
      scope.getByRole('button', { name: exactPattern }).first(),
      scope.getByRole('link', { name: exactPattern }).first(),
      scope.getByRole('menuitem', { name: partialPattern }).first(),
      scope.getByRole('button', { name: partialPattern }).first(),
      scope.getByRole('link', { name: partialPattern }).first(),
      scope
        .locator(
          'xpath=.//*[normalize-space(text())="' +
            escapedText +
            '"]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem"][1]'
        )
        .first(),
      scope
        .locator(
          'xpath=.//*[contains(normalize-space(text()),"' +
            escapedText +
            '")]/ancestor-or-self::*[self::button or self::a or @role="button" or @role="link" or @role="menuitem"][1]'
        )
        .first(),
    ];
  };

  const clickByLabels = async (scopes, labels, context) => {
    for (const scope of scopes) {
      if (!scope) continue;
      for (const label of labels) {
        const candidates = resolveLabelLocators(scope, label);
        for (const candidate of candidates) {
          const visible = await candidate.isVisible().catch(() => false);
          if (!visible) continue;
          log?.('tradera.move_to_unsold.click', { context, label });
          await humanClick(candidate);
          return { clicked: true, label };
        }
      }
    }

    return { clicked: false, label: null };
  };

  const clickEndListingAction = async () => {
    await dismissCookiesIfPresent({ context: 'pre-end-click' });
    const directClick = await clickByLabels([page], END_LISTING_LABELS, 'direct-end');
    if (directClick.clicked) {
      return directClick;
    }

    const menuTrigger = await firstVisible(LISTING_ACTION_MENU_TRIGGER_SELECTORS);
    if (!menuTrigger) {
      return { clicked: false, label: null };
    }

    await humanClick(menuTrigger);
    await wait(600);

    const menuClick = await clickByLabels([page], END_LISTING_LABELS, 'menu-end');
    if (menuClick.clicked) {
      return menuClick;
    }

    const intermediateClick = await clickByLabels(
      [page],
      EDIT_INTERMEDIATE_MENU_LABELS,
      'menu-intermediate'
    );
    if (intermediateClick.clicked) {
      await wait(500);
      return clickByLabels([page], END_LISTING_LABELS, 'menu-end-after-intermediate');
    }

    return { clicked: false, label: null };
  };

  const confirmEndListingIfNeeded = async () => {
    const dialog = page.locator('[role="dialog"], [aria-modal="true"], [data-testid*="modal"]').last();
    const dialogVisible = await dialog.isVisible().catch(() => false);
    if (!dialogVisible) {
      return false;
    }

    const confirmClick = await clickByLabels(
      [dialog, page],
      CONFIRM_END_LISTING_LABELS,
      'confirm-end'
    );
    if (!confirmClick.clicked) {
      throw new Error('FAIL_MOVE_TO_UNSOLD_CONFIRMATION: Could not confirm the Tradera end-listing action.');
    }

    await waitForPageIdle(1_000);
    return true;
  };

  const detectCurrentPageStatus = async () => {
    const currentUrl = page.url().trim().toLowerCase();
    const bodyText = normalizeForSearch(await readBodyText());

    if (
      currentUrl.includes('tab=unsold') ||
      UNSOLD_PAGE_HINTS.some((hint) => bodyText.includes(hint))
    ) {
      return 'unsold';
    }

    if (ENDED_HINTS.some((hint) => bodyText.includes(hint))) {
      return 'ended';
    }

    return null;
  };

  const verifyUnsoldOverview = async () => {
    const normalizedSearchTitle = normalizeForSearch(searchTitle);

    await page.goto(UNSOLD_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForPageIdle(1_200);
    await dismissCookiesIfPresent();

    if (isLoginPage()) {
      throw new Error(
        'AUTH_REQUIRED: Stored Tradera session redirected to login while verifying the Unsold overview.'
      );
    }

    const overviewHtml = await page.content().catch(() => '');
    const overviewText = normalizeForSearch(await readBodyText());

    if (
      externalListingId &&
      (overviewHtml.includes(externalListingId) ||
        overviewText.includes(normalizeForSearch(externalListingId)))
    ) {
      return true;
    }

    if (normalizedSearchTitle && overviewText.includes(normalizedSearchTitle)) {
      return true;
    }

    if (listingUrl && overviewHtml.includes(listingUrl)) {
      return true;
    }

    return false;
  };

  if (!TARGET_URL) {
    throw new Error(
      'FAIL_MOVE_TO_UNSOLD_TARGET: Tradera end listing requires a listing URL or external listing ID.'
    );
  }

  try {
    updateStep('browser_preparation', 'success', 'Browser settings were prepared.');
    updateStep('browser_open', 'success', 'Browser was opened successfully.');

    updateStep('listing_open', 'running', 'Opening the Tradera listing page.');
    await page.goto(TARGET_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForPageIdle(1_200);
    updateStep('listing_open', 'success', 'Tradera listing page opened successfully.');

    updateStep('cookie_accept', 'running', 'Checking for cookie consent banner.');
    const cookiesDismissed = await dismissCookiesIfPresent({ context: 'move-to-unsold' });
    updateStep(
      'cookie_accept',
      'success',
      cookiesDismissed ? 'Cookies accepted.' : 'No cookie banner detected.'
    );

    updateStep('auth_check', 'running', 'Validating Tradera session.');
    if (isLoginPage()) {
      updateStep('auth_check', 'error', 'Stored Tradera session redirected to login.');
      throw new Error(
        'AUTH_REQUIRED: Stored Tradera session redirected to login before the listing could be managed.'
      );
    }
    updateStep('auth_check', 'success', 'Tradera session is valid.');

    updateStep('end_listing_action', 'running', 'Opening Tradera listing actions.');
    const clickedAction = await clickEndListingAction();
    if (!clickedAction.clicked) {
      throw new Error(
        'FAIL_MOVE_TO_UNSOLD_ACTION: Could not find a Tradera end-listing action for this listing.'
      );
    }
    updateStep(
      'end_listing_action',
      'success',
      'Triggered the Tradera end-listing action using "' + clickedAction.label + '".'
    );

    updateStep('end_listing_confirm', 'running', 'Confirming the Tradera end-listing action.');
    const confirmationHandled = await confirmEndListingIfNeeded();
    updateStep(
      'end_listing_confirm',
      'success',
      confirmationHandled
        ? 'Confirmed the Tradera end-listing action.'
        : 'No additional confirmation dialog appeared.'
    );

    updateStep('end_listing_verify', 'running', 'Resolving the final Tradera status.');
    await waitForPageIdle(1_500);
    const currentStatus = await detectCurrentPageStatus();
    if (currentStatus === 'unsold') {
      updateStep('end_listing_verify', 'success', 'Listing reached the Unsold section.');
      updateStep('browser_close', 'success', 'Browser was closed.');
      emit('result', {
        status: 'unsold',
        listingUrl: listingUrl || TARGET_URL,
        externalListingId,
        verificationMethod: 'current-page-unsold',
        verifiedInUnsold: true,
        actionConfirmed: confirmationHandled,
        executionSteps,
        currentUrl: page.url(),
      });
      return;
    }

    const verifiedInUnsold = await verifyUnsoldOverview().catch(() => false);
    const finalStatus = verifiedInUnsold ? 'unsold' : currentStatus === 'ended' ? 'ended' : 'ended';
    const verificationMethod = verifiedInUnsold
      ? 'unsold-overview'
      : currentStatus === 'ended'
        ? 'current-page-ended'
        : 'ended-fallback';
    updateStep(
      'end_listing_verify',
      'success',
      finalStatus === 'unsold'
        ? 'Listing was verified in the Tradera Unsold section.'
        : 'Listing was treated as ended after the Tradera end-listing action.'
    );
    updateStep('browser_close', 'success', 'Browser was closed.');
    emit('result', {
      status: finalStatus,
      listingUrl: listingUrl || TARGET_URL,
      externalListingId,
      verificationMethod,
      verifiedInUnsold,
      actionConfirmed: confirmationHandled,
      executionSteps,
      currentUrl: page.url(),
    });
  } catch (error) {
    updateStep('browser_close', 'success', 'Browser was closed.');
    throw error;
  }
}`;

export const TRADERA_MOVE_TO_UNSOLD_SCRIPT = buildTraderaMoveToUnsoldScript();
