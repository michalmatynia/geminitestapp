import { test, expect } from '@playwright/test';

test.describe('Agent Runs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/agentcreator/runs');
    // Wait for the page to load and potentially for initial runs to appear or for the empty state to be clear
    await expect(page.getByRole('heading', { name: 'Agent Runs' })).toBeVisible();
  });

  test('should display agent runs page with search and refresh', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Agent Runs' })).toBeVisible();
    
    // Check for search input
    await expect(page.getByPlaceholder('Search runs...')).toBeVisible();
    
    // Check for Refresh and Delete buttons
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete completed agent runs' })).toBeVisible();
  });

  test('should handle empty state if no runs exist', async ({ page }) => {
    // If no runs, it shows "No runs yet."
    // This is the most likely state in a clean test environment.
    const emptyMsg = page.getByText('No runs yet.');
    // The page might initially show a loading state before the empty message, so a visible check is robust.
    await expect(emptyMsg).toBeVisible();
  });

  test('should allow searching for runs', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search runs...');
    await searchInput.fill('test-run-id');
    await expect(searchInput).toHaveValue('test-run-id');
    // In a real app, we'd wait for the table to update and assert results.
    // For now, just verify input interaction.
    // If there were runs, we'd add: await expect(page.locator('table tbody tr')).toContainText('test-run-id');
  });

  test('should allow refreshing the list', async ({ page }) => {
    // The refresh button might not do much visually if the list is static or auto-refreshing.
    // We just confirm it's clickable and doesn't break.
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled();
    await page.getByRole('button', { name: 'Refresh' }).click();
    // Add an assertion if refresh has a visual indicator or changes the list state
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeEnabled(); // Check it's still enabled after click
  });

  test('should handle deleting completed agent runs', async ({ page }) => {
    // This test focuses on the UI interaction of clicking the delete button and confirming.
    // It assumes runs exist or the button is enabled. A more robust test would involve
    // pre-populating a completed run and verifying its removal.

    // Check if delete button is enabled (it might be disabled if no runs are selected/completed)
    // For now, we'll just simulate the click and confirmation
    await expect(page.getByRole('button', { name: 'Delete completed agent runs' })).toBeVisible();
    
    // Simulate clicking the delete button.
    // In a real scenario, you'd want to have at least one completed run visible to select/target for deletion.
    // For this example, we'll just simulate the action and the confirmation dialog.
    
    // Mock the dialog confirmation
    page.once('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm'); // Ensure it's a confirmation dialog
      expect(dialog.message()).toContain('Are you sure you want to delete'); // Check confirmation message
      await dialog.accept(); // Confirm deletion
    });

    await page.getByRole('button', { name: 'Delete completed agent runs' }).click();

    // Add assertions here to verify the action, e.g., check for a success message,
    // or check if the list has updated (e.g., fewer runs or empty state).
    // For now, we'll just confirm the action was initiated.
    await expect(page.getByRole('button', { name: 'Delete completed agent runs' })).toBeEnabled(); // Check it's still enabled after click
  });
});
