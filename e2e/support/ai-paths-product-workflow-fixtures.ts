import { expect, type Page } from '@playwright/test';

import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonLocation, AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';

import { ensureAdminSession } from './admin-auth';

const AI_PATHS_INDEX_KEY = 'ai_paths_index';
const AI_PATHS_CONFIG_KEY_PREFIX = 'ai_paths_config_';
const PRODUCTS_SEARCH_PLACEHOLDER = 'Search by product name...';
const JOB_QUEUE_SEARCH_PLACEHOLDER = 'Run ID, path name, entity, error...';
const DEFAULT_WAIT_TIMEOUT_MS = 120_000;

type BrowserRequestResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
};

type AiPathsSettingRecord = {
  key: string;
  value: string;
};

type AiPathsIndexEntry = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ProductApiRecord = {
  id: string;
  sku: string | null;
  name_en?: string | null;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
};

type ProductWorkflowFixtureOptions = {
  location: Extract<AiTriggerButtonLocation, 'product_row' | 'product_modal'>;
  triggerButtonName: string;
  pathName: string;
  updateField: 'description_pl' | 'description_de';
  expectedValue: string;
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

const randomSuffix = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const createCsrfToken = (): string =>
  `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

const readOrCreateCsrfToken = async (page: Page): Promise<string> => {
  return await page.evaluate((fallbackToken: string) => {
    const match = document.cookie.match(/(?:^|; )csrf-token=([^;]+)/);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }

    document.cookie = `csrf-token=${encodeURIComponent(fallbackToken)}; path=/; SameSite=Lax`;
    return fallbackToken;
  }, createCsrfToken());
};

const browserRequest = async <T>(
  page: Page,
  args: {
    method?: 'GET' | 'POST' | 'DELETE';
    url: string;
    json?: unknown;
    form?: Record<string, string | null | undefined>;
  }
): Promise<BrowserRequestResult<T>> => {
  const csrfToken =
    args.method && args.method !== 'GET' ? await readOrCreateCsrfToken(page) : null;

  return await page.evaluate(
    async (request: {
      method: 'GET' | 'POST' | 'DELETE';
      url: string;
      json?: unknown;
      form?: Record<string, string | null | undefined>;
      csrfToken: string | null;
    }) => {
      const headers = new Headers();
      if (request.csrfToken) {
        headers.set('x-csrf-token', request.csrfToken);
      }

      let body: BodyInit | undefined;
      if (request.form) {
        const formData = new FormData();
        Object.entries(request.form).forEach(([key, value]) => {
          if (value === undefined || value === null) return;
          formData.append(key, value);
        });
        body = formData;
      } else if (request.json !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(request.json);
      }

      const response = await fetch(request.url, {
        method: request.method,
        headers,
        body,
        credentials: 'include',
      });
      const text = await response.text();

      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          data = null;
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
        text,
      };
    },
    {
      method: args.method ?? 'GET',
      url: args.url,
      ...(args.json !== undefined ? { json: args.json } : {}),
      ...(args.form ? { form: args.form } : {}),
      csrfToken,
    }
  );
};

const expectApiSuccess = <T>(response: BrowserRequestResult<T>, url: string): T => {
  if (!response.ok || response.data === null) {
    throw new Error(
      `Request to ${url} failed with status ${response.status}: ${response.text || 'no body'}`
    );
  }
  return response.data;
};

const readAiPathsIndex = async (page: Page): Promise<{
  existed: boolean;
  entries: AiPathsIndexEntry[];
}> => {
  const url = `/api/ai-paths/settings?keys=${encodeURIComponent(AI_PATHS_INDEX_KEY)}`;
  const response = await browserRequest<AiPathsSettingRecord[]>(page, { url });
  const settings = expectApiSuccess(response, url);
  const indexRecord = settings.find((item) => item.key === AI_PATHS_INDEX_KEY) ?? null;

  if (!indexRecord?.value?.trim()) {
    return {
      existed: false,
      entries: [],
    };
  }

  const parsed = JSON.parse(indexRecord.value) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('AI Paths index payload is not an array.');
  }

  return {
    existed: true,
    entries: parsed as AiPathsIndexEntry[],
  };
};

const upsertAiPathsSetting = async (page: Page, key: string, value: string): Promise<void> => {
  const response = await browserRequest<AiPathsSettingRecord>(page, {
    method: 'POST',
    url: '/api/ai-paths/settings',
    json: { key, value },
  });
  expectApiSuccess(response, '/api/ai-paths/settings');
};

const deleteAiPathsSettings = async (page: Page, keys: string[]): Promise<void> => {
  if (keys.length === 0) return;
  const response = await browserRequest<{ deletedCount?: number }>(page, {
    method: 'DELETE',
    url: '/api/ai-paths/settings',
    json: { keys },
  });
  expectApiSuccess(response, '/api/ai-paths/settings');
};

const upsertPathConfig = async (
  page: Page,
  args: {
    pathId: string;
    pathName: string;
    config: PathConfig;
  }
): Promise<{ indexExisted: boolean }> => {
  const { existed, entries } = await readAiPathsIndex(page);
  const now = args.config.updatedAt;
  const nextEntries = [
    ...entries.filter((entry) => entry.id !== args.pathId),
    {
      id: args.pathId,
      name: args.pathName,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await upsertAiPathsSetting(page, AI_PATHS_INDEX_KEY, JSON.stringify(nextEntries));
  await upsertAiPathsSetting(
    page,
    `${AI_PATHS_CONFIG_KEY_PREFIX}${args.pathId}`,
    JSON.stringify(args.config)
  );

  return { indexExisted: existed };
};

const removePathConfig = async (
  page: Page,
  args: { pathId: string; indexExisted: boolean }
): Promise<void> => {
  const { entries } = await readAiPathsIndex(page);
  const nextEntries = entries.filter((entry) => entry.id !== args.pathId);

  if (nextEntries.length === 0 && !args.indexExisted) {
    await deleteAiPathsSettings(page, [AI_PATHS_INDEX_KEY]);
  } else {
    await upsertAiPathsSetting(page, AI_PATHS_INDEX_KEY, JSON.stringify(nextEntries));
  }

  await deleteAiPathsSettings(page, [`${AI_PATHS_CONFIG_KEY_PREFIX}${args.pathId}`]);
};

const createTriggerButton = async (
  page: Page,
  args: {
    name: string;
    pathId: string;
    location: Extract<AiTriggerButtonLocation, 'product_row' | 'product_modal'>;
  }
): Promise<AiTriggerButtonRecord> => {
  const response = await browserRequest<AiTriggerButtonRecord>(page, {
    method: 'POST',
    url: '/api/ai-paths/trigger-buttons',
    json: {
      name: args.name,
      pathId: args.pathId,
      enabled: true,
      locations: [args.location],
      mode: 'click',
      display: 'icon_label',
    },
  });
  return expectApiSuccess(response, '/api/ai-paths/trigger-buttons');
};

const deleteTriggerButton = async (page: Page, triggerButtonId: string): Promise<void> => {
  const response = await browserRequest<{ success?: boolean }>(page, {
    method: 'DELETE',
    url: `/api/ai-paths/trigger-buttons/${encodeURIComponent(triggerButtonId)}`,
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Request to delete trigger button ${triggerButtonId} failed with status ${response.status}: ${response.text || 'no body'}`
    );
  }
};

const createProduct = async (
  page: Page,
  args: { sku: string; nameEn: string; descriptionEn: string }
): Promise<ProductApiRecord> => {
  const response = await browserRequest<ProductApiRecord>(page, {
    method: 'POST',
    url: '/api/v2/products',
    form: {
      sku: args.sku,
      name_en: args.nameEn,
      name_pl: args.nameEn,
      description_en: args.descriptionEn,
      description_pl: args.descriptionEn,
    },
  });
  return expectApiSuccess(response, '/api/v2/products');
};

const deleteProduct = async (page: Page, productId: string): Promise<void> => {
  const response = await browserRequest<unknown>(page, {
    method: 'DELETE',
    url: `/api/v2/products/${encodeURIComponent(productId)}`,
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Request to delete product ${productId} failed with status ${response.status}: ${response.text || 'no body'}`
    );
  }
};

const createDeterministicProductUpdatePathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  updateField: 'description_pl' | 'description_de';
  expectedValue: string;
  timestamp: string;
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const constantNodeId = `node-constant-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;

  const nodes: AiNode[] = [
    {
      id: triggerNodeId,
      instanceId: triggerNodeId,
      type: 'trigger',
      title: 'Trigger',
      description: 'Playwright workflow trigger',
      position: { x: 80, y: 160 },
      data: {},
      inputs: [],
      outputs: ['trigger'],
      config: {
        trigger: {
          event: args.triggerEventId,
          contextMode: 'trigger_only',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    } as AiNode,
    {
      id: constantNodeId,
      instanceId: constantNodeId,
      type: 'constant',
      title: 'Expected Update',
      description: 'Deterministic product mutation payload',
      position: { x: 360, y: 48 },
      data: {},
      inputs: [],
      outputs: ['value'],
      config: {
        constant: {
          value: args.expectedValue,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    } as AiNode,
    {
      id: databaseNodeId,
      instanceId: databaseNodeId,
      type: 'database',
      title: 'Update Product',
      description: 'Writes the deterministic localized field update back to the product',
      position: { x: 360, y: 220 },
      data: {},
      inputs: ['trigger', 'value'],
      outputs: ['result', 'bundle', 'query', 'queryMode', 'querySource'],
      config: {
        database: {
          operation: 'update',
          entityType: 'product',
          mode: 'replace',
          updatePayloadMode: 'custom',
          useMongoActions: true,
          actionCategory: 'update',
          action: 'updateOne',
          query: {
            provider: 'auto',
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            field: 'id',
            idType: 'string',
            queryTemplate: '{"id":"{{entityId}}"}',
            limit: 1,
            sort: '',
            projection: '',
            single: true,
          },
          updateTemplate: JSON.stringify(
            {
              $set: {
                [args.updateField]: '{{value}}',
              },
            },
            null,
            2
          ),
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    } as AiNode,
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: 'Playwright deterministic product workflow success path',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-database-${randomSuffix()}`,
        from: triggerNodeId,
        to: databaseNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-constant-database-${randomSuffix()}`,
        from: constantNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
    ],
    updatedAt: args.timestamp,
    runtimeState: { inputs: {}, outputs: {} },
    parserSamples: {},
    updaterSamples: {},
    lastRunAt: null,
    runCount: 0,
    uiState: {
      selectedNodeId: triggerNodeId,
      configOpen: false,
    },
  };
};

const extractRunId = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') return null;

  const record = payload as Record<string, unknown>;
  if (typeof record.runId === 'string' && record.runId.trim()) {
    return record.runId.trim();
  }

  const run = record.run;
  if (run && typeof run === 'object') {
    const runRecord = run as Record<string, unknown>;
    if (typeof runRecord.id === 'string' && runRecord.id.trim()) {
      return runRecord.id.trim();
    }
    if (typeof runRecord.runId === 'string' && runRecord.runId.trim()) {
      return runRecord.runId.trim();
    }
    if (typeof runRecord._id === 'string' && runRecord._id.trim()) {
      return runRecord._id.trim();
    }
  }

  return null;
};

export async function openAdminProductsPage(page: Page): Promise<void> {
  await ensureAdminSession(page, '/admin/products');
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

export async function openAdminQueuePage(page: Page): Promise<void> {
  await ensureAdminSession(page, '/admin/ai-paths/queue?tab=paths-all');
  await expect(page.getByRole('heading', { name: 'Job Queue', exact: true })).toBeVisible({
    timeout: 30_000,
  });
}

export async function searchForProductRow(
  page: Page,
  searchTerm: string,
  options?: { rowText?: string }
) {
  const searchInput = page.locator(`input[placeholder="${PRODUCTS_SEARCH_PLACEHOLDER}"]:visible`).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill(searchTerm);
  await page.keyboard.press('Enter');

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
    const timestamp = new Date().toISOString();
    const sku = `PW-AIP-${suffix}`.toUpperCase();
    const nameEn = `Playwright AI Paths ${suffix}`;
    const descriptionEn = `Playwright AI Paths source description ${suffix}`;
    const pathId = `path_pw_products_${suffix.replace(/[^a-z0-9_-]/gi, '_')}`;
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
      pathName: options.pathName,
      triggerEventId: placeholderTriggerEventId,
      updateField: options.updateField,
      expectedValue: options.expectedValue,
      timestamp,
    });

    const { indexExisted } = await upsertPathConfig(page, {
      pathId,
      pathName: options.pathName,
      config: initialConfig,
    });
    cleanupTasks.push(async () => {
      await removePathConfig(page, { pathId, indexExisted });
    });

    const triggerButton = await createTriggerButton(page, {
      name: options.triggerButtonName,
      pathId,
      location: options.location,
    });
    cleanupTasks.push(async () => {
      await deleteTriggerButton(page, triggerButton.id);
    });

    const finalConfig = createDeterministicProductUpdatePathConfig({
      pathId,
      pathName: options.pathName,
      triggerEventId: triggerButton.id,
      updateField: options.updateField,
      expectedValue: options.expectedValue,
      timestamp,
    });

    await upsertPathConfig(page, {
      pathId,
      pathName: options.pathName,
      config: finalConfig,
    });

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await openAdminProductsPage(page);

    return {
      product,
      searchTerm: nameEn,
      pathId,
      pathName: options.pathName,
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
): Promise<{ run: Record<string, unknown>; nodes: Array<Record<string, unknown>>; events: unknown[] }> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const url = `/api/ai-paths/runs/${encodeURIComponent(runId)}`;
    const response = await browserRequest<{
      run: Record<string, unknown>;
      nodes: Array<Record<string, unknown>>;
      events: unknown[];
    }>(page, { url });
    const detail = expectApiSuccess(response, url);
    const status = typeof detail.run?.status === 'string' ? detail.run.status : 'unknown';

    if (status === 'completed') {
      return detail;
    }

    if (status === 'failed' || status === 'canceled' || status === 'dead_lettered') {
      throw new Error(
        `Run ${runId} terminated with status ${status}: ${String(detail.run?.errorMessage ?? 'no error message')}`
      );
    }

    await page.waitForTimeout(1_000);
  }

  throw new Error(`Timed out waiting for run ${runId} to complete.`);
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
    const url = `/api/v2/products/${encodeURIComponent(args.productId)}?fresh=1`;
    const response = await browserRequest<ProductApiRecord>(page, { url });
    const product = expectApiSuccess(response, url);
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
  const searchInput = page.locator(`input[placeholder="${JOB_QUEUE_SEARCH_PLACEHOLDER}"]:visible`).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill(runId);
  await page.keyboard.press('Enter');
}
