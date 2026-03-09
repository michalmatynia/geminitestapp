import { expect, test } from '@playwright/test';

import {
  createProductWorkflowFixture,
  filterQueueByRunId,
  openAdminProductsPage,
  openAdminQueuePage,
  searchForProductRow,
  triggerActionAndCaptureRunId,
  waitForProductFieldValue,
  waitForRunToComplete,
} from '../../support/ai-paths-product-workflow-fixtures';

const TEST_TIMEOUT_MS = 180_000;

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
      const row = await searchForProductRow(page, fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
      });
      const triggerButton = row.getByRole('button', { name: fixture.triggerButton.name });
      await expect(triggerButton).toBeVisible({ timeout: 15_000 });

      const runId = await triggerActionAndCaptureRunId(page, async () => {
        await triggerButton.click();
      });

      const detail = await waitForRunToComplete(page, runId);
      expect(detail.run.status).toBe('completed');

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
      const row = await searchForProductRow(page, fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
      });
      await row.getByLabel('Open row actions').click();
      await page.getByRole('menuitem', { name: 'Edit' }).click();

      const modal = page.locator('[role="dialog"]').last();
      await expect(modal).toBeVisible({ timeout: 15_000 });

      const triggerButton = modal.getByRole('button', { name: fixture.triggerButton.name });
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

  test('shows the completed product workflow run in Job Queue search results', async ({ page }) => {
    const fixture = await createProductWorkflowFixture(page, {
      location: 'product_row',
      triggerButtonName: 'Queue Completed Workflow',
      pathName: 'E2E Product Queue Visibility Workflow',
      updateField: 'description_pl',
      expectedValue: `Playwright queue visibility ${Date.now()}`,
    });

    try {
      const row = await searchForProductRow(page, fixture.searchTerm, {
        rowText: fixture.product.sku ?? fixture.searchTerm,
      });
      const triggerButton = row.getByRole('button', { name: fixture.triggerButton.name });
      await expect(triggerButton).toBeVisible({ timeout: 15_000 });

      const runId = await triggerActionAndCaptureRunId(page, async () => {
        await triggerButton.click();
      });

      await waitForRunToComplete(page, runId);
      await waitForProductFieldValue(page, {
        productId: fixture.product.id,
        field: 'description_pl',
        expectedValue: fixture.expectedValue,
      });

      await openAdminQueuePage(page);
      await filterQueueByRunId(page, runId);

      await expect(page.getByText(runId)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(fixture.pathName)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText('Showing 1 of 1 runs')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 30_000 });
    } finally {
      await fixture.cleanup();
    }
  });
});
