import { expect, type Locator, type Page, test } from '@playwright/test';

type SettingsRecord = {
  key: string;
  value: string;
};

type NotesCategoryRecord = {
  id: string;
  name: string;
  parentId: string | null;
  notebookId: string;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  color: string;
};

const NOTES_SETTINGS_SELECTED_NOTEBOOK_KEY = 'noteSettings:selectedNotebookId';
const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'E2eAdmin!123';

async function ensureAdminSession(page: Page): Promise<boolean> {
  await page.goto('/auth/signin?callbackUrl=%2Fadmin', { waitUntil: 'networkidle' });
  const signInHeading = page.getByRole('heading', { name: /sign in/i });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return true;
  }

  await page.getByRole('textbox', { name: /email/i }).fill(E2E_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: /password/i }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  try {
    await page.waitForURL(/\/admin(\/.*)?(\?.*)?$/, { timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

const asSettingsPayload = (settings: Map<string, string>): SettingsRecord[] =>
  Array.from(settings.entries()).map(([key, value]) => ({ key, value }));

async function mockNotesFolderTreeEnvironment(
  page: Page,
  initialSettings: SettingsRecord[] = []
): Promise<void> {
  const settings = new Map<string, string>(
    initialSettings.map((setting: SettingsRecord) => [setting.key, setting.value])
  );

  const now = new Date().toISOString();
  const categories: NotesCategoryRecord[] = [
    {
      id: 'folder-a',
      name: 'Folder A',
      parentId: null,
      notebookId: 'notebook-1',
      sortIndex: 0,
      createdAt: now,
      updatedAt: now,
      description: null,
      color: '#22c55e',
    },
    {
      id: 'folder-b',
      name: 'Folder B',
      parentId: null,
      notebookId: 'notebook-1',
      sortIndex: 1,
      createdAt: now,
      updatedAt: now,
      description: null,
      color: '#3b82f6',
    },
    {
      id: 'folder-c',
      name: 'Folder C',
      parentId: null,
      notebookId: 'notebook-1',
      sortIndex: 2,
      createdAt: now,
      updatedAt: now,
      description: null,
      color: '#a855f7',
    },
  ];

  await page.route(/\/api\/settings\/lite(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(asSettingsPayload(settings)),
    });
  });

  await page.route(/\/api\/settings\/heavy(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(/\/api\/settings(\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(asSettingsPayload(settings)),
      });
      return;
    }
    if (request.method() === 'POST') {
      const body = JSON.parse(request.postData() || '{}') as Partial<SettingsRecord>;
      if (typeof body.key === 'string' && typeof body.value === 'string') {
        settings.set(body.key, body.value);
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ key: body.key ?? '', value: body.value ?? '' }),
      });
      return;
    }
    await route.fallback();
  });

  await page.route('**/api/notes/notebooks**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'notebook-1',
          name: 'Default Notebook',
          color: '#2563eb',
          createdAt: now,
          updatedAt: now,
        },
      ]),
    });
  });

  await page.route(/\/api\/notes\/categories(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(categories),
    });
  });

  await page.route(/\/api\/notes\/categories\/tree(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        categories.map((category) => ({
          ...category,
          children: [],
          notes: [],
        }))
      ),
    });
  });

  await page.route(/\/api\/notes\/tags(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(/\/api\/notes\/themes(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route(/\/api\/notes(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/client-errors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
}

const treeRow = (page: Page, name: string): Locator =>
  page
    .locator('div.group')
    .filter({
      has: page.locator('span.truncate', { hasText: name }),
    })
    .first();

test.describe('Master Folder Tree shell runtime lifecycle (Phase 3)', () => {
  test('retains keyboard navigation behavior after background tab suspension and resume', async ({
    page,
    context,
  }) => {
    const hasSession = await ensureAdminSession(page);
    test.skip(!hasSession, 'Admin E2E auth is unavailable in this environment.');

    await mockNotesFolderTreeEnvironment(page, [
      {
        key: NOTES_SETTINGS_SELECTED_NOTEBOOK_KEY,
        value: 'notebook-1',
      },
    ]);

    await page.goto('/admin/notes', { waitUntil: 'networkidle' });

    const rowA = treeRow(page, 'Folder A');
    const rowB = treeRow(page, 'Folder B');
    const rowC = treeRow(page, 'Folder C');

    await expect(rowA).toBeVisible();
    await expect(rowB).toBeVisible();
    await expect(rowC).toBeVisible();

    await rowA.click();
    await expect(rowA).toHaveClass(/bg-blue-600/);

    await page.keyboard.press('ArrowDown');
    await expect(rowB).toHaveClass(/bg-blue-600/);

    const backgroundTab = await context.newPage();
    await backgroundTab.goto('about:blank');
    await backgroundTab.bringToFront();

    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('hidden');

    await page.bringToFront();
    await expect.poll(() => page.evaluate(() => document.visibilityState)).toBe('visible');

    await page.keyboard.press('ArrowDown');
    await expect(rowC).toHaveClass(/bg-blue-600/);

    await page.keyboard.press('ArrowUp');
    await expect(rowB).toHaveClass(/bg-blue-600/);

    await backgroundTab.close();
  });
});
