import type { BrowserContextOptions, Page } from 'playwright';

import {
  createPlaywrightConnectionTestSuccessResponse,
  openPlaywrightConnectionTestSession,
  persistPlaywrightConnectionTestSession,
  resolvePlaywrightConnectionTestRuntime,
} from '@/features/playwright/server';
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
import { getPlaywrightDevicesCatalog } from '@/shared/lib/playwright/runtime';

import {
  type ConnectionTestContext,
} from './types';

const VINTED_GOOGLE_SIGN_IN_BLOCKED_MESSAGE =
  'AUTH_REQUIRED: Google sign-in is blocked in this automated browser. Use Vinted.pl email/password login instead of Continue with Google.';
const MANUAL_VINTED_DEVICE_NAME = 'Desktop Chrome';

export const handleVintedBrowserTest = async (
  ctx: ConnectionTestContext
): Promise<Response> => {
  const {
    connection,
    repo,
    manualMode,
    quicklistPreflightMode,
    manualLoginTimeoutMs,
    steps,
    pushStep,
    fail,
  } = ctx;
  if (manualMode) {
    pushStep('Manual mode', 'ok', `Manual login enabled (timeout ${manualLoginTimeoutMs}ms).`);
  }
  if (quicklistPreflightMode) {
    pushStep('Quicklist preflight', 'ok', 'Fast stored-session validation enabled.');
  }

  let storedState = null;
  const runtime = await resolvePlaywrightConnectionTestRuntime({
    connection,
    pushStep,
    fail,
    settingsStep: {
      pendingDetail: 'Resolving browser runtime settings',
      successDetail: 'Resolved browser runtime settings',
      failureDetail: 'Failed to resolve Playwright settings',
    },
    storedSession: {
      loadedDetail: 'Stored session loaded',
      missingDetail: 'Failed to load session',
    },
  });
  storedState = runtime.storageState;
  const resolvedPlaywrightSettings = runtime.settings;

  const headless = manualMode ? false : quicklistPreflightMode ? true : resolvedPlaywrightSettings.headless;
  const slowMo = quicklistPreflightMode ? 0 : resolvedPlaywrightSettings.slowMo;
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
  const devices = getPlaywrightDevicesCatalog();
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
  
  let page: Page | null = null;
  let closeSession: (() => Promise<void>) | null = null;

  try {
    const browserPreference = manualMode && resolvedPlaywrightSettings.browser === 'chromium'
      ? 'auto' as const
      : resolvedPlaywrightSettings.browser;
    const session = await openPlaywrightConnectionTestSession({
      connection,
      pushStep,
      runtime: {
        ...runtime,
        deviceProfileName: deviceProfile ? effectiveDeviceName : null,
        deviceContextOptions,
      },
      browserPreference,
      headless,
      launchSettingsOverrides: {
        slowMo,
        proxyEnabled,
        proxyServer,
        proxyUsername,
        proxyPassword,
      },
      viewport: { width: 1280, height: 720 },
      launchStep: {
        stepName: 'Launching Playwright',
        pendingDetail: `Starting browser (headless=${headless ? 'on' : 'off'})`,
      },
    });
    closeSession = session.close;
    page = session.page;
    const activePage = session.page;

    const {
      acceptCookieConsent,
      humanizedPause,
      failWithDebug,
    } = createVintedBrowserTestUtils({
      page: activePage,
      connectionId: connection.id,
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
      return createPlaywrightConnectionTestSuccessResponse({
        steps,
        sessionReady: true,
      });
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

    await persistPlaywrightConnectionTestSession({
      connectionId: connection.id,
      page,
      repo,
      pushStep,
      pendingDetail: 'Storing Vinted Playwright session',
      successDetail: 'Session stored for reuse',
      failureDetail: 'Failed to store session',
      throwOnFailure: false,
    });
  } finally {
    await page?.close().catch(() => undefined);
    await closeSession?.().catch(() => undefined);
  }

  return createPlaywrightConnectionTestSuccessResponse({ steps });
};
