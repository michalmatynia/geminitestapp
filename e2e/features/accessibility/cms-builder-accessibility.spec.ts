import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';
import { mockCmsBuilderApis } from '../../support/cms-builder-fixtures';

test('cms builder exposes shell controls accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(360_000);

  await mockCmsBuilderApis(page);
  await ensureAdminSession(page, '/admin', {
    destinationNavigationTimeoutMs: 60_000,
    transitionTimeoutMs: 30_000,
  });
  try {
    await page.goto('/admin/cms/builder?pageId=page-1', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Timeout')) {
      throw error;
    }
  }

  const main = page.locator('#kangur-main-content');
  await expect(main).toBeVisible({ timeout: 60_000 });
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('combobox', { name: 'Select a page...' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('combobox', { name: 'Zone selector' }).first()).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('button', { name: 'Hide left panel' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('button', { name: 'Hide right panel' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('heading', { name: '2 sections' })).toBeVisible({
    timeout: 60_000,
  });

  const selectSectionButton = page.getByRole('button', { name: 'Select section Block' }).first();
  await selectSectionButton.focus();
  await expect(selectSectionButton).toBeFocused();
  await selectSectionButton.press('Enter');
  await expect(selectSectionButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Section: Block' })).toBeVisible();

  const selectBlockButton = page.getByRole('button', { name: 'Select block Text' }).first();
  await selectBlockButton.focus();
  await expect(selectBlockButton).toBeFocused();
  await selectBlockButton.press('Enter');
  await expect(selectBlockButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Block: Text' })).toBeVisible();

  const selectFrameButton = page.getByRole('button', { name: 'Select block Intro slide' }).first();
  await selectFrameButton.scrollIntoViewIfNeeded();
  await selectFrameButton.focus();
  await expect(selectFrameButton).toBeFocused();
  await selectFrameButton.press('Enter');
  await expect(selectFrameButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Block: Slideshow Frame' })).toBeVisible();

  const addSectionButton = page.getByRole('button', { name: 'Add section' }).first();
  await expect(addSectionButton).toBeVisible();
  await addSectionButton.click();

  await expect(page.getByRole('dialog', { name: 'Add a section' })).toBeVisible();
  await page.getByRole('option', { name: /rich\s*text/i }).first().click();

  await expect(page.getByRole('heading', { name: '3 sections' })).toBeVisible();
  await expect(page.getByTestId('preview-canvas')).toBeVisible();

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  await skipLink.press('Enter');
  await expect(page).toHaveURL(/#kangur-main-content$/);
  await expect(main).toBeFocused();

  await expectPageToHaveNoAxeViolations(page, {
    contextSelector: 'body',
  });
});
