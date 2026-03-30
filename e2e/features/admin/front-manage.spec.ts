import { expect, test, type Page } from '@playwright/test';

import {
  FRONT_PAGE_OPTIONS,
  normalizeFrontPageApp,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { ensureAdminSession } from '../../support/admin-auth';

const FRONT_PAGE_KEY = 'front_page_app';
const ROOT_OWNED_HOME_URL_PATTERN = /\/(?:[a-z]{2})?$/;
const FRONT_PAGE_ORIGINAL_STORAGE_KEY = '__front_manage_original_front_page_app';
const FRONT_PAGE_WRITE_RETRY_DELAYS_MS = [750, 1_500, 3_000, 5_000, 10_000] as const;

type BrowserFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

type KangurNavigationSample = {
  path: string;
  hasAppLoader: boolean;
  hasSkeleton: boolean;
  hasRouteShell: boolean;
  hasFeaturePageShell: boolean;
  hasHomeActionsShell: boolean;
  hasLessonsListTransition: boolean;
};

const KANGUR_NAVIGATION_MONITOR_KEY = '__kangurRootOwnerNavigationMonitor';

async function fetchFromBrowser(
  page: Page,
  path: string,
  init?: BrowserFetchInit
): Promise<{ ok: boolean; status: number; json: unknown | null }> {
  return await page.evaluate(
    async ({ path, init }) => {
      const readCookie = (name: string): string | null => {
        const part = document.cookie
          .split(';')
          .map((value) => value.trim())
          .find((value) => value.startsWith(`${name}=`));
        return part ? decodeURIComponent(part.split('=').slice(1).join('=')) : null;
      };

      let csrfToken = readCookie('csrf-token');
      if (!csrfToken) {
        csrfToken =
          typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().replace(/-/g, '')
            : `${Date.now()}${Math.random().toString(36).slice(2)}`;
        document.cookie = `csrf-token=${encodeURIComponent(csrfToken)}; Path=/; SameSite=Lax`;
      }

      const headers = new Headers(init?.headers ?? {});
      if (csrfToken && !headers.has('x-csrf-token')) {
        headers.set('x-csrf-token', csrfToken);
      }

      const response = await fetch(path, {
        method: init?.method ?? 'GET',
        headers,
        body: init?.body,
        credentials: 'same-origin',
      });

      let json: unknown | null = null;
      try {
        json = await response.json();
      } catch {
        json = null;
      }

      return {
        ok: response.ok,
        status: response.status,
        json,
      };
    },
    { path, init }
  );
}

async function readFrontPageAppSetting(page: Page): Promise<string | null> {
  return await page.evaluate((storageKey) => {
    const stored = window.sessionStorage.getItem(storageKey);
    if (typeof stored === 'string' && stored.length > 0) {
      return stored;
    }

    const selectedButton = document.querySelector<HTMLElement>(
      '[data-front-page-option-id][aria-pressed="true"]'
    );
    const selectedValue = selectedButton?.dataset['frontPageOptionId'];
    return typeof selectedValue === 'string' && selectedValue.length > 0 ? selectedValue : null;
  }, FRONT_PAGE_ORIGINAL_STORAGE_KEY);
}

async function writeFrontPageAppSetting(page: Page, value: string): Promise<void> {
  let lastStatus = 0;

  for (let attempt = 0; attempt <= FRONT_PAGE_WRITE_RETRY_DELAYS_MS.length; attempt += 1) {
    const response = await fetchFromBrowser(page, '/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key: FRONT_PAGE_KEY,
        value,
      }),
    });

    if (response.ok) {
      return;
    }

    lastStatus = response.status;
    if (response.status !== 429 || attempt === FRONT_PAGE_WRITE_RETRY_DELAYS_MS.length) {
      break;
    }

    await page.waitForTimeout(FRONT_PAGE_WRITE_RETRY_DELAYS_MS[attempt]);
  }

  throw new Error(`Unable to update ${FRONT_PAGE_KEY}: ${lastStatus}`);
}

async function readSelectedFrontPageOptionFromUi(
  page: Page
): Promise<FrontPageSelectableApp | null> {
  const selectedValue = await page.evaluate(() => {
    const selectedButton = document.querySelector<HTMLElement>(
      '[data-front-page-option-id][aria-pressed="true"]'
    );
    return selectedButton?.dataset['frontPageOptionId'] ?? null;
  });

  return selectedValue === 'cms' ||
    selectedValue === 'kangur' ||
    selectedValue === 'chatbot' ||
    selectedValue === 'notes'
    ? selectedValue
    : null;
}

async function restoreFrontPageAppSetting(page: Page, value: string | null): Promise<void> {
  const restoreValue = value ?? 'cms';
  await writeFrontPageAppSetting(page, restoreValue);
}

async function waitForRootOwnedKangurBoot(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="kangur-feature-page-shell"]')).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.locator('[data-testid="kangur-route-content"]')).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.locator('[data-testid="kangur-route-content"]')).toHaveAttribute(
    'data-route-interactive-ready',
    'true',
    {
      timeout: 45_000,
    }
  );
  await expect(page.locator('[data-testid="kangur-app-loader"]')).toHaveCount(0, {
    timeout: 45_000,
  });
}

async function startKangurNavigationMonitor(page: Page): Promise<void> {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => KangurNavigationSample[];
          }
        | undefined;
    };
    const storageKey = `${monitorKey}:samples`;
    const samples: KangurNavigationSample[] = [];
    let running = true;
    window.sessionStorage.removeItem(storageKey);

    const isElementVisible = (element: Element | null): boolean => {
      if (!(element instanceof HTMLElement) && !(element instanceof SVGElement)) {
        return false;
      }

      let current: Element | null = element;
      while (current) {
        const styles = window.getComputedStyle(current);
        if (
          styles.display === 'none' ||
          styles.visibility === 'hidden' ||
          Number.parseFloat(styles.opacity || '1') === 0
        ) {
          return false;
        }
        current = current.parentElement;
      }

      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const sample = (): void => {
      samples.push({
        path: `${window.location.pathname}${window.location.search}`,
        hasAppLoader: Boolean(document.querySelector('[data-testid="kangur-app-loader"]')),
        hasSkeleton: isElementVisible(
          document.querySelector('[data-testid="kangur-page-transition-skeleton"]')
        ),
        hasRouteShell: Boolean(document.querySelector('[data-testid="kangur-route-shell"]')),
        hasFeaturePageShell: Boolean(
          document.querySelector('[data-testid="kangur-feature-page-shell"]')
        ),
        hasHomeActionsShell: isElementVisible(
          document.querySelector('[data-testid="kangur-home-actions-shell"]')
        ),
        hasLessonsListTransition: isElementVisible(
          document.querySelector('[data-testid="lessons-list-transition"]')
        ),
      });
      window.sessionStorage.setItem(storageKey, JSON.stringify(samples));

      if (running) {
        window.requestAnimationFrame(sample);
      }
    };

    window.requestAnimationFrame(sample);
    globalWindow[monitorKey] = {
      stop: () => {
        running = false;
        window.sessionStorage.setItem(storageKey, JSON.stringify(samples));
        return samples;
      },
    };
  }, KANGUR_NAVIGATION_MONITOR_KEY);
}

async function stopKangurNavigationMonitor(page: Page): Promise<KangurNavigationSample[]> {
  return page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
            stop: () => KangurNavigationSample[];
          }
        | undefined;
    };

    const liveSamples = globalWindow[monitorKey]?.stop();
    if (liveSamples) {
      return liveSamples;
    }

    const serializedSamples = window.sessionStorage.getItem(`${monitorKey}:samples`);
    if (!serializedSamples) {
      return [];
    }

    try {
      return JSON.parse(serializedSamples) as KangurNavigationSample[];
    } catch {
      return [];
    }
  }, KANGUR_NAVIGATION_MONITOR_KEY);
}

test.describe.serial('Front Manage', () => {
  let suiteOriginalValue: string | null = null;
  let hasCapturedSuiteOriginalValue = false;
  let suiteCurrentSelection: FrontPageSelectableApp | null = null;

  const ensureSuiteFrontPageSelection = async (
    page: Page,
    option: FrontPageSelectableApp
  ): Promise<void> => {
    if (suiteCurrentSelection === option) {
      return;
    }

    await writeFrontPageAppSetting(page, option);
    suiteCurrentSelection = option;
  };

  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    const settingsResponsePromise = page
      .waitForResponse(
        (response) =>
          response.request().method() === 'GET' &&
          /\/api\/settings\?scope=light(?:&|$)/.test(response.url()),
        { timeout: 60_000 }
      )
      .catch(() => null);

    await ensureAdminSession(page, '/admin/front-manage');
    await page.goto('/admin/front-manage', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });

    const settingsResponse = await settingsResponsePromise;
    const settingValue =
      settingsResponse && settingsResponse.ok()
        ? ((await settingsResponse.json().catch(() => null)) as Array<{
            key?: unknown;
            value?: unknown;
          }> | null)
            ?.find((entry) => entry?.key === FRONT_PAGE_KEY)
            ?.value
        : null;

    if (typeof settingValue === 'string' && settingValue.length > 0) {
      await page.evaluate(
        ({ storageKey, value }) => {
          window.sessionStorage.setItem(storageKey, value);
        },
        {
          storageKey: FRONT_PAGE_ORIGINAL_STORAGE_KEY,
          value: settingValue,
        }
      );
    }

    if (!hasCapturedSuiteOriginalValue) {
      suiteOriginalValue = await readFrontPageAppSetting(page);
      hasCapturedSuiteOriginalValue = true;
    }

    if (!suiteCurrentSelection) {
      suiteCurrentSelection =
        normalizeFrontPageApp(suiteOriginalValue) ??
        (await readSelectedFrontPageOptionFromUi(page)) ??
        'cms';
    }
  });

  test.afterAll(async ({ browser }) => {
    if (!hasCapturedSuiteOriginalValue) {
      return;
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await ensureAdminSession(page, '/admin/front-manage');
      await page.goto('/admin/front-manage', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
      const currentSelection = await readSelectedFrontPageOptionFromUi(page);
      const originalSelection = normalizeFrontPageApp(suiteOriginalValue);

      if (!currentSelection || currentSelection !== originalSelection) {
        await restoreFrontPageAppSetting(page, suiteOriginalValue);
        suiteCurrentSelection = originalSelection;
      }
    } finally {
      await context.close();
    }
  });

  test('should display front manage page', async ({ page }) => {
    const main = page.locator('main');

    await expect(main.getByRole('heading', { level: 1, name: /front manage/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(main.getByText('Pick which app should own the public home route.')).toBeVisible({
      timeout: 30_000,
    });
  });

  test('should display the available front page options', async ({ page }) => {
    const main = page.locator('main');
    const kangurOptionTitle =
      FRONT_PAGE_OPTIONS.find((option) => option.id === 'kangur')?.title ?? 'StudiQ';
    await expect(
      main.getByRole('button', { name: new RegExp(FRONT_PAGE_OPTIONS[0]?.title ?? 'CMS Home', 'i') })
    ).toBeVisible({
      timeout: 30_000,
    });
    for (const option of FRONT_PAGE_OPTIONS) {
      await expect(main.getByRole('button', { name: new RegExp(option.title, 'i') })).toBeVisible();
    }

    const kangurBtn = main.getByRole('button', { name: new RegExp(kangurOptionTitle, 'i') });
    await kangurBtn.click();

    await expect(kangurBtn.getByText('/', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Selection' })).toBeEnabled();
  });

  test('should mount Kangur on HOME when selected and restore the previous setting', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await ensureSuiteFrontPageSelection(page, 'kangur');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(ROOT_OWNED_HOME_URL_PATTERN);
    await expect(page.locator('[data-testid="kangur-feature-page-shell"]')).toBeVisible();
  });

  test('should keep route navigation on skeleton loading instead of the app loader when Kangur owns root', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await ensureSuiteFrontPageSelection(page, 'kangur');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(ROOT_OWNED_HOME_URL_PATTERN);
    await waitForRootOwnedKangurBoot(page);

    await startKangurNavigationMonitor(page);
    await page.getByTestId('kangur-primary-nav-lessons').click();

    await expect(page).toHaveURL(/\/lessons$/);
    await expect(page.locator('[data-testid="kangur-route-content"]')).toBeVisible({
      timeout: 45_000,
    });

    const samples = await stopKangurNavigationMonitor(page);
    expect(samples.length).toBeGreaterThan(0);
    expect(samples.every((sample) => sample.hasRouteShell || sample.hasFeaturePageShell)).toBe(
      true
    );
    expect(
      samples.some((sample) => sample.hasSkeleton),
      'expected root-owned Kangur navigation to surface the page skeleton during the transition'
    ).toBe(true);
    expect(
      samples.every((sample) => !sample.hasAppLoader),
      'expected root-owned Kangur navigation not to surface the global app loader after boot'
    ).toBe(true);
  });

  test('should keep the home lessons action hidden once the root-owned lessons handoff begins', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await ensureSuiteFrontPageSelection(page, 'kangur');

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(ROOT_OWNED_HOME_URL_PATTERN);
    await waitForRootOwnedKangurBoot(page);
    await expect(page.locator('[data-doc-id="home_lessons_action"]')).toBeVisible({
      timeout: 45_000,
    });

    await startKangurNavigationMonitor(page);
    await page.locator('[data-doc-id="home_lessons_action"]').click();

    await expect(page).toHaveURL(/\/lessons$/);
    await expect(page.locator('[data-testid="lessons-list-transition"]')).toBeVisible({
      timeout: 45_000,
    });
    await page.waitForTimeout(180);

    const samples = await stopKangurNavigationMonitor(page);
    const handoffStartIndex = samples.findIndex(
      (sample) =>
        sample.hasSkeleton || sample.hasLessonsListTransition || /\/lessons$/.test(sample.path)
    );

    expect(samples.length).toBeGreaterThan(0);
    expect(handoffStartIndex).toBeGreaterThan(-1);
    expect(
      samples.some((sample) => sample.hasSkeleton),
      'expected the root-owned lessons handoff to surface the route skeleton'
    ).toBe(true);
    expect(
      samples.slice(handoffStartIndex).some((sample) => sample.hasHomeActionsShell),
      'expected the embedded home actions shell not to reappear once the lessons handoff started'
    ).toBe(false);
    expect(
      samples.some((sample) => sample.hasLessonsListTransition),
      'expected the lessons list surface to become visible after the handoff'
    ).toBe(true);
  });

  test('should redirect legacy /kangur routes to root-owned Kangur routes when selected', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await ensureSuiteFrontPageSelection(page, 'kangur');

    await page.goto('/kangur/tests', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/tests$/);

    await page.goto('/kangur/login?callbackUrl=%2Fkangur%2Ftests', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fkangur%2Ftests$/);
    await expect(page.locator('[data-testid="kangur-feature-page-shell"]')).toBeVisible();
    await expect(page.getByTestId('kangur-login-form')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-login-kind',
      'unknown'
    );
    await expect(
      page
        .getByTestId('kangur-login-form')
        .getByLabel(/Email rodzica (albo|lub) nick ucznia|Parent email or learner username/i)
    ).toBeVisible();
  });

  test('should keep localized public login routes route-driven when Kangur owns the frontend', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await ensureSuiteFrontPageSelection(page, 'kangur');

    await page.goto('/en/login?callbackUrl=%2Fen%2Ftests', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/en\/login\?callbackUrl=%2Fen%2Ftests$/);
    await expect(page.locator('[data-testid="kangur-feature-page-shell"]')).toBeVisible();
    await expect(page.getByTestId('kangur-login-form')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-login-kind',
      'unknown'
    );
    await expect(
      page
        .getByTestId('kangur-login-form')
        .getByLabel(/Email rodzica (albo|lub) nick ucznia|Parent email or learner username/i)
    ).toBeVisible();
  });

  test('should keep legacy /kangur routes when CMS owns the frontend', async ({ page }) => {
    test.setTimeout(120_000);

    await ensureSuiteFrontPageSelection(page, 'cms');

    await page.goto('/kangur/tests', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expect(page.locator('[data-testid="kangur-route-shell"]')).toBeVisible();

    await page.goto('/kangur/login?callbackUrl=%2Fkangur%2Ftests', {
      waitUntil: 'domcontentloaded',
    });
    await expect(page).toHaveURL(/\/kangur\/login\?callbackUrl=%2Fkangur%2Ftests$/);
    await expect(page.locator('[data-testid="kangur-route-shell"]')).toBeVisible();
    await expect(page.getByTestId('kangur-login-form')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId('kangur-login-form')).toHaveAttribute(
      'data-login-kind',
      'unknown'
    );
    await expect(
      page
        .getByTestId('kangur-login-form')
        .getByLabel(/Email rodzica (albo|lub) nick ucznia|Parent email or learner username/i)
    ).toBeVisible();
  });
});
