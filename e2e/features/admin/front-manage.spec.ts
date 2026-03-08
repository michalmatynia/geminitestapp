import { expect, test, type Page } from '@playwright/test';

import {
  FRONT_PAGE_OPTIONS,
  normalizeFrontPageApp,
  type FrontPageSelectableApp,
} from '@/shared/lib/front-page-app';
import { ensureAdminSession } from '../../support/admin-auth';

const FRONT_PAGE_KEY = 'front_page_app';
const FRONT_PAGE_UPDATED_TOAST = 'Front page updated';

type BrowserFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

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
  await expect(page.getByText(FRONT_PAGE_UPDATED_TOAST)).toBeVisible({ timeout: 30_000 });
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
    for (const option of FRONT_PAGE_OPTIONS) {
      await expect(main.getByRole('button', { name: new RegExp(option.title, 'i') })).toBeVisible();
    }

    const kangurBtn = main.getByRole('button', { name: /Kangur/i });
    await kangurBtn.click();

    await expect(kangurBtn.getByText('/', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Selection' })).toBeEnabled();
  });

  test('should mount Kangur on HOME when selected and restore the previous setting', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);
    const restoreOption = normalizeFrontPageApp(originalValue) ?? 'cms';

    try {
      await saveFrontPageSelectionFromUi(page, 'kangur');

      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/$/);
      await expect(page.locator('[data-testid="kangur-feature-page-shell"]')).toBeVisible();
    } finally {
      await page.goto('/admin/front-manage', { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (originalValue === 'products') {
        await writeFrontPageAppSetting(page, originalValue);
      } else {
        await saveFrontPageSelectionFromUi(page, restoreOption);
      }
    }
  });

  test('should redirect legacy /kangur routes to root-owned Kangur routes when selected', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);
    const restoreOption = normalizeFrontPageApp(originalValue) ?? 'cms';

    try {
      await saveFrontPageSelectionFromUi(page, 'kangur');

      await page.goto('/kangur/tests', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/tests$/);

      await page.goto('/kangur/login?callbackUrl=%2Fkangur%2Ftests', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fkangur%2Ftests$/);
      await expect(page.locator('[data-testid="kangur-login-shell"]')).toBeVisible();
      await expect(
        page.getByTestId('kangur-login-parent-form').getByLabel('Email rodzica')
      ).toBeVisible();
      await expect(
        page.getByTestId('kangur-login-student-form').getByLabel('Nick ucznia')
      ).toBeVisible();
      await expect(page.getByRole('link', { name: /Przejdz do logowania rodzica/i })).toHaveCount(0);
    } finally {
      await page.goto('/admin/front-manage', { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (originalValue === 'products') {
        await writeFrontPageAppSetting(page, originalValue);
      } else {
        await saveFrontPageSelectionFromUi(page, restoreOption);
      }
    }
  });

  test('should keep legacy /kangur routes when CMS owns the frontend', async ({ page }) => {
    test.setTimeout(120_000);

    const originalValue = await readFrontPageAppSetting(page);
    const restoreOption = normalizeFrontPageApp(originalValue) ?? 'cms';

    try {
      await saveFrontPageSelectionFromUi(page, 'cms');

      await page.goto('/kangur/tests', { waitUntil: 'domcontentloaded' });
      await expect(page).toHaveURL(/\/kangur\/tests$/);
      await expect(page.locator('[data-testid="kangur-route-shell"]')).toBeVisible();

      await page.goto('/kangur/login?callbackUrl=%2Fkangur%2Ftests', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page).toHaveURL(/\/kangur\/login\?callbackUrl=%2Fkangur%2Ftests$/);
      await expect(page.locator('[data-testid="kangur-login-shell"]')).toBeVisible();
      await expect(
        page.getByTestId('kangur-login-parent-form').getByLabel('Email rodzica')
      ).toBeVisible();
      await expect(
        page.getByTestId('kangur-login-student-form').getByLabel('Nick ucznia')
      ).toBeVisible();
    } finally {
      await page.goto('/admin/front-manage', { waitUntil: 'domcontentloaded' }).catch(() => {});
      if (originalValue === 'products') {
        await writeFrontPageAppSetting(page, originalValue);
      } else {
        await saveFrontPageSelectionFromUi(page, restoreOption);
      }
    }
  });
});
