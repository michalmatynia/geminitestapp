import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';

test('cms pages list exposes filters and actions accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  await ensureAdminSession(page, '/admin/cms/pages');
  await page.goto('/admin/cms/pages');

  await expect(page.getByRole('heading', { name: 'Content Pages' })).toBeVisible();

  const main = page.locator('#app-content');
  await expect(main).toBeVisible();
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('button', { name: 'Create Page' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Zone selector' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Search pages by name...' })).toBeVisible();

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  await skipLink.press('Enter');
  await expect(page).toHaveURL(/#app-content$/);
  await expect(main).toBeFocused();

  await expectPageToHaveNoAxeViolations(page, {
    contextSelector: 'body',
  });
});
