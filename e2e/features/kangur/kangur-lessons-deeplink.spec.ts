import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });

const ROUTE_BOOT_TIMEOUT_MS = 45_000;

const waitForFocusParamToClear = async (page: Page) => {
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
    .not.toContain('focus=');
};

test.describe('Kangur Lessons Deep Links', () => {
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

  test('opens the focused lesson from localized routes and clears query params', async ({
    page,
  }) => {
    const backToLessonsButton = page.getByRole('button', { name: /back to lesson list/i });

    await page.goto('/en/kangur/lessons?focus=division', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await expect(page).toHaveURL(/\/en\/kangur\/lessons/, {
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await expect(backToLessonsButton).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
    await waitForFocusParamToClear(page);
    await backToLessonsButton.click();
    await expect(page.locator('#kangur-lessons-intro')).toBeVisible({
      timeout: ROUTE_BOOT_TIMEOUT_MS,
    });
  });
});
