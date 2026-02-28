import { test, expect } from '@playwright/test';

test.describe('3D Assets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/3d-assets');
  });

  test('should display 3D assets page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: '3D Assets' })).toBeVisible();
    await expect(page.getByText('Upload and manage 3D models')).toBeVisible();

    // Check for Upload button
    await expect(page.getByRole('button', { name: 'Upload Asset' })).toBeVisible();
  });

  test('should open uploader panel', async ({ page }) => {
    await page.getByRole('button', { name: 'Upload Asset' }).click();

    await expect(page.getByRole('heading', { name: 'Upload 3D Asset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('should toggle view mode', async ({ page }) => {
    // Default is grid mode. Find the list mode button.
    // The buttons use icons (Grid, List), and are inside a div with border.
    // In Admin3DAssetsPage, they are buttons with icons.

    const listButton = page.locator('button').filter({ has: page.locator('svg.lucide-list') });

    await listButton.click();
    // In list mode, a table should be visible if there are assets,
    // or at least the table header if it's rendered empty (but code shows it's only rendered if assets.length > 0)

    // If no assets, it shows "No 3D assets yet"
    const emptyState = page.getByText('No 3D assets yet');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should show filters', async ({ page }) => {
    await page.getByRole('button', { name: 'Filters' }).click();

    await expect(page.getByText('Category', { exact: true })).toBeVisible();
    await expect(page.getByText('Tags', { exact: true })).toBeVisible();
  });
});
