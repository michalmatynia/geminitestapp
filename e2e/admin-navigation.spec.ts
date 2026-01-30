import { test, expect } from '@playwright/test';

test.describe('Admin Navigation and Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('should display the admin sidebar with all main sections', async ({ page }) => {
    // Sidebar title/logo
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();

    // Verify main menu sections exist (some might be inside CollapsibleMenu)
    await expect(page.getByText('Products')).toBeVisible();
    await expect(page.getByText('Integrations')).toBeVisible();
    await expect(page.getByText('Notes')).toBeVisible();
    await expect(page.getByText('Settings')).toBeVisible();
    await expect(page.getByText('Files')).toBeVisible();
    await expect(page.getByText('System Logs')).toBeVisible();
  });

  test('should collapse and expand the sidebar', async ({ page }) => {
    const sidebar = page.locator('aside');
    // The toggle button is the only one without text content in the sidebar header area
    const toggleButton = sidebar.locator('button').first();
    
    // Initially expanded (default width is 64 / w-64)
    await expect(sidebar).toHaveClass(/w-64/);
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();

    // Collapse
    await toggleButton.click();
    await page.waitForTimeout(500); // Wait for transition
    await expect(sidebar).toHaveClass(/w-20/);
    // Link text should be hidden when collapsed (based on AdminLayout.tsx)
    await expect(page.getByRole('link', { name: 'Admin' })).not.toBeVisible();

    // Expand back
    await toggleButton.click();
    await page.waitForTimeout(500); // Wait for transition
    await expect(sidebar).toHaveClass(/w-64/);
    await expect(page.getByRole('link', { name: 'Admin' })).toBeVisible();
  });

  test('should navigate through main sections via sidebar', async ({ page }) => {
    // Test navigation to System Logs
    await page.getByText('System Logs').click({ force: true });
    await expect(page).toHaveURL(/\/admin\/system\/logs/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /System Logs/i })).toBeVisible();

    // Test navigation to Front Manage
    await page.getByText('Front Manage').click({ force: true });
    await expect(page).toHaveURL(/\/admin\/front-manage/, { timeout: 10000 });
    
    // Test navigation to Files
    await page.getByText('Files').click({ force: true });
    await expect(page).toHaveURL(/\/admin\/files/, { timeout: 10000 });
  });

  test('should open collapsible menu items', async ({ page }) => {
    // Click on Products section
    await page.getByText('Products', { exact: true }).click();
    
    // Should see sub-links
    await expect(page.getByRole('link', { name: 'All Products' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Drafts' })).toBeVisible();
    
    // Navigate to All Products
    await page.getByRole('link', { name: 'All Products' }).click();
    await expect(page).toHaveURL(/\/admin\/products/);
  });

  test('should display UserNav in the header', async ({ page }) => {
    const header = page.locator('header');
    await expect(header.locator('button')).toBeVisible(); // Avatar/User menu trigger
  });
});
