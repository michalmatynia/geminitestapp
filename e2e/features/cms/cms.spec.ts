import { test, expect, type Page } from '@playwright/test';
import type { Locator } from '@playwright/test';

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

async function dragToTarget(page: Page, source: Locator, target: Locator): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent('dragstart', { dataTransfer });
  await target.waitFor({ state: 'visible', timeout: 5_000 });
  const box = await target.boundingBox();
  const clientX = box ? box.x + box.width / 2 : 8;
  const clientY = box ? box.y + box.height / 2 : 8;
  await target.dispatchEvent('dragenter', { dataTransfer, clientX, clientY });
  await target.dispatchEvent('dragover', { dataTransfer, clientX, clientY });
  await target.dispatchEvent('drop', { dataTransfer, clientX, clientY });
}

function sectionToggleLocator(page: Page, sectionType: string) {
  return page
    .getByRole('button', { name: new RegExp(`^(Expand|Collapse)\\s+${sectionType}$`) })
    .first();
}

function sectionRowLocator(page: Page, sectionType: string): Locator {
  return page
    .locator('[data-cms-section-row="true"]')
    .filter({
      has: page.getByText(new RegExp(`^${sectionType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')),
    })
    .first();
}

async function ensureSectionExpanded(page: Page, sectionType: string): Promise<void> {
  const toggleButton = sectionToggleLocator(page, sectionType);
  if (!(await toggleButton.isVisible().catch(() => false))) return;

  const expandButton = page.getByRole('button', { name: `Expand ${sectionType}` }).first();
  if (await expandButton.isVisible().catch(() => false)) {
    await expandButton.click();
  }

  await expect(page.getByRole('button', { name: `Collapse ${sectionType}` }).first()).toBeVisible({
    timeout: 15000,
  });
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

    // Select page (legacy picker) when present; current builder may already open the selected page.
    const selectPageButton = page.locator('button:has-text("Select a page...")').first();
    const hasLegacyPagePicker = await selectPageButton.isVisible().catch(() => false);
    if (hasLegacyPagePicker) {
      await selectPageButton.click();
      await page.waitForSelector('div[role="option"], [role="option"]', { timeout: 15000 });
      await page.getByRole('option', { name: testPageName }).click();
    } else {
      await expect(page.locator('text=Playwright Test Page').first()).toBeVisible({
        timeout: 15000,
      });
    }

    // Wait for builder content to load after selection
    await page.waitForTimeout(3000);

    // Add a section
    await page.click('button:has-text("Add section")');
    await page.waitForSelector('button:has-text("Rich text")', { timeout: 15000 });
    await page.click('button:has-text("Rich text")');

    // Check if a section appears in tree
    await expect(page.getByRole('heading', { name: '1 sections' })).toBeVisible({ timeout: 20000 });
    const richTextLabel = page.getByText(/^Rich\s?Text$/i).first();
    await expect(richTextLabel).toBeVisible({ timeout: 20000 });
    await ensureSectionExpanded(page, 'RichText');

    // Add a block to the section
    await page.getByRole('button', { name: 'Add block' }).first().click();

    // Select the block type
    await page.waitForSelector('button:has-text("Heading")', { timeout: 15000 });
    await page.click('button:has-text("Heading")');

    // WAIT for re-render
    await page.waitForTimeout(1000);

    // Check if Heading block appears in tree
    await expect(page.locator('main').getByText('Heading').first()).toBeVisible({ timeout: 20000 });

    // Verify preview switched from empty state to rendered canvas
    await expect(page.getByTestId('preview-canvas')).toBeVisible({ timeout: 20000 });
    await expect(page.getByTestId('preview-empty')).toHaveCount(0);

    // Add a second section with a different type so we can verify section nesting.
    await page.click('button:has-text("Add section")');
    await page.waitForSelector('button:has-text("Text element")', { timeout: 15000 });
    await page.click('button:has-text("Text element")');

    await expect(page.getByRole('heading', { name: '2 sections' })).toBeVisible({ timeout: 20000 });

    const textElementLabel = page.getByText(/^Text\s?Element$/i).first();
    await expect(textElementLabel).toBeVisible({ timeout: 20000 });

    const richTextRow = sectionRowLocator(page, 'RichText');
    const textElementRow = sectionRowLocator(page, 'TextElement');
    await expect(richTextRow).toBeVisible({ timeout: 20000 });
    await expect(textElementRow).toBeVisible({ timeout: 20000 });

    const beforeNestingX = (await textElementRow.boundingBox())?.x ?? 0;
    const textElementDragHandle = textElementRow.locator('[draggable="true"]').first();
    await dragToTarget(page, textElementDragHandle, richTextRow);

    // Center-drop should nest, which increases tree indentation for the moved section.
    await expect(page.getByRole('heading', { name: '2 sections' })).toBeVisible({ timeout: 20000 });
    await expect
      .poll(async () => (await sectionRowLocator(page, 'TextElement').boundingBox())?.x ?? 0, {
        timeout: 15000,
      })
      .toBeGreaterThan(beforeNestingX + 8);
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
