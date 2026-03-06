import { test, expect } from '@playwright/test';

test.describe('Kangur Game Quick Start', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });
  });

  test('opens training setup from quickStart=training and clears query params', async ({ page }) => {
    await page.goto('/kangur/game?quickStart=training');

    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page).not.toHaveURL(/quickStart=/);
    await expect(page.getByText(/Tryb treningowy/i)).toBeVisible();
  });

  test('starts operation run from quickStart=operation and clears query params', async ({ page }) => {
    await page.goto('/kangur/game?quickStart=operation&operation=division&difficulty=easy');

    await expect(page).toHaveURL(/\/kangur\/game/);
    await expect(page).not.toHaveURL(/quickStart=/);
    await expect(page).not.toHaveURL(/operation=/);
    await expect(page).not.toHaveURL(/difficulty=/);
    await expect(page.getByText(/Pytanie 1 z 10/i)).toBeVisible();
  });
});
