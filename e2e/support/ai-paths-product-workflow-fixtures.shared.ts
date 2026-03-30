import { aiNodeSchema, type AiNode } from '@/shared/contracts/ai-paths';
import {
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
  PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX,
  PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';

export const AI_PATHS_INDEX_KEY = 'ai_paths_index';
export const AI_PATHS_CONFIG_KEY_PREFIX = 'ai_paths_config_';
export const PRODUCTS_SEARCH_PLACEHOLDER = 'Search by product name...';
export const JOB_QUEUE_SEARCH_PLACEHOLDER = 'Run ID, path name, entity, error...';
export const DEFAULT_WAIT_TIMEOUT_MS = 120_000;
export const FIXTURE_STALE_MS = 60 * 60 * 1000;

export {
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
  PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX,
  PLAYWRIGHT_AI_PATHS_PRODUCT_SKU_PREFIX,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
};

export type BrowserRequestResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  text: string;
};

export type AiPathsSettingRecord = {
  key: string;
  value: string;
};

export type AiPathsIndexEntry = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductApiRecord = {
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

export type ProductParameterDefinitionRecord = {
  id: string;
  catalogId: string;
  name_en?: string | null;
  selectorType?: string | null;
  optionLabels?: string[];
};

export type AiPathRunDetailRecord = {
  run: Record<string, unknown>;
  nodes: Array<Record<string, unknown>>;
  events: unknown[];
  errorSummary?: Record<string, unknown> | null;
};

export const parseAiNode = (node: unknown): AiNode => aiNodeSchema.parse(node);

export const randomSuffix = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const readRecordString = (record: Record<string, unknown>, key: string): string | null => {
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
