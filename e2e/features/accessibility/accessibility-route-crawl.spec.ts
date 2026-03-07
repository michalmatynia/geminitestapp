import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';
import { accessibilityRouteCrawlRoutes } from '../../../scripts/testing/config/accessibility-route-crawl.config.mjs';
import {
  buildAccessibilityRouteCrawlTitle,
  normalizeAccessibilityRouteEntries,
} from '../../../scripts/testing/lib/accessibility-route-crawl.mjs';

const routes = normalizeAccessibilityRouteEntries(accessibilityRouteCrawlRoutes);

test.describe.configure({ mode: 'serial' });

for (const routeEntry of routes) {
  test(buildAccessibilityRouteCrawlTitle(routeEntry), async ({ page }) => {
    if (routeEntry.audience === 'admin') {
      await ensureAdminSession(page, routeEntry.route);
      await page.waitForLoadState('networkidle');
    } else {
      await page.goto(routeEntry.route, { waitUntil: 'networkidle' });
    }

    const main = page.locator('#app-content');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('tabindex', '-1');

    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await skipLink.press('Enter');
    await expect(page).toHaveURL(/#app-content$/);
    await expect(main).toBeFocused();

    if (routeEntry.readySelector) {
      await expect(page.locator(routeEntry.readySelector)).toBeVisible();
    }

    await expectPageToHaveNoAxeViolations(page, {
      contextSelector: routeEntry.contextSelector ?? 'body',
    });
  });
}
