import { expect, test } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';
import { expectPageToHaveNoAxeViolations } from '../../support/accessibility';
import { accessibilityRouteCrawlRoutes } from '../../../scripts/testing/config/accessibility-route-crawl.config.mjs';
import {
  buildAccessibilityRouteCrawlTitle,
  filterAccessibilityRouteEntries,
  normalizeAccessibilityRouteEntries,
} from '../../../scripts/testing/lib/accessibility-route-crawl.mjs';

const routes = filterAccessibilityRouteEntries(
  normalizeAccessibilityRouteEntries(accessibilityRouteCrawlRoutes),
  { env: process.env }
);

test.describe.configure({ mode: 'serial' });

const PUBLIC_ROUTE_TIMEOUT_MS = 180_000;
const ADMIN_ROUTE_TIMEOUT_MS = 360_000;
const ADMIN_NAV_TIMEOUT_MS = 240_000;
const ADMIN_TRANSITION_TIMEOUT_MS = 120_000;
const MAIN_READY_TIMEOUT_MS = 30_000;

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
    await expect(main).toBeVisible({ timeout: MAIN_READY_TIMEOUT_MS });
    await expect(main).toHaveAttribute('tabindex', '-1', { timeout: MAIN_READY_TIMEOUT_MS });

    const skipLink = page.getByRole('link', { name: 'Skip to content', includeHidden: true }).first();
    await expect(skipLink).toBeVisible({ timeout: MAIN_READY_TIMEOUT_MS });
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
