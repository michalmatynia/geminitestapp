import { NextRequest, NextResponse } from 'next/server';
import { chromium, devices } from 'playwright';

import {
  isTraderaApiIntegrationSlug,
  isTraderaBrowserIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { getTraderaUserInfo } from '@/features/integrations/services/tradera-api-client';
import { createTraderaBrowserTestUtils } from '@/features/integrations/services/tradera-browser-test-utils';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { internalError } from '@/shared/errors/app-error';
import { mapStatusToAppError } from '@/shared/errors/error-mapper';

import type { Browser, BrowserContext, Page, BrowserContextOptions } from 'playwright';

type PersistedStorageState = NonNullable<Exclude<BrowserContextOptions['storageState'], string>>;

type TestLogEntry = {
  step: string;
  status: 'pending' | 'ok' | 'failed';
  timestamp: string;
  detail: string;
};

type TraderaConnectionTestRequest = {
  mode?: 'auto' | 'manual';
  manualTimeoutMs?: number;
};

const DEFAULT_MANUAL_LOGIN_TIMEOUT_MS = 240000;
const MAX_MANUAL_LOGIN_TIMEOUT_MS = 600000;

const toPositiveInt = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
};

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

  let requestBody: TraderaConnectionTestRequest = {};
  try {
    const parsed = (await req.json()) as unknown;
    if (parsed && typeof parsed === 'object') {
      requestBody = parsed as TraderaConnectionTestRequest;
    }
  } catch {
    requestBody = {};
  }

  const mode = requestBody.mode === 'manual' ? 'manual' : 'auto';
  const manualMode = mode === 'manual';
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
    if (manualMode) {
      pushStep('Manual mode', 'ok', 'Manual login mode does not apply to Tradera API connections.');
    }

    pushStep('Decrypting credentials', 'pending', 'Validating Tradera API credentials');
    const appId = toPositiveInt(connection.traderaApiAppId);
    const userId = toPositiveInt(connection.traderaApiUserId);
    const encryptedAppKey = connection.traderaApiAppKey;
    const encryptedToken = connection.traderaApiToken;

    if (!appId) {
      return fail(
        'Decrypting credentials',
        'Tradera API App ID is missing. Update the connection first.'
      );
    }
    if (!userId) {
      return fail(
        'Decrypting credentials',
        'Tradera API User ID is missing. Update the connection first.'
      );
    }
    if (!encryptedAppKey) {
      return fail(
        'Decrypting credentials',
        'Tradera API App Key is missing. Update the connection first. Password fallback is disabled.'
      );
    }
    if (!encryptedToken) {
      return fail(
        'Decrypting credentials',
        'Tradera API token is missing. Update the connection first. Password fallback is disabled.'
      );
    }

    let appKey: string;
    let token: string;
    try {
      appKey = decryptSecret(encryptedAppKey).trim();
      token = decryptSecret(encryptedToken).trim();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return fail(
        'Decrypting credentials',
        `Unable to decrypt Tradera API credentials: ${message}`
      );
    }
    if (!appKey || !token) {
      return fail('Decrypting credentials', 'Tradera API credentials are empty after decryption.');
    }
    pushStep('Decrypting credentials', 'ok', 'Tradera API credentials decrypted');

    pushStep('Testing API connection', 'pending', 'Calling RestrictedService.GetUserInfo');
    try {
      const profile = await getTraderaUserInfo({
        appId,
        appKey,
        userId,
        token,
        sandbox: connection.traderaApiSandbox ?? false,
      });
      await repo.updateConnection(connection.id, {
        traderaApiTokenUpdatedAt: new Date(),
      });
      pushStep(
        'Testing API connection',
        'ok',
        profile.alias
          ? `Authenticated as ${profile.alias}.`
          : `Authenticated as user ${profile.userId}.`
      );
      return NextResponse.json({
        ok: true,
        steps,
        profile,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return fail('Testing API connection', message);
    }
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

  // Decrypt to ensure credentials are readable with the configured key.
  pushStep(
    'Decrypting credentials',
    'pending',
    'Validating encryption key and decrypting password'
  );
  const encryptedPassword = connection.password;
  if (!manualMode && !encryptedPassword) {
    return fail('Decrypting credentials', 'No encrypted password configured for this connection.');
  }
  const loginUsername = connection.username;
  if (!manualMode && !loginUsername) {
    return fail('Decrypting credentials', 'No username configured for this connection.');
  }
  const decryptedPassword = manualMode ? '' : decryptSecret(encryptedPassword as string);
  pushStep(
    'Decrypting credentials',
    'ok',
    manualMode ? 'Skipped in manual mode.' : 'Password decrypted successfully'
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
      const message = error instanceof Error ? error.message : 'Unknown error';
      pushStep('Loading session', 'failed', `Failed to load session: ${message}`);
    }
  }

  const configuredHeadless = connection.playwrightHeadless ?? true;
  const headless = manualMode ? false : configuredHeadless;
  const slowMo = connection.playwrightSlowMo ?? 0;
  const defaultTimeout = connection.playwrightTimeout ?? 15000;
  const navigationTimeout = connection.playwrightNavigationTimeout ?? 30000;
  const humanizeMouse = connection.playwrightHumanizeMouse ?? false;
  const mouseJitter = Math.max(0, connection.playwrightMouseJitter ?? 0);
  const clickDelayMin = Math.max(0, connection.playwrightClickDelayMin ?? 0);
  const clickDelayMax = Math.max(
    clickDelayMin,
    connection.playwrightClickDelayMax ?? clickDelayMin
  );
  const inputDelayMin = Math.max(0, connection.playwrightInputDelayMin ?? 0);
  const inputDelayMax = Math.max(
    inputDelayMin,
    connection.playwrightInputDelayMax ?? inputDelayMin
  );
  const actionDelayMin = Math.max(0, connection.playwrightActionDelayMin ?? 0);
  const actionDelayMax = Math.max(
    actionDelayMin,
    connection.playwrightActionDelayMax ?? actionDelayMin
  );
  const proxyEnabled = connection.playwrightProxyEnabled ?? false;
  const proxyServer = connection.playwrightProxyServer?.trim() ?? '';
  const proxyUsername = connection.playwrightProxyUsername?.trim() ?? '';
  let proxyPassword = '';
  if (connection.playwrightProxyPassword) {
    try {
      proxyPassword = decryptSecret(connection.playwrightProxyPassword);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      pushStep('Proxy setup', 'failed', `Failed to decrypt proxy password: ${message}`);
    }
  }
  const emulateDevice = connection.playwrightEmulateDevice ?? false;
  const deviceName = connection.playwrightDeviceName ?? '';

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

      const deviceContextOptions: BrowserContextOptions = deviceProfile
        ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
        : {};

      const contextOptions: BrowserContextOptions = {
        ...deviceContextOptions,
        ...(storedState ? { storageState: storedState } : {}),
      };

      context = await browser.newContext(contextOptions);
      context.setDefaultTimeout(defaultTimeout);
      context.setDefaultNavigationTimeout(navigationTimeout);
      page = await context.newPage();
    } catch (error) {
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
    if (storedState) {
      pushStep('Reusing session', 'pending', 'Checking existing session');
      try {
        await safeGoto(
          'https://www.tradera.com/en',
          {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          },
          'Session check'
        );
        await humanizedPause();
        if (!page) throw internalError('Page not found');
        const loggedIn = await safeIsVisible(
          page.locator(successSelector).first(),
          'Session check'
        ).catch(() => false);
        if (loggedIn) {
          pushStep('Reusing session', 'ok', 'Session still valid');
          sessionReused = true;
        } else {
          pushStep('Reusing session', 'failed', 'Session invalid or expired');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        pushStep('Reusing session', 'failed', `Failed to check session: ${message}`);
      }
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
          const message = error instanceof Error ? error.message : 'Unknown error';
          pushStep('Opening login page', 'failed', `${url} failed: ${message}`);
        }
      }
      return loginUrls[loginUrls.length - 1]!;
    };
    const loginUrl = sessionReused ? loginUrls[0]! : await openLoginPage();

    const formSelector = [
      '#sign-in-form',
      'form[data-sign-in-form="true"]',
      'form[data-sentry-component="LoginForm"]',
    ].join(', ');
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
        if (!page) throw internalError('Page not found');
        const formLocator = page.locator(formSelector).first();
        const isVisible = await safeIsVisible(formLocator, 'Login form').catch(() => false);
        if (!isVisible) {
          throw internalError('Login form not visible yet');
        }
      } catch (error) {
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
          } catch (clickError) {
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
      } catch (error) {
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

    pushStep('Saving session', 'pending', 'Storing Playwright session cookies');
    try {
      if (!page) throw internalError('Page not found');
      const storageStateResult = await page.context().storageState();
      await repo.updateConnection(connection.id, {
        playwrightStorageState: encryptSecret(JSON.stringify(storageStateResult)),
        playwrightStorageStateUpdatedAt: new Date(),
      });
      pushStep('Saving session', 'ok', 'Session stored for reuse');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      pushStep('Saving session', 'failed', `Failed to store session: ${message}`);
    }

    pushStep('Verifying session', 'ok', 'Login appears successful');
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  return NextResponse.json({ ok: true, steps });
}
