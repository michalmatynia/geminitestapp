import { expect, type Page } from '@playwright/test';

import { aiNodeSchema, type AiNode, type PathConfig } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonLocation, AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import {
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
  PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX,
  PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';

import { ensureAdminSession } from './admin-auth';

const AI_PATHS_INDEX_KEY = 'ai_paths_index';
const AI_PATHS_CONFIG_KEY_PREFIX = 'ai_paths_config_';
const PRODUCTS_SEARCH_PLACEHOLDER = 'Search by product name...';
const JOB_QUEUE_SEARCH_PLACEHOLDER = 'Run ID, path name, entity, error...';
const DEFAULT_WAIT_TIMEOUT_MS = 120_000;
const FIXTURE_STALE_MS = 60 * 60 * 1000;
const playwrightFixtureJanitorRun = new WeakSet<Page>();

const parseAiNode = (node: unknown): AiNode => aiNodeSchema.parse(node);

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
  parameters?: Array<{
    parameterId: string;
    value?: string | null;
    valuesByLanguage?: Record<string, string>;
  }>;
};

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

type ProductParameterDefinitionRecord = {
  id: string;
  catalogId: string;
  name_en?: string | null;
  selectorType?: string | null;
  optionLabels?: string[];
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

type AiPathRunDetailRecord = {
  run: Record<string, unknown>;
  nodes: Array<Record<string, unknown>>;
  events: unknown[];
  errorSummary?: Record<string, unknown> | null;
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

const enablePlaywrightFixtureButtons = async (page: Page): Promise<void> => {
  await page.evaluate((cookieName: string) => {
    document.cookie = `${cookieName}=1; Path=/; SameSite=Lax`;
  }, PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME);
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
  const headers: Record<string, string> = {};
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await page.request.fetch(args.url, {
    method: args.method ?? 'GET',
    headers,
    form: args.form
      ? Object.fromEntries(
          Object.entries(args.form).filter(([, value]) => value !== undefined && value !== null)
        )
      : undefined,
    data: args.form ? undefined : args.json,
    failOnStatusCode: false,
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
    ok: response.ok(),
    status: response.status(),
    data: data as T | null,
    text,
  };
};

const expectApiSuccess = <T>(response: BrowserRequestResult<T>, url: string): T => {
  if (!response.ok || response.data === null) {
    throw new Error(
      `Request to ${url} failed with status ${response.status}: ${response.text || 'no body'}`
    );
  }
  return response.data;
};

const readRecordString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

const readPrimaryErrorSummaryMessage = (value: unknown): string | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const primary = (value as Record<string, unknown>)['primary'];
  if (!primary || typeof primary !== 'object' || Array.isArray(primary)) return null;
  return (
    readRecordString(primary as Record<string, unknown>, 'userMessage') ??
    readRecordString(primary as Record<string, unknown>, 'message')
  );
};

export const readRunFailureMessage = (detail: AiPathRunDetailRecord): string | null =>
  readPrimaryErrorSummaryMessage(detail.errorSummary) ?? readRecordString(detail.run, 'errorMessage');

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

const createTriggerButtonWithPathRetry = async (
  page: Page,
  args: {
    pathId: string;
    pathName: string;
    config: PathConfig;
    button: {
      name: string;
      pathId: string;
      location: Extract<AiTriggerButtonLocation, 'product_row' | 'product_modal'>;
    };
  }
): Promise<AiTriggerButtonRecord> => {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      return await createTriggerButton(page, args.button);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const missingBoundPath =
        message.includes('missing_bound_path') || message.includes('does not exist');
      if (!missingBoundPath || attempt === 5) {
        throw error;
      }
      await upsertPathConfig(page, {
        pathId: args.pathId,
        pathName: args.pathName,
        config: args.config,
      });
      await page.waitForTimeout(100 * (attempt + 1));
    }
  }

  throw new Error(`Failed to create trigger button for AI Path "${args.pathId}".`);
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

const createParameterDefinition = async (
  page: Page,
  args: {
    catalogId: string;
    nameEn: string;
    selectorType?: string;
    optionLabels?: string[];
  }
): Promise<ProductParameterDefinitionRecord> => {
  const response = await browserRequest<ProductParameterDefinitionRecord>(page, {
    method: 'POST',
    url: '/api/v2/products/parameters',
    json: {
      name_en: args.nameEn,
      catalogId: args.catalogId,
      selectorType: args.selectorType ?? 'text',
      optionLabels: args.optionLabels ?? [],
    },
  });
  return expectApiSuccess(response, '/api/v2/products/parameters');
};

const deleteParameterDefinition = async (page: Page, parameterId: string): Promise<void> => {
  const response = await browserRequest<unknown>(page, {
    method: 'DELETE',
    url: `/api/v2/products/parameters/${encodeURIComponent(parameterId)}`,
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(
      `Request to delete parameter ${parameterId} failed with status ${response.status}: ${response.text || 'no body'}`
    );
  }
};

const createProduct = async (
  page: Page,
  args: {
    sku: string;
    nameEn: string;
    descriptionEn: string;
    parameters?: Array<{
      parameterId: string;
      value?: string | null;
      valuesByLanguage?: Record<string, string>;
    }>;
  }
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
      ...(args.parameters ? { parameters: JSON.stringify(args.parameters) } : {}),
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

export const fetchProductById = async (page: Page, productId: string): Promise<ProductApiRecord> => {
  const url = `/api/v2/products/${encodeURIComponent(productId)}?fresh=1`;
  const response = await browserRequest<ProductApiRecord>(page, { url });
  return expectApiSuccess(response, url);
};

const listTriggerButtons = async (page: Page): Promise<AiTriggerButtonRecord[]> => {
  const url = `/api/ai-paths/trigger-buttons?${PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM}=1`;
  const response = await browserRequest<AiTriggerButtonRecord[]>(page, { url });
  return expectApiSuccess(response, url);
};

const cleanupStaleProductWorkflowFixtures = async (page: Page): Promise<void> => {
  if (playwrightFixtureJanitorRun.has(page)) return;

  const { existed, entries } = await readAiPathsIndex(page);
  const staleFixturePathIds = new Set<string>(
    entries
      .filter((entry) => {
        if (!isPlaywrightAiPathsFixturePathId(entry.id)) return false;
        const timestamp = Date.parse(entry.updatedAt || entry.createdAt || '');
        return !Number.isFinite(timestamp) || timestamp < Date.now() - FIXTURE_STALE_MS;
      })
      .map((entry) => entry.id)
  );

  if (staleFixturePathIds.size === 0) {
    playwrightFixtureJanitorRun.add(page);
    return;
  }

  const triggerButtons = await listTriggerButtons(page);
  const staleFixtureButtons = triggerButtons.filter(
    (button) =>
      isPlaywrightAiPathsFixtureTriggerButton(button) &&
      typeof button.pathId === 'string' &&
      staleFixturePathIds.has(button.pathId)
  );

  for (const button of staleFixtureButtons) {
    await deleteTriggerButton(page, button.id);
  }

  const remainingEntries = entries.filter((entry) => !staleFixturePathIds.has(entry.id));

  if (staleFixturePathIds.size > 0) {
    if (remainingEntries.length > 0 || existed) {
      await upsertAiPathsSetting(page, AI_PATHS_INDEX_KEY, JSON.stringify(remainingEntries));
    } else {
      await deleteAiPathsSettings(page, [AI_PATHS_INDEX_KEY]);
    }

    await deleteAiPathsSettings(
      page,
      Array.from(staleFixturePathIds, (pathId) => `${AI_PATHS_CONFIG_KEY_PREFIX}${pathId}`)
    );
  }
  playwrightFixtureJanitorRun.add(page);
};

const createDeterministicProductUpdatePathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  updateField: 'description_pl' | 'description_de';
  expectedValue: string;
  timestamp: string;
  outcome?: 'success' | 'zero_affected_fail';
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const constantNodeId = `node-constant-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;
  const shouldForceZeroAffected = args.outcome === 'zero_affected_fail';

  const nodes: AiNode[] = [
    parseAiNode({
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
    }),
    parseAiNode({
      id: constantNodeId,
      instanceId: constantNodeId,
      type: 'constant',
      title: 'Expected Update',
      description: 'Deterministic product mutation payload',
      position: { x: 360, y: 48 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: args.expectedValue,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
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
            queryTemplate: shouldForceZeroAffected
              ? '{"id":"missing-{{entityId}}"}'
              : '{"id":"{{entityId}}"}',
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
    }),
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: shouldForceZeroAffected
      ? 'Playwright deterministic product workflow failure path'
      : 'Playwright deterministic product workflow success path',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-constant-${randomSuffix()}`,
        from: triggerNodeId,
        to: constantNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
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

const createDeterministicParameterTranslationPathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  expectedDescriptionPl: string;
  translatedParameters: Array<{
    parameterId: string;
    value: string;
  }>;
  timestamp: string;
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const descriptionNodeId = `node-description-${randomSuffix()}`;
  const descriptionRegexNodeId = `node-description-regex-${randomSuffix()}`;
  const parametersNodeId = `node-parameters-${randomSuffix()}`;
  const parametersRegexNodeId = `node-parameters-regex-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;

  const nodes: AiNode[] = [
    parseAiNode({
      id: triggerNodeId,
      instanceId: triggerNodeId,
      type: 'trigger',
      title: 'Trigger',
      description: 'Playwright translation workflow trigger',
      position: { x: 80, y: 220 },
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
    }),
    parseAiNode({
      id: descriptionNodeId,
      instanceId: descriptionNodeId,
      type: 'constant',
      title: 'Translated Description',
      description: 'Deterministic Polish description payload',
      position: { x: 360, y: 84 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            {
              description_pl: args.expectedDescriptionPl,
            },
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: descriptionRegexNodeId,
      instanceId: descriptionRegexNodeId,
      type: 'regex',
      title: 'Parse Description JSON',
      description: 'Parse deterministic Polish description payload',
      position: { x: 520, y: 84 },
      data: {},
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      config: {
        regex: {
          pattern: '\\{[\\s\\S]*\\}',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          sampleText: '',
          aiPrompt: '',
          aiAutoRun: false,
          activeVariant: 'manual',
          jsonIntegrityPolicy: 'repair',
        },
        runtime: {
          waitForInputs: true,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersNodeId,
      instanceId: parametersNodeId,
      type: 'constant',
      title: 'Translated Parameters',
      description: 'Deterministic translated parameter payload',
      position: { x: 360, y: 276 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            {
              parameters: args.translatedParameters,
            },
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersRegexNodeId,
      instanceId: parametersRegexNodeId,
      type: 'regex',
      title: 'Parse Parameters JSON',
      description: 'Parse deterministic translated parameters payload',
      position: { x: 520, y: 276 },
      data: {},
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      config: {
        regex: {
          pattern: '\\{[\\s\\S]*\\}',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          sampleText: '',
          aiPrompt: '',
          aiAutoRun: false,
          activeVariant: 'manual',
          jsonIntegrityPolicy: 'repair',
        },
        runtime: {
          waitForInputs: true,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: databaseNodeId,
      instanceId: databaseNodeId,
      type: 'database',
      title: 'Persist Translation',
      description: 'Writes translated description and merged parameter languages back to the product',
      position: { x: 700, y: 220 },
      data: {},
      inputs: ['trigger', 'value', 'result'],
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
          updateTemplate:
            '{\n' +
            '  "$set": {\n' +
            '    "description_pl": "{{value.description_pl}}",\n' +
            '    "parameters": {{result.parameters}}\n' +
            '  },\n' +
            '  "$unset": {\n' +
            '    "__noop__": ""\n' +
            '  }\n' +
            '}',
          mappings: [
            {
              sourcePort: 'value',
              sourcePath: 'description_pl',
              targetPath: 'description_pl',
            },
            {
              sourcePort: 'result',
              sourcePath: 'parameters',
              targetPath: 'parameters',
            },
          ],
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: 'Playwright deterministic translation parameter merge workflow',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-description-${randomSuffix()}`,
        from: triggerNodeId,
        to: descriptionNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-description-regex-${randomSuffix()}`,
        from: descriptionNodeId,
        to: descriptionRegexNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-trigger-parameters-${randomSuffix()}`,
        from: triggerNodeId,
        to: parametersNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-parameters-regex-${randomSuffix()}`,
        from: parametersNodeId,
        to: parametersRegexNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-trigger-database-${randomSuffix()}`,
        from: triggerNodeId,
        to: databaseNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-description-database-${randomSuffix()}`,
        from: descriptionRegexNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-parameters-database-${randomSuffix()}`,
        from: parametersRegexNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'result',
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

const createDeterministicParameterInferencePathConfig = (args: {
  pathId: string;
  pathName: string;
  triggerEventId: string;
  parameterDefinitions: ProductParameterDefinitionRecord[];
  inferredParameters: Array<{
    parameterId: string;
    value: string;
  }>;
  timestamp: string;
}): PathConfig => {
  const baseConfig = createDefaultPathConfig(args.pathId);
  const triggerNodeId = `node-trigger-${randomSuffix()}`;
  const definitionsNodeId = `node-definitions-${randomSuffix()}`;
  const parametersNodeId = `node-parameters-${randomSuffix()}`;
  const parametersRegexNodeId = `node-parameters-regex-${randomSuffix()}`;
  const databaseNodeId = `node-database-${randomSuffix()}`;

  const nodes: AiNode[] = [
    parseAiNode({
      id: triggerNodeId,
      instanceId: triggerNodeId,
      type: 'trigger',
      title: 'Trigger',
      description: 'Playwright parameter inference trigger',
      position: { x: 80, y: 220 },
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
    }),
    parseAiNode({
      id: definitionsNodeId,
      instanceId: definitionsNodeId,
      type: 'constant',
      title: 'Parameter Definitions',
      description: 'Deterministic parameter definition payload',
      position: { x: 360, y: 276 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            args.parameterDefinitions.map((definition) => ({
              id: definition.id,
              catalogId: definition.catalogId,
              name_en: definition.name_en ?? null,
              selectorType: definition.selectorType ?? 'text',
              optionLabels: definition.optionLabels ?? [],
            })),
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersNodeId,
      instanceId: parametersNodeId,
      type: 'constant',
      title: 'Inferred Parameters',
      description: 'Deterministic inferred parameter payload',
      position: { x: 360, y: 84 },
      data: {},
      inputs: ['trigger'],
      outputs: ['value'],
      config: {
        constant: {
          value: JSON.stringify(
            {
              parameters: args.inferredParameters,
            },
            null,
            2
          ),
          valueType: 'json',
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: parametersRegexNodeId,
      instanceId: parametersRegexNodeId,
      type: 'regex',
      title: 'Parse Inference JSON',
      description: 'Parse deterministic inferred parameters payload',
      position: { x: 540, y: 84 },
      data: {},
      inputs: ['value', 'prompt', 'regexCallback'],
      outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
      config: {
        regex: {
          pattern: '\\{[\\s\\S]*\\}',
          flags: '',
          mode: 'extract_json',
          matchMode: 'first_overall',
          groupBy: 'match',
          outputMode: 'object',
          includeUnmatched: false,
          unmatchedKey: '__unmatched__',
          splitLines: false,
          sampleText: '',
          aiPrompt: '',
          aiAutoRun: false,
          activeVariant: 'manual',
          jsonIntegrityPolicy: 'repair',
        },
        runtime: {
          waitForInputs: true,
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
    parseAiNode({
      id: databaseNodeId,
      instanceId: databaseNodeId,
      type: 'database',
      title: 'Persist Inferred Parameters',
      description: 'Writes merged inferred parameters back to the product',
      position: { x: 760, y: 220 },
      data: {},
      inputs: ['trigger', 'value', 'result'],
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
          updateTemplate:
            '{\n' +
            '  "$set": {\n' +
            '    "parameters": {{value.parameters}}\n' +
            '  }\n' +
            '}',
          parameterInferenceGuard: {
            enabled: true,
            targetPath: 'parameters',
            definitionsPort: 'result',
          },
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
      },
      createdAt: args.timestamp,
      updatedAt: null,
    }),
  ];

  return {
    ...baseConfig,
    name: args.pathName,
    description: 'Playwright deterministic parameter inference workflow',
    strictFlowMode: true,
    aiPathsValidation: { enabled: false },
    nodes,
    edges: [
      {
        id: `edge-trigger-definitions-${randomSuffix()}`,
        from: triggerNodeId,
        to: definitionsNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-trigger-parameters-${randomSuffix()}`,
        from: triggerNodeId,
        to: parametersNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-parameters-regex-${randomSuffix()}`,
        from: parametersNodeId,
        to: parametersRegexNodeId,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: `edge-trigger-database-${randomSuffix()}`,
        from: triggerNodeId,
        to: databaseNodeId,
        fromPort: 'trigger',
        toPort: 'trigger',
      },
      {
        id: `edge-definitions-database-${randomSuffix()}`,
        from: definitionsNodeId,
        to: databaseNodeId,
        fromPort: 'value',
        toPort: 'result',
      },
      {
        id: `edge-regex-database-${randomSuffix()}`,
        from: parametersRegexNodeId,
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
    const showFiltersButton = page.getByRole('button', { name: /show filters/i });
    if (await showFiltersButton.isVisible().catch(() => false)) {
      await showFiltersButton.click();
    }
    const skuInput = page.locator('input[placeholder="Search by SKU..."]:visible').first();
    await expect(skuInput).toBeVisible({ timeout: 15_000 });
    await skuInput.fill(searchTerm);
    await page.keyboard.press('Enter');
  } else {
    const searchInput = page.locator(`input[placeholder="${PRODUCTS_SEARCH_PLACEHOLDER}"]:visible`).first();
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
  const searchInput = page.locator(`input[placeholder="${JOB_QUEUE_SEARCH_PLACEHOLDER}"]:visible`).first();
  await expect(searchInput).toBeVisible({ timeout: 15_000 });
  await searchInput.fill(runId);
  await page.keyboard.press('Enter');
}
