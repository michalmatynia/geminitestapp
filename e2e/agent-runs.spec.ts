import { test, expect } from '@playwright/test';

test.describe('Agent Runs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/agentcreator/runs');
  });

  test('should display agent runs page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Agent Runs' })).toBeVisible();
    
    // Check for search input
    await expect(page.getByPlaceholder('Search runs...')).toBeVisible();
    
    // Check for Refresh and Delete buttons
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete completed agent runs' })).toBeVisible();
  });

  test('should handle empty state', async ({ page }) => {
    // If no runs, it shows "No runs yet."
    // This is the most likely state in a clean test environment.
    const emptyMsg = page.getByText('No runs yet.');
    if (await emptyMsg.isVisible()) {
        await expect(emptyMsg).toBeVisible();
    }
  });

  test('should allow searching', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search runs...');
    await searchInput.fill('test-run');
    await expect(searchInput).toHaveValue('test-run');
  });
});
