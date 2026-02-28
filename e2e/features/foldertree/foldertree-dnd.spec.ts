import { expect, type Locator, type Page, test } from '@playwright/test';

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
  await source.dispatchEvent('dragstart', { dataTransfer });
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
    await ensureAdminSession(page);
    await mockAuthAndSettings(page);

    const now = new Date().toISOString();
    let reorderPayload: Record<string, unknown> | null = null;

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

    await page.route('**/api/catalogs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
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
        ]),
      });
    });

    await page.route('**/api/price-groups**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/products\/tags(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/currencies**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/countries**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/languages**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route(/\/api\/products\/categories\/tree(\?.*)?$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      });
    });

    await page.route('**/api/products/categories/reorder', async (route) => {
      reorderPayload = JSON.parse(route.request().postData() || '{}') as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'root-a',
          name: 'Root A',
          parentId: 'root-b',
          catalogId: 'catalog-1',
        }),
      });
    });

    await page.goto('/admin/products/settings', { waitUntil: 'networkidle' });

    const sourceRoot = page.locator('[data-master-tree-node-id="category:root-a"]').first();
    await expect(sourceRoot).toBeVisible();

    const targetRoot = page.locator('[data-master-tree-node-id="category:root-b"]').first();
    await expect(targetRoot).toBeVisible();
    await dragAndDrop(page, sourceRoot, targetRoot);

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
