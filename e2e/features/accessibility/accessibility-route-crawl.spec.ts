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
    test.setTimeout(routeEntry.audience === 'admin' ? 240_000 : 120_000);

    if (routeEntry.audience === 'admin') {
      await ensureAdminSession(page, routeEntry.route, {
        initialNavigationTimeoutMs: 120_000,
        destinationNavigationTimeoutMs: 120_000,
        transitionTimeoutMs: 60_000,
      });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    } else {
      await page.goto(routeEntry.route, {
        waitUntil: 'domcontentloaded',
        timeout: 120_000,
      });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    }

    const main = page.locator('#app-content');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('tabindex', '-1');

    const skipLink = page.getByRole('link', { name: 'Skip to content' });
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
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
