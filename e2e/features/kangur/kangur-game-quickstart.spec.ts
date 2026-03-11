import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });

const ROUTE_BOOT_TIMEOUT_MS = 45_000;

const waitForQuickStartParamsToClear = async (page: Page) => {
  await expect
    .poll(
      () => {
        const url = new URL(page.url());
        return url.search;
      },
      {
        timeout: 20_000,
      }
    )
    .not.toContain('quickStart=');
};

test.describe('Kangur Game Quick Start', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    await page.route('**/api/kangur/auth/me**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Unauthorized' }),
      });
    });
  });

  test('opens training setup from quickStart=training and clears query params', async ({ page }) => {
    await page.goto('/kangur/game?quickStart=training', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/\/kangur\/game/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(
      page
        .getByTestId('kangur-game-training-top-section')
        .getByRole('heading', { name: /^Trening$/i })
    ).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await waitForQuickStartParamsToClear(page);
    await page
      .getByTestId('kangur-game-training-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
  });

  test('starts operation run from quickStart=operation and clears query params', async ({ page }) => {
    await page.goto('/kangur/game?quickStart=operation&operation=division&difficulty=easy', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/\/kangur\/game/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(page.getByRole('heading', { name: 'Pytanie do rozwiazania' })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect
      .poll(
        () => {
          const url = new URL(page.url());
          return {
            quickStart: url.searchParams.get('quickStart'),
            operation: url.searchParams.get('operation'),
            difficulty: url.searchParams.get('difficulty'),
          };
        },
        { timeout: 20_000 }
      )
      .toEqual({
        quickStart: null,
        operation: null,
        difficulty: null,
      });
  });

  test('opens operation setup from bare quickStart=operation and clears query params', async ({
    page,
  }) => {
    await page.goto('/kangur/game?quickStart=operation', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/\/kangur\/game/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(page.getByTestId('kangur-game-operation-top-section')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(page.getByRole('heading', { name: /Grajmy!/i })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await waitForQuickStartParamsToClear(page);
    await page
      .getByTestId('kangur-game-operation-top-section')
      .getByRole('button', { name: 'Wróć do poprzedniej strony' })
      .click();
    await expect(page.getByTestId('kangur-home-actions-shell')).toBeVisible();
  });
});
