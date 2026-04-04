import { NextResponse } from 'next/server';
import { chromium, devices, type BrowserContextOptions } from 'playwright';
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
import {
  type IntegrationConnectionRecord,
  type IntegrationRepository,
  type TestConnectionResponse,
  type TestLogEntry,
} from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';
import type { Browser, BrowserContext, Page } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const QUICKLIST_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.';
const TRADERA_LISTING_FORM_URL = normalizeTraderaListingFormUrl(
  DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl
);

type PushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => void;
type Fail = (step: string, detail: string, status?: number) => Promise<never>;
type ConnectionUpdateRepository = Pick<IntegrationRepository, 'updateConnection'>;

export async function handleTraderaBrowserTest(
  connection: IntegrationConnectionRecord,
  repo: ConnectionUpdateRepository,
  mode: 'manual' | 'manual_session_refresh' | 'quicklist_preflight' | 'auto',
  manualLoginTimeoutMs: number,
  steps: TestLogEntry[],
  pushStep: PushStep,
  fail: Fail
): Promise<Response> {
  const manualMode = mode === 'manual';
  const manualSessionRefreshMode = mode === 'manual_session_refresh';
  const quicklistPreflightMode = mode === 'quicklist_preflight';

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
    try {
      const storedState = parsePersistedStorageState(connection.playwrightStorageState);
      if (storedState) {
        pushStep('Loading session', 'ok', 'Stored session loaded successfully');
      } else {
        pushStep('Loading session', 'ok', 'Stored session was empty or invalid (skipped)');
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      pushStep('Loading session', 'ok', 'Stored session was corrupt or invalid (skipped)');
    }
  }

  pushStep('Launching browser', 'pending', 'Starting isolated Chromium instance');
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const playwrightSettings = await resolveConnectionPlaywrightSettings(connection);
    const effectiveHeadless =
      manualMode || manualSessionRefreshMode ? false : playwrightSettings.headless;
    const emulateDevice = playwrightSettings.emulateDevice;
    const deviceName = playwrightSettings.deviceName;
    const deviceProfile =
      emulateDevice && deviceName && devices[deviceName] ? devices[deviceName] : null;

    browser = await chromium.launch({
      headless: effectiveHeadless,
      slowMo: manualMode || manualSessionRefreshMode ? 250 : playwrightSettings.slowMo,
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

    const deviceContextOptions: BrowserContextOptions = deviceProfile
      ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
      : {};

    context = await browser.newContext({
      ...deviceContextOptions,
      ...(connection.playwrightStorageState
        ? {
            storageState: parsePersistedStorageState(connection.playwrightStorageState) ?? undefined,
          }
        : {}),
    });
    context.setDefaultTimeout(playwrightSettings.timeout);
    context.setDefaultNavigationTimeout(playwrightSettings.navigationTimeout);

    page = await context.newPage();
    const humanizeMouse = quicklistPreflightMode
      ? false
      : (connection.playwrightHumanizeMouse ?? false);
    const mouseJitter =
      quicklistPreflightMode ? 0 : Math.max(0, connection.playwrightMouseJitter ?? 0);
    const clickDelayMin = quicklistPreflightMode
      ? 0
      : Math.max(0, connection.playwrightClickDelayMin ?? 0);
    const clickDelayMax = Math.max(
      clickDelayMin,
      quicklistPreflightMode ? clickDelayMin : (connection.playwrightClickDelayMax ?? clickDelayMin)
    );
    const inputDelayMin = quicklistPreflightMode
      ? 0
      : Math.max(0, connection.playwrightInputDelayMin ?? 0);
    const inputDelayMax = Math.max(
      inputDelayMin,
      quicklistPreflightMode ? inputDelayMin : (connection.playwrightInputDelayMax ?? inputDelayMin)
    );
    const actionDelayMin = quicklistPreflightMode
      ? 0
      : Math.max(0, connection.playwrightActionDelayMin ?? 0);
    const actionDelayMax = Math.max(
      actionDelayMin,
      quicklistPreflightMode
        ? actionDelayMin
        : (connection.playwrightActionDelayMax ?? actionDelayMin)
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
    const isListingFormVisible = async (): Promise<boolean> =>
      (await findVisibleLocator(activePage, TITLE_SELECTORS)) !== null;

    pushStep('Launching browser', 'ok', 'Browser ready');

    if (quicklistPreflightMode) {
      pushStep('Preflight validation', 'pending', 'Checking active listing session');
      const isSessionActive = await isUserLoggedIn();
      if (!isSessionActive) {
        pushStep('Preflight validation', 'failed', 'Stored session expired');
        throw internalError(QUICKLIST_AUTH_REQUIRED_DETAIL);
      }
      pushStep('Preflight validation', 'ok', 'Stored session active');
    } else if (manualMode || manualSessionRefreshMode) {
      pushStep(
        manualSessionRefreshMode ? 'Session refresh' : 'Manual login',
        'pending',
        manualSessionRefreshMode
          ? 'Navigating to session dashboard...'
          : 'Navigating to login page...'
      );
      await page.goto(
        manualSessionRefreshMode ? 'https://www.tradera.com/en/my/' : 'https://www.tradera.com/login',
        {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        }
      );
      await acceptCookies();

      pushStep(
        manualSessionRefreshMode ? 'Session refresh' : 'Manual login',
        'pending',
        `Waiting up to ${Math.round(manualLoginTimeoutMs / 1000)}s for user action...`
      );

      const success = await waitForManualLogin(manualLoginTimeoutMs);
      if (!success) {
        return fail(
          manualSessionRefreshMode ? 'Session refresh' : 'Manual login',
          `Manual action timed out after ${Math.round(manualLoginTimeoutMs / 1000)}s.`
        );
      }
      pushStep(manualSessionRefreshMode ? 'Session refresh' : 'Manual login', 'ok', 'Success');
    } else {
      pushStep('Authentication', 'pending', `Attempting login as ${resolvedLoginUsername}...`);
      await page.goto('https://www.tradera.com/login', {
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
    await page.goto(TRADERA_LISTING_FORM_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
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
    const newState = await context.storageState();
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
    };
    return NextResponse.json(response);
  } catch (error: unknown) {
    if (manualMode || manualSessionRefreshMode) {
      await page?.waitForTimeout(2000).catch(() => undefined);
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
