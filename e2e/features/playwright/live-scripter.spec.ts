import { expect, test, type Locator, type Page } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';

const LIVE_SCRIPTER_FRAME = {
  width: 1280,
  height: 800,
} as const;

const FIXTURE_BUTTON_CENTER = {
  x: 130,
  y: 144,
} as const;

const mockLiveScripterPageApis = async (page: Page): Promise<void> => {
  await page.route('**/api/user/preferences', async (route) => {
    const method = route.request().method();
    if (method !== 'GET' && method !== 'PATCH') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify({}),
    });
  });

  await page.route('**/api/settings/lite**', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route(/\/api\/settings(?:\?.*)?$/, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });
};

const buildFixtureUrl = (page: Page): string => {
  const current = new URL(page.url());
  const fixtureUrl = new URL('/playwright-fixtures/live-scripter-fixture', current);
  fixtureUrl.hostname = '2130706433';
  return fixtureUrl.toString();
};

const clickPreviewAtFramePoint = async (
  preview: Locator,
  point: { x: number; y: number }
): Promise<void> => {
  const box = await preview.boundingBox();
  expect(box).not.toBeNull();
  const resolvedBox = box as { width: number; height: number };

  await preview.click({
    force: true,
    position: {
      x: (point.x / LIVE_SCRIPTER_FRAME.width) * resolvedBox.width,
      y: (point.y / LIVE_SCRIPTER_FRAME.height) * resolvedBox.height,
    },
  });
};

const triggerButton = async (button: Locator): Promise<void> => {
  await button.evaluate((element) => (element as HTMLButtonElement).click());
};

const waitForLivePreviewReady = async (page: Page): Promise<Locator> => {
  await expect(
    page.getByText(new RegExp(`^Current page title: .*Live Scripter Fixture.*$`))
  ).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/^live$/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/^http:\/\/127\.0\.0\.1:3000\/playwright-fixtures\/live-scripter-fixture$/)).toBeVisible({
    timeout: 30_000,
  });

  const preview = page.getByLabel('Live website preview');
  await expect(preview).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      async () => {
        const box = await preview.boundingBox();
        return box !== null && box.width > 200 && box.height > 100;
      },
      {
        timeout: 30_000,
        message: 'Expected the live preview canvas to become stable before interacting with it.',
      }
    )
    .toBe(true);

  return preview;
};

const pickFixtureActionFromPreview = async (page: Page): Promise<void> => {
  const pickButton = page.getByRole('button', { name: 'Pick' });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await triggerButton(pickButton);
    await expect(page.getByText('Pick mode inspects the clicked element.')).toBeVisible({
      timeout: 20_000,
    });

    const preview = await waitForLivePreviewReady(page);
    await clickPreviewAtFramePoint(preview, FIXTURE_BUTTON_CENTER);

    try {
      await expect(page.getByText('Fixture action')).toBeVisible({ timeout: 5_000 });
      await expect(page.getByText('#fixture-action').first()).toBeVisible({ timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 5) {
        throw error;
      }
      await page.waitForTimeout(1_000);
    }
  }
};

test.describe('Playwright Live Scripter', () => {
  test('starts a live session, picks an element, and appends a draft step', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await mockLiveScripterPageApis(page);
    const authenticated = await ensureAdminSession(
      page,
      '/admin/playwright/step-sequencer/scripter'
    )
      .then(() => true)
      .catch(() => false);
    test.skip(!authenticated, 'Admin authentication is unavailable in this environment.');

    const fixtureUrl = buildFixtureUrl(page);

    await page.getByPlaceholder('https://example.com').fill(fixtureUrl);
    await triggerButton(page.getByRole('button', { name: /^Start$/ }));
    await expect(page.getByRole('button', { name: 'Pick' })).toBeVisible();
    await waitForLivePreviewReady(page);
    await pickFixtureActionFromPreview(page);

    await triggerButton(page.getByRole('button', { name: 'Append Step' }));

    await expect(page.getByRole('heading', { name: 'Draft Step Set' })).toBeVisible();
    await expect(page.getByText('Click Fixture action')).toBeVisible();
    await expect(page.getByText('click', { exact: true })).toBeVisible();
  });
});
