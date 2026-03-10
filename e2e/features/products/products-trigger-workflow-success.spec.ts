import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import {
  createProductWorkflowFixture,
  createProductTranslationWorkflowFixture,
  fetchProductById,
  filterQueueByRunId,
  openAdminQueuePage,
  openAdminProductsPage,
  readRunFailureMessage,
  searchForProductRow,
  triggerActionAndCaptureRunId,
  waitForProductFieldValue,
  waitForRunToComplete,
  waitForRunToReachTerminal,
} from '../../support/ai-paths-product-workflow-fixtures';

const TEST_TIMEOUT_MS = 180_000;

const locateQueueRunCard = (page: Page, runId: string): Locator =>
  page
    .getByText(runId)
    .first()
    .locator('xpath=ancestor::div[contains(@class, "bg-card/70")]')
    .first();

const runRowTriggerAction = async (
  page: Page,
  row: Locator,
  triggerButtonName: string
): Promise<string> => {
  const inlineButton = row.getByRole('button', { name: triggerButtonName }).first();
  if (await inlineButton.isVisible().catch(() => false)) {
    return await triggerActionAndCaptureRunId(page, async () => {
      await inlineButton.click();
    });
  }

  const overflowToggle = row.getByRole('button', { name: /Open \d+ more AI actions/i }).first();
  await expect(overflowToggle).toBeVisible({ timeout: 15_000 });
  await overflowToggle.click();

  const overflowItem = page.getByRole('menuitem', { name: triggerButtonName }).first();
  await expect(overflowItem).toBeVisible({ timeout: 15_000 });
  return await triggerActionAndCaptureRunId(page, async () => {
    await overflowItem.click();
    await page.keyboard.press('Escape').catch(() => undefined);
  });
};

test.describe('Products AI Paths workflow success', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    try {
      await openAdminProductsPage(page);
    } catch {
      test.skip(true, 'Admin authentication is required for this e2e test.');
    }
  });

  test('runs a row trigger workflow to completion and updates the Polish description', async ({
    page,
  }) => {
    const fixture = await createProductWorkflowFixture(page, {
      location: 'product_row',
      triggerButtonName: 'Generate Polish Copy',
      pathName: 'E2E Product Row Workflow Success',
      updateField: 'description_pl',
      expectedValue: `Playwright row workflow success ${Date.now()}`,
    });

    try {
      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      const runId = await runRowTriggerAction(page, row, fixture.triggerButton.name);
      const runFeedback = row.locator(`[data-run-id="${runId}"]`).first();
      await expect(runFeedback).toBeVisible({ timeout: 15_000 });
      await expect(runFeedback.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
        'href',
        new RegExp(`query=${runId}&runId=${runId}$`)
      );

      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');
      await expect(runFeedback.getByText(/^completed$/i)).toBeVisible({ timeout: 30_000 });

      const updatedProduct = await waitForProductFieldValue(page, {
        productId: fixture.product.id,
        field: 'description_pl',
        expectedValue: fixture.expectedValue,
      });
      expect(updatedProduct.description_pl).toBe(fixture.expectedValue);
    } finally {
      await fixture.cleanup();
    }
  });

  test('runs a modal trigger workflow to completion and updates the German description', async ({
    page,
  }) => {
    const fixture = await createProductWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Generate German Copy',
      pathName: 'E2E Product Modal Workflow Success',
      updateField: 'description_de',
      expectedValue: `Playwright modal workflow success ${Date.now()}`,
    });

    try {
      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      await row.getByLabel('Open row actions').click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();

      const modal = page.locator('[role="dialog"]').last();
      await expect(modal).toBeVisible({ timeout: 15_000 });

      const triggerButton = modal.getByRole('button', { name: fixture.triggerButton.name }).first();
      await expect(triggerButton).toBeVisible({ timeout: 15_000 });

      const runId = await triggerActionAndCaptureRunId(page, async () => {
        await triggerButton.click();
      });

      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

      const updatedProduct = await waitForProductFieldValue(page, {
        productId: fixture.product.id,
        field: 'description_de',
        expectedValue: fixture.expectedValue,
      });
      expect(updatedProduct.description_de).toBe(fixture.expectedValue);
    } finally {
      await fixture.cleanup();
    }
  });

  test('runs a modal translation workflow without removing English parameter values', async ({
    page,
  }) => {
    const fixture = await createProductTranslationWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Translate Parameter Languages',
      pathName: 'E2E Product Modal Translation Parameter Preservation',
      expectedDescriptionPl: `Playwright translated description ${Date.now()}`,
      initialParameters: [
        {
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: { en: 'Leather' },
        },
        {
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: { en: 'Used' },
        },
        {
          parameterId: 'size',
          value: '13 cm',
          valuesByLanguage: { en: '13 cm' },
        },
      ],
      translatedParameters: [
        { parameterId: 'material', value: 'Skora' },
        { parameterId: 'condition', value: 'Uzywany' },
      ],
    });

    try {
      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      await row.getByLabel('Open row actions').click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();

      const modal = page.locator('[role="dialog"]').last();
      await expect(modal).toBeVisible({ timeout: 15_000 });

      const triggerButton = modal.getByRole('button', { name: fixture.triggerButton.name }).first();
      await expect(triggerButton).toBeVisible({ timeout: 15_000 });

      const runId = await triggerActionAndCaptureRunId(page, async () => {
        await triggerButton.click();
      });

      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      expect(updatedProduct.description_pl).toBe(fixture.expectedDescriptionPl);

      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];
      const material = parameters.find((entry) => entry.parameterId === 'material');
      const condition = parameters.find((entry) => entry.parameterId === 'condition');
      const size = parameters.find((entry) => entry.parameterId === 'size');

      expect(material).toEqual(
        expect.objectContaining({
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: expect.objectContaining({
            en: 'Leather',
            pl: 'Skora',
          }),
        })
      );
      expect(condition).toEqual(
        expect.objectContaining({
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: expect.objectContaining({
            en: 'Used',
            pl: 'Uzywany',
          }),
        })
      );
      expect(size).toEqual(
        expect.objectContaining({
          parameterId: 'size',
          value: '13 cm',
          valuesByLanguage: expect.objectContaining({
            en: '13 cm',
          }),
        })
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('runs a row translation workflow without removing English parameter values', async ({
    page,
  }) => {
    const fixture = await createProductTranslationWorkflowFixture(page, {
      location: 'product_row',
      triggerButtonName: 'Translate Parameter Languages Row',
      pathName: 'E2E Product Row Translation Parameter Preservation',
      expectedDescriptionPl: `Playwright translated row description ${Date.now()}`,
      initialParameters: [
        {
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: { en: 'Leather' },
        },
        {
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: { en: 'Used' },
        },
        {
          parameterId: 'size',
          value: '13 cm',
          valuesByLanguage: { en: '13 cm' },
        },
      ],
      translatedParameters: [
        { parameterId: 'material', value: 'Skora' },
        { parameterId: 'condition', value: 'Uzywany' },
      ],
    });

    try {
      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      const runId = await runRowTriggerAction(page, row, fixture.triggerButton.name);
      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      expect(updatedProduct.description_pl).toBe(fixture.expectedDescriptionPl);

      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];
      const material = parameters.find((entry) => entry.parameterId === 'material');
      const condition = parameters.find((entry) => entry.parameterId === 'condition');
      const size = parameters.find((entry) => entry.parameterId === 'size');

      expect(material).toEqual(
        expect.objectContaining({
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: expect.objectContaining({
            en: 'Leather',
            pl: 'Skora',
          }),
        })
      );
      expect(condition).toEqual(
        expect.objectContaining({
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: expect.objectContaining({
            en: 'Used',
            pl: 'Uzywany',
          }),
        })
      );
      expect(size).toEqual(
        expect.objectContaining({
          parameterId: 'size',
          value: '13 cm',
          valuesByLanguage: expect.objectContaining({
            en: '13 cm',
          }),
        })
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('reruns a modal translation workflow without duplicating or erasing parameter language data', async ({
    page,
  }) => {
    const fixture = await createProductTranslationWorkflowFixture(page, {
      location: 'product_modal',
      triggerButtonName: 'Translate Parameter Languages Twice',
      pathName: 'E2E Product Modal Translation Parameter Idempotency',
      expectedDescriptionPl: `Playwright translated description rerun ${Date.now()}`,
      initialParameters: [
        {
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: { en: 'Leather' },
        },
        {
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: { en: 'Used' },
        },
        {
          parameterId: 'size',
          value: '13 cm',
          valuesByLanguage: { en: '13 cm' },
        },
      ],
      translatedParameters: [
        { parameterId: 'material', value: 'Skora' },
        { parameterId: 'condition', value: 'Uzywany' },
      ],
    });

    const triggerModalWorkflow = async (): Promise<string> => {
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

    try {
      const firstRunId = await triggerModalWorkflow();
      const firstDetail = await waitForRunToComplete(page, firstRunId);
      expect(firstDetail.run.status).toBe('completed');

      const secondRunId = await triggerModalWorkflow();
      const secondDetail = await waitForRunToComplete(page, secondRunId);
      expect(secondDetail.run.status).toBe('completed');
      expect(secondRunId).not.toBe(firstRunId);

      const updatedProduct = await fetchProductById(page, fixture.product.id);
      expect(updatedProduct.description_pl).toBe(fixture.expectedDescriptionPl);

      const parameters = Array.isArray(updatedProduct.parameters) ? updatedProduct.parameters : [];
      expect(parameters).toHaveLength(3);

      const materials = parameters.filter((entry) => entry.parameterId === 'material');
      const conditions = parameters.filter((entry) => entry.parameterId === 'condition');
      const sizes = parameters.filter((entry) => entry.parameterId === 'size');

      expect(materials).toHaveLength(1);
      expect(conditions).toHaveLength(1);
      expect(sizes).toHaveLength(1);

      expect(materials[0]).toEqual(
        expect.objectContaining({
          parameterId: 'material',
          value: 'Leather',
          valuesByLanguage: expect.objectContaining({
            en: 'Leather',
            pl: 'Skora',
          }),
        })
      );
      expect(conditions[0]).toEqual(
        expect.objectContaining({
          parameterId: 'condition',
          value: 'Used',
          valuesByLanguage: expect.objectContaining({
            en: 'Used',
            pl: 'Uzywany',
          }),
        })
      );
      expect(sizes[0]).toEqual(
        expect.objectContaining({
          parameterId: 'size',
          value: '13 cm',
          valuesByLanguage: expect.objectContaining({
            en: '13 cm',
          }),
        })
      );
    } finally {
      await fixture.cleanup();
    }
  });

  test('shows the completed product workflow run in Job Queue search results', async ({ page }) => {
    const fixture = await createProductWorkflowFixture(page, {
      location: 'product_row',
      triggerButtonName: 'Queue Completed Workflow',
      pathName: 'E2E Product Queue Visibility Workflow',
      updateField: 'description_pl',
      expectedValue: `Playwright queue visibility ${Date.now()}`,
    });

    try {
      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      const runId = await runRowTriggerAction(page, row, fixture.triggerButton.name);

      await waitForRunToComplete(page, runId);
      await waitForProductFieldValue(page, {
        productId: fixture.product.id,
        field: 'description_pl',
        expectedValue: fixture.expectedValue,
      });

      const runFeedback = row.locator(`[data-run-id="${runId}"]`).first();
      const queueLink = runFeedback.getByRole('link', { name: 'Job Queue' });
      await expect(queueLink).toBeVisible({ timeout: 15_000 });
      await queueLink.click();

      await expect(page).toHaveURL(
        new RegExp(`/admin/ai-paths/queue\\?tab=paths-all&query=${runId}&runId=${runId}$`)
      );
      await expect(
        page.getByPlaceholder('Run ID, path name, entity, error...')
      ).toHaveValue(runId, {
        timeout: 30_000,
      });

      const runCard = locateQueueRunCard(page, runId);

      await expect(runCard.getByText(runId)).toBeVisible({ timeout: 30_000 });
      await expect(runCard.getByText(fixture.pathName)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Showing 1 of 1 runs')).toBeVisible({ timeout: 30_000 });
      await expect(runCard.getByText(/^completed$/i).first()).toBeVisible({ timeout: 30_000 });
      await expect(runCard.getByRole('button', { name: 'Hide details' })).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      await fixture.cleanup();
    }
  });

  test('surfaces failed product workflow runs without mutating the product', async ({ page }) => {
    const fixture = await createProductWorkflowFixture(page, {
      location: 'product_row',
      triggerButtonName: 'Fail Product Update',
      pathName: 'E2E Product Failure Visibility Workflow',
      updateField: 'description_pl',
      expectedValue: `Playwright failure workflow ${Date.now()}`,
      outcome: 'zero_affected_fail',
    });

    try {
      const originalProduct = await fetchProductById(page, fixture.product.id);
      const originalValue = originalProduct.description_pl ?? null;

      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      const runId = await runRowTriggerAction(page, row, fixture.triggerButton.name);
      const runFeedback = row.locator(`[data-run-id="${runId}"]`).first();
      await expect(runFeedback).toBeVisible({ timeout: 15_000 });

      const detail = await waitForRunToReachTerminal(page, runId);
      expect(detail.run.status).toBe('failed');
      const failureMessage = readRunFailureMessage(detail);
      expect(failureMessage).toBeTruthy();
      await expect(runFeedback.getByText(/^failed$/i)).toBeVisible({ timeout: 30_000 });
      await expect(runFeedback).toContainText(failureMessage ?? '');

      const refreshedProduct = await fetchProductById(page, fixture.product.id);
      expect(refreshedProduct.description_pl ?? null).toBe(originalValue);

      await openAdminQueuePage(page);
      await filterQueueByRunId(page, runId);

      const runCard = locateQueueRunCard(page, runId);

      await expect(runCard.getByText(runId)).toBeVisible({ timeout: 30_000 });
      await expect(runCard.getByText(fixture.pathName)).toBeVisible({ timeout: 30_000 });
      await expect(runCard.getByText(/^failed$/i)).toBeVisible({ timeout: 30_000 });
      await expect(runCard).toContainText(failureMessage ?? '', { timeout: 30_000 });
    } finally {
      await fixture.cleanup();
    }
  });

  test('shows completed node details and outputs in expanded Job Queue run details', async ({
    page,
  }) => {
    const fixture = await createProductWorkflowFixture(page, {
      location: 'product_row',
      triggerButtonName: 'Inspect Completed Workflow',
      pathName: 'E2E Product Run Detail Workflow',
      updateField: 'description_pl',
      expectedValue: `Playwright run detail ${Date.now()}`,
    });

    try {
      const row = await searchForProductRow(page, fixture.product.sku ?? fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
        mode: 'sku',
      });
      const runId = await runRowTriggerAction(page, row, fixture.triggerButton.name);

      await waitForRunToComplete(page, runId);
      await waitForProductFieldValue(page, {
        productId: fixture.product.id,
        field: 'description_pl',
        expectedValue: fixture.expectedValue,
      });

      await openAdminQueuePage(page);
      await filterQueueByRunId(page, runId);

      const runCard = locateQueueRunCard(page, runId);
      await expect(runCard.getByText(runId)).toBeVisible({ timeout: 30_000 });
      await runCard.getByRole('button', { name: 'Details', exact: true }).click();

      await expect(page.getByText('Path ID')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(fixture.pathId)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Nodes \(3\)/)).toBeVisible({ timeout: 30_000 });
      await page.getByRole('button', { name: 'Nodes (3)', exact: true }).click();
      await expect(page.getByText(/Trigger \(trigger\)/)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/Expected Update \(constant\)/)).toBeVisible({
        timeout: 30_000,
      });
      await expect(page.getByText(/Update Product \(database\)/)).toBeVisible({
        timeout: 30_000,
      });
      await page.getByRole('button', { name: 'Raw payloads', exact: true }).click();

      const textareaValues = await page
        .locator('textarea')
        .evaluateAll((elements) =>
          elements.map((element) => (element as HTMLTextAreaElement).value)
        );
      expect(textareaValues.some((value) => value.includes(fixture.expectedValue))).toBe(true);
      expect(textareaValues.some((value) => value.includes('description_pl'))).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });
});
