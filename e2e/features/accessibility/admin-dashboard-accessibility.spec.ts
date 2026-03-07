import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';

test('admin dashboard exposes shell landmarks and passes the accessibility smoke scan', async ({
  page,
}) => {
  await ensureAdminSession(page, '/admin');
  await page.goto('/admin');

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  const main = page.locator('#app-content');
  await expect(main).toBeVisible();
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('complementary', { name: 'Admin sidebar' })).toBeVisible();
  await expect(page.locator('header[aria-label=\"Admin toolbar\"]')).toBeVisible();

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
