import { test, expect } from '@playwright/test';

test.describe('CMS and Page Builder', () => {
  // Global timeout for this suite
  test.setTimeout(180000); 

  const timestamp = Date.now();
  const testSlug = `test-page-${timestamp}`;
  const testPageName = `Playwright Test Page ${timestamp}`;

  test('should complete the full CMS lifecycle', async ({ page }) => {
    // 1. Create a Slug
    await page.goto('/admin/cms/slugs/create');
    
    const slugInput = page.locator('input#slug');
    await slugInput.waitFor({ state: 'visible' });
    await slugInput.fill(testSlug);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/admin/cms/slugs', { timeout: 30000 });
    await expect(page.getByText(`/${testSlug}`)).toBeVisible({ timeout: 30000 });

    // 2. Create a Page
    await page.goto('/admin/cms/pages/create');
    
    const nameInput = page.locator('input#name');
    await nameInput.waitFor({ state: 'visible' });
    await nameInput.fill(testPageName);
    
    // Select the slug from dropdown
    await page.click('button:has-text("Select a slug")');
    // Wait for popover items
    await page.waitForSelector('div[role="option"], [role="option"]', { timeout: 15000 });
    await page.getByRole('option', { name: new RegExp(`/${testSlug}`) }).click();
    
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL('/admin/cms/pages', { timeout: 30000 });
    await expect(page.getByText(testPageName)).toBeVisible({ timeout: 30000 });

    // 3. Use Page Builder
    await page.goto('/admin/cms/builder');
    await page.waitForLoadState('networkidle');
    
    // Select the page
    await page.click('button:has-text("Select a page...")');
    await page.waitForSelector('div[role="option"], [role="option"]', { timeout: 15000 });
    await page.getByRole('option', { name: testPageName }).click();

    // Wait for builder content to load after selection
    await page.waitForTimeout(3000); 

    // Add a section
    await page.click('button:has-text("Add section")');
    await page.waitForSelector('button:has-text("Rich text")', { timeout: 15000 });
    await page.click('button:has-text("Rich text")');
    
    // Check if section appears in tree
    await expect(page.locator('aside').getByText('RichText')).toBeVisible({ timeout: 20000 });

    // Add a block to the section
    const sectionItem = page.locator('button').filter({ hasText: 'RichText' });
    // Click the "Add block" trigger
    await sectionItem.locator('div[aria-label="Add block"]').click();
    
    // Select the block type
    await page.waitForSelector('button:has-text("Heading")', { timeout: 15000 });
    await page.click('button:has-text("Heading")');
    
    // WAIT for re-render
    await page.waitForTimeout(1000);

    // Check if Heading block appears in tree
    await expect(page.locator('aside').getByText('Heading')).toBeVisible({ timeout: 20000 });
    
    // Verify preview content
    await expect(page.locator('main').getByText('Rich text content area')).toBeVisible({ timeout: 20000 });
  });

  test('should update front page destination setting', async ({ page }) => {
    await page.goto('/admin/front-manage');
    await page.waitForLoadState('networkidle');
    
    // Select "Chatbot"
    await page.click('button:has-text("Chatbot")');
    
    // Save
    await page.click('button:has-text("Save Selection")', { force: true });
    
    // Expect success toast
    await expect(page.locator('text=Front page updated')).toBeVisible({ timeout: 30000 });
    
    // Switch back to Products
    await page.click('button:has-text("Products")');
    await page.click('button:has-text("Save Selection")', { force: true });
    await expect(page.locator('text=Front page updated')).toBeVisible({ timeout: 30000 });
  });
});
