import { expect, type Page, test } from '@playwright/test';

type SettingsRecord = {
  key: string;
  value: string;
};

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'E2eAdmin!123';

async function ensureAdminSession(page: Page): Promise<void> {
  await page.goto('/auth/signin?callbackUrl=%2Fadmin', { waitUntil: 'networkidle' });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return;
  }

  await page.getByRole('textbox', { name: 'Email' }).fill(E2E_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin(\/.*)?(\?.*)?$/);
}

async function mockAuthAndSettings(
  page: Page,
  initialSettings: SettingsRecord[] = []
): Promise<void> {
  const settings = new Map<string, string>(
    initialSettings.map((setting: SettingsRecord) => [setting.key, setting.value])
  );

  await page.route(/\/api\/settings\/lite(\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
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
      const payload: SettingsRecord[] = Array.from(settings.entries()).map(([key, value]) => ({
        key,
        value,
      }));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
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
        body: JSON.stringify({
          key: body.key ?? '',
          value: body.value ?? '',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/client-errors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
}

test.describe('Case Resolver', () => {
  test('creates a text node and compiles prompt output', async ({ page }) => {
    await ensureAdminSession(page);
    await mockAuthAndSettings(page);
    await page.goto('/admin/case-resolver', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Case Resolver' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Text Node' })).toBeVisible();

    await page.getByRole('button', { name: 'Text Node' }).click();

    const editor = page.locator('.ProseMirror').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await editor.fill('Quoted segment');

    await expect(page.locator('.font-mono', { hasText: '"Quoted segment"' })).toBeVisible();

    await page.getByRole('button', { name: 'Copy Prompt' }).click();
  });
});
