import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';
import { mockCaseResolverApis } from '../../support/case-resolver-fixtures';

test('case resolver exposes tree controls accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(300_000);

  await mockCaseResolverApis(page);
  await ensureAdminSession(page, '/admin');
  try {
    await page.goto('/admin/case-resolver', {
      waitUntil: 'domcontentloaded',
      timeout: 120_000,
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Timeout')) {
      throw error;
    }
  }

  const main = page.locator('#kangur-main-content');
  await expect(main).toBeVisible({ timeout: 30_000 });
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('heading', { name: 'Case Resolver' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('Case 1').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'ALL CASES' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Show nested folders and files' })).toBeVisible();
  await expect(page.getByRole('searchbox', { name: 'Search files & folders…' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add folder' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add case file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create new image file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create new image asset' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add node file' })).toBeVisible();

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
