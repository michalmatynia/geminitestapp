import { NextResponse } from 'next/server';
import { devices, type BrowserContextOptions } from 'playwright';
import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  normalizeTraderaListingFormUrl,
} from '@/features/integrations/constants/tradera';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import { createTraderaBrowserTestUtils } from '@/features/integrations/services/tradera-browser-test-utils';
import {
  acceptTraderaCookies,
  readTraderaAuthState,
} from '@/features/integrations/services/tradera-listing/tradera-browser-auth';
import {
  validateTraderaQuickListProductConfig,
} from '@/features/integrations/services/tradera-listing/preflight';
import {
  LOGIN_BUTTON_SELECTORS,
  PASSWORD_SELECTORS,
  TITLE_SELECTORS,
  USERNAME_SELECTORS,
} from '@/features/integrations/services/tradera-listing/config';
import { findVisibleLocator } from '@/features/integrations/services/tradera-listing/utils';
import {
  parsePersistedStorageState,
  resolveConnectionPlaywrightSettings,
} from '@/features/integrations/services/tradera-playwright-settings';
import { getProductRepository } from '@/shared/lib/products/services/product-repository';
import { type IntegrationConnectionRecord, type IntegrationRepository, type TestConnectionResponse, type TestLogEntry } from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';
import { launchPlaywrightBrowser } from '@/shared/lib/playwright/browser-launch';
import type { Browser, BrowserContext, Page } from 'playwright';

const QUICKLIST_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.';
const TRADERA_LISTING_FORM_URL = normalizeTraderaListingFormUrl(
  DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl
);
const SESSION_CHECK_URL = 'https://www.tradera.com/en/my/listings?tab=active';

type PushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => void;
type Fail = (step: string, detail: string, status?: number) => Promise<never>;
type ConnectionUpdateRepository = Pick<IntegrationRepository, 'updateConnection'>;

export async function handleTraderaBrowserTest(
  connection: IntegrationConnectionRecord,
  repo: ConnectionUpdateRepository,
  mode: 'manual' | 'manual_session_refresh' | 'quicklist_preflight' | 'auto',
  manualLoginTimeoutMs: number,
  productId: string | null,
  steps: TestLogEntry[],
  pushStep: PushStep,
  fail: Fail
): Promise<Response> {
  const manualMode = mode === 'manual';
  const manualSessionRefreshMode = mode === 'manual_session_refresh';
  const quicklistPreflightMode = mode === 'quicklist_preflight';

  // In quicklist preflight mode, validate the product config before launching the browser.
  if (quicklistPreflightMode && productId) {
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (product) {
      await validateTraderaQuickListProductConfig({ product, connection });
    }
  }

  // Decrypt to ensure credentials are readable with the configured key.
  pushStep(
    'Decrypting credentials',
    'pending',
    'Validating encryption key and decrypting password'
  );
  const encryptedPassword = connection.password;
  if (!manualMode && !manualSessionRefreshMode && !quicklistPreflightMode && !encryptedPassword) {
    return fail('Decrypting credentials', 'No encrypted password configured for this connection.');
  }
  const loginUsername = connection.username;
  if (!manualMode && !manualSessionRefreshMode && !quicklistPreflightMode && !loginUsername) {
    return fail('Decrypting credentials', 'No username configured for this connection.');
  }
  const resolvedLoginUsername: string = loginUsername ?? '';
  const decryptedPassword: string =
    manualMode || manualSessionRefreshMode || quicklistPreflightMode
      ? ''
      : decryptSecret(encryptedPassword as string);
  pushStep(
    'Decrypting credentials',
    'ok',
    manualMode || manualSessionRefreshMode || quicklistPreflightMode
      ? 'Skipped in non-credential mode.'
      : 'Password decrypted successfully'
  );

  if (connection.playwrightStorageState) {
    pushStep('Loading session', 'pending', 'Loading stored Playwright session');
    const storedState = parsePersistedStorageState(connection.playwrightStorageState);
    if (storedState) {
      pushStep('Loading session', 'ok', 'Stored session loaded successfully');
    } else {
      pushStep('Loading session', 'ok', 'Stored session was corrupt or invalid (skipped)');
    }
  }

  pushStep('Launching browser', 'pending', 'Starting isolated Chromium instance');
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
    const effectiveHeadless = quicklistPreflightMode
      ? true
      : manualMode || manualSessionRefreshMode
        ? false
        : playwrightSettings.headless;
    const emulateDevice = playwrightSettings.emulateDevice;
    const deviceName = playwrightSettings.deviceName;
    const deviceProfile =
      emulateDevice && deviceName && devices[deviceName] ? devices[deviceName] : null;

    const launchResult = await launchPlaywrightBrowser(playwrightSettings.browser, {
      headless: effectiveHeadless,
      slowMo: quicklistPreflightMode ? 0 : playwrightSettings.slowMo,
      ...(playwrightSettings.proxyEnabled && playwrightSettings.proxyServer
        ? {
          proxy: {
            server: playwrightSettings.proxyServer,
            ...(playwrightSettings.proxyUsername
              ? { username: playwrightSettings.proxyUsername }
              : {}),
            ...(playwrightSettings.proxyPassword
              ? { password: playwrightSettings.proxyPassword }
              : {}),
          },
        }
        : {}),
    });
    browser = launchResult.browser;
    for (const msg of launchResult.fallbackMessages) {
      pushStep('Browser selection', 'ok', msg);
    }
    pushStep('Browser selection', 'ok', `Using ${launchResult.label}.`);

    const deviceContextOptions: BrowserContextOptions = deviceProfile
      ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
      : {};

    const resolvedStorageState =
      parsePersistedStorageState(connection.playwrightStorageState) ?? undefined;
    context = await browser.newContext({
      ...deviceContextOptions,
      ...(resolvedStorageState ? { storageState: resolvedStorageState } : {}),
    });
    context.setDefaultTimeout(playwrightSettings.timeout);
    context.setDefaultNavigationTimeout(playwrightSettings.navigationTimeout);

    page = await context.newPage();
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
    const activePage = page;
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
    const readAuthState = async () => await readTraderaAuthState(activePage);
    const isUserLoggedIn = async (): Promise<boolean> => (await readAuthState()).loggedIn;
    const waitForManualLogin = async (timeoutMs: number): Promise<boolean> => {
      const deadline = Date.now() + timeoutMs;

      while (Date.now() < deadline) {
        if (await isUserLoggedIn()) {
          return true;
        }
        await activePage.waitForTimeout(1000).catch(() => undefined);
      }

      return false;
    };
    const performLogin = async (username: string, password: string): Promise<void> => {
      const usernameInput = await findVisibleLocator(activePage, USERNAME_SELECTORS);
      const passwordInput = await findVisibleLocator(activePage, PASSWORD_SELECTORS);
      const submitButton = await findVisibleLocator(activePage, LOGIN_BUTTON_SELECTORS);

      if (!usernameInput || !passwordInput || !submitButton) {
        throw internalError('Unable to locate Tradera login form controls.');
      }

      await utils.humanizedFill(usernameInput, username);
      await utils.humanizedFill(passwordInput, password);
      await utils.humanizedPause();
      await Promise.allSettled([
        activePage.waitForNavigation({
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        }),
        utils.humanizedClick(submitButton),
      ]);
      await activePage.waitForTimeout(1500).catch(() => undefined);
      await acceptCookies();
    };
    const isListingFormVisible = async (): Promise<boolean> => {
      for (const selector of TITLE_SELECTORS) {
        const locator = activePage.locator(selector).first();
        if (await utils.safeIsVisible(locator, 'Listing form field')) return true;
      }
      return false;
    };

    pushStep('Launching browser', 'ok', 'Browser ready');

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

      const response: TestConnectionResponse = {
        ok: true,
        message: 'Tradera session is active.',
        steps,
        sessionReady: true,
      };
      return NextResponse.json(response);
    } else if (manualMode || manualSessionRefreshMode) {
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
      pushStep('Authentication', 'pending', `Attempting login as ${resolvedLoginUsername}...`);
      await activePage.goto('https://www.tradera.com/login', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await acceptCookies();

      const isLoggedIn = await isUserLoggedIn();
      if (isLoggedIn) {
        pushStep('Authentication', 'ok', 'Already logged in (session restored)');
      } else {
        await performLogin(resolvedLoginUsername, decryptedPassword);
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

    pushStep('Saving session', 'pending', 'Capturing cookies and local storage');
    const newState = await activePage.context().storageState();
    const encryptedState = encryptSecret(JSON.stringify(newState));
    await repo.updateConnection(connection.id, {
      playwrightStorageState: encryptedState,
      playwrightStorageStateUpdatedAt: new Date().toISOString(),
    });
    pushStep('Saving session', 'ok', 'Playwright session updated');

    const response: TestConnectionResponse = {
      ok: true,
      message: manualSessionRefreshMode
        ? 'Tradera session refreshed successfully.'
        : 'Tradera browser connection test successful.',
      steps,
      sessionReady: true,
    };
    return NextResponse.json(response);
  } catch (error: unknown) {
    if (manualMode || manualSessionRefreshMode) {
      await page?.waitForTimeout?.(2000);
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    pushStep('Connection test', 'failed', errorMsg);

    const response: TestConnectionResponse = {
      ok: false,
      message: errorMsg,
      steps,
    };
    return NextResponse.json(response, { status: errorMsg.includes('AUTH_REQUIRED') ? 401 : 400 });
  } finally {
    await browser?.close();
  }
}
