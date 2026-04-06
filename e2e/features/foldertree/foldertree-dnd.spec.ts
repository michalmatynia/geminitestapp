import { expect, type Locator, type Page, test } from '@playwright/test';

import { ensureAdminSession as ensureSharedAdminSession } from '../../support/admin-auth';

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

async function dragAndDrop(page: Page, source: Locator, target: Locator): Promise<void> {
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.waitFor({ state: 'visible', timeout: 5_000 });
  const sourceBox = await source.boundingBox();
  const sourceClientX = sourceBox ? sourceBox.x + sourceBox.width / 2 : 8;
  const sourceClientY = sourceBox ? sourceBox.y + sourceBox.height / 2 : 8;
  await source.dispatchEvent('dragstart', {
    dataTransfer,
    clientX: sourceClientX,
    clientY: sourceClientY,
  });
  await target.waitFor({ state: 'visible', timeout: 5_000 });
  const box = await target.boundingBox();
  const clientX = box ? box.x + box.width / 2 : 8;
  const clientY = box ? box.y + box.height / 2 : 8;
  await target.dispatchEvent('dragenter', { dataTransfer, clientX, clientY });
  await target.dispatchEvent('dragover', { dataTransfer, clientX, clientY });
  await target.dispatchEvent('drop', { dataTransfer, clientX, clientY });
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

async function mockProductsAdminBootstrap(page: Page, timestamp: string): Promise<void> {
  await page.route('**/api/user/preferences', async (route) => {
    const method = route.request().method();

    if (method === 'GET' || method === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({}),
      });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/drafts**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/ai-paths/trigger-buttons**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });

  await page.route('**/api/v2/products/metadata/price-groups**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'price-group-1',
          name: 'Default Price Group',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          groupId: 'default',
          currencyId: 'currency-pln',
          currencyCode: 'PLN',
          isDefault: true,
          type: 'default',
          basePriceField: 'price',
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
          currency: {
            id: 'currency-pln',
            name: 'Polish Zloty',
            description: null,
            createdAt: timestamp,
            updatedAt: timestamp,
            code: 'PLN',
            symbol: 'zl',
          },
        },
      ]),
    });
  });

  await page.route('**/api/v2/metadata/languages**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'language-en',
          name: 'English',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          code: 'EN',
          nativeName: 'English',
          isDefault: true,
          isActive: true,
        },
      ]),
    });
  });

  await page.route('**/api/v2/metadata/currencies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([
        {
          id: 'currency-pln',
          name: 'Polish Zloty',
          description: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          code: 'PLN',
          symbol: 'zl',
          isDefault: true,
          isActive: true,
        },
      ]),
    });
  });

  await page.route('**/api/v2/products/producers**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'no-store' },
      body: JSON.stringify([]),
    });
  });
}

async function ensureAdminSession(page: Page): Promise<void> {
  await page.goto('/en/auth/signin?callbackUrl=%2Fen%2Fadmin', { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator('input[placeholder="name@example.com"]').first();
  if (!(await emailInput.isVisible().catch(() => false))) {
    return;
  }

  await emailInput.fill(E2E_ADMIN_EMAIL);
  await page.locator('input[type="password"]').first().fill(E2E_ADMIN_PASSWORD);
  await page.locator('form button[type="submit"]').first().click();
  await page.waitForURL(/\/(en\/)?admin(\/.*)?(\?.*)?$/);
}

test.describe('Master Folder Tree drag and drop', () => {
  test('Notes: dragging a folder into another folder updates parent assignment', async ({
    page,
  }) => {
    await ensureAdminSession(page);
    await mockAuthAndSettings(page, [
      { key: 'noteSettings:selectedNotebookId', value: 'notebook-1' },
    ]);

    const now = new Date().toISOString();
    let patchedCategoryPayload: Record<string, unknown> | null = null;

    const noteCategories = [
      {
        id: 'folder-a',
        name: 'Folder A',
        description: null,
        color: '#10b981',
        parentId: null,
        notebookId: 'notebook-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'folder-b',
        name: 'Folder B',
        description: null,
        color: '#3b82f6',
        parentId: null,
        notebookId: 'notebook-1',
        sortIndex: 1,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const noteCategoryTree = noteCategories.map((category) => ({
      ...category,
      children: [],
      notes: [],
    }));

    await page.route('**/api/notes/notebooks**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'notebook-1', name: 'Default', color: '#3b82f6', createdAt: now, updatedAt: now },
        ]),
      });
    });

    await page.route('**/api/notes/tags**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/notes/themes**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/notes\/categories(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(noteCategories),
      });
    });
    await page.route(/\/api\/notes\/categories\/tree(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(noteCategoryTree),
      });
    });

    await page.route(/\/api\/notes\/categories\/folder-a(\?.*)?$/, async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        patchedCategoryPayload = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...noteCategories[0],
            ...patchedCategoryPayload,
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.route(/\/api\/notes(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/admin/notes', { waitUntil: 'networkidle' });

    const sourceFolderNode = page.locator('[data-master-tree-node-id="folder:folder-a"]').first();
    await expect(sourceFolderNode).toBeVisible();

    const targetFolderNode = page.locator('[data-master-tree-node-id="folder:folder-b"]').first();
    await expect(targetFolderNode).toBeVisible();
    await dragAndDrop(page, sourceFolderNode, targetFolderNode);

    await expect.poll(() => patchedCategoryPayload, { timeout: 10_000 }).not.toBeNull();
    expect(patchedCategoryPayload).toMatchObject({ parentId: 'folder-b' });
  });

  test('Product categories: dragging a root category into another root persists move payload', async ({
    page,
  }) => {
    test.setTimeout(120_000);

    const now = new Date().toISOString();
    let reorderPayload: Record<string, unknown> | null = null;

    await mockAuthAndSettings(page);
    await mockProductsAdminBootstrap(page, now);

    const categories = [
      {
        id: 'root-a',
        name: 'Root A',
        description: null,
        color: '#10b981',
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 0,
        createdAt: now,
        updatedAt: now,
        children: [
          {
            id: 'child-1',
            name: 'Child 1',
            description: null,
            color: '#22d3ee',
            parentId: 'root-a',
            catalogId: 'catalog-1',
            sortIndex: 0,
            createdAt: now,
            updatedAt: now,
            children: [],
          },
        ],
      },
      {
        id: 'root-b',
        name: 'Root B',
        description: null,
        color: '#6366f1',
        parentId: null,
        catalogId: 'catalog-1',
        sortIndex: 1,
        createdAt: now,
        updatedAt: now,
        children: [],
      },
    ];
    const catalogsResponseBody = [
      {
        id: 'catalog-1',
        name: 'Default Catalog',
        isDefault: true,
        languageIds: ['lang-en'],
        defaultLanguageId: 'lang-en',
        defaultPriceGroupId: null,
        priceGroupIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    await page.route('**/api/v2/products/entities/catalogs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(catalogsResponseBody),
      });
    });

    await page.route(/\/api\/v2\/products\/tags(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v2\/products\/shipping-groups(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v2\/products\/parameters(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/v2\/products\/categories\/tree(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(categories),
      });
    });

    await page.route('**/api/v2/products/categories/reorder', async (route) => {
      reorderPayload = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({
          id: 'root-a',
          name: 'Root A',
          parentId: 'root-b',
          catalogId: 'catalog-1',
        }),
      });
    });

    await ensureSharedAdminSession(page, '/admin/products/settings', {
      initialNavigationTimeoutMs: 120_000,
      destinationNavigationTimeoutMs: 120_000,
      transitionTimeoutMs: 60_000,
    });

    await expect(page.getByRole('button', { name: 'Add Category' }).first()).toBeVisible({
      timeout: 30_000,
    });
    const sourceRootRow = page.locator('[data-master-tree-node-id="category:root-a"]').first();
    await expect(sourceRootRow).toBeVisible();

    const targetRoot = page.locator('[data-master-tree-node-id="category:root-b"]').first();
    await expect(targetRoot).toBeVisible();
    await dragAndDrop(page, sourceRootRow, targetRoot);

    await expect.poll(() => reorderPayload, { timeout: 10_000 }).not.toBeNull();
    expect(reorderPayload).toMatchObject({
      categoryId: 'root-a',
      parentId: 'root-b',
      position: 'inside',
      targetId: 'root-b',
      catalogId: 'catalog-1',
    });
  });

  test('Image Studio: dragging a folder into another folder persists nested card folder updates', async ({
    page,
  }) => {
    await ensureAdminSession(page);
    await mockAuthAndSettings(page);

    let slotPatchPayload: Record<string, unknown> | null = null;
    const slots = [
      {
        id: 'slot-1',
        projectId: 'proj-1',
        name: 'Card One',
        folderPath: 'folder-a',
        imageFileId: null,
        imageUrl: null,
        imageBase64: null,
        metadata: {},
      },
      {
        id: 'slot-2',
        projectId: 'proj-1',
        name: 'Card Two',
        folderPath: 'folder-b',
        imageFileId: null,
        imageUrl: null,
        imageBase64: null,
        metadata: {},
      },
    ];

    await page.route('**/api/image-studio/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: ['proj-1'] }),
      });
    });

    await page.route('**/api/image-studio/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: ['gpt-image-1'], source: 'fallback' }),
      });
    });

    await page.route(/\/api\/image-studio\/projects\/proj-1\/slots(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ slots }),
      });
    });

    await page.route(/\/api\/image-studio\/slots\/slot-1(\?.*)?$/, async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        slotPatchPayload = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            slot: {
              ...slots[0],
              ...slotPatchPayload,
            },
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/admin/image-studio', { waitUntil: 'networkidle' });

    const sourceFolder = page.locator('[data-master-tree-node-id="folder:folder-a"]').first();
    await expect(sourceFolder).toBeVisible();

    const targetFolder = page.locator('[data-master-tree-node-id="folder:folder-b"]').first();
    await expect(targetFolder).toBeVisible();
    await dragAndDrop(page, sourceFolder, targetFolder);

    await expect.poll(() => slotPatchPayload, { timeout: 10_000 }).not.toBeNull();
    const folderPath = slotPatchPayload?.['folderPath'];
    expect(folderPath).toBe('folder-b/folder-a');
  });

  test('Image Studio: dragging a card from folder to root persists empty folder path', async ({
    page,
  }) => {
    await ensureAdminSession(page);
    await mockAuthAndSettings(page);

    let slotPatchPayload: Record<string, unknown> | null = null;
    let patchedSlotId: string | null = null;
    const slots = [
      {
        id: 'slot-1',
        projectId: 'proj-1',
        name: 'Card One',
        folderPath: 'folder-a',
        imageFileId: null,
        imageUrl: null,
        imageBase64: null,
        metadata: {},
      },
      {
        id: 'slot-2',
        projectId: 'proj-1',
        name: 'Card Two',
        folderPath: null,
        imageFileId: null,
        imageUrl: null,
        imageBase64: null,
        metadata: {},
      },
    ];

    await page.route('**/api/image-studio/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: ['proj-1'] }),
      });
    });

    await page.route('**/api/image-studio/models', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ models: ['gpt-image-1'], source: 'fallback' }),
      });
    });

    await page.route(/\/api\/image-studio\/projects\/proj-1\/slots(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ slots }),
      });
    });

    await page.route(/\/api\/image-studio\/slots\/[^/?]+(\?.*)?$/, async (route) => {
      const request = route.request();
      if (request.method() === 'PATCH') {
        const slotId = new URL(request.url()).pathname.split('/').pop() ?? '';
        patchedSlotId = slotId || null;
        slotPatchPayload = JSON.parse(request.postData() || '{}') as Record<string, unknown>;
        const sourceSlot = slots.find((slot) => slot.id === slotId) ?? slots[0];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            slot: {
              ...sourceSlot,
              ...slotPatchPayload,
            },
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto('/admin/image-studio', { waitUntil: 'networkidle' });

    const expandFolderButton = page.getByRole('button', { name: 'Expand folder-a' }).first();
    await expect(expandFolderButton).toBeVisible();
    await expandFolderButton.click();

    const sourceCardButton = page.locator('[data-slot-id]').first();
    await expect(sourceCardButton).toBeVisible();
    const sourceSlotId = await sourceCardButton.getAttribute('data-slot-id');
    expect(sourceSlotId).toBeTruthy();
    const sourceCard = page.locator(`[data-master-tree-node-id="card:${sourceSlotId}"]`).first();
    await expect(sourceCard).toBeVisible();

    const rootDropTarget = page.locator('[data-master-tree-root-drop="top"]').first();
    await dragAndDrop(page, sourceCard, rootDropTarget);

    await expect.poll(() => slotPatchPayload, { timeout: 10_000 }).not.toBeNull();
    expect(patchedSlotId).toBe(sourceSlotId);
    expect(slotPatchPayload).toMatchObject({ folderPath: '' });
  });
});
