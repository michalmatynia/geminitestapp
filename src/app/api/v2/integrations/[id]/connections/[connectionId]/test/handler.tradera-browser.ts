import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  normalizeTraderaListingFormUrl,
} from '@/features/integrations/constants/tradera';
import { decryptSecret } from '@/features/integrations/server';
import { createTraderaBrowserTestUtils } from '@/features/integrations/services/tradera-browser-test-utils';
import {
  acceptTraderaCookies,
  readTraderaAuthState,
  type TraderaAuthState,
} from '@/features/integrations/services/tradera-listing/tradera-browser-auth';
import {
  validateTraderaQuickListProductConfig,
} from '@/features/integrations/services/tradera-listing/preflight';
import {
  LOGIN_BUTTON_SELECTORS,
  PASSWORD_SELECTORS,
  TITLE_SELECTORS,
  TRADERA_EMAIL_VERIFICATION_CODE_INPUT_SELECTORS,
  TRADERA_EMAIL_VERIFICATION_SUBMIT_SELECTORS,
  USERNAME_SELECTORS,
} from '@/features/integrations/services/tradera-listing/config';
import { resolveTraderaEmailVerificationCode } from '@/features/integrations/services/tradera-listing/tradera-auth-email-code';
import { findVisibleLocator } from '@/features/integrations/services/tradera-listing/utils';
import {
  createPlaywrightConnectionTestFailureResponse,
  createPlaywrightConnectionTestSuccessResponse,
  openPlaywrightConnectionTestSession,
  persistPlaywrightConnectionTestSession,
  resolvePlaywrightConnectionTestRuntime,
} from '@/features/playwright/server';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { internalError } from '@/shared/errors/app-error';
import type { Locator, Page } from 'playwright';

const QUICKLIST_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.';
const TRADERA_LISTING_FORM_URL = normalizeTraderaListingFormUrl(
  DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl
);
const SESSION_CHECK_URL = 'https://www.tradera.com/en/my/listings?tab=active';

import {
  type ConnectionTestContext,
} from './types';

export async function handleTraderaBrowserTest(
  ctx: ConnectionTestContext
): Promise<Response> {
  const {
    connection,
    repo,
    manualMode,
    manualSessionRefreshMode,
    quicklistPreflightMode,
    manualLoginTimeoutMs,
    productId,
    steps,
    pushStep,
    fail,
  } = {
    ...ctx,
    manualMode: ctx.manualMode === true || ctx.mode === 'manual',
    manualSessionRefreshMode:
      ctx.manualSessionRefreshMode === true || ctx.mode === 'manual_session_refresh',
    quicklistPreflightMode:
      ctx.quicklistPreflightMode === true || ctx.mode === 'quicklist_preflight',
  };

  // In quicklist preflight mode, validate the product config before launching the browser.
  const requestedProductId = typeof productId === 'string' ? productId.trim() : '';
  if (quicklistPreflightMode && requestedProductId.length > 0) {
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(requestedProductId);
    await validateTraderaQuickListProductConfig({ product, connection });
  }

  // Decrypt to ensure credentials are readable with the configured key.
  pushStep(
    'Decrypting credentials',
    'pending',
    'Validating encryption key and decrypting password'
  );
  const encryptedPassword = typeof connection.password === 'string' ? connection.password : '';
  const hasEncryptedPassword = encryptedPassword.trim().length > 0;
  const requiresStoredCredentials =
    !manualMode && !manualSessionRefreshMode && !quicklistPreflightMode;
  if (requiresStoredCredentials && !hasEncryptedPassword) {
    return fail('Decrypting credentials', 'No encrypted password configured for this connection.');
  }
  const loginUsername = connection.username?.trim() ?? '';
  if (requiresStoredCredentials && loginUsername.length === 0) {
    return fail('Decrypting credentials', 'No username configured for this connection.');
  }
  let decryptedPassword = '';
  let credentialsDecryptStatus = 'No stored credentials available for manual autofill.';
  if (quicklistPreflightMode) {
    credentialsDecryptStatus = 'Skipped during quicklist preflight.';
  }
  if (!quicklistPreflightMode && loginUsername.length > 0 && hasEncryptedPassword) {
    try {
      decryptedPassword = decryptSecret(encryptedPassword);
      credentialsDecryptStatus = requiresStoredCredentials
        ? 'Password decrypted successfully'
        : 'Stored credentials ready for login autofill.';
    } catch (error) {
      if (requiresStoredCredentials) {
        throw error;
      }
      credentialsDecryptStatus =
        'Stored password could not be decrypted; credentials will need manual entry.';
    }
  }
  let manualLoginCredentials: { username: string; password: string } | null = null;
  if (
    (manualMode || manualSessionRefreshMode) &&
    loginUsername.length > 0 &&
    decryptedPassword.length > 0
  ) {
    manualLoginCredentials = {
      username: loginUsername,
      password: decryptedPassword,
    };
  }
  pushStep('Decrypting credentials', 'ok', credentialsDecryptStatus);
  let page: Page | null = null;
  let closeSession: (() => Promise<void>) | null = null;

  try {
    const runtime = await resolvePlaywrightConnectionTestRuntime({
      connection,
      pushStep,
      storedSession: {
        loadedDetail: 'Stored session loaded successfully',
        missingDetail: 'Stored session was corrupt or invalid (skipped)',
        missingStatus: 'ok',
      },
    });
    const playwrightSettings = runtime.settings;
    let effectiveHeadless = playwrightSettings.headless;
    if (quicklistPreflightMode) {
      effectiveHeadless = true;
    } else if (manualMode || manualSessionRefreshMode) {
      effectiveHeadless = false;
    }

    const session = await openPlaywrightConnectionTestSession({
      connection,
      pushStep,
      runtime,
      headless: effectiveHeadless,
      launchSettingsOverrides: {
        slowMo: quicklistPreflightMode ? 0 : playwrightSettings.slowMo,
      },
      launchStep: {
        stepName: 'Launching browser',
        pendingDetail: 'Starting isolated Chromium instance',
        successDetail: 'Browser ready',
      },
    });
    closeSession = session.close;
    page = session.page;

    const humanizeMouse = quicklistPreflightMode
      ? false
      : playwrightSettings.humanizeMouse;
    const mouseJitter =
      quicklistPreflightMode ? 0 : Math.max(0, playwrightSettings.mouseJitter);
    const clickDelayMin = quicklistPreflightMode
      ? 0
      : Math.max(0, playwrightSettings.clickDelayMin);
    const clickDelayMax = Math.max(
      clickDelayMin,
      quicklistPreflightMode ? clickDelayMin : playwrightSettings.clickDelayMax
    );
    const inputDelayMin = quicklistPreflightMode
      ? 0
      : Math.max(0, playwrightSettings.inputDelayMin);
    const inputDelayMax = Math.max(
      inputDelayMin,
      quicklistPreflightMode ? inputDelayMin : playwrightSettings.inputDelayMax
    );
    const actionDelayMin = quicklistPreflightMode
      ? 0
      : Math.max(0, playwrightSettings.actionDelayMin);
    const actionDelayMax = Math.max(
      actionDelayMin,
      quicklistPreflightMode ? actionDelayMin : playwrightSettings.actionDelayMax
    );
    const activePage = session.page;
    const utils = createTraderaBrowserTestUtils({
      page: activePage,
      connectionId: connection.id,
      fail,
      humanizeMouse,
      mouseJitter,
      clickDelayMin,
      clickDelayMax,
      inputDelayMin,
      inputDelayMax,
      actionDelayMin,
      actionDelayMax,
    });
    const acceptCookies = async (): Promise<void> => {
      await utils.acceptCookieConsent().catch(() => undefined);
      await acceptTraderaCookies(activePage).catch(() => undefined);
    };
    const readAuthState = (): Promise<TraderaAuthState> => readTraderaAuthState(activePage);
    const isUserLoggedIn = async (): Promise<boolean> => (await readAuthState()).loggedIn;
    const waitForManualLogin = async (timeoutMs: number): Promise<boolean> => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        await acceptCookies();
        if (await isUserLoggedIn()) {
          return true;
        }
        await activePage.waitForTimeout(1000).catch(() => undefined);
      }

      return false;
    };
    const findLoginControls = async (): Promise<{
      usernameInput: Locator;
      passwordInput: Locator;
      submitButton: Locator;
    } | null> => {
      const usernameInput = await findVisibleLocator(activePage, USERNAME_SELECTORS);
      const passwordInput = await findVisibleLocator(activePage, PASSWORD_SELECTORS);
      const submitButton = await findVisibleLocator(activePage, LOGIN_BUTTON_SELECTORS);

      if (!usernameInput || !passwordInput || !submitButton) {
        return null;
      }

      return { usernameInput, passwordInput, submitButton };
    };
    const findEmailVerificationControls = async (
      timeoutMs = 10_000
    ): Promise<{
      codeInput: Locator;
      submitButton: Locator | null;
    } | null> => {
      const codeInput = activePage
        .locator(TRADERA_EMAIL_VERIFICATION_CODE_INPUT_SELECTORS.join(', '))
        .first();
      await codeInput.waitFor({ state: 'visible', timeout: timeoutMs }).catch(() => undefined);
      const codeInputVisible = await codeInput.isVisible().catch(() => false);
      if (!codeInputVisible) {
        return null;
      }

      return {
        codeInput,
        submitButton: await findVisibleLocator(
          activePage,
          TRADERA_EMAIL_VERIFICATION_SUBMIT_SELECTORS
        ),
      };
    };
    const fillAndSubmitLoginCredentials = async (
      username: string,
      password: string,
      controls: {
        usernameInput: Locator;
        passwordInput: Locator;
        submitButton: Locator;
      }
    ): Promise<string> => {
      const credentialSubmittedAt = new Date().toISOString();
      await utils.humanizedFill(controls.usernameInput, username);
      await utils.humanizedFill(controls.passwordInput, password);
      await utils.humanizedPause();
      await Promise.allSettled([
        activePage.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        }),
        utils.humanizedClick(controls.submitButton),
      ]);
      await activePage.waitForTimeout(1500).catch(() => undefined);
      await acceptCookies();
      return credentialSubmittedAt;
    };
    const performLogin = async (username: string, password: string): Promise<string> => {
      const controls = await findLoginControls();
      if (controls === null) {
        throw internalError('Unable to locate Tradera login form controls.');
      }

      return fillAndSubmitLoginCredentials(username, password, controls);
    };
    const submitTraderaEmailVerificationCode = async (
      stepLabel: string,
      requestedAfter: string
    ): Promise<boolean> => {
      if (await isUserLoggedIn()) {
        return true;
      }

      const verificationControls = await findEmailVerificationControls();
      if (verificationControls === null || loginUsername.length === 0) {
        return false;
      }

      pushStep(
        stepLabel,
        'pending',
        'Waiting for Tradera verification code from email.'
      );
      const verificationCode = await resolveTraderaEmailVerificationCode({
        emailAddress: loginUsername,
        requestedAfter,
        timeoutMs: Math.min(manualLoginTimeoutMs, 120_000),
      });
      if (verificationCode === null) {
        pushStep(
          stepLabel,
          'pending',
          'Tradera verification code was not found in email; waiting for manual entry.'
        );
        return false;
      }

      await utils.humanizedFill(verificationControls.codeInput, verificationCode.code);
      if (verificationControls.submitButton !== null) {
        await utils.humanizedClick(verificationControls.submitButton);
      } else {
        await activePage.keyboard.press('Enter');
      }
      await activePage.waitForTimeout(1500).catch(() => undefined);
      await acceptCookies();
      pushStep(
        stepLabel,
        'pending',
        'Tradera verification code submitted from email.'
      );
      return true;
    };
    const autofillManualLoginCredentials = async (stepLabel: string): Promise<void> => {
      if (!manualLoginCredentials) {
        return;
      }

      const controls = await findLoginControls();
      if (controls === null) {
        pushStep(
          stepLabel,
          'pending',
          'Stored credentials were ready, but Tradera login fields were not visible yet.'
        );
        return;
      }

      const credentialSubmittedAt = await fillAndSubmitLoginCredentials(
        manualLoginCredentials.username,
        manualLoginCredentials.password,
        controls
      );
      pushStep(
        stepLabel,
        'pending',
        'Stored credentials submitted; checking for Tradera email verification.'
      );
      await submitTraderaEmailVerificationCode(stepLabel, credentialSubmittedAt);
    };
    const isListingFormVisible = async (): Promise<boolean> => {
      for (const selector of TITLE_SELECTORS) {
        const locator = activePage.locator(selector).first();
        if (await utils.safeIsVisible(locator, 'Listing form field')) return true;
      }
      return false;
    };

    if (quicklistPreflightMode) {
      // Auth check only — no listing form navigation or session save needed for preflight.
      pushStep('Preflight validation', 'pending', 'Checking active listing session');
      await utils.safeGoto(
        SESSION_CHECK_URL,
        { waitUntil: 'domcontentloaded', timeout: 30_000 },
        'Session check'
      );
      await acceptCookies();

      const isSessionActive = await isUserLoggedIn();
      if (!isSessionActive) {
        pushStep('Preflight validation', 'failed', 'Stored session expired');
        throw internalError(QUICKLIST_AUTH_REQUIRED_DETAIL);
      }
      pushStep('Preflight validation', 'ok', 'Stored session active');

      return createPlaywrightConnectionTestSuccessResponse({
        message: 'Tradera session is active.',
        steps,
        sessionReady: true,
      });
    } if (manualMode || manualSessionRefreshMode) {
      const stepLabel = manualSessionRefreshMode ? 'Session refresh' : 'Manual login';
      let sessionAlreadyActive = false;

      if (!manualSessionRefreshMode) {
        pushStep(stepLabel, 'pending', 'Checking current session status...');

        await utils.safeGoto(
          SESSION_CHECK_URL,
          { waitUntil: 'domcontentloaded', timeout: 30_000 },
          'Session check'
        );
        await acceptCookies();

        sessionAlreadyActive = await isUserLoggedIn();
      } else {
        pushStep(
          stepLabel,
          'pending',
          'Opening Tradera login page to refresh the saved browser session...'
        );
      }

      if (manualSessionRefreshMode || !sessionAlreadyActive) {
        pushStep(
          stepLabel,
          'pending',
          manualSessionRefreshMode
            ? 'Navigating to login page for manual session refresh...'
            : 'Session expired — navigating to login page...'
        );
        await activePage.goto('https://www.tradera.com/login', {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        await acceptCookies();
        await autofillManualLoginCredentials(stepLabel);

        pushStep(
          stepLabel,
          'pending',
          `Waiting up to ${Math.round(manualLoginTimeoutMs / 1000)}s for user action...`
        );

        const success = await waitForManualLogin(manualLoginTimeoutMs);
        if (!success) {
          return fail(
            stepLabel,
            `Manual action timed out after ${Math.round(manualLoginTimeoutMs / 1000)}s.`
          );
        }
      }
      pushStep(stepLabel, 'ok', sessionAlreadyActive ? 'Session already active' : 'Success');
    } else {
      pushStep('Authentication', 'pending', `Attempting login as ${loginUsername}...`);
      await activePage.goto('https://www.tradera.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await acceptCookies();

      const isLoggedIn = await isUserLoggedIn();
      if (isLoggedIn) {
        pushStep('Authentication', 'ok', 'Already logged in (session restored)');
      } else {
        const credentialSubmittedAt = await performLogin(loginUsername, decryptedPassword);
        await submitTraderaEmailVerificationCode('Authentication', credentialSubmittedAt);
        const postLoginOk = await isUserLoggedIn();
        if (!postLoginOk) {
          const authState = await readAuthState();
          if (authState.captchaDetected) {
            pushStep('Authentication', 'failed', 'CAPTCHA detected');
            throw internalError(
              'AUTH_REQUIRED: Tradera requires CAPTCHA verification. Please use manual login mode.'
            );
          }
          if (authState.manualVerificationDetected) {
            pushStep('Authentication', 'failed', 'Manual verification required');
            throw internalError(
              'AUTH_REQUIRED: Tradera requires manual verification. Please use manual login mode.'
            );
          }
          return fail('Authentication', 'Login failed. Please check credentials or use manual mode.');
        }
        pushStep('Authentication', 'ok', 'Logged in successfully');
      }
    }

    pushStep('Accessing listing form', 'pending', 'Navigating to quick-list form');
    await utils.safeGoto(
      TRADERA_LISTING_FORM_URL,
      { waitUntil: 'domcontentloaded', timeout: 30_000 },
      'Sell page check'
    );
    await acceptCookies();

    const formVisible = await isListingFormVisible();
    if (!formVisible) {
      const finalAuthState = await readAuthState();
      if (!finalAuthState.loggedIn) {
        pushStep('Accessing listing form', 'failed', 'Session expired during navigation');
        throw internalError(
          'AUTH_REQUIRED: Session expired while navigating to listing form. Please refresh session.'
        );
      }
      return fail('Accessing listing form', 'Quick-list form not found after login.');
    }
    pushStep('Accessing listing form', 'ok', 'Listing form accessible');

    await persistPlaywrightConnectionTestSession({
      connectionId: connection.id,
      page: activePage,
      repo,
      pushStep,
      pendingDetail: 'Capturing cookies and local storage',
      successDetail: 'Playwright session updated',
      failureDetail: 'Failed to store session',
    });

    return createPlaywrightConnectionTestSuccessResponse({
      message: manualSessionRefreshMode
        ? 'Tradera session refreshed successfully.'
        : 'Tradera browser connection test successful.',
      steps,
      sessionReady: true,
    });
  } catch (error: unknown) {
    if ((manualMode || manualSessionRefreshMode) && page !== null) {
      await page.waitForTimeout(2000).catch(() => undefined);
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    pushStep('Connection test', 'failed', errorMsg);

    return createPlaywrightConnectionTestFailureResponse({
      message: errorMsg,
      steps,
    });
  } finally {
    await page?.close().catch(() => undefined);
    await closeSession?.().catch(() => undefined);
  }
}
