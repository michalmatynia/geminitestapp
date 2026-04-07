import { NextResponse } from 'next/server';
import type { Browser, BrowserContext, Page, BrowserContextOptions } from 'playwright';
import { chromium, devices } from 'playwright';

import { isVintedIntegrationSlug } from '@/features/integrations/constants/slugs';
import { decryptSecret, encryptSecret } from '@/features/integrations/server';
import {
  resolveConnectionPlaywrightSettings,
  type PersistedStorageState,
} from '@/features/integrations/services/tradera-playwright-settings';
import { type TestConnectionResponse, type TestLogEntry } from '@/shared/contracts/integrations';
import { internalError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import { createVintedBrowserTestUtils } from '@/features/integrations/services/vinted-listing/vinted-browser-test-utils';

type PushStep = (step: string, status: 'pending' | 'ok' | 'failed', detail: string) => void;
type Fail = (step: string, detail: string, status?: number) => Promise<never>;

export const handleVintedBrowserTest = async (
  connection: any, // IntegrationConnectionRecord
  repo: any, // IntegrationRepository
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
  if (connection.playwrightStorageState) {
    pushStep('Loading session', 'pending', 'Loading stored Playwright session');
    try {
      const raw = decryptSecret(connection.playwrightStorageState);
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
  
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    pushStep('Launching Playwright', 'pending', `Starting Chromium (headless=${headless ? 'on' : 'off'})`);
    browser = await chromium.launch({
      headless,
      slowMo,
    });

    const contextOptions: BrowserContextOptions = {
      ...(storedState ? { storageState: storedState } : {}),
      viewport: { width: 1280, height: 720 },
    };

    context = await browser.newContext(contextOptions);
    page = await context.newPage();

    const {
      safeGoto,
      acceptCookieConsent,
      safeIsVisible,
      safeWaitFor,
      humanizedPause,
      successSelector,
    } = createVintedBrowserTestUtils({
      page,
      connectionId: connection.id,
      fail,
    });

    const isVintedLoggedIn = async (): Promise<boolean> => {
      if (!page) return false;
      const currentUrl = page.url().toLowerCase();
      // Vinted login detection logic
      const userProfileIcon = page.locator('button[aria-label*="Profil"], button[aria-label*="Profile"], .c-header__item--user').first();
      return (await safeIsVisible(userProfileIcon)) || currentUrl.includes('/member/') || currentUrl.includes('/settings');
    };

    let sessionReused = false;
    if (storedState) {
      pushStep('Reusing session', 'pending', 'Checking existing session');
      try {
        await safeGoto('https://www.vinted.pl/', { waitUntil: 'domcontentloaded', timeout: 30000 }, 'Session check');
        await acceptCookieConsent();
        await humanizedPause();
        if (await isVintedLoggedIn()) {
          pushStep('Reusing session', 'ok', 'Session still valid');
          sessionReused = true;
        } else {
          pushStep('Reusing session', 'failed', 'Session invalid or expired');
        }
      } catch (error) {
        pushStep('Reusing session', 'failed', 'Failed to check session');
      }
    }

    if (quicklistPreflightMode) {
      if (!sessionReused) {
        return fail('Quicklist preflight', 'AUTH_REQUIRED: Vinted session expired or is missing.', 409);
      }
      pushStep('Quicklist preflight', 'ok', 'Stored session is ready.');
      return NextResponse.json({ ok: true, steps, sessionReady: true });
    }

    if (!sessionReused) {
      if (manualMode) {
        pushStep('Manual login', 'pending', 'Complete Vinted login in the opened browser window.');
        await safeGoto('https://www.vinted.pl/member/general/login', { waitUntil: 'domcontentloaded', timeout: 30000 }, 'Vinted Login');
        await acceptCookieConsent();
        
        try {
          await safeWaitFor(page.locator(successSelector).first(), { state: 'visible', timeout: manualLoginTimeoutMs }, 'Manual login detection');
          if (await isVintedLoggedIn()) {
            pushStep('Manual login', 'ok', 'Logged-in state detected.');
          } else {
             // Second attempt if first selector was too generic
             await page.waitForURL('**/items/new', { timeout: manualLoginTimeoutMs }).catch(() => undefined);
             if (await isVintedLoggedIn()) {
               pushStep('Manual login', 'ok', 'Logged-in state detected via URL.');
             } else {
               return fail('Manual login', 'Login detection timed out.');
             }
          }
        } catch (error) {
           return fail('Manual login', 'Manual login timed out.');
        }
      } else {
         // Auto login not implemented for Vinted yet, prefer manual for first implementation
         return fail('Auto login', 'Automatic Vinted login is not yet supported. Please use Manual mode.');
      }
    }

    pushStep('Saving session', 'pending', 'Storing Vinted Playwright session');
    try {
      const storageStateResult = await page.context().storageState();
      await repo.updateConnection(connection.id, {
        playwrightStorageState: encryptSecret(JSON.stringify(storageStateResult)),
        playwrightStorageStateUpdatedAt: new Date(),
      });
      pushStep('Saving session', 'ok', 'Session stored for reuse');
    } catch (error) {
      pushStep('Saving session', 'failed', 'Failed to store session');
    }

    pushStep('Verifying session', 'ok', 'Vinted login successful');
  } finally {
    await page?.close().catch(() => undefined);
    await context?.close().catch(() => undefined);
    await browser?.close().catch(() => undefined);
  }

  return NextResponse.json({ ok: true, steps });
};
