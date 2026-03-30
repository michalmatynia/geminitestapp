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
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
  readRecordString,
} from './ai-paths-product-workflow-fixtures.shared';

const expectApiSuccess = <T>(response: BrowserRequestResult<T>, url: string): T => {
  if (!response.ok || response.data === null) {
    throw new Error(
      `Request to ${url} failed with status ${response.status}: ${response.text || 'no body'}`
    );
  }
  return response.data;
};

export {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  FIXTURE_STALE_MS,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
  expectApiSuccess,
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
  readRecordString,
  type AiPathsIndexEntry,
  type AiPathsSettingRecord,
  type BrowserRequestResult,
  type ProductApiRecord,
  type ProductParameterDefinitionRecord,
};
