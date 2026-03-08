import { expect, test, type Page } from '@playwright/test';

const DOCUMENT_LOAD_COUNT_KEY = '__kangurE2eDocumentLoadCount';
const ROUTE_SHELL_MONITOR_KEY = '__kangurRouteShellMonitor';

type RouteShellMonitorSample = {
  hasShell: boolean;
  backgroundImage: string | null;
};

const startRouteShellMonitor = async (page: Page): Promise<void> => {
  await page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
          stop: () => RouteShellMonitorSample[];
        }
        | undefined;
    };
    const samples: RouteShellMonitorSample[] = [];
    let running = true;

    const sample = (): void => {
      const shell = document.querySelector('[data-testid="kangur-route-shell"]');
      const shellStyles = shell ? window.getComputedStyle(shell) : null;
      samples.push({
        hasShell: Boolean(shell),
        backgroundImage: shellStyles?.backgroundImage ?? null,
      });

      if (running) {
        window.requestAnimationFrame(sample);
      }
    };

    window.requestAnimationFrame(sample);
    globalWindow[monitorKey] = {
      stop: () => {
        running = false;
        return samples;
      },
    };
  }, ROUTE_SHELL_MONITOR_KEY);
};

const stopRouteShellMonitor = async (page: Page): Promise<RouteShellMonitorSample[]> =>
  page.evaluate((monitorKey) => {
    const globalWindow = window as Window & {
      [key: string]:
        | {
          stop: () => RouteShellMonitorSample[];
        }
        | undefined;
    };

    return globalWindow[monitorKey]?.stop() ?? [];
  }, ROUTE_SHELL_MONITOR_KEY);

const expectRouteShellContinuity = (
  samples: RouteShellMonitorSample[],
  stepLabel: string
): void => {
  expect(samples.length, `${stepLabel}: expected animation-frame samples`).toBeGreaterThan(0);
  expect(
    samples.every((sample) => sample.hasShell),
    `${stepLabel}: route shell disappeared during navigation`
  ).toBe(true);
  expect(
    samples.every(
      (sample) =>
        sample.backgroundImage !== null && sample.backgroundImage.includes('radial-gradient')
    ),
    `${stepLabel}: route shell lost the Kangur premium background`
  ).toBe(true);
};

const buildManagerUser = () => {
  const nowIso = new Date('2026-03-08T10:00:00.000Z').toISOString();

  return {
    id: 'parent-001',
    full_name: 'Parent Demo',
    email: 'parent@example.com',
    role: 'user',
    actorType: 'parent',
    canManageLearners: true,
    ownerUserId: 'parent-001',
    activeLearner: {
      id: 'learner-001',
      ownerUserId: 'parent-001',
      displayName: 'Jan',
      loginName: 'jan-demo',
      status: 'active',
      legacyUserKey: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    learners: [
      {
        id: 'learner-001',
        ownerUserId: 'parent-001',
        displayName: 'Jan',
        loginName: 'jan-demo',
        status: 'active',
        legacyUserKey: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
  };
};

test.describe('Kangur navigation continuity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((storageKey) => {
      const rawValue = window.localStorage.getItem(storageKey);
      const parsedValue = Number.parseInt(rawValue ?? '0', 10);
      const nextValue = Number.isFinite(parsedValue) ? parsedValue + 1 : 1;
      window.localStorage.setItem(storageKey, String(nextValue));
    }, DOCUMENT_LOAD_COUNT_KEY);

    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    await page.route('**/api/kangur/scores**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/kangur/assignments**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });
  });

  test('keeps the persistent shell mounted across main-page navigation', async ({ page }) => {
    await page.goto('/kangur/game');

    const routeShell = page.getByTestId('kangur-route-shell');
    await expect(routeShell).toBeVisible();
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();

    const routeShellBackground = await routeShell.evaluate(
      (element) => getComputedStyle(element).backgroundImage
    );
    expect(routeShellBackground).toContain('radial-gradient');

    await routeShell.evaluate((element) => {
      element.setAttribute('data-e2e-shell-marker', 'persist');
    });

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-lessons').click();
    await expect(page).toHaveURL(/\/kangur\/lessons$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'game -> lessons');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-tests').click();
    await expect(page).toHaveURL(/\/kangur\/tests$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await expect(page.getByRole('heading', { name: /Testy Kangur/i })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'lessons -> tests');

    await startRouteShellMonitor(page);
    await page.getByRole('link', { name: /^Profil$/ }).click();
    await expect(page).toHaveURL(/\/kangur\/profile$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await expect(page.getByRole('heading', { name: /Profil ucznia/i })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'tests -> profile');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await expect(page.getByTestId('kangur-route-content')).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> game');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });

  test('keeps the persistent shell mounted for parent-dashboard navigation', async ({ page }) => {
    await page.route('**/api/kangur/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildManagerUser()),
      });
    });

    await page.goto('/kangur/profile');

    const routeShell = page.getByTestId('kangur-route-shell');
    await expect(routeShell).toBeVisible();
    await routeShell.evaluate((element) => {
      element.setAttribute('data-e2e-shell-marker', 'persist');
    });

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await expect(page.getByRole('heading', { name: /^Panel Rodzica$/ })).toBeVisible();
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'profile -> parent-dashboard');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-home').click();
    await expect(page).toHaveURL(/\/kangur\/game$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'parent-dashboard -> game');

    await startRouteShellMonitor(page);
    await page.getByTestId('kangur-primary-nav-parent-dashboard').click();
    await expect(page).toHaveURL(/\/kangur\/parent-dashboard$/);
    await expect(routeShell).toHaveAttribute('data-e2e-shell-marker', 'persist');
    await page.waitForTimeout(250);
    expectRouteShellContinuity(await stopRouteShellMonitor(page), 'game -> parent-dashboard');

    const documentLoadCount = await page.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      DOCUMENT_LOAD_COUNT_KEY
    );
    expect(documentLoadCount).toBe('1');
  });
});
