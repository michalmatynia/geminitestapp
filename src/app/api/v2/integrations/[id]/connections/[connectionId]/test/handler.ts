import { handleLinkedinApiTest } from './handler.linkedin';
import { handleTraderaApiTest } from './handler.tradera-api';
import { NextRequest, NextResponse } from 'next/server';
import { chromium, devices, type BrowserContextOptions } from 'playwright';

import {
  isTraderaApiIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  DEFAULT_TRADERA_SYSTEM_SETTINGS,
  normalizeTraderaListingFormUrl,
} from '@/features/integrations/constants/tradera';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { createTraderaBrowserTestUtils } from '@/features/integrations/services/tradera-browser-test-utils';
import {
  resolveConnectionPlaywrightSettings,
  type PersistedStorageState,
} from '@/features/integrations/services/tradera-playwright-settings';
import { integrationConnectionTestRequestSchema } from '@/shared/contracts/integrations/session-testing';
import { type IntegrationConnectionTestRequest, type TestConnectionResponse, type TestLogEntry } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { internalError } from '@/shared/errors/app-error';
import { mapStatusToAppError } from '@/shared/errors/error-mapper';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

import type { Browser, BrowserContext, Page } from 'playwright';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const DEFAULT_MANUAL_LOGIN_TIMEOUT_MS = 240000;
const MAX_MANUAL_LOGIN_TIMEOUT_MS = 600000;
const QUICKLIST_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Stored Tradera session expired or is missing. Open Tradera recovery options and refresh the session.';
const TRADERA_LISTING_FORM_URL = normalizeTraderaListingFormUrl(
  DEFAULT_TRADERA_SYSTEM_SETTINGS.listingFormUrl
);


/**
 * POST /api/v2/integrations/[id]/connections/[connectionId]/test
 * Performs a lightweight credential check for the integration connection.
 */
export async function postTestConnectionHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; connectionId: string }
): Promise<Response> {
  let integrationId: string | null;
  let integrationConnectionId: string | null;
  const steps: TestLogEntry[] = [];

  let requestBody: IntegrationConnectionTestRequest = {};
  const parsedBody = await parseJsonBody(req, integrationConnectionTestRequestSchema, {
    allowEmpty: true,
    logPrefix: 'integrations.connections.test',
  });
  if (parsedBody.ok) {
    requestBody = parsedBody.data;
  }

  const mode =
    requestBody.mode === 'manual'
      ? 'manual'
      : requestBody.mode === 'quicklist_preflight'
        ? 'quicklist_preflight'
        : 'auto';
  const manualMode = mode === 'manual';
  const quicklistPreflightMode = mode === 'quicklist_preflight';
  const rawManualTimeout = requestBody.manualTimeoutMs;
  const manualLoginTimeoutMs =
    typeof rawManualTimeout === 'number' && Number.isFinite(rawManualTimeout)
      ? Math.max(30_000, Math.min(MAX_MANUAL_LOGIN_TIMEOUT_MS, Math.floor(rawManualTimeout)))
      : DEFAULT_MANUAL_LOGIN_TIMEOUT_MS;

  const pushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => {
    steps.push({
      step,
      status,
      detail,
      timestamp: new Date().toISOString(),
    });
  };

  const fail = async (step: string, detail: string, status = 400) => {
    const safeDetail = detail?.trim() ? detail : 'Unknown error';
    pushStep(step, 'failed', safeDetail);

    throw mapStatusToAppError(safeDetail, status);
  };

  const { id, connectionId } = params;
  integrationId = id;
  integrationConnectionId = connectionId;
  if (!integrationId || !integrationConnectionId) {
    return fail('Loading connection', 'Integration id and connection id are required', 400);
  }

  pushStep('Loading connection', 'pending', 'Fetching stored credentials');
  const repo = await getIntegrationRepository();
  const connection = await repo.getConnectionByIdAndIntegration(connectionId, id);

  if (!connection) {
    return fail('Loading connection', 'Connection not found', 404);
  }
  pushStep('Loading connection', 'ok', 'Connection loaded');

  const integration = await repo.getIntegrationById(id);

  if (!integration) {
    return fail('Loading integration', 'Integration not found', 404);
  }

  if (integration.slug === 'baselinker') {
    // Redirect to Base-specific test endpoint
    const baseTestUrl = `/api/v2/integrations/${id}/connections/${connectionId}/base/test`;
    return NextResponse.json(
      {
        error: `Please use the Base.com-specific test endpoint: POST ${baseTestUrl}`,
        redirectUrl: baseTestUrl,
      },
      { status: 400 }
    );
  }

  if (isTraderaApiIntegrationSlug(integration.slug)) {
    return handleTraderaApiTest(connection, repo, manualMode, steps, pushStep, fail);
  }

  if (integration.slug === 'linkedin') {
    return handleLinkedinApiTest(connection, steps, pushStep, fail);
  }

  if (!isTraderaBrowserIntegrationSlug(integration.slug)) {
    return fail(
      'Connection test',
      `${integration.name} connection tests are not configured yet.`,
      400
    );
  }

  if (manualMode) {
    pushStep('Manual mode', 'ok', `Manual login enabled (timeout ${manualLoginTimeoutMs}ms).`);
  }
  if (quicklistPreflightMode) {
    pushStep('Quicklist preflight', 'ok', 'Fast stored-session validation enabled.');
  }

  // Decrypt to ensure credentials are readable with the configured key.
  pushStep(
    'Decrypting credentials',
    'pending',
    'Validating encryption key and decrypting password'
  );
  const encryptedPassword = connection.password;
  if (!manualMode && !quicklistPreflightMode && !encryptedPassword) {
    return fail('Decrypting credentials', 'No encrypted password configured for this connection.');
  }
  const loginUsername = connection.username;
  if (!manualMode && !quicklistPreflightMode && !loginUsername) {
    return fail('Decrypting credentials', 'No username configured for this connection.');
  }
  const decryptedPassword =
    manualMode || quicklistPreflightMode ? '' : decryptSecret(encryptedPassword as string);
  pushStep(
    'Decrypting credentials',
    'ok',
    manualMode || quicklistPreflightMode
      ? 'Skipped in non-credential mode.'
      : 'Password decrypted successfully'
  );

  let storedState: PersistedStorageState | null = null;

  if (connection.playwrightStorageState) {
    pushStep('Loading session', 'pending', 'Loading stored Playwright session');
    try {
      const raw = decryptSecret(connection.playwrightStorageState);
      const parsed = JSON.parse(raw) as unknown;

      // minimal validation so TS + runtime both stay sane
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { cookies?: unknown[] }).cookies) &&
        Array.isArray((parsed as { origins?: unknown[] }).origins)
      ) {
        storedState = {
          cookies: (parsed as PersistedStorageState).cookies,
          origins: (parsed as PersistedStorageState).origins,
        };
        pushStep('Loading session', 'ok', 'Stored session loaded');
      } else {
        pushStep('Loading session', 'failed', 'Stored session has invalid shape');
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      pushStep('Loading session', 'failed', `Failed to load session: ${message}`);
    }
  }

  pushStep('Loading Playwright settings', 'pending', 'Resolving browser runtime settings');
  let resolvedPlaywrightSettings;
  try {
    resolvedPlaywrightSettings = await resolveConnectionPlaywrightSettings(connection);
  } catch (error) {
    void ErrorSystem.captureException(error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return fail('Loading Playwright settings', `Failed to resolve Playwright settings: ${message}`);
  }
  pushStep('Loading Playwright settings', 'ok', 'Resolved browser runtime settings');

  const headless = manualMode
    ? false
    : quicklistPreflightMode
      ? true
      : resolvedPlaywrightSettings.headless;
  const slowMo = quicklistPreflightMode ? 0 : resolvedPlaywrightSettings.slowMo;
  const defaultTimeout = resolvedPlaywrightSettings.timeout;
  const navigationTimeout = resolvedPlaywrightSettings.navigationTimeout;
  const humanizeMouse =
    quicklistPreflightMode ? false : (connection.playwrightHumanizeMouse ?? false);
  const mouseJitter = quicklistPreflightMode ? 0 : Math.max(0, connection.playwrightMouseJitter ?? 0);
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
    quicklistPreflightMode ? actionDelayMin : (connection.playwrightActionDelayMax ?? actionDelayMin)
  );
  const proxyEnabled = resolvedPlaywrightSettings.proxyEnabled;
  const proxyServer = resolvedPlaywrightSettings.proxyServer;
  const proxyUsername = resolvedPlaywrightSettings.proxyUsername;
  const proxyPassword = resolvedPlaywrightSettings.proxyPassword;
  const emulateDevice = resolvedPlaywrightSettings.emulateDevice;
  const deviceName = resolvedPlaywrightSettings.deviceName;

  if (proxyEnabled && !proxyServer) {
    return fail('Proxy setup', 'Proxy is enabled but no proxy server is set.');
  }
  if (proxyEnabled && proxyServer) {
    pushStep('Proxy setup', 'ok', `Using proxy ${proxyServer}`);
  }

  const deviceProfile =
    emulateDevice && deviceName && devices[deviceName] ? devices[deviceName] : null;
  if (emulateDevice && deviceName && !deviceProfile) {
    pushStep('Device emulation', 'failed', `Unknown device profile: ${deviceName}`);
  } else if (emulateDevice && deviceProfile) {
    pushStep('Device emulation', 'ok', `Using ${deviceName}`);
  }
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;
  const deviceContextOptions: BrowserContextOptions = deviceProfile
    ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
    : {};

  const isSellPageAccessible = (currentUrl: string): boolean => {
    const normalized = currentUrl.trim().toLowerCase();
    return normalized.includes('/selling');
  };
  const isLoginPageUrl = (currentUrl: string): boolean =>
    currentUrl.trim().toLowerCase().includes('/login');
  try {
    try {
      pushStep(
        'Launching Playwright',
        'pending',
        `Starting Chromium (headless=${headless ? 'on' : 'off'}, slowMo=${slowMo}ms)`
      );
      browser = await chromium.launch({
        headless,
        slowMo,
        ...(proxyEnabled && proxyServer
          ? {
            proxy: {
              server: proxyServer,
              ...(proxyUsername && { username: proxyUsername }),
              ...(proxyPassword && { password: proxyPassword }),
            },
          }
          : {}),
      });

      const contextOptions: BrowserContextOptions = {
        ...deviceContextOptions,
        ...(storedState ? { storageState: storedState } : {}),
      };

      context = await browser.newContext(contextOptions);
      context.setDefaultTimeout(defaultTimeout);
      context.setDefaultNavigationTimeout(navigationTimeout);
      page = await context.newPage();
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return fail('Launching Playwright', message);
    }

    if (!page) {
      return fail('Launching Playwright', 'Browser page not initialized');
    }
    const {
      safeWaitForSelector,
      safeWaitFor,
      safeCount,
      safeIsVisible,
      safeInnerText,
      safeGoto,
      safeWaitForLoadState,
      failWithDebug,
      humanizedPause,
      humanizedClick,
      humanizedFill,
      acceptCookieConsent,
      successSelector,
      errorSelector,
    } = createTraderaBrowserTestUtils({
      page,
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

    let sessionReused = false;
    const formSelector = [
      '#sign-in-form',
      'form[data-sign-in-form="true"]',
      'form[data-sentry-component="LoginForm"]',
    ].join(', ');
    const validateFreshStoredSession = async (
      storageStateResult: PersistedStorageState
    ): Promise<void> => {
      if (!browser) throw internalError('Browser not initialized');

      let validationContext: BrowserContext | null = null;
      let validationPage: Page | null = null;
      try {
        validationContext = await browser.newContext({
          ...deviceContextOptions,
          storageState: storageStateResult,
        });
        validationContext.setDefaultTimeout(defaultTimeout);
        validationContext.setDefaultNavigationTimeout(navigationTimeout);
        validationPage = await validationContext.newPage();

        const {
          safeGoto: validationGoto,
          safeWaitForLoadState: validationWaitForLoadState,
          safeIsVisible: validationIsVisible,
          acceptCookieConsent: validationAcceptCookieConsent,
        } = createTraderaBrowserTestUtils({
          page: validationPage,
          connectionId: connection.id,
          fail,
          humanizeMouse: false,
          mouseJitter: 0,
          clickDelayMin: 0,
          clickDelayMax: 0,
          inputDelayMin: 0,
          inputDelayMax: 0,
          actionDelayMin: 0,
          actionDelayMax: 0,
        });

        await validationGoto(
          TRADERA_LISTING_FORM_URL,
          {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          },
          'Saved session validation'
        );
        await validationAcceptCookieConsent();
        await validationWaitForLoadState(
          'networkidle',
          { timeout: 15000 },
          'Saved session validation'
        ).catch(() => undefined);

        const currentUrl = validationPage.url();
        const loginFormVisible = await validationIsVisible(
          validationPage.locator(formSelector).first(),
          'Saved session validation login form'
        ).catch(() => false);

        if (
          !isSellPageAccessible(currentUrl) ||
          isLoginPageUrl(currentUrl) ||
          loginFormVisible
        ) {
          throw internalError(
            `Saved session did not reopen the Tradera listing flow. Current URL: ${currentUrl}`
          );
        }
      } finally {
        await validationPage?.close().catch(() => undefined);
        await validationContext?.close().catch(() => undefined);
      }
    };
    if (storedState) {
      pushStep('Reusing session', 'pending', 'Checking existing session');
      try {
        await safeGoto(
          'https://www.tradera.com/en/my/listings?tab=active',
          {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          },
          'Session check'
        );
        await acceptCookieConsent();
        await humanizedPause();
        if (!page) throw internalError('Page not found');
        const successVisible = await safeIsVisible(
          page.locator(successSelector).first(),
          'Session check'
        ).catch(() => false);
        const loginFormVisible = await safeIsVisible(
          page.locator(formSelector).first(),
          'Session check login form'
        ).catch(() => false);
        const currentUrl = page.url();
        const loggedIn =
          successVisible ||
          (!loginFormVisible &&
            (currentUrl.includes('/my/') || currentUrl.includes('/my?')));
        if (loggedIn) {
          pushStep('Reusing session', 'ok', 'Session still valid');
          sessionReused = true;
        } else {
          pushStep('Reusing session', 'failed', 'Session invalid or expired');
        }
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Reusing session', 'failed', `Failed to check session: ${message}`);
      }
    }

    if (quicklistPreflightMode) {
      pushStep('Quicklist preflight', 'pending', 'Validating stored Tradera session');
      if (!storedState) {
        return fail('Quicklist preflight', QUICKLIST_AUTH_REQUIRED_DETAIL, 409);
      }
      if (!sessionReused) {
        return fail('Quicklist preflight', QUICKLIST_AUTH_REQUIRED_DETAIL, 409);
      }
      pushStep('Quicklist preflight', 'ok', 'Stored session is ready for one-click queueing.');
      const response: TestConnectionResponse = {
        ok: true,
        steps,
        sessionReady: true,
      };
      return NextResponse.json(response);
    }

    const loginUrls = [
      'https://www.tradera.com/login',
      'https://www.tradera.com/en/login',
      'https://www.tradera.com/en',
    ];
    const openLoginPage = async () => {
      if (!page) throw internalError('Page not found');
      for (const url of loginUrls) {
        pushStep('Opening login page', 'pending', url);
        try {
          await safeGoto(
            url,
            { waitUntil: 'domcontentloaded', timeout: 30000 },
            'Opening login page'
          );
          await acceptCookieConsent();
          await safeWaitForLoadState('networkidle', { timeout: 15000 }, 'Opening login page').catch(
            () => undefined
          );
          await humanizedPause();
          const formLocator = page.locator('#sign-in-form').first();
          if ((await safeCount(formLocator, 'Login form')) > 0) {
            pushStep('Opening login page', 'ok', `Login page loaded: ${url}`);
            return url;
          }
        } catch (error) {
          void ErrorSystem.captureException(error);
          const message = error instanceof Error ? error.message : 'Unknown error';
          pushStep('Opening login page', 'failed', `${url} failed: ${message}`);
        }
      }
      return loginUrls[loginUrls.length - 1]!;
    };
    const loginUrl = sessionReused ? loginUrls[0]! : await openLoginPage();

    const emailSelector = '#email, input[name="email"], input[type="email"]';
    const passwordSelector = '#password, input[name="password"], input[type="password"]';

    const findInput = async (selectors: string[]) => {
      if (!page) throw internalError('Page not found');
      for (const selector of selectors) {
        const locator = page.locator(selector).first();
        if ((await safeCount(locator, `Find input ${selector}`)) > 0) {
          const visible = await safeIsVisible(locator, `Find input ${selector}`).catch(() => false);
          if (visible) {
            return { selector, locator };
          }
        }
      }
      return null;
    };

    const useManualLogin = manualMode && !sessionReused;

    if (useManualLogin) {
      pushStep(
        'Manual login',
        'pending',
        'Complete login in the opened browser window. Waiting for logged-in state.'
      );
      try {
        if (!page) throw internalError('Page not found');
        await safeGoto(
          loginUrl,
          {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          },
          'Manual login'
        );
        await acceptCookieConsent();
        await safeWaitForLoadState('networkidle', { timeout: 15000 }, 'Manual login').catch(
          () => undefined
        );
        await safeWaitFor(
          page.locator(successSelector).first(),
          { state: 'visible', timeout: manualLoginTimeoutMs },
          'Manual login success'
        );
        pushStep('Manual login', 'ok', 'Logged-in state detected.');
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return await failWithDebug(
          'Manual login',
          `Manual login timed out or failed after ${manualLoginTimeoutMs}ms: ${message}`
        );
      }
    }

    if (!sessionReused && !useManualLogin) {
      pushStep('Locating login form', 'pending', 'Waiting for sign-in form');
      try {
        await safeWaitForSelector(
          formSelector,
          { state: 'attached', timeout: 15000 },
          'Login form'
        );
        await acceptCookieConsent();
        if (!page) throw internalError('Page not found');
        const formLocator = page.locator(formSelector).first();
        const isVisible = await safeIsVisible(formLocator, 'Login form').catch(() => false);
        if (!isVisible) {
          throw internalError('Login form not visible yet');
        }
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Locating login form', 'failed', `Form not ready: ${message}`);
        if (!page) throw internalError('Page not found');
        const signInTrigger = page
          .locator(
            [
              'a:has-text("Sign in")',
              'button:has-text("Sign in")',
              'a:has-text("Logga in")',
              'button:has-text("Logga in")',
              'a[href*="/login"]',
              'a[href*="login"]',
              'button[aria-label*="Sign in"]',
              'button[aria-label*="Logga in"]',
            ].join(', ')
          )
          .first();
        if ((await safeCount(signInTrigger, 'Sign-in trigger')) > 0) {
          pushStep('Locating login form', 'pending', 'Opening sign-in modal');
          try {
            await humanizedClick(signInTrigger);
            await humanizedPause();
            await acceptCookieConsent();
          } catch (clickError) {
            void ErrorSystem.captureException(clickError);
            const clickMessage = clickError instanceof Error ? clickError.message : 'Unknown error';
            pushStep(
              'Locating login form',
              'failed',
              `Failed to open sign-in modal: ${clickMessage}`
            );
          }
        }
        try {
          await safeWaitForSelector(
            formSelector,
            { state: 'attached', timeout: 20000 },
            'Login form'
          );
          await safeWaitFor(
            page.locator(formSelector).first(),
            { state: 'visible', timeout: 20000 },
            'Login form'
          );
        } catch (waitError) {
          void ErrorSystem.captureException(waitError);
          const waitMessage = waitError instanceof Error ? waitError.message : 'Unknown error';
          return await failWithDebug(
            'Locating login form',
            `Form still not visible: ${waitMessage}`
          );
        }
      }
      try {
        if (!page) throw internalError('Page not found');
        await safeWaitFor(
          page.locator(emailSelector).first(),
          { state: 'visible', timeout: 15000 },
          'Email field'
        );
        await safeWaitFor(
          page.locator(passwordSelector).first(),
          { state: 'visible', timeout: 15000 },
          'Password field'
        );
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return await failWithDebug('Locating login form', `Input fields not visible: ${message}`);
      }
      pushStep('Locating login form', 'ok', 'Sign-in form detected');

      pushStep('Filling credentials', 'pending', 'Locating login fields');
      const usernameSelectors = ['#email', 'input[name="email"]', 'input[type="email"]'];
      const passwordSelectors = ['#password', 'input[type="password"]', 'input[name="password"]'];

      const findInputInForm = async (selectors: string[]) => {
        if (!page) throw internalError('Page not found');
        for (const selector of selectors) {
          const locator = page.locator(formSelector).first().locator(selector).first();
          if ((await safeCount(locator, `Find form input ${selector}`)) > 0) {
            const visible = await safeIsVisible(locator, `Find form input ${selector}`).catch(
              () => false
            );
            if (visible) {
              return { selector, locator };
            }
          }
        }
        return null;
      };

      const usernameField = await findInputInForm(usernameSelectors);
      const passwordField = await findInputInForm(passwordSelectors);
      if (!usernameField || !passwordField) {
        return await failWithDebug('Filling credentials', 'Login fields not found on Tradera page');
      }
      try {
        await humanizedFill(usernameField.locator, loginUsername as string);
        await humanizedFill(passwordField.locator, decryptedPassword);
        await humanizedPause();
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return await failWithDebug('Filling credentials', `Failed to fill fields: ${message}`);
      }
      pushStep(
        'Filling credentials',
        'ok',
        `Filled fields (${usernameField.selector}, ${passwordField.selector})`
      );
    }

    if (!sessionReused && !useManualLogin) {
      pushStep('Submitting login', 'pending', 'Attempting to submit form');
      if (!page) throw internalError('Page not found');
      const stayLoggedIn = page.locator('input[name="keepMeLoggedIn"]').first();
      try {
        if ((await safeCount(stayLoggedIn, 'Stay logged in')) > 0) {
          const isChecked = await stayLoggedIn.isChecked().catch(() => false);
          if (!isChecked) {
            await humanizedClick(stayLoggedIn);
            await humanizedPause();
            pushStep('Keep me logged in', 'ok', 'Enabled stay logged in');
          } else {
            pushStep('Keep me logged in', 'ok', 'Already enabled');
          }
        } else {
          pushStep('Keep me logged in', 'failed', 'Checkbox not found');
        }
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Keep me logged in', 'failed', `Checkbox error: ${message}`);
      }
      const submitSelectors = [
        'button[data-login-submit="true"]',
        '#sign-in-form button[type="submit"]',
        'button:has-text("Sign in")',
        'button:has-text("Logga in")',
      ];
      const submitButton = await findInput(submitSelectors);
      if (!submitButton) {
        return await failWithDebug('Submitting login', 'Submit button not found');
      }
      try {
        await Promise.allSettled([
          page.waitForNavigation({
            waitUntil: 'domcontentloaded',
            timeout: 15000,
          }),
          humanizedClick(submitButton.locator),
        ]);
        await humanizedPause();
        await acceptCookieConsent();
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return await failWithDebug('Submitting login', `Submit failed: ${message}`);
      }
      pushStep('Submitting login', 'ok', `Clicked ${submitButton.selector}`);

      try {
        if (!page) throw internalError('Page not found');
        await page.waitForTimeout(1000);
        const postSubmitUrl = page.url();
        const postSubmitError = await safeInnerText(
          page.locator(errorSelector).first(),
          'Post-submit error'
        ).catch(() => '');
        const postSubmitDetail = `URL: ${postSubmitUrl}${
          postSubmitError?.trim() ? `\nError: ${postSubmitError}` : '\nError: (none visible)'
        }`;
        pushStep('Post-submit debug', 'ok', postSubmitDetail);
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Post-submit debug', 'failed', `Debug failed: ${message}`);
      }

      const captchaHints = ['captcha', 'recaptcha', 'fylla i captcha', 'captcha:n'];
      try {
        if (!page) throw internalError('Page not found');
        const postSubmitErrorLower = (
          await safeInnerText(page.locator(errorSelector).first(), 'Post-submit error').catch(
            () => ''
          )
        ).toLowerCase();
        const captchaDetected = captchaHints.some((hint) => postSubmitErrorLower.includes(hint));
        if (captchaDetected) {
          pushStep(
            'Captcha required',
            'pending',
            'Solve the captcha in the opened browser window to continue.'
          );
          const captchaResult = await Promise.race([
            safeWaitFor(
              page.locator(successSelector).first(),
              { state: 'visible', timeout: 120000 },
              'Captcha success'
            ).then(() => 'success'),
            safeWaitFor(
              page.locator(formSelector).first(),
              { state: 'hidden', timeout: 120000 },
              'Captcha form hide'
            ).then(() => 'form-hidden'),
          ]).catch(() => 'timeout');

          if (captchaResult === 'timeout') {
            return await failWithDebug('Captcha required', 'Captcha not solved within 2 minutes.');
          }
          pushStep('Captcha required', 'ok', 'Captcha solved.');
        }
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Captcha required', 'failed', `Captcha check failed: ${message}`);
      }

      pushStep('Verifying session', 'pending', 'Checking for logged-in state');
      try {
        if (!page) throw internalError('Page not found');
        const formLocator = page.locator(formSelector).first();
        const result = await Promise.race([
          safeWaitFor(
            page.locator(successSelector).first(),
            { state: 'visible', timeout: 12000 },
            'Login success'
          ).then(() => 'success'),
          safeWaitFor(formLocator, { state: 'hidden', timeout: 12000 }, 'Login form hide').then(
            () => 'form-hidden'
          ),
          safeWaitFor(
            page.locator(errorSelector).first(),
            { state: 'visible', timeout: 12000 },
            'Login error'
          ).then(() => 'error'),
        ]).catch(() => 'timeout');

        if (result === 'error') {
          const errorText = await safeInnerText(
            page.locator(errorSelector).first(),
            'Login error'
          ).catch(() => 'Login error displayed.');
          const safeErrorText = errorText?.trim()
            ? errorText
            : 'Login error displayed but no message was found.';
          return await failWithDebug('Verifying session', safeErrorText);
        }

        if (result === 'timeout') {
          const currentUrl = page.url();
          const hint =
            currentUrl === loginUrl || currentUrl.includes('/login')
              ? 'Still on login page (invalid credentials, CAPTCHA, or extra verification required).'
              : `Current URL: ${currentUrl}`;
          return await failWithDebug('Verifying session', `Login verification timed out. ${hint}`);
        }
      } catch (error) {
        void ErrorSystem.captureException(error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return await failWithDebug('Verifying session', `Verification failed: ${message}`);
      }
    } else {
      pushStep(
        'Verifying session',
        'ok',
        useManualLogin
          ? 'Manual login completed and session is active'
          : 'Session restored from storage'
      );
    }

    pushStep('Verifying sell page', 'pending', 'Checking Tradera selling page access');
    try {
      if (!page) throw internalError('Page not found');
      await safeGoto(
        TRADERA_LISTING_FORM_URL,
        {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        },
        'Sell page check'
      );
      await acceptCookieConsent();
      await safeWaitForLoadState(
        'networkidle',
        { timeout: 15000 },
        'Sell page check'
      ).catch(() => undefined);
      if (!isSellPageAccessible(page.url())) {
        if (manualMode) {
          pushStep(
            'Verifying sell page',
            'pending',
            'Complete any extra Tradera verification in the opened browser window. Waiting for the selling page.'
          );
          await page.waitForURL(
            (url) => isSellPageAccessible(url.toString()),
            { timeout: manualLoginTimeoutMs }
          );
          await safeWaitForLoadState(
            'networkidle',
            { timeout: 15000 },
            'Sell page check'
          ).catch(() => undefined);
        }
      }
      if (!isSellPageAccessible(page.url())) {
        return await failWithDebug(
          'Verifying sell page',
          `Selling page is not accessible yet. Current URL: ${page.url()}`
        );
      }
      pushStep('Verifying sell page', 'ok', 'Selling page accessible');
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await failWithDebug('Verifying sell page', message);
    }

    pushStep('Saving session', 'pending', 'Storing Playwright session cookies');
    try {
      if (!page) throw internalError('Page not found');
      const storageStateResult = await page.context().storageState();
      pushStep(
        'Validating saved session',
        'pending',
        'Opening a fresh browser context from stored session'
      );
      try {
        await validateFreshStoredSession(storageStateResult);
        pushStep(
          'Validating saved session',
          'ok',
          'Stored session reopened the Tradera selling flow'
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Validating saved session', 'failed', message);
        throw error;
      }
      await repo.updateConnection(connection.id, {
        playwrightStorageState: encryptSecret(JSON.stringify(storageStateResult)),
        playwrightStorageStateUpdatedAt: new Date(),
      });
      pushStep('Saving session', 'ok', 'Session stored for reuse');
    } catch (error) {
      void ErrorSystem.captureException(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      pushStep('Saving session', 'failed', `Failed to store session: ${message}`);
    }

    pushStep('Verifying session', 'ok', 'Login appears successful');
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  const response: TestConnectionResponse = { ok: true, steps };

  return NextResponse.json(response);
}
