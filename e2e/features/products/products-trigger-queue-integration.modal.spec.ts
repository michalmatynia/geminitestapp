import { expect, test } from '@playwright/test';

import {
  ensureAdminSession,
  openAdminProductsPage,
  openProductEditModalFromName,
  setupProductModalTriggerHarness,
} from './products-trigger-queue-integration.spec-support';

test.describe.configure({ timeout: 120_000 });

test.describe('Products trigger button queue integration modal feedback', () => {
  test.setTimeout(60_000);

  test('enqueues AI Path run from Product modal trigger with entityJson form context', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const setup = await setupProductModalTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: 'run-e2e-product-modal-trigger',
          status: 'queued',
        },
      },
    });

    await setup.modal.getByRole('button', { name: setup.triggerButtonName }).click();

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    const enqueueBody = setup.getEnqueueRequestBody();
    expect(enqueueBody?.['entityType']).toBe('product');
    expect(enqueueBody?.['entityId']).toBe(setup.productId);
    expect(enqueueBody?.['triggerEvent']).toBe(setup.triggerEventId);
    expect(enqueueBody?.['pathId']).toBe(setup.pathId);

    const triggerContext = enqueueBody?.['triggerContext'] as Record<string, unknown> | undefined;
    expect(triggerContext?.['entityId']).toBe(setup.productId);
    expect(triggerContext?.['entityType']).toBe('product');
    expect(triggerContext?.['productId']).toBe(setup.productId);

    const source = triggerContext?.['source'] as Record<string, unknown> | undefined;
    expect(source?.['location']).toBe('product_modal');
    expect(source?.['pathId']).toBe(setup.pathId);

    const entityJson = triggerContext?.['entityJson'] as Record<string, unknown> | undefined;
    expect(entityJson).toMatchObject({
      id: setup.productId,
      sku: setup.productSku,
      name_en: 'Modal Trigger Product',
    });
  });

  test('keeps modal trigger run feedback visible after closing and reopening the product modal', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const runId = 'run-e2e-product-modal-trigger-persisted';
    const setup = await setupProductModalTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: runId,
          status: 'queued',
        },
      },
    });

    await setup.modal.getByRole('button', { name: setup.triggerButtonName }).click();

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    await expect(setup.modal.getByText('Queued')).toBeVisible({ timeout: 15_000 });
    await expect(setup.modal.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
      'href',
      new RegExp(`query=${runId}.*runId=${runId}`)
    );

    await page.keyboard.press('Escape');
    await expect(setup.modal).not.toBeVisible({ timeout: 15_000 });

    const reopenedModal = await openProductEditModalFromName(page, setup.productSku, setup.productName, {
      dismissTransientOverlays: true,
    });
    await expect(reopenedModal.getByText('Queued')).toBeVisible({ timeout: 15_000 });
    await expect(reopenedModal.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
      'href',
      new RegExp(`query=${runId}.*runId=${runId}`)
    );
  });

  test('shows a modal trigger status toggle and hides or restores modal run pills', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const runId = 'run-e2e-product-modal-trigger-visibility-toggle';
    const setup = await setupProductModalTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: runId,
          status: 'queued',
        },
      },
    });

    const hideStatusesButton = setup.modal.getByRole('button', { name: 'Hide trigger run pills' });
    await expect(hideStatusesButton).toBeVisible({ timeout: 15_000 });
    await expect(hideStatusesButton).toContainText('Hide Statuses');

    await setup.modal.getByRole('button', { name: setup.triggerButtonName }).click();

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    await expect(setup.modal.getByText('Queued')).toBeVisible({ timeout: 15_000 });
    await expect(setup.modal.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
      'href',
      new RegExp(`query=${runId}.*runId=${runId}`)
    );

    await hideStatusesButton.click();
    await expect(setup.modal.getByText('Queued')).toHaveCount(0);
    await expect(setup.modal.getByRole('link', { name: 'Job Queue' })).toHaveCount(0);

    const showStatusesButton = setup.modal.getByRole('button', { name: 'Show trigger run pills' });
    await expect(showStatusesButton).toBeVisible({ timeout: 15_000 });
    await expect(showStatusesButton).toContainText('Show Statuses');

    await showStatusesButton.click();
    await expect(setup.modal.getByText('Queued')).toBeVisible({ timeout: 15_000 });
    await expect(setup.modal.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
      'href',
      new RegExp(`query=${runId}.*runId=${runId}`)
    );
  });

  test('keeps modal trigger run feedback visible after redirecting away and back to products', async ({
    page,
  }) => {
    const authenticated = await ensureAdminSession(page);
    test.skip(!authenticated, 'Admin authentication is required for this e2e test.');

    const runId = 'run-e2e-product-modal-trigger-redirect-persisted';
    const setup = await setupProductModalTriggerHarness(page, {
      enqueueBody: {
        run: {
          id: runId,
          status: 'queued',
        },
      },
    });

    await setup.modal.getByRole('button', { name: setup.triggerButtonName }).click();

    await expect.poll(() => setup.getEnqueueRequestBody()).not.toBeNull();
    await expect(setup.modal.getByText('Queued')).toBeVisible({ timeout: 15_000 });

    await page.keyboard.press('Escape');
    await expect(setup.modal).not.toBeVisible({ timeout: 15_000 });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await openAdminProductsPage(page);

    const reopenedModal = await openProductEditModalFromName(
      page,
      setup.productSku,
      setup.productName
    );
    await expect(reopenedModal.getByText('Queued')).toBeVisible({ timeout: 15_000 });
    await expect(reopenedModal.getByRole('link', { name: 'Job Queue' })).toHaveAttribute(
      'href',
      new RegExp(`query=${runId}.*runId=${runId}`)
    );
  });
});
