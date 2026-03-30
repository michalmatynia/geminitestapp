import { expect, type Locator, type Page } from '@playwright/test';

import type { AiTriggerButtonLocation, AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

import { ensureAdminSession } from './admin-auth';
import {
  browserRequest,
  cleanupStaleProductWorkflowFixtures,
  createParameterDefinition,
  createProduct,
  createTriggerButtonWithPathRetry,
  deleteParameterDefinition,
  deleteProduct,
  deleteTriggerButton,
  enablePlaywrightFixtureButtons,
  fetchProductById,
  removePathConfig,
  upsertPathConfig,
} from './ai-paths-product-workflow-fixtures.api';
import {
  createDeterministicParameterInferencePathConfig,
  createDeterministicParameterTranslationPathConfig,
  createDeterministicProductUpdatePathConfig,
} from './ai-paths-product-workflow-fixtures.path-configs';
import {
  DEFAULT_WAIT_TIMEOUT_MS,
  JOB_QUEUE_SEARCH_PLACEHOLDER,
  PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX,
  PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX,
  PRODUCTS_SEARCH_PLACEHOLDER,
  randomSuffix,
  readRecordString,
  readRunFailureMessage,
  type AiPathRunDetailRecord,
  type ProductApiRecord,
  type ProductParameterDefinitionRecord,
} from './ai-paths-product-workflow-fixtures.shared';

type ProductWorkflowFixtureOptions = {
  location: Extract<AiTriggerButtonLocation, 'product_row' | 'product_modal'>;
  triggerButtonName: string;
  pathName: string;
  updateField: 'description_pl' | 'description_de';
  expectedValue: string;
  outcome?: 'success' | 'zero_affected_fail';
};

type ProductWorkflowFixture = {
  product: ProductApiRecord;
  searchTerm: string;
  pathId: string;
  pathName: string;
  triggerButton: AiTriggerButtonRecord;
  expectedValue: string;
  updateField: 'description_pl' | 'description_de';
  cleanup: () => Promise<void>;
};

type ProductTranslationWorkflowFixtureOptions = {
  location: Extract<AiTriggerButtonLocation, 'product_row' | 'product_modal'>;
  triggerButtonName: string;
  pathName: string;
  expectedDescriptionPl: string;
  initialParameters: Array<{
    parameterId: string;
    value?: string | null;
    valuesByLanguage?: Record<string, string>;
  }>;
  translatedParameters: Array<{
    parameterId: string;
    value: string;
  }>;
};

type ProductTranslationWorkflowFixture = {
  product: ProductApiRecord;
  searchTerm: string;
  pathId: string;
  pathName: string;
  triggerButton: AiTriggerButtonRecord;
  expectedDescriptionPl: string;
  cleanup: () => Promise<void>;
};

type ProductParameterDefinitionSeed = {
  key: string;
  nameEn: string;
  selectorType?: string;
  optionLabels?: string[];
};

type ProductParameterFixtureValue = {
  parameterKey?: string;
  parameterId?: string;
  value?: string | null;
  valuesByLanguage?: Record<string, string>;
};

type ProductParameterInferenceFixtureValue = {
  parameterKey?: string;
  parameterId?: string;
  value: string;
};

type ProductParameterInferenceWorkflowFixtureOptions = {
  location: Extract<AiTriggerButtonLocation, 'product_row' | 'product_modal'>;
  triggerButtonName: string;
  pathName: string;
  definitions: ProductParameterDefinitionSeed[];
  initialParameters: ProductParameterFixtureValue[];
  inferredParameters: ProductParameterInferenceFixtureValue[];
};

type ProductParameterInferenceWorkflowFixture = {
  product: ProductApiRecord;
  searchTerm: string;
  pathId: string;
  pathName: string;
  triggerButton: AiTriggerButtonRecord;
  parameterDefinitions: ProductParameterDefinitionRecord[];
  parameterIdsByKey: Record<string, string>;
  cleanup: () => Promise<void>;
};

const extractRunId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;
  const directRunId = readRecordString(record, 'runId');
  if (directRunId) {
    return directRunId;
  }

  const run = record['run'];
  if (run && typeof run === 'object') {
    const runRecord = run as Record<string, unknown>;
    const nestedRunId =
      readRecordString(runRecord, 'id') ??
      readRecordString(runRecord, 'runId') ??
      readRecordString(runRecord, '_id');
    if (nestedRunId) {
      return nestedRunId;
    }
  }

  return null;
};

export { fetchProductById, readRunFailureMessage };

export async function openAdminProductsPage(page: Page): Promise<void> {
  const productsHeading = page.getByRole('heading', { name: 'Products', exact: true });
  const currentPath = new URL(page.url(), 'http://localhost').pathname;
  const alreadyOnProducts =
    currentPath === '/admin/products' &&
    (await productsHeading.isVisible().catch(() => false));

  if (!alreadyOnProducts) {
    await ensureAdminSession(page, '/admin/products');
    await expect(productsHeading).toBeVisible({
      timeout: 30_000,
    });
  }

  await enablePlaywrightFixtureButtons(page);

  const catalogFilter = page.getByRole('combobox', { name: 'Filter by catalog' }).first();
  await expect(catalogFilter).toBeVisible({ timeout: 15_000 });
  const catalogLabel = (await catalogFilter.textContent())?.trim() ?? '';
  if (!catalogLabel.includes('All catalogs')) {
    await catalogFilter.click();
    await page.getByRole('option', { name: 'All catalogs' }).click();
  }
}

export async function openAdminQueuePage(page: Page): Promise<void> {
  const queueHeading = page.getByRole('heading', { name: 'Job Queue', exact: true });
  const currentUrl = new URL(page.url(), 'http://localhost');
  const alreadyOnQueue =
    currentUrl.pathname === '/admin/ai-paths/queue' &&
    currentUrl.search === '?tab=paths-all' &&
    (await queueHeading.isVisible().catch(() => false));

  if (!alreadyOnQueue) {
    await ensureAdminSession(page, '/admin/ai-paths/queue?tab=paths-all');
    await expect(queueHeading).toBeVisible({
      timeout: 30_000,
    });
  }
}

export async function searchForProductRow(
  page: Page,
  searchTerm: string,
  options?: { rowText?: string; mode?: 'name' | 'sku' }
) {
  await openAdminProductsPage(page);

  const mode = options?.mode ?? 'name';
  if (mode === 'sku') {
    const resolveSkuOrFallbackInput = async (): Promise<{
      input: Locator;
      value: string;
    }> => {
      const showFiltersButton = page.getByRole('button', { name: /show filters/i });
      if (await showFiltersButton.isVisible().catch(() => false)) {
        await showFiltersButton.click();
      }

      const skuInput = page.locator('input[placeholder="Search by SKU..."]:visible').first();
      if (await skuInput.isVisible().catch(() => false)) {
        return { input: skuInput, value: searchTerm };
      }

      const fallbackSearch = page
        .locator(`input[placeholder="${PRODUCTS_SEARCH_PLACEHOLDER}"]:visible`)
        .first();
      if (await fallbackSearch.isVisible().catch(() => false)) {
        return { input: fallbackSearch, value: options?.rowText ?? searchTerm };
      }

      await ensureAdminSession(page, '/admin/products');
      await openAdminProductsPage(page);

      if (await showFiltersButton.isVisible().catch(() => false)) {
        await showFiltersButton.click();
      }

      const retrySkuInput = page.locator('input[placeholder="Search by SKU..."]:visible').first();
      if (await retrySkuInput.isVisible().catch(() => false)) {
        return { input: retrySkuInput, value: searchTerm };
      }

      const retryFallbackSearch = page
        .locator(`input[placeholder="${PRODUCTS_SEARCH_PLACEHOLDER}"]:visible`)
        .first();
      await expect(retryFallbackSearch).toBeVisible({ timeout: 15_000 });
      return { input: retryFallbackSearch, value: options?.rowText ?? searchTerm };
    };

    const { input, value } = await resolveSkuOrFallbackInput();
    await input.fill(value);
    await page.keyboard.press('Enter');
  } else {
    const searchInput = page
      .locator(`input[placeholder="${PRODUCTS_SEARCH_PLACEHOLDER}"]:visible`)
      .first();
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill(searchTerm);
    await page.keyboard.press('Enter');
  }

  const rowText = options?.rowText ?? searchTerm;
  const row = page.locator('tr').filter({ hasText: rowText }).first();
  await expect(row).toBeVisible({ timeout: 30_000 });
  return row;
}

export async function createProductWorkflowFixture(
  page: Page,
  options: ProductWorkflowFixtureOptions
): Promise<ProductWorkflowFixture> {
  await openAdminProductsPage(page);
  await cleanupStaleProductWorkflowFixtures(page);

  const cleanupTasks: Array<() => Promise<void>> = [];
  const cleanup = async (): Promise<void> => {
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop();
      if (!task) continue;
      await task().catch(() => undefined);
    }
  };

  try {
    const suffix = randomSuffix();
    const shortSuffix = suffix.slice(-6).toUpperCase();
    const timestamp = new Date().toISOString();
    const sku = `${PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX}${suffix}`.toUpperCase();
    const nameEn = `Playwright AI Paths ${suffix}`;
    const descriptionEn = `Playwright AI Paths source description ${suffix}`;
    const pathId = `${PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX}${suffix.replace(/[^a-z0-9_-]/gi, '_')}`;
    const pathName = `${options.pathName} ${shortSuffix}`;
    const triggerButtonName = `${options.triggerButtonName} ${shortSuffix}`;
    const placeholderTriggerEventId = `pending-${suffix}`;

    const product = await createProduct(page, {
      sku,
      nameEn,
      descriptionEn,
    });
    cleanupTasks.push(async () => {
      await deleteProduct(page, product.id);
    });

    const initialConfig = createDeterministicProductUpdatePathConfig({
      pathId,
      pathName,
      triggerEventId: placeholderTriggerEventId,
      updateField: options.updateField,
      expectedValue: options.expectedValue,
      timestamp,
      outcome: options.outcome,
    });

    const { indexExisted } = await upsertPathConfig(page, {
      pathId,
      pathName,
      config: initialConfig,
    });
    cleanupTasks.push(async () => {
      await removePathConfig(page, { pathId, indexExisted });
    });

    const triggerButton = await createTriggerButtonWithPathRetry(page, {
      pathId,
      pathName,
      config: initialConfig,
      button: {
        name: triggerButtonName,
        pathId,
        location: options.location,
      },
    });
    cleanupTasks.push(async () => {
      await deleteTriggerButton(page, triggerButton.id);
    });

    const finalConfig = createDeterministicProductUpdatePathConfig({
      pathId,
      pathName,
      triggerEventId: triggerButton.id,
      updateField: options.updateField,
      expectedValue: options.expectedValue,
      timestamp,
      outcome: options.outcome,
    });

    await upsertPathConfig(page, {
      pathId,
      pathName,
      config: finalConfig,
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await openAdminProductsPage(page);

    return {
      product,
      searchTerm: nameEn,
      pathId,
      pathName,
      triggerButton,
      expectedValue: options.expectedValue,
      updateField: options.updateField,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function createProductTranslationWorkflowFixture(
  page: Page,
  options: ProductTranslationWorkflowFixtureOptions
): Promise<ProductTranslationWorkflowFixture> {
  await openAdminProductsPage(page);
  await cleanupStaleProductWorkflowFixtures(page);

  const cleanupTasks: Array<() => Promise<void>> = [];
  const cleanup = async (): Promise<void> => {
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop();
      if (!task) continue;
      await task().catch(() => undefined);
    }
  };

  try {
    const suffix = randomSuffix();
    const shortSuffix = suffix.slice(-6).toUpperCase();
    const timestamp = new Date().toISOString();
    const sku = `${PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX}${suffix}`.toUpperCase();
    const nameEn = `Playwright AI Paths Translation ${suffix}`;
    const descriptionEn = `Playwright AI Paths translation source ${suffix}`;
    const pathId = `${PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX}${suffix.replace(/[^a-z0-9_-]/gi, '_')}`;
    const pathName = `${options.pathName} ${shortSuffix}`;
    const triggerButtonName = `${options.triggerButtonName} ${shortSuffix}`;
    const placeholderTriggerEventId = `pending-${suffix}`;

    const product = await createProduct(page, {
      sku,
      nameEn,
      descriptionEn,
      parameters: options.initialParameters,
    });
    cleanupTasks.push(async () => {
      await deleteProduct(page, product.id);
    });

    const initialConfig = createDeterministicParameterTranslationPathConfig({
      pathId,
      pathName,
      triggerEventId: placeholderTriggerEventId,
      expectedDescriptionPl: options.expectedDescriptionPl,
      translatedParameters: options.translatedParameters,
      timestamp,
    });

    const { indexExisted } = await upsertPathConfig(page, {
      pathId,
      pathName,
      config: initialConfig,
    });
    cleanupTasks.push(async () => {
      await removePathConfig(page, { pathId, indexExisted });
    });

    const triggerButton = await createTriggerButtonWithPathRetry(page, {
      pathId,
      pathName,
      config: initialConfig,
      button: {
        name: triggerButtonName,
        pathId,
        location: options.location,
      },
    });
    cleanupTasks.push(async () => {
      await deleteTriggerButton(page, triggerButton.id);
    });

    const finalConfig = createDeterministicParameterTranslationPathConfig({
      pathId,
      pathName,
      triggerEventId: triggerButton.id,
      expectedDescriptionPl: options.expectedDescriptionPl,
      translatedParameters: options.translatedParameters,
      timestamp,
    });

    await upsertPathConfig(page, {
      pathId,
      pathName,
      config: finalConfig,
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await openAdminProductsPage(page);

    return {
      product,
      searchTerm: nameEn,
      pathId,
      pathName,
      triggerButton,
      expectedDescriptionPl: options.expectedDescriptionPl,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function createProductParameterInferenceWorkflowFixture(
  page: Page,
  options: ProductParameterInferenceWorkflowFixtureOptions
): Promise<ProductParameterInferenceWorkflowFixture> {
  await openAdminProductsPage(page);
  await cleanupStaleProductWorkflowFixtures(page);

  const cleanupTasks: Array<() => Promise<void>> = [];
  const cleanup = async (): Promise<void> => {
    while (cleanupTasks.length > 0) {
      const task = cleanupTasks.pop();
      if (!task) continue;
      await task().catch(() => undefined);
    }
  };

  try {
    const suffix = randomSuffix();
    const shortSuffix = suffix.slice(-6).toUpperCase();
    const timestamp = new Date().toISOString();
    const sku = `${PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX}${suffix}`.toUpperCase();
    const nameEn = `Playwright AI Paths Parameter Inference ${suffix}`;
    const descriptionEn = `Playwright AI Paths parameter inference source ${suffix}`;
    const pathId = `${PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX}${suffix.replace(/[^a-z0-9_-]/gi, '_')}`;
    const pathName = `${options.pathName} ${shortSuffix}`;
    const triggerButtonName = `${options.triggerButtonName} ${shortSuffix}`;
    const placeholderTriggerEventId = `pending-${suffix}`;
    const parameterCatalogId = `catalog-playwright-params-${suffix}`;
    const parameterDefinitions: ProductParameterDefinitionRecord[] = [];
    const parameterIdsByKey: Record<string, string> = {};

    for (const definition of options.definitions) {
      const parameter = await createParameterDefinition(page, {
        catalogId: parameterCatalogId,
        nameEn: definition.nameEn,
        selectorType: definition.selectorType,
        optionLabels: definition.optionLabels,
      });
      parameterDefinitions.push(parameter);
      parameterIdsByKey[definition.key] = parameter.id;
      cleanupTasks.push(async () => {
        await deleteParameterDefinition(page, parameter.id);
      });
    }

    const resolveParameterId = (value: {
      parameterKey?: string;
      parameterId?: string;
    }): string => {
      if (value.parameterId) return value.parameterId;
      if (!value.parameterKey) {
        throw new Error('Parameter fixture entries must provide parameterKey or parameterId.');
      }
      const resolved = parameterIdsByKey[value.parameterKey];
      if (!resolved) {
        throw new Error(`Missing parameter definition for key "${value.parameterKey}".`);
      }
      return resolved;
    };

    const product = await createProduct(page, {
      sku,
      nameEn,
      descriptionEn,
      parameters: options.initialParameters.map((entry) => ({
        parameterId: resolveParameterId(entry),
        ...(entry.value !== undefined ? { value: entry.value } : {}),
        ...(entry.valuesByLanguage ? { valuesByLanguage: entry.valuesByLanguage } : {}),
      })),
    });
    cleanupTasks.push(async () => {
      await deleteProduct(page, product.id);
    });

    const inferredParameters = options.inferredParameters.map((entry) => ({
      parameterId: resolveParameterId(entry),
      value: entry.value,
    }));

    const initialConfig = createDeterministicParameterInferencePathConfig({
      pathId,
      pathName,
      triggerEventId: placeholderTriggerEventId,
      parameterDefinitions,
      inferredParameters,
      timestamp,
    });

    const { indexExisted } = await upsertPathConfig(page, {
      pathId,
      pathName,
      config: initialConfig,
    });
    cleanupTasks.push(async () => {
      await removePathConfig(page, { pathId, indexExisted });
    });

    const triggerButton = await createTriggerButtonWithPathRetry(page, {
      pathId,
      pathName,
      config: initialConfig,
      button: {
        name: triggerButtonName,
        pathId,
        location: options.location,
      },
    });
    cleanupTasks.push(async () => {
      await deleteTriggerButton(page, triggerButton.id);
    });

    const finalConfig = createDeterministicParameterInferencePathConfig({
      pathId,
      pathName,
      triggerEventId: triggerButton.id,
      parameterDefinitions,
      inferredParameters,
      timestamp,
    });

    await upsertPathConfig(page, {
      pathId,
      pathName,
      config: finalConfig,
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await openAdminProductsPage(page);

    return {
      product,
      searchTerm: nameEn,
      pathId,
      pathName,
      triggerButton,
      parameterDefinitions,
      parameterIdsByKey,
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

export async function triggerActionAndCaptureRunId(
  page: Page,
  action: () => Promise<void>
): Promise<string> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/api/ai-paths/runs/enqueue'),
    { timeout: 30_000 }
  );

  await action();
  const response = await responsePromise;
  const payload = (await response.json().catch(() => null)) as unknown;
  const runId = extractRunId(payload);
  if (!runId) {
    throw new Error(
      `AI Paths enqueue response did not include a run id: ${JSON.stringify(payload)}`
    );
  }
  return runId;
}

export async function waitForRunToComplete(
  page: Page,
  runId: string,
  options?: { timeoutMs?: number }
): Promise<AiPathRunDetailRecord> {
  const detail = await waitForRunToReachTerminal(page, runId, options);
  const status = readRecordString(detail.run, 'status') ?? 'unknown';
  if (status !== 'completed') {
    throw new Error(
      `Run ${runId} terminated with status ${status}: ${readRunFailureMessage(detail) ?? 'no error message'}`
    );
  }
  return detail;
}

export async function waitForRunToReachTerminal(
  page: Page,
  runId: string,
  options?: { timeoutMs?: number }
): Promise<AiPathRunDetailRecord> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  const startedAt = Date.now();
  let lastPollingError: string | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    const url = `/api/ai-paths/runs/${encodeURIComponent(runId)}`;
    const response = await browserRequest<{
      run: Record<string, unknown>;
      nodes: Array<Record<string, unknown>>;
      events: unknown[];
      errorSummary?: Record<string, unknown> | null;
    }>(page, { url });
    if (!response.ok || response.data === null) {
      const errorMessage = `Request to ${url} failed with status ${response.status}: ${response.text || 'no body'}`;
      if (response.status >= 500) {
        lastPollingError = errorMessage;
        await page.waitForTimeout(1_000);
        continue;
      }
      throw new Error(errorMessage);
    }
    lastPollingError = null;
    const detail = response.data;
    const status = readRecordString(detail.run, 'status') ?? 'unknown';

    if (status === 'completed') {
      return detail;
    }

    if (status === 'failed' || status === 'canceled' || status === 'dead_lettered') {
      return detail;
    }

    await page.waitForTimeout(1_000);
  }

  throw new Error(
    lastPollingError
      ? `Timed out waiting for run ${runId} to reach a terminal status. Last polling error: ${lastPollingError}`
      : `Timed out waiting for run ${runId} to reach a terminal status.`
  );
}

export async function waitForProductFieldValue(
  page: Page,
  args: {
    productId: string;
    field: 'description_pl' | 'description_de';
    expectedValue: string;
    timeoutMs?: number;
  }
): Promise<ProductApiRecord> {
  const timeoutMs = args.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const product = await fetchProductById(page, args.productId);
    if (product[args.field] === args.expectedValue) {
      return product;
    }
    await page.waitForTimeout(1_000);
  }

  throw new Error(
    `Timed out waiting for product ${args.productId} field ${args.field} to equal "${args.expectedValue}".`
  );
}

export async function filterQueueByRunId(page: Page, runId: string): Promise<void> {
  const searchInput = page
    .locator(`input[placeholder="${JOB_QUEUE_SEARCH_PLACEHOLDER}"]:visible`)
    .first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill(runId);
  await page.keyboard.press('Enter');
}
