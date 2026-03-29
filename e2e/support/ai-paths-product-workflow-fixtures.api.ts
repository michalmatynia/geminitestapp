import type { Page } from '@playwright/test';

import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { AiTriggerButtonLocation, AiTriggerButtonRecord } from '@/shared/contracts/ai-trigger-buttons';

import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  FIXTURE_STALE_MS,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
  type AiPathsIndexEntry,
  type AiPathsSettingRecord,
  type BrowserRequestResult,
  type ProductApiRecord,
  type ProductParameterDefinitionRecord,
  expectApiSuccess,
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
} from './ai-paths-product-workflow-fixtures.api-shared';

const playwrightFixtureJanitorRun = new WeakSet<Page>();

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

export const enablePlaywrightFixtureButtons = async (page: Page): Promise<void> => {
  await page.evaluate((cookieName: string) => {
    document.cookie = `${cookieName}=1; Path=/; SameSite=Lax`;
  }, PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME);
};

export const browserRequest = async <T>(
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
  const formData = args.form
    ? Object.fromEntries(
        Object.entries(args.form).filter(
          (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== null
        )
      )
    : undefined;
  if (csrfToken) {
    headers['x-csrf-token'] = csrfToken;
  }

  const response = await page.request.fetch(args.url, {
    method: args.method ?? 'GET',
    headers,
    form: formData,
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

export const upsertPathConfig = async (
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

export const removePathConfig = async (
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

export const createTriggerButtonWithPathRetry = async (
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

export const deleteTriggerButton = async (page: Page, triggerButtonId: string): Promise<void> => {
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

export const createParameterDefinition = async (
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

export const deleteParameterDefinition = async (page: Page, parameterId: string): Promise<void> => {
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

export const createProduct = async (
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

export const deleteProduct = async (page: Page, productId: string): Promise<void> => {
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

export const cleanupStaleProductWorkflowFixtures = async (page: Page): Promise<void> => {
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
