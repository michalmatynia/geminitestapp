import { test, expect, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });

const ROUTE_BOOT_TIMEOUT_MS = 45_000;
const TRAINING_HEADING_PATTERN = /training|trening/i;
const GAME_PLAYING_HEADING_PATTERN =
  /question to solve|pytanie do rozwiazania|pytanie do rozwiązania/i;
const OPERATION_HEADING_PATTERN = /let's play|grajmy/i;

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
        .getByRole('heading', { name: TRAINING_HEADING_PATTERN })
    ).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await waitForQuickStartParamsToClear(page);
  });

  test('opens training setup from localized quickStart=training routes and clears query params', async ({
    page,
  }) => {
    await page.goto('/en/kangur/game?quickStart=training', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/\/en\/kangur\/game/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(page.getByTestId('kangur-game-training-top-section')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await waitForQuickStartParamsToClear(page);
  });

  test('starts operation run from quickStart=operation and clears query params', async ({ page }) => {
    await page.goto('/kangur/game?quickStart=operation&operation=division&difficulty=easy', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/\/kangur\/game/, { timeout: ROUTE_BOOT_TIMEOUT_MS });
    await expect(
      page
        .getByTestId('kangur-game-main')
        .getByRole('heading', { name: GAME_PLAYING_HEADING_PATTERN })
    ).toBeVisible({ timeout: ROUTE_BOOT_TIMEOUT_MS });
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
    await expect(page.getByRole('heading', { name: OPERATION_HEADING_PATTERN })).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await waitForQuickStartParamsToClear(page);
  });
});
