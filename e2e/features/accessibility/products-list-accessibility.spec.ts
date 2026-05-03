import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';

test('products list exposes search and actions accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const productsUiTimeoutMs = 90_000;

  await ensureAdminSession(page, '/admin/products');
  await expect(page.getByText('Loading...')).toBeHidden({ timeout: productsUiTimeoutMs });

  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible({
    timeout: productsUiTimeoutMs,
  });

  const main = page.locator('#kangur-main-content');
  await expect(main).toBeVisible({ timeout: productsUiTimeoutMs });
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('button', { name: 'Create new product' })).toBeVisible({
    timeout: productsUiTimeoutMs,
  });
  await expect(page.getByRole('textbox', { name: 'Search by product name...' })).toBeVisible({
    timeout: productsUiTimeoutMs,
  });
  await expect(page.getByRole('complementary', { name: 'Admin sidebar' })).toBeVisible({
    timeout: productsUiTimeoutMs,
  });

  const skipLink = page.getByRole('link', { name: /Skip to (main )?content/i });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();

  await skipLink.press('Enter');
  await expect(page).toHaveURL(/#kangur-main-content$/);
  await expect(main).toBeFocused();

  await expectPageToHaveNoAxeViolations(page, {
    contextSelector: 'body',
  });
});
