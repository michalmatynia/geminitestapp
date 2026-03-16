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

const PUBLIC_ROUTE_TIMEOUT_MS = 180_000;
const ADMIN_ROUTE_TIMEOUT_MS = 240_000;
const ADMIN_NAV_TIMEOUT_MS = 180_000;
const ADMIN_TRANSITION_TIMEOUT_MS = 90_000;

for (const routeEntry of routes) {
  test(buildAccessibilityRouteCrawlTitle(routeEntry), async ({ page }) => {
    test.setTimeout(routeEntry.audience === 'admin' ? ADMIN_ROUTE_TIMEOUT_MS : PUBLIC_ROUTE_TIMEOUT_MS);

    if (routeEntry.audience === 'admin') {
      await ensureAdminSession(page, routeEntry.route, {
        initialNavigationTimeoutMs: ADMIN_NAV_TIMEOUT_MS,
        destinationNavigationTimeoutMs: ADMIN_NAV_TIMEOUT_MS,
        transitionTimeoutMs: ADMIN_TRANSITION_TIMEOUT_MS,
      });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    } else {
      await page.goto(routeEntry.route, {
        waitUntil: 'domcontentloaded',
        timeout: PUBLIC_ROUTE_TIMEOUT_MS,
      });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    }

    const main = page.locator('#app-content');
    await expect(main).toBeVisible();
    await expect(main).toHaveAttribute('tabindex', '-1');

    const skipLink = page.getByRole('link', { name: 'Skip to content', includeHidden: true });
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
