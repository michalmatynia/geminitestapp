import { NextResponse } from 'next/server';
import type { Browser, BrowserContext, Page, BrowserContextOptions } from 'playwright';
import { devices } from 'playwright';

import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import {
  resolveConnectionPlaywrightSettings,
  type PersistedStorageState,
} from '@/features/integrations/services/tradera-playwright-settings';
import { type TestLogEntry } from '@/shared/contracts/integrations';
import { launchPlaywrightBrowser } from '@/shared/lib/playwright/browser-launch';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { createVintedBrowserTestUtils } from '@/features/integrations/services/vinted-listing/vinted-browser-test-utils';
import {
  readVintedAuthState,
  waitForVintedManualLogin,
} from '@/features/integrations/services/vinted-listing/vinted-browser-auth';
import {
  VINTED_AUTH_ENTRY_URL,
  VINTED_LISTING_FORM_URL,
} from '@/features/integrations/services/vinted-listing/config';

import {
  type IntegrationConnectionRecord,
  type IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';

type PushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => void;
type Fail = (step: string, detail: string, status?: number) => Promise<never>;

type ConnectionUpdateRepository = Pick<IntegrationRepository, 'updateConnection'>;

const VINTED_GOOGLE_SIGN_IN_BLOCKED_MESSAGE =
  'AUTH_REQUIRED: Google sign-in is blocked in this automated browser. Use Vinted.pl email/password login instead of Continue with Google.';
const MANUAL_VINTED_DEVICE_NAME = 'Desktop Chrome';

export const handleVintedBrowserTest = async (
  connection: IntegrationConnectionRecord,
  repo: ConnectionUpdateRepository,
  manualMode: boolean,
  quicklistPreflightMode: boolean,
  manualLoginTimeoutMs: number,
  steps: TestLogEntry[],
  pushStep: PushStep,
  fail: Fail
): Promise<Response> => {
  if (manualMode) {
    pushStep('Manual mode', 'ok', `Manual login enabled (timeout ${manualLoginTimeoutMs}ms).`);
  }
  if (quicklistPreflightMode) {
    pushStep('Quicklist preflight', 'ok', 'Fast stored-session validation enabled.');
  }

  let storedState: PersistedStorageState | null = null;
  const playwrightStorageState = connection.playwrightStorageState;
  if (playwrightStorageState) {
    pushStep('Loading session', 'pending', 'Loading stored Playwright session');
    try {
      const raw = decryptSecret(playwrightStorageState);
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { cookies?: unknown[] }).cookies)
      ) {
        storedState = parsed as PersistedStorageState;
        pushStep('Loading session', 'ok', 'Stored session loaded');
      } else {
        pushStep('Loading session', 'failed', 'Stored session has invalid shape');
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      pushStep('Loading session', 'failed', 'Failed to load session');
    }
  }

  pushStep('Loading Playwright settings', 'pending', 'Resolving browser runtime settings');
  let resolvedPlaywrightSettings;
  try {
    resolvedPlaywrightSettings = await resolveConnectionPlaywrightSettings(connection);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return fail('Loading Playwright settings', 'Failed to resolve Playwright settings');
  }
  pushStep('Loading Playwright settings', 'ok', 'Resolved browser runtime settings');

  const headless = manualMode ? false : quicklistPreflightMode ? true : resolvedPlaywrightSettings.headless;
  const slowMo = quicklistPreflightMode ? 0 : resolvedPlaywrightSettings.slowMo;
  const defaultTimeout = resolvedPlaywrightSettings.timeout;
  const navigationTimeout = resolvedPlaywrightSettings.navigationTimeout;
  const proxyEnabled = resolvedPlaywrightSettings.proxyEnabled;
  const proxyServer = resolvedPlaywrightSettings.proxyServer;
  const proxyUsername = resolvedPlaywrightSettings.proxyUsername;
  const proxyPassword = resolvedPlaywrightSettings.proxyPassword;
  const configuredDeviceName = resolvedPlaywrightSettings.deviceName?.trim();
  const shouldApplyDeviceProfile =
    manualMode || resolvedPlaywrightSettings.emulateDevice;
  const effectiveDeviceName = manualMode
    ? MANUAL_VINTED_DEVICE_NAME
    : configuredDeviceName || MANUAL_VINTED_DEVICE_NAME;
  const deviceProfile =
    shouldApplyDeviceProfile && effectiveDeviceName && devices[effectiveDeviceName]
      ? devices[effectiveDeviceName]
      : null;
  const deviceContextOptions: BrowserContextOptions = deviceProfile
    ? (({ defaultBrowserType: _ignore, ...rest }) => rest)(deviceProfile)
    : {};

  if (proxyEnabled && !proxyServer) {
    return fail('Proxy setup', 'Proxy is enabled but no proxy server is set.');
  }
  if (proxyEnabled && proxyServer) {
    pushStep('Proxy setup', 'ok', `Using proxy ${proxyServer}`);
  }
  if (shouldApplyDeviceProfile && deviceProfile) {
    pushStep(
      'Device emulation',
      'ok',
      manualMode
        ? `Using ${effectiveDeviceName} profile for manual Vinted authentication.`
        : `Using ${effectiveDeviceName}`
    );
  } else if (resolvedPlaywrightSettings.emulateDevice && effectiveDeviceName) {
    pushStep('Device emulation', 'failed', `Unknown device profile: ${effectiveDeviceName}`);
  }
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    const baseLaunchOptions = {
      headless,
      slowMo,
      ...(proxyEnabled && proxyServer
        ? {
          proxy: {
            server: proxyServer,
            ...(proxyUsername ? { username: proxyUsername } : {}),
            ...(proxyPassword ? { password: proxyPassword } : {}),
          },
        }
        : {}),
    };

    pushStep(
      'Launching Playwright',
      'pending',
      `Starting browser (headless=${headless ? 'on' : 'off'})`
    );

    const browserPreference = manualMode && resolvedPlaywrightSettings.browser === 'chromium'
      ? 'auto' as const
      : resolvedPlaywrightSettings.browser;
    const launchResult = await launchPlaywrightBrowser(browserPreference, baseLaunchOptions);
    browser = launchResult.browser;

    for (const msg of launchResult.fallbackMessages) {
      pushStep('Browser selection', 'ok', msg);
    }
    pushStep('Browser selection', 'ok', `Using ${launchResult.label}.`);

    const contextOptions: BrowserContextOptions = {
      ...deviceContextOptions,
      ...(storedState ? { storageState: storedState } : {}),
      ...(!deviceProfile ? { viewport: { width: 1280, height: 720 } } : {}),
    };

    context = await browser.newContext(contextOptions);
    context.setDefaultTimeout(defaultTimeout);
    context.setDefaultNavigationTimeout(navigationTimeout);
    page = await context.newPage();
    const activePage = page;

    const {
      acceptCookieConsent,
      humanizedPause,
      failWithDebug,
    } = createVintedBrowserTestUtils({
      page: activePage,
      connectionId: (connection as any).id as string,
      fail,
    });
    /** Navigate to a Vinted URL, tolerating ERR_ABORTED which happens during Vinted's redirect chain (GDPR, locale, OAuth). */
    const safeVintedGoto = async (url: string, stepName: string): Promise<void> => {
      try {
        await activePage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (message.includes('net::ERR_ABORTED')) {
          // Vinted redirects during navigation (consent, locale detection, etc.) — wait for the page to settle
          pushStep(stepName, 'pending', 'Redirect detected, waiting for page to settle...');
          await activePage
            .waitForLoadState('domcontentloaded', { timeout: 15000 })
            .catch(() => undefined);
        } else {
          void ErrorSystem.captureException(error);
          return await fail(stepName, `Failed to navigate to ${url}: ${message}`);
        }
      }
    };
    const openVintedListingForm = async (stepName: string): Promise<void> => {
      await safeVintedGoto(VINTED_LISTING_FORM_URL, stepName);
      await acceptCookieConsent();
    };
    const openVintedAuthEntry = async (stepName: string): Promise<void> => {
      await safeVintedGoto(VINTED_AUTH_ENTRY_URL, stepName);
      await acceptCookieConsent();
    };

    let sessionReused = false;
    if (storedState) {
      pushStep('Reusing session', 'pending', 'Checking existing session');
      try {
        await openVintedListingForm('Session check');
        await humanizedPause();
        const authState = await readVintedAuthState(page);
        if (authState.loggedIn) {
          pushStep('Reusing session', 'ok', 'Session still valid');
          sessionReused = true;
        } else {
          pushStep('Reusing session', 'failed', 'Session invalid or expired');
        }
      } catch (_error) {
        pushStep('Reusing session', 'failed', 'Failed to check session');
      }
    }

    if (quicklistPreflightMode) {
      if (!sessionReused) {
        return failWithDebug(
          'Quicklist preflight',
          'AUTH_REQUIRED: Vinted session expired or is missing.',
          409
        );
      }
      pushStep('Quicklist preflight', 'ok', 'Stored session is ready.');
      return NextResponse.json({ ok: true, steps, sessionReady: true });
    }

    if (!sessionReused) {
      if (manualMode) {
        pushStep('Manual login', 'pending', 'Complete Vinted login in the opened browser window.');
        await openVintedAuthEntry('Vinted Login');
        pushStep(
          'Manual login',
          'pending',
          `Waiting up to ${Math.round(manualLoginTimeoutMs / 1000)}s for login completion. If Google blocks sign-in, use Vinted.pl email/password instead.`
        );

        const authState = await waitForVintedManualLogin(page, manualLoginTimeoutMs);
        if (!authState) {
          const finalManualState = await readVintedAuthState(page);
          if (finalManualState.googleBlockDetected) {
            return failWithDebug(
              'Manual login',
              VINTED_GOOGLE_SIGN_IN_BLOCKED_MESSAGE,
              409
            );
          }
          return failWithDebug(
            'Manual login',
            `Manual login timed out after ${Math.round(manualLoginTimeoutMs / 1000)}s.`
          );
        }
        pushStep(
          'Manual login',
          'ok',
          authState.sellFormVisible
            ? 'Listing form unlocked after manual login.'
            : 'Logged-in state detected.'
        );
      } else {
         // Auto login not implemented for Vinted yet, prefer manual for first implementation
         return fail('Auto login', 'Automatic Vinted login is not yet supported. Please use Manual mode.');
      }
    }

    pushStep('Verifying session', 'pending', 'Confirming Vinted listing form access');
    await openVintedListingForm('Verify Vinted session');
    const finalAuthState = await readVintedAuthState(page);
    if (finalAuthState.googleBlockDetected) {
      return failWithDebug(
        'Verifying session',
        VINTED_GOOGLE_SIGN_IN_BLOCKED_MESSAGE,
        409
      );
    }
    if (!finalAuthState.loggedIn) {
      return failWithDebug(
        'Verifying session',
        finalAuthState.authRouteDetected || finalAuthState.loginFormVisible
          ? 'AUTH_REQUIRED: Vinted session expired or manual verification is incomplete.'
          : 'Vinted login could not be verified.'
      );
    }
    pushStep(
      'Verifying session',
      'ok',
      finalAuthState.sellFormVisible
        ? 'Vinted listing form accessible.'
        : 'Vinted login successful'
    );

    pushStep('Saving session', 'pending', 'Storing Vinted Playwright session');
    try {
      const storageStateResult = await page.context().storageState();
      await (repo as any).updateConnection((connection as any).id as string, {
        playwrightStorageState: encryptSecret(JSON.stringify(storageStateResult)),
        playwrightStorageStateUpdatedAt: new Date(),
      });
      pushStep('Saving session', 'ok', 'Session stored for reuse');
    } catch (_error) {
      pushStep('Saving session', 'failed', 'Failed to store session');
    }
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  return NextResponse.json({ ok: true, steps });
};
