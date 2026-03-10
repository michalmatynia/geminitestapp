import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  createProductParameterInferenceWorkflowFixture,
  fetchProductById,
  openAdminProductsPage,
  searchForProductRow,
  triggerActionAndCaptureRunId,
  waitForRunToComplete,
} from '../../support/ai-paths-product-workflow-fixtures';

const TEST_TIMEOUT_MS = 180_000;

const runModalInference = async (
  page: Page,
  fixture: Awaited<ReturnType<typeof createProductParameterInferenceWorkflowFixture>>
): Promise<string> => {
  const modal = page.locator('[role="dialog"]').last();
  const modalVisible = await modal.isVisible().catch(() => false);

  if (!modalVisible) {
    const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
      rowText: fixture.product.sku ?? fixture.searchTerm,
      mode: 'sku',
    });
    await row.getByLabel('Open row actions').click();
    await page.getByRole('menuitem', { name: 'Edit' }).click();
  }

  const activeModal = page.locator('[role="dialog"]').last();
  await expect(activeModal).toBeVisible({ timeout: 15_000 });

  const triggerButton = activeModal
    .getByRole('button', { name: fixture.triggerButton.name })
    .first();
  await expect(triggerButton).toBeVisible({ timeout: 15_000 });

  return await triggerActionAndCaptureRunId(page, async () => {
    await triggerButton.click();
  });
};

const expectParameterValue = (
  parameters: Array<{
    parameterId: string;
    value?: string | null;
    valuesByLanguage?: Record<string, string>;
  }>,
  parameterId: string,
  expectedValue: string | null
): void => {
  const entry = parameters.find((candidate) => candidate.parameterId === parameterId);
  expect(entry).toBeTruthy();
  expect(entry?.value ?? null).toBe(expectedValue);
};

test.describe('Products AI Paths parameter inference', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    try {
      await openAdminProductsPage(page);
    } catch {
      test.skip(true, 'Admin authentication is required for this e2e test.');
    }
  });

  test('fills blank parameter rows in the product modal infer parameters workflow', async ({
    page,
  }) => {
    const fixture = await createProductParameterInferenceWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Infer Parameters',
      pathName: 'E2E Product Modal Parameter Inference Fallback',
      definitions: [
        { key: 'material', nameEn: 'Material' },
        { key: 'condition', nameEn: 'Condition' },
        { key: 'size', nameEn: 'Size' },
      ],
      initialParameters: [
        { parameterKey: 'material', value: '' },
        { parameterKey: 'condition', value: '' },
        { parameterKey: 'size', value: '' },
      ],
      inferredParameters: [
        { parameterKey: 'material', value: 'Leather' },
        { parameterKey: 'condition', value: 'Used' },
        { parameterKey: 'size', value: '13 cm' },
      ],
    });

    try {
      const runId = await runModalInference(page, fixture);
      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];

      expect(parameters).toHaveLength(3);
      expectParameterValue(parameters, fixture.parameterIdsByKey.material, 'Leather');
      expectParameterValue(parameters, fixture.parameterIdsByKey.condition, 'Used');
      expectParameterValue(parameters, fixture.parameterIdsByKey.size, '13 Cm');
    } finally {
      await fixture.cleanup();
    }
  });

  test('preserves non-empty parameter values while filling remaining blanks', async ({ page }) => {
    const fixture = await createProductParameterInferenceWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Infer Parameters Preserve Existing',
      pathName: 'E2E Product Modal Parameter Inference Preserve Existing',
      definitions: [
        { key: 'material', nameEn: 'Material' },
        { key: 'condition', nameEn: 'Condition' },
        { key: 'size', nameEn: 'Size' },
      ],
      initialParameters: [
        { parameterKey: 'material', value: '' },
        { parameterKey: 'condition', value: 'Like New' },
        { parameterKey: 'size', value: '' },
      ],
      inferredParameters: [
        { parameterKey: 'material', value: 'Leather' },
        { parameterKey: 'condition', value: 'Used' },
        { parameterKey: 'size', value: '13 cm' },
      ],
    });

    try {
      const runId = await runModalInference(page, fixture);
      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];

      expectParameterValue(parameters, fixture.parameterIdsByKey.material, 'Leather');
      expectParameterValue(parameters, fixture.parameterIdsByKey.condition, 'Like New');
      expectParameterValue(parameters, fixture.parameterIdsByKey.size, '13 Cm');
    } finally {
      await fixture.cleanup();
    }
  });

  test('preserves custom parameter rows and drops inferred ids outside resolved definitions', async ({
    page,
  }) => {
    const fixture = await createProductParameterInferenceWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Infer Parameters Ignore Unknown',
      pathName: 'E2E Product Modal Parameter Inference Ignore Unknown',
      definitions: [
        { key: 'material', nameEn: 'Material' },
        { key: 'condition', nameEn: 'Condition' },
      ],
      initialParameters: [
        { parameterKey: 'material', value: '' },
        { parameterKey: 'condition', value: '' },
        { parameterId: 'custom-note', value: 'Collector Edition' },
      ],
      inferredParameters: [
        { parameterKey: 'material', value: 'Leather' },
        { parameterKey: 'condition', value: 'Used' },
        { parameterId: 'unknown-size', value: 'XL' },
      ],
    });

    try {
      const runId = await runModalInference(page, fixture);
      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];

      expectParameterValue(parameters, fixture.parameterIdsByKey.material, 'Leather');
      expectParameterValue(parameters, fixture.parameterIdsByKey.condition, 'Used');
      expect(parameters).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            parameterId: 'custom-note',
            value: 'Collector Edition',
          }),
        ])
      );
      expect(parameters.some((entry) => entry.parameterId === 'unknown-size')).toBe(false);
    } finally {
      await fixture.cleanup();
    }
  });

  test('does not duplicate parameter rows when infer parameters is run twice', async ({ page }) => {
    const fixture = await createProductParameterInferenceWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Infer Parameters Twice',
      pathName: 'E2E Product Modal Parameter Inference Idempotency',
      definitions: [
        { key: 'material', nameEn: 'Material' },
        { key: 'condition', nameEn: 'Condition' },
      ],
      initialParameters: [
        { parameterKey: 'material', value: '' },
        { parameterKey: 'condition', value: '' },
      ],
      inferredParameters: [
        { parameterKey: 'material', value: 'Leather' },
        { parameterKey: 'condition', value: 'Used' },
      ],
    });

    try {
      const firstRunId = await runModalInference(page, fixture);
      const firstDetail = await waitForRunToComplete(page, firstRunId);
      expect(firstDetail.run.status).toBe('completed');

      const secondRunId = await runModalInference(page, fixture);
      const secondDetail = await waitForRunToComplete(page, secondRunId);
      expect(secondDetail.run.status).toBe('completed');
      expect(secondRunId).not.toBe(firstRunId);

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];
      const materialRows = parameters.filter(
        (entry) => entry.parameterId === fixture.parameterIdsByKey.material
      );
      const conditionRows = parameters.filter(
        (entry) => entry.parameterId === fixture.parameterIdsByKey.condition
      );

      expect(materialRows).toHaveLength(1);
      expect(conditionRows).toHaveLength(1);
      expect(materialRows[0]?.value ?? null).toBe('Leather');
      expect(conditionRows[0]?.value ?? null).toBe('Used');
    } finally {
      await fixture.cleanup();
    }
  });
});
