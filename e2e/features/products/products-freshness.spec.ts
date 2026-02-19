import { expect, test, type Page } from '@playwright/test';

type TriggerButtonFixture = {
  id: string;
  name: string;
  enabled: boolean;
  locations: Array<'product_modal' | 'product_list' | 'note_modal' | 'note_list'>;
  mode: 'click' | 'toggle';
  display: 'icon' | 'label' | 'icon_label';
  iconId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProductFixture = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sku: string;
  baseProductId: string | null;
  defaultPriceGroupId: string | null;
  ean: string | null;
  gtin: string | null;
  asin: string | null;
  name: Record<string, string | null>;
  description: Record<string, string | null>;
  supplierName: string | null;
  supplierLink: string | null;
  priceComment: string | null;
  stock: number | null;
  price: number | null;
  sizeLength: number | null;
  sizeWidth: number | null;
  weight: number | null;
  length: number | null;
  published: boolean;
  categoryId: string | null;
  catalogId: string;
  images: unknown[];
  catalogs: unknown[];
  parameters: Array<{ parameterId: string; value?: string | null }>;
  imageLinks: string[];
  imageBase64s: string[];
  noteIds: string[];
};

const E2E_ADMIN_EMAIL =
  process.env['PLAYWRIGHT_E2E_ADMIN_EMAIL'] ??
  process.env['E2E_ADMIN_EMAIL'] ??
  'e2e.admin@example.com';
const E2E_ADMIN_PASSWORD =
  process.env['PLAYWRIGHT_E2E_ADMIN_PASSWORD'] ??
  process.env['E2E_ADMIN_PASSWORD'] ??
  'E2eAdmin!123';

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

const createModalTriggerButton = (
  id: string,
  name: string,
  timestamp: string
): TriggerButtonFixture => ({
  id,
  name,
  enabled: true,
  locations: ['product_modal'],
  mode: 'click',
  display: 'icon_label',
  iconId: null,
  createdAt: timestamp,
  updatedAt: timestamp,
});

const createProductFixture = (
  id: string,
  sku: string,
  label: string,
  timestamp: string
): ProductFixture => ({
  id,
  createdAt: timestamp,
  updatedAt: timestamp,
  sku,
  baseProductId: null,
  defaultPriceGroupId: null,
  ean: null,
  gtin: null,
  asin: null,
  name: { en: label },
  description: { en: `${label} description` },
  supplierName: null,
  supplierLink: null,
  priceComment: null,
  stock: null,
  price: null,
  sizeLength: null,
  sizeWidth: null,
  weight: null,
  length: null,
  published: true,
  categoryId: null,
  catalogId: 'catalog-1',
  images: [],
  catalogs: [],
  parameters: [],
  imageLinks: [],
  imageBase64s: [],
  noteIds: [],
});

const openCreateProductModal = async (page: Page, sku: string) => {
  page.once('dialog', async (dialog) => {
    await dialog.accept(sku);
  });
  await page.getByLabel('Create new product').click();
  const modal = page.getByRole('dialog').last();
  await expect(modal).toBeVisible({ timeout: 15_000 });
  return modal;
};

test.describe('Products cache freshness', () => {
  test('refreshes trigger buttons in Product modal without page reload', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(
      !authenticated,
      'Admin authentication is required for this e2e test.'
    );

    const now = new Date().toISOString();
    let triggerButtonsPhase: 1 | 2 = 1;

    const legacyButton = createModalTriggerButton(
      'trigger-legacy',
      'Legacy Modal Trigger',
      now
    );
    const freshButton = createModalTriggerButton(
      'trigger-fresh',
      'Fresh Modal Trigger',
      now
    );

    await page.route('**/api/ai-paths/trigger-buttons**', async (route) => {
      const payload =
        triggerButtonsPhase === 1 ? [legacyButton] : [freshButton];
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(payload),
      });
    });

    await page.goto('/admin/products');
    await expect(
      page.getByRole('heading', { name: 'Products', exact: true })
    ).toBeVisible();

    const firstModal = await openCreateProductModal(
      page,
      `FRESH-A-${Date.now()}`
    );
    await expect(
      firstModal.getByRole('button', { name: 'Legacy Modal Trigger' })
    ).toBeVisible();
    await firstModal.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(firstModal).not.toBeVisible({ timeout: 10_000 });

    triggerButtonsPhase = 2;
    const refetchPromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        response.url().includes('/api/ai-paths/trigger-buttons')
    );

    const secondModal = await openCreateProductModal(
      page,
      `FRESH-B-${Date.now()}`
    );
    await refetchPromise;
    await expect(
      secondModal.getByRole('button', { name: 'Fresh Modal Trigger' })
    ).toBeVisible();
    await expect(
      secondModal.getByRole('button', { name: 'Legacy Modal Trigger' })
    ).toHaveCount(0);
  });

  test('shows newly available products after navigating back to All Products', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(
      !authenticated,
      'Admin authentication is required for this e2e test.'
    );

    const now = new Date().toISOString();
    let productPhase: 1 | 2 = 1;

    const oldSku = `E2E-OLD-${Date.now()}`;
    const newSku = `E2E-NEW-${Date.now()}`;

    const oldProduct = createProductFixture(
      'product-old',
      oldSku,
      'Old Product',
      now
    );
    const newProduct = createProductFixture(
      'product-new',
      newSku,
      'New Product',
      now
    );

    await page.route('**/api/products/count**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify({ count: productPhase === 1 ? 1 : 2 }),
      });
    });

    await page.route('**/api/products?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Cache-Control': 'no-store' },
        body: JSON.stringify(
          productPhase === 1 ? [oldProduct] : [oldProduct, newProduct]
        ),
      });
    });

    await page.goto('/admin/ai-paths');
    await page.goto('/admin/products');

    await expect(
      page.getByRole('heading', { name: 'Products', exact: true })
    ).toBeVisible();
    await expect(page.getByText(oldSku).first()).toBeVisible();
    await expect(page.getByText(newSku).first()).toHaveCount(0);

    productPhase = 2;

    await page.goto('/admin/settings');
    await page.goto('/admin/products');

    await expect(page.getByText(newSku).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
