import { expect, test, type Page } from '@playwright/test';

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'admin123';

const AI_PATHS_RUNTIME_KERNEL_MODE_KEY = 'ai_paths_runtime_kernel_mode';
const AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY = 'ai_paths_runtime_kernel_pilot_node_types';

type RuntimeSettingsBulkPayload = {
  items: Array<{ key: string; value: string }>;
};

const ensureAdminSession = async (page: Page): Promise<boolean> => {
  await page.goto('/auth/signin?callbackUrl=%2Fadmin', {
    waitUntil: 'networkidle',
  });
  const signInHeading = page.getByRole('heading', { name: 'Sign in' });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return true;
  }

  await page.getByRole('textbox', { name: 'Email' }).fill(E2E_ADMIN_EMAIL);
  await page.getByRole('textbox', { name: 'Password' }).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  const authSucceeded = await page
    .waitForURL(/\/admin(\/.*)?(\?.*)?$/, { timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  return authSucceeded;
};

const getSettingValue = (
  payload: RuntimeSettingsBulkPayload,
  key: string
): string | undefined => {
  const entry = payload.items.find((item) => item.key === key);
  return entry?.value;
};

test.describe('AI Paths runtime kernel settings', () => {
  test('persists runtime-kernel mode and pilot node list from Canvas controls', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const persistedUpdates: RuntimeSettingsBulkPayload[] = [];

    await page.route('**/api/ai-paths/settings**', async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());

      if (method === 'GET') {
        const keys = url.searchParams.getAll('keys');
        const isRuntimeKernelKeysRequest =
          keys.includes(AI_PATHS_RUNTIME_KERNEL_MODE_KEY) &&
          keys.includes(AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY);
        if (isRuntimeKernelKeysRequest) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'Cache-Control': 'no-store' },
            body: JSON.stringify([
              { key: AI_PATHS_RUNTIME_KERNEL_MODE_KEY, value: 'auto' },
              {
                key: AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY,
                value: JSON.stringify(['constant', 'template']),
              },
            ]),
          });
          return;
        }
        await route.continue();
        return;
      }

      if (method === 'POST') {
        const raw = request.postData();
        let payload: unknown = {};
        if (raw) {
          try {
            payload = JSON.parse(raw);
          } catch {
            payload = {};
          }
        }
        const parsed =
          payload && typeof payload === 'object' && Array.isArray((payload as { items?: unknown }).items)
            ? (payload as RuntimeSettingsBulkPayload)
            : null;
        if (
          parsed &&
          parsed.items.some(
            (item) =>
              item.key === AI_PATHS_RUNTIME_KERNEL_MODE_KEY ||
              item.key === AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY
          )
        ) {
          persistedUpdates.push(parsed);
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'Cache-Control': 'no-store' },
            body: JSON.stringify(parsed.items),
          });
          return;
        }
        await route.continue();
        return;
      }

      await route.continue();
    });

    await page.goto('/admin/ai-paths');
    await expect(page.getByRole('tab', { name: 'Canvas' })).toBeVisible();

    const modeSelect = page.locator('[data-doc-id="canvas_runtime_kernel_mode"]').first();
    const pilotNodesInput = page.locator('[data-doc-id="canvas_runtime_kernel_pilot_nodes"]').first();
    const applyButton = page.locator('[data-doc-id="canvas_runtime_kernel_apply"]').first();

    await expect(modeSelect).toBeVisible();
    await expect(pilotNodesInput).toBeVisible();
    await expect(applyButton).toBeVisible();
    await expect(pilotNodesInput).toHaveValue('constant, template');

    await pilotNodesInput.fill('constant, math, template');
    await applyButton.click();

    await expect.poll(() => persistedUpdates.length).toBe(1);
    expect(getSettingValue(persistedUpdates[0]!, AI_PATHS_RUNTIME_KERNEL_MODE_KEY)).toBe('auto');
    expect(getSettingValue(persistedUpdates[0]!, AI_PATHS_RUNTIME_KERNEL_PILOT_NODE_TYPES_KEY)).toBe(
      JSON.stringify(['constant', 'math', 'template'])
    );

    await modeSelect.click();
    await page.getByRole('option', { name: 'Mode: Legacy Only' }).click();
    await applyButton.click();

    await expect.poll(() => persistedUpdates.length).toBe(2);
    expect(getSettingValue(persistedUpdates[1]!, AI_PATHS_RUNTIME_KERNEL_MODE_KEY)).toBe(
      'legacy_only'
    );
  });
});
