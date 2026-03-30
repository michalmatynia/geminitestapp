import { expect, test, type Page } from '@playwright/test';

import { ensureAdminSession } from '../../support/admin-auth';

type KangurAdminRouteExpectation = {
  path: string;
  heading: string;
  breadcrumb: string;
  assertSurface: (page: Page) => Promise<void>;
};

const ROUTES: KangurAdminRouteExpectation[] = [
  {
    path: '/admin/kangur/settings',
    heading: 'Kangur Settings',
    breadcrumb: 'Admin/Kangur/Settings',
    assertSurface: async (page) => {
      await expect(page.getByRole('button', { name: /save settings/i })).toBeVisible();
    },
  },
  {
    path: '/admin/kangur/documentation',
    heading: 'Kangur Documentation',
    breadcrumb: 'Admin/Kangur/Documentation',
    assertSurface: async (page) => {
      await expect(
        page.getByRole('searchbox', { name: /search kangur documentation/i })
      ).toBeVisible();
    },
  },
  {
    path: '/admin/kangur/observability',
    heading: 'Kangur Observability',
    breadcrumb: 'Admin/Kangur/Observability',
    assertSurface: async (page) => {
      await expect(page.getByRole('link', { name: /^logs$/i }).first()).toBeVisible();
    },
  },
  {
    path: '/admin/kangur/content-manager',
    heading: 'Kangur Content Manager',
    breadcrumb: 'Admin/Kangur/Content Manager',
    assertSurface: async (page) => {
      await expect(page.getByRole('button', { name: /^lessons$/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /^tests$/i })).toBeVisible();
    },
  },
  {
    path: '/admin/kangur/lessons-manager',
    heading: 'Kangur Lessons',
    breadcrumb: 'Admin/Kangur/Lessons',
    assertSurface: async (page) => {
      await expect(page.getByRole('heading', { level: 2, name: /lessons workspace/i })).toBeVisible();
    },
  },
  {
    path: '/admin/kangur/tests-manager',
    heading: 'Kangur Tests',
    breadcrumb: 'Admin/Kangur/Tests',
    assertSurface: async (page) => {
      await expect(page.getByText('Test Suite Library', { exact: true })).toBeVisible();
    },
  },
];

test('kangur admin routes share the consolidated shell chrome', async ({ page }) => {
  test.setTimeout(120_000);

  await ensureAdminSession(page, '/admin/kangur/settings');

  for (const route of ROUTES) {
    await page.goto(route.path, { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toContainText(
      route.breadcrumb
    );
    await expect(page.locator('#kangur-main-content')).toBeVisible();

    await route.assertSurface(page);
  }
});
