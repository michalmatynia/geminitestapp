import { expect, test, type Page } from '@playwright/test';

import {
  FRONT_PAGE_OPTIONS,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { ensureAdminSession } from '../../support/admin-auth';

const FRONT_PAGE_KEY = 'front_page_app';
const ROOT_OWNED_HOME_URL_PATTERN = /\/(?:[a-z]{2})?$/;

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
  const response = await fetchFromBrowser(page, `/api/settings?key=${encodeURIComponent(FRONT_PAGE_KEY)}`);

  if (!response.ok) {
    throw new Error(`Unable to read ${FRONT_PAGE_KEY}: ${response.status}`);
  }

  const payload = response.json as Array<{ value?: unknown }> | null;
  const value = Array.isArray(payload) ? payload[0]?.value : null;
  return typeof value === 'string' ? value : null;
}

async function writeFrontPageAppSetting(page: Page, value: string): Promise<void> {
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

  if (!response.ok) {
    throw new Error(`Unable to update ${FRONT_PAGE_KEY}: ${response.status}`);
  }
}

async function saveFrontPageSelectionFromUi(
  page: Page,
  option: FrontPageSelectableApp
): Promise<void> {
  const main = page.locator('main');
  const optionTitle = FRONT_PAGE_OPTIONS.find((entry) => entry.id === option)?.title;
  if (!optionTitle) {
    throw new Error(`Unknown front page option: ${option}`);
  }

  const updatePromise = page.waitForResponse((response) => {
    return (
      response.url().includes('/api/settings') &&
      response.request().method() === 'POST' &&
      response.status() === 200
    );
  });

  await main.getByRole('button', { name: new RegExp(optionTitle, 'i') }).click();
  await page.getByRole('button', { name: 'Save Selection' }).click();
  await updatePromise;
  await expect
    .poll(async () => await readFrontPageAppSetting(page), {
      timeout: 30_000,
      message: `expected ${FRONT_PAGE_KEY} to persist as ${option}`,
    })
    .toBe(option);
  await expect(page.getByRole('button', { name: 'Save Selection' })).toBeEnabled({
    timeout: 30_000,
  });
}

async function restoreFrontPageAppSetting(page: Page, value: string | null): Promise<void> {
  const restoreValue = value ?? 'cms';
  await writeFrontPageAppSetting(page, restoreValue);
  await expect
    .poll(async () => await readFrontPageAppSetting(page), {
      timeout: 30_000,
      message: `expected ${FRONT_PAGE_KEY} to restore as ${restoreValue}`,
    })
    .toBe(restoreValue);
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
  test.beforeEach(async ({ page }, testInfo) => {
    testInfo.setTimeout(120_000);
    await ensureAdminSession(page, '/admin/front-manage');
    await page.goto('/admin/front-manage', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible({ timeout: 30_000 });
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

    const originalValue = await readFrontPageAppSetting(page);

    try {
      await saveFrontPageSelectionFromUi(page, 'kangur');

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(ROOT_OWNED_HOME_URL_PATTERN);
      await expect(page.locator('[data-testid="kangur-feature-page-shell"]')).toBeVisible();
    } finally {
      await restoreFrontPageAppSetting(page, originalValue);
    }
  });

  test('should keep route navigation on skeleton loading instead of the app loader when Kangur owns root', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);

    try {
      await saveFrontPageSelectionFromUi(page, 'kangur');

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
    } finally {
      await restoreFrontPageAppSetting(page, originalValue);
    }
  });

  test('should keep the home lessons action hidden once the root-owned lessons handoff begins', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);

    try {
      await saveFrontPageSelectionFromUi(page, 'kangur');

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
    } finally {
      await restoreFrontPageAppSetting(page, originalValue);
    }
  });

  test('should redirect legacy /kangur routes to root-owned Kangur routes when selected', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);

    try {
      await saveFrontPageSelectionFromUi(page, 'kangur');

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
    } finally {
      await restoreFrontPageAppSetting(page, originalValue);
    }
  });

  test('should keep legacy /kangur routes when CMS owns the frontend', async ({ page }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);

    try {
      await saveFrontPageSelectionFromUi(page, 'cms');

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
    } finally {
      await restoreFrontPageAppSetting(page, originalValue);
    }
  });
});
