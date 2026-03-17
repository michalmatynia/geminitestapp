import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';

test('cms pages list exposes filters and actions accessibly and passes the accessibility smoke scan', async ({
  page,
}) => {
  test.setTimeout(240_000);

  await ensureAdminSession(page, '/admin/cms/pages');

  await expect(page.getByRole('heading', { name: 'Content Pages' })).toBeVisible({
    timeout: 15_000,
  });

  const main = page.locator('#app-content');
  await expect(main).toBeVisible({ timeout: 15_000 });
  await expect(main).toHaveAttribute('tabindex', '-1');

  await expect(page.getByRole('button', { name: 'Create Page' })).toBeVisible({
    timeout: 15_000,
  });
  const zoneSelector = page.getByRole('combobox', { name: 'Zone selector' });
  const simpleRoutingIndicator = page.getByText('Simple routing');
  await expect
    .poll(
      async () => (await zoneSelector.count()) > 0 || (await simpleRoutingIndicator.count()) > 0,
      { timeout: 20_000 }
    )
    .toBe(true);
  if ((await zoneSelector.count()) > 0) {
    await expect(zoneSelector).toBeVisible({ timeout: 10_000 });
  } else {
    await expect(simpleRoutingIndicator).toBeVisible({ timeout: 10_000 });
  }
  await expect(page.getByRole('textbox', { name: 'Search pages by name...' })).toBeVisible({
    timeout: 15_000,
  });

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
