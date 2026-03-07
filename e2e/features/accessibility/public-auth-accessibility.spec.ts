import { expect, test } from '@playwright/test';

import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';

const publicAuthRoutes = ['/auth/signin', '/auth/register'];

for (const route of publicAuthRoutes) {
  test(`${route} exposes skip navigation and passes the accessibility smoke scan`, async ({
    page,
  }) => {
    await page.goto(route);

    const main = page.locator('#app-content');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('tabindex', '-1');

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
}
