import { test, expect } from '@playwright/test';

test.describe('Databases Engine Workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/databases');
  });

  test('should resolve /admin/databases to the engine workspace', async ({ page }) => {
    await expect(page).toHaveURL(/\/admin\/databases\/engine$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Database Engine' })).toBeVisible();
  });

  test('should switch between restored engine workspace views', async ({ page }) => {
    await page.getByRole('button', { name: 'Backups' }).click();
    await expect(page).toHaveURL(/\/admin\/databases\/engine\?view=backups/, { timeout: 10000 });
    await expect(page.getByText('Backup Center')).toBeVisible();

    await page.getByRole('button', { name: 'Operations' }).click();
    await expect(page).toHaveURL(/\/admin\/databases\/engine\?view=operations/, { timeout: 10000 });

    await page.getByRole('button', { name: 'CRUD Console' }).click();
    await expect(page).toHaveURL(/\/admin\/databases\/engine\?view=crud/, { timeout: 10000 });

    await page.getByRole('button', { name: 'Redis' }).click();
    await expect(page).toHaveURL(/\/admin\/databases\/engine\?view=redis/, { timeout: 10000 });
  });

  test('should expose direct Database Preview access', async ({ page }) => {
    await page.getByRole('button', { name: 'Database Preview', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/databases\/preview/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Database Preview' })).toBeVisible();
  });
});
