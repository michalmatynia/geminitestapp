import { fetchSettingsCached } from '@/shared/api/settings-client';
import { mergeSeededPlaywrightActions } from '@/shared/lib/browser-execution/playwright-runtime-action-seeds';
import {
  PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
  PLAYWRIGHT_FLOWS_SETTINGS_KEY,
  PLAYWRIGHT_STEPS_SETTINGS_KEY,
  PLAYWRIGHT_STEP_SETS_SETTINGS_KEY,
  PLAYWRIGHT_WEBSITES_SETTINGS_KEY,
  normalizePlaywrightAction,
  playwrightActionSchema,
  playwrightFlowSchema,
  playwrightStepSchema,
  playwrightStepSetSchema,
  playwrightWebsiteSchema,
  type PlaywrightAction,
  type PlaywrightFlow,
  type PlaywrightStep,
  type PlaywrightStepSet,
  type PlaywrightWebsite,
} from '@/shared/contracts/playwright-steps';
import { parseJsonSetting } from '@/shared/utils/settings-json';

// ---------------------------------------------------------------------------
// Normalizers — safely parse persisted data through Zod, drop invalid records
// ---------------------------------------------------------------------------

function normalizeSteps(raw: unknown): PlaywrightStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown): PlaywrightStep | null => {
      const result = playwrightStepSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is PlaywrightStep => item !== null);
}

function normalizeStepSets(raw: unknown): PlaywrightStepSet[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown): PlaywrightStepSet | null => {
      const result = playwrightStepSetSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is PlaywrightStepSet => item !== null);
}

function normalizeWebsites(raw: unknown): PlaywrightWebsite[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown): PlaywrightWebsite | null => {
      const result = playwrightWebsiteSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is PlaywrightWebsite => item !== null);
}

function normalizeFlows(raw: unknown): PlaywrightFlow[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item: unknown): PlaywrightFlow | null => {
      const result = playwrightFlowSchema.safeParse(item);
      return result.success ? result.data : null;
    })
    .filter((item): item is PlaywrightFlow => item !== null);
}

function normalizeActions(raw: unknown): PlaywrightAction[] {
  if (!Array.isArray(raw)) return mergeSeededPlaywrightActions([]);
  const normalized = raw
    .map((item: unknown): PlaywrightAction | null => {
      const result = playwrightActionSchema.safeParse(item);
      return result.success ? normalizePlaywrightAction(result.data) : null;
    })
    .filter((item): item is PlaywrightAction => item !== null);

  return mergeSeededPlaywrightActions(normalized);
}

// ---------------------------------------------------------------------------
// Fetch helpers (all read from the settings key-value store)
// ---------------------------------------------------------------------------

async function getSettingsMap(): Promise<Map<string, string>> {
  const data = await fetchSettingsCached();
  return new Map(data.map((item: { key: string; value: string }) => [item.key, item.value]));
}

export async function fetchPlaywrightSteps(): Promise<PlaywrightStep[]> {
  const map = await getSettingsMap();
  const stored = parseJsonSetting<unknown>(map.get(PLAYWRIGHT_STEPS_SETTINGS_KEY), []);
  return normalizeSteps(stored);
}

export async function fetchPlaywrightStepSets(): Promise<PlaywrightStepSet[]> {
  const map = await getSettingsMap();
  const stored = parseJsonSetting<unknown>(map.get(PLAYWRIGHT_STEP_SETS_SETTINGS_KEY), []);
  return normalizeStepSets(stored);
}

export async function fetchPlaywrightActions(): Promise<PlaywrightAction[]> {
  const map = await getSettingsMap();
  const stored = parseJsonSetting<unknown>(map.get(PLAYWRIGHT_ACTIONS_SETTINGS_KEY), []);
  return normalizeActions(stored);
}

export async function fetchPlaywrightWebsites(): Promise<PlaywrightWebsite[]> {
  const map = await getSettingsMap();
  const stored = parseJsonSetting<unknown>(map.get(PLAYWRIGHT_WEBSITES_SETTINGS_KEY), []);
  return normalizeWebsites(stored);
}

export async function fetchPlaywrightFlows(): Promise<PlaywrightFlow[]> {
  const map = await getSettingsMap();
  const stored = parseJsonSetting<unknown>(map.get(PLAYWRIGHT_FLOWS_SETTINGS_KEY), []);
  return normalizeFlows(stored);
}
