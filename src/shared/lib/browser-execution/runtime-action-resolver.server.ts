import 'server-only';

import {
  PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
  normalizePlaywrightAction,
  playwrightActionSchema,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';
import { getSettingValue } from '@/shared/lib/ai/server-settings';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import { mergeSeededPlaywrightActions } from './playwright-runtime-action-seeds';
import { STEP_REGISTRY, type BrowserExecutionStep, type StepId } from './step-registry';

const parseStoredRuntimeActions = (raw: string | null): PlaywrightAction[] => {
  if (raw === null || raw.trim().length === 0) {
    return mergeSeededPlaywrightActions([]);
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return mergeSeededPlaywrightActions([]);
    }

    const actions = parsed
      .map((entry): PlaywrightAction | null => {
        const result = playwrightActionSchema.safeParse(entry);
        return result.success ? normalizePlaywrightAction(result.data) : null;
      })
      .filter((entry): entry is PlaywrightAction => entry !== null);

    return mergeSeededPlaywrightActions(actions);
  } catch {
    return mergeSeededPlaywrightActions([]);
  }
};

const toRuntimeStepId = (value: string): StepId | null =>
  value in STEP_REGISTRY ? (value as StepId) : null;

export async function fetchResolvedPlaywrightRuntimeActions(): Promise<PlaywrightAction[]> {
  const raw = await getSettingValue(PLAYWRIGHT_ACTIONS_SETTINGS_KEY);
  return parseStoredRuntimeActions(raw);
}

export async function resolveRuntimeActionStepIds(
  key: ActionSequenceKey
): Promise<StepId[]> {
  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const action = actions.find((entry) => entry.runtimeKey === key) ?? null;
  if (action === null) {
    return [...ACTION_SEQUENCES[key]];
  }

  const runtimeStepIds = action.blocks
    .filter((block) => block.kind === 'runtime_step' && block.enabled !== false)
    .map((block) => toRuntimeStepId(block.refId))
    .filter((stepId): stepId is StepId => stepId !== null);

  return runtimeStepIds.length > 0 ? runtimeStepIds : [...ACTION_SEQUENCES[key]];
}

export async function buildResolvedActionSteps(
  key: ActionSequenceKey
): Promise<BrowserExecutionStep[]> {
  const stepIds = await resolveRuntimeActionStepIds(key);
  return stepIds.map((id) => ({
    ...STEP_REGISTRY[id],
    status: 'pending',
    message: null,
  }));
}

export async function getResolvedActionStepManifest(
  key: ActionSequenceKey
): Promise<Array<{ id: string; label: string }>> {
  const stepIds = await resolveRuntimeActionStepIds(key);
  return stepIds.map((id) => ({
    id: STEP_REGISTRY[id].id,
    label: STEP_REGISTRY[id].label,
  }));
}
