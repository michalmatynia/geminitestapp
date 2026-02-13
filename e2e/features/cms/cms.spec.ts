import { test, expect, type Page } from '@playwright/test';

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'E2eAdmin!123';

async function ensureAdminSession(page: Page): Promise<void> {
  await page.goto('/auth/signin?callbackUrl=%2Fadmin', { waitUntil: 'networkidle' });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return;
  }

  await page.getByRole('textbox', { name: 'Email' }).fill(E2E_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin(\/.*)?(\?.*)?$/);
}

test.describe('CMS and Page Builder', () => {
  // Global timeout for this suite
  test.setTimeout(180000); 

  const timestamp = Date.now();
  const testSlug = `test-page-${timestamp}`;
  const testPageName = `Playwright Test Page ${timestamp}`;

  test('should complete the full CMS lifecycle', async ({ page }) => {
    await ensureAdminSession(page);

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
    
    // Select slug (supports both legacy dropdown and current checklist UI).
    const slugSelectButton = page.locator('button:has-text("Select a slug")').first();
    const hasLegacySlugPicker = await slugSelectButton.isVisible().catch(() => false);
    if (hasLegacySlugPicker) {
      await slugSelectButton.click();
      await page.waitForSelector('div[role="option"], [role="option"]', { timeout: 15000 });
      await page.getByRole('option', { name: new RegExp(`/${testSlug}`) }).click();
    } else {
      const slugCheckboxByRole = page
        .getByRole('checkbox', { name: new RegExp(`/${testSlug}`) })
        .first();
      const hasRoleCheckbox = await slugCheckboxByRole.isVisible().catch(() => false);
      if (hasRoleCheckbox) {
        await slugCheckboxByRole.check();
      } else {
        const slugCheckboxByRow = page
          .locator(
            `xpath=//input[@type='checkbox' and (following-sibling::*[contains(normalize-space(.), '/${testSlug}')] or following-sibling::text()[contains(normalize-space(.), '/${testSlug}')])]`
          )
          .first();
        await slugCheckboxByRow.check();
      }
    }
    
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

    // Add a second section with a different type so we can verify section drag/reorder.
    await page.click('button:has-text("Add section")');
    await page.waitForSelector('button:has-text("Text element")', { timeout: 15000 });
    await page.click('button:has-text("Text element")');
    await expect(page.locator('aside').getByText('TextElement')).toBeVisible({ timeout: 20000 });

    const richTextSectionRow = page.locator('aside .group\\/section').filter({ hasText: 'RichText' }).first();
    const textElementSectionRow = page.locator('aside .group\\/section').filter({ hasText: 'TextElement' }).first();

    const textElementDragHandle = textElementSectionRow.getByLabel('Drag section');
    await textElementDragHandle.dragTo(richTextSectionRow);

    await expect.poll(async () => {
      const richTextBox = await richTextSectionRow.boundingBox();
      const textElementBox = await textElementSectionRow.boundingBox();
      if (!richTextBox || !textElementBox) return false;
      return textElementBox.y < richTextBox.y;
    }, { timeout: 20000 }).toBe(true);
  });

  test('should update front page destination setting', async ({ page }) => {
    await ensureAdminSession(page);

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
