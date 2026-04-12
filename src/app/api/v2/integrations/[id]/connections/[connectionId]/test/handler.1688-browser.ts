import type { Page } from 'playwright';

import {
  createPlaywrightConnectionTestSuccessResponse,
  openPlaywrightConnectionTestSession,
  persistPlaywrightConnectionTestSession,
  resolvePlaywrightConnectionTestRuntime,
} from '@/features/playwright/server';
import type { TestLogEntry } from '@/shared/contracts/integrations';
import type {
  IntegrationConnectionRecord,
  IntegrationRepository,
} from '@/shared/contracts/integrations/repositories';

type PushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => void;
type Fail = (step: string, detail: string, status?: number) => Promise<never>;

type ConnectionUpdateRepository = Pick<IntegrationRepository, 'updateConnection'>;

const QUICKLIST_AUTH_REQUIRED_DETAIL =
  'AUTH_REQUIRED: Stored 1688 session expired or is missing. Open the 1688 login window and refresh the session.';

const normalize1688StartUrl = (connection: IntegrationConnectionRecord): string =>
  connection.scanner1688StartUrl?.trim() || 'https://www.1688.com/';

const detect1688AccessBarrier = async (page: Page): Promise<{
  blocked: boolean;
  currentUrl: string;
}> => {
  const currentUrl = page.url();
  const normalizedUrl = currentUrl.toLowerCase();
  const bodyText = (
    (await page.locator('body').first().textContent().catch(() => null))?.trim().toLowerCase() || ''
  );
  const blockingSelectors = [
    'input[type="password"]',
    'iframe[src*="captcha"]',
    '[id*="nc_"]',
    '[class*="captcha"]',
    '[class*="login"] input',
  ];

  for (const selector of blockingSelectors) {
    if ((await page.locator(selector).first().count().catch(() => 0)) > 0) {
      return { blocked: true, currentUrl };
    }
  }

  const textHints = [
    '请登录',
    '登录后',
    '扫码登录',
    '验证码',
    '滑动验证',
    '访问受限',
    '安全验证',
    'captcha',
  ];

  return {
    blocked:
      normalizedUrl.includes('login') ||
      normalizedUrl.includes('captcha') ||
      textHints.some((hint) => bodyText.includes(hint.toLowerCase())),
    currentUrl,
  };
};

const waitFor1688ManualLogin = async (
  page: Page,
  timeoutMs: number
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(1000);
    const barrier = await detect1688AccessBarrier(page);
    if (!barrier.blocked) {
      return true;
    }
  }
  return false;
};

export const handle1688BrowserTest = async (
  connection: IntegrationConnectionRecord,
  repo: ConnectionUpdateRepository,
  manualMode: boolean,
  manualSessionRefreshMode: boolean,
  quicklistPreflightMode: boolean,
  manualLoginTimeoutMs: number,
  steps: TestLogEntry[],
  pushStep: PushStep,
  fail: Fail
): Promise<Response> => {
  const interactiveManualMode = manualMode || manualSessionRefreshMode;

  if (interactiveManualMode) {
    pushStep(
      'Manual mode',
      'ok',
      `${
        manualSessionRefreshMode ? 'Manual session refresh' : 'Manual login'
      } enabled (timeout ${manualLoginTimeoutMs}ms).`
    );
  }

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
      missingDetail: 'No stored session found',
      missingStatus: interactiveManualMode ? 'ok' : 'failed',
    },
  });

  const resolvedSettings = runtime.settings;
  const startUrl = normalize1688StartUrl(connection);
  const headless = interactiveManualMode ? false : resolvedSettings.headless;
  const session = await openPlaywrightConnectionTestSession({
    connection,
    pushStep,
    runtime,
    headless,
    browserPreference:
      interactiveManualMode && resolvedSettings.browser === 'chromium'
        ? 'auto'
        : resolvedSettings.browser,
    launchSettingsOverrides: {
      slowMo: interactiveManualMode
        ? Math.max(50, resolvedSettings.slowMo)
        : resolvedSettings.slowMo,
      proxyEnabled: resolvedSettings.proxyEnabled,
      proxyServer: resolvedSettings.proxyServer,
      proxyUsername: resolvedSettings.proxyUsername,
      proxyPassword: resolvedSettings.proxyPassword,
    },
    viewport: { width: 1366, height: 900 },
    launchStep: {
      stepName: 'Launching Playwright',
      pendingDetail: `Starting browser (headless=${headless ? 'on' : 'off'})`,
    },
  });

  try {
    const page = session.page;

    const openStartPage = async (stepName: string, detail: string): Promise<void> => {
      pushStep(stepName, 'pending', detail);
      await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => undefined);
      pushStep(stepName, 'ok', '1688 start page loaded');
    };

    if (quicklistPreflightMode || !interactiveManualMode) {
      if (!runtime.storageState) {
        return await fail('Session preflight', QUICKLIST_AUTH_REQUIRED_DETAIL, 409);
      }

      await openStartPage('Session preflight', 'Checking stored 1688 session...');
      const barrier = await detect1688AccessBarrier(page);
      if (barrier.blocked) {
        return await fail('Session preflight', QUICKLIST_AUTH_REQUIRED_DETAIL, 409);
      }

      pushStep('Session preflight', 'ok', 'Stored 1688 session is active.');
      return createPlaywrightConnectionTestSuccessResponse({
        steps,
        message: '1688 session is active.',
        sessionReady: true,
      });
    }

    await openStartPage('1688 Login', 'Opening 1688 for manual login...');
    const initialBarrier = await detect1688AccessBarrier(page);
    if (initialBarrier.blocked) {
      pushStep(
        'Manual login',
        'pending',
        `Complete 1688 login in the opened browser window. Waiting up to ${Math.round(
          manualLoginTimeoutMs / 1000
        )}s.`
      );
      const success = await waitFor1688ManualLogin(page, manualLoginTimeoutMs);
      if (!success) {
        return await fail(
          'Manual login',
          `Manual 1688 login timed out after ${Math.round(manualLoginTimeoutMs / 1000)}s.`,
          409
        );
      }
      pushStep('Manual login', 'ok', '1688 login barrier cleared.');
    } else {
      pushStep('Authentication', 'ok', '1688 session already active.');
    }

    const finalBarrier = await detect1688AccessBarrier(page);
    if (finalBarrier.blocked) {
      return await fail(
        'Verifying session',
        'AUTH_REQUIRED: 1688 session is still blocked after manual login.',
        409
      );
    }

    await persistPlaywrightConnectionTestSession({
      connectionId: connection.id,
      page,
      repo,
      pushStep,
      pendingDetail: 'Saving 1688 browser session',
      successDetail: '1688 browser session saved',
      failureDetail: 'Failed to save 1688 browser session',
    });

    return createPlaywrightConnectionTestSuccessResponse({
      steps,
      message: '1688 session refreshed successfully.',
      sessionReady: true,
    });
  } finally {
    await session.close().catch(() => undefined);
  }
};
