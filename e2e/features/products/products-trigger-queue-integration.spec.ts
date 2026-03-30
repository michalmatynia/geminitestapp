import { expect, test } from '@playwright/test';

import {
  assertQueuedRunVisibleInAllRuns,
  assertTriggerRunQueued,
  assertTriggerRunRejected,
  createProductTriggerPathConfig,
  ensureAdminSession,
  setupProductTriggerHarness,
} from './products-trigger-queue-integration.spec-support';

test.describe.configure({ timeout: 120_000 });

test.describe('Products trigger button queue integration', () => {
  test.setTimeout(60_000);

  test('enqueues AI Path run from Product row trigger and updates queued badge + refresh', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger',
          status: 'queued',
        },
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('surfaces Product row trigger run in Job Queue All Runs immediately', async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-queue',
          status: 'queued',
        },
      },
    });
    await assertTriggerRunQueued(page, setup);

    const queueOpened = await assertQueuedRunVisibleInAllRuns(
      page,
      'run-e2e-product-trigger-queue'
    );
    test.skip(queueOpened === false, 'Admin AI Paths queue access is required for this e2e test.');
  });

  test('toggles product row trigger run pills globally from the products header', async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-feedback-toggle',
          status: 'queued',
        },
      },
    });

    await assertTriggerRunQueued(page, setup);

    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    const tableHeaderRow = page.getByRole('row', { name: /Select all Image Name Price/i });
    await expect(productRow.getByText('Queued').first()).toBeVisible({ timeout: 15_000 });
    await expect(productRow.getByRole('link', { name: 'Job Queue' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(productRow.getByText('Just now')).toBeVisible({ timeout: 15_000 });

    await tableHeaderRow.getByRole('button', { name: 'Hide trigger run pills' }).click();
    await expect(productRow.getByRole('link', { name: 'Job Queue' })).toHaveCount(0, {
      timeout: 15_000,
    });
    await expect(productRow.getByText('Just now')).toHaveCount(0, { timeout: 15_000 });

    await tableHeaderRow.getByRole('button', { name: 'Show trigger run pills' }).click();
    await expect(productRow.getByRole('link', { name: 'Job Queue' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(productRow.getByText('Just now')).toBeVisible({ timeout: 15_000 });
  });

  test('shows waiting immediately before a trigger run becomes queued', async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueDelayMs: 1_500,
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-waiting',
          status: 'queued',
        },
      },
    });

    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    await expect(productRow).toBeVisible({ timeout: 15_000 });

    await productRow.getByRole('button', { name: setup.triggerButtonName }).click();

    await expect(productRow.getByText('Waiting').first()).toBeVisible({ timeout: 5_000 });
    await expect(productRow.getByRole('link', { name: 'Job Queue' })).toHaveCount(0);

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    await expect(productRow.getByText('Queued').first()).toBeVisible({ timeout: 15_000 });
    await expect(productRow.getByRole('link', { name: 'Job Queue' })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('does not show a permanent queued pill from stale legacy or offline queued storage', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const staleSourceExpiresAt = Date.now() + 60_000;
    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-unused',
          status: 'queued',
        },
      },
      productId: 'product-keycha1212',
      productSku: 'KEYCHA1212',
      productLabel: 'Keychain Product',
      initialQueuedProductStoragePayload: {
        version: 2,
        products: {
          'product-keycha1212': [
            { source: 'legacy' },
            { source: 'offline:update', expiresAt: staleSourceExpiresAt },
          ],
        },
      },
    });

    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    await expect(productRow).toBeVisible({ timeout: 15_000 });
    await expect(productRow.getByText('Queued')).toHaveCount(0);
  });

  test('handles legacy enqueue payloads exposing only run._id and still updates queue state', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          _id: 'run-e2e-product-trigger-legacy',
          status: 'queued',
        },
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('does not show queued badge when enqueue response is missing run identifier', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          status: 'queued',
        },
      },
    });
    await assertTriggerRunRejected(page, setup);
  });

  test('does not show queued badge when enqueue response exposes only wrapper id/pathId', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        id: 'path-e2e-product-trigger',
        pathId: 'path-e2e-product-trigger',
        run: {
          status: 'queued',
        },
      },
    });
    await assertTriggerRunRejected(page, setup);
  });

  test('handles legacy top-level runId payloads and still updates queue state', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        runId: 'run-e2e-product-trigger-top-level',
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('handles mixed enqueue payloads with runId outside run object', async ({ page }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          status: 'queued',
        },
        runId: 'run-e2e-product-trigger-mixed',
      },
    });
    await assertTriggerRunQueued(page, setup);
  });

  test('keeps the queued pill visible after reload while the AI Path run is still queued', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-reload',
          status: 'queued',
        },
      },
      trackRunStatus: true,
      initialTrackedRunDetail: {
        status: 'queued',
      },
    });

    await assertTriggerRunQueued(page, setup);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    await expect(productRow).toBeVisible({ timeout: 15_000 });
    await expect(productRow.getByText('Queued').first()).toBeVisible({ timeout: 15_000 });
  });

  test('clears the queued pill after the tracked AI Path run reaches a terminal status', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-terminal',
          status: 'queued',
        },
      },
      trackRunStatus: true,
      initialTrackedRunDetail: {
        status: 'queued',
      },
    });

    await assertTriggerRunQueued(page, setup);

    setup.setTrackedRunDetail({
      status: 'completed',
      finishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const productRow = page.locator('tr').filter({ hasText: setup.productSku }).first();
    await expect(productRow.getByText('Queued')).toHaveCount(0, { timeout: 15_000 });
  });

  test('repairs legacy Trigger contextMode in stored product path config and still enqueues', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductTriggerHarness(page, {
      pathName: 'E2E Legacy Trigger Path',
      pathConfigOverride: createProductTriggerPathConfig({
        pathId: 'path-e2e-product-trigger',
        pathName: 'E2E Legacy Trigger Path',
        timestamp: new Date().toISOString(),
        triggerTitle: 'Trigger: Opis i Tytul',
        triggerEventId: 'manual',
        triggerConfig: {
          contextMode: 'simulation_preferred',
        },
      }),
      enqueueBody: {
        run: {
          id: 'run-e2e-product-trigger-legacy-context-mode',
          status: 'queued',
        },
      },
    });

    await assertTriggerRunQueued(page, setup);

    await expect
      .poll(
        () =>
          setup
            .getSettingsWriteBodies()
            .filter((body) => body?.['key'] === `ai_paths_config_${setup.pathId}`).length
      )
      .toBe(1);
    const repairWrites = setup
      .getSettingsWriteBodies()
      .filter((body) => body?.['key'] === `ai_paths_config_${setup.pathId}`);
    const repairWrite = repairWrites.at(-1);
    expect(repairWrite?.['key']).toBe(`ai_paths_config_${setup.pathId}`);
    expect(typeof repairWrite?.['value']).toBe('string');

    const repairedConfig = JSON.parse(repairWrite['value'] as string) as {
      nodes?: Array<{ config?: { trigger?: { contextMode?: string } } }>;
    };
    expect(repairedConfig.nodes?.[0]?.config?.trigger?.contextMode).toBe('trigger_only');

    await expect(page.getByText(/removed legacy Trigger context modes/i)).toHaveCount(0);
    await expect(page.getByText(/temporarily unavailable/i)).toHaveCount(0);
  });
});
