import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';

test('products list exposes search and actions accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(240_000);

  await ensureAdminSession(page, '/admin/products');

  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible({
    timeout: 15_000,
  });

  const main = page.locator('#kangur-main-content');
  await expect(main).toBeVisible({ timeout: 15_000 });
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('button', { name: 'Create new product' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('textbox', { name: 'Search by product name...' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByRole('complementary', { name: 'Admin sidebar' })).toBeVisible({
    timeout: 15_000,
  });

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
