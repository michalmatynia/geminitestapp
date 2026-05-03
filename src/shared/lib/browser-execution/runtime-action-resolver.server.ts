import 'server-only';

import {
  defaultPlaywrightActionExecutionSettings,
  hasPlaywrightActionBlockConfigOverrides,
  PLAYWRIGHT_ACTIONS_SETTINGS_KEY,
  normalizePlaywrightAction,
  playwrightActionSchema,
  type PlaywrightAction,
  type PlaywrightActionExecutionSettings,
} from '@/shared/contracts/playwright-steps';
import { getSettingValue } from '@/shared/lib/ai/server-settings';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import { analyzeLoadedPlaywrightActions } from './playwright-actions-settings-validation';
import {
  getPlaywrightRuntimeActionSeed,
  mergeSeededPlaywrightActions,
} from './playwright-runtime-action-seeds';
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

const toResolvedRuntimeBlocks = (
  action: PlaywrightAction
): Array<{ stepId: StepId; config?: BrowserExecutionStep['config'] }> => {
  const resolvedBlocks: Array<{ stepId: StepId; config?: BrowserExecutionStep['config'] }> = [];

  for (const block of action.blocks) {
    if (block.kind !== 'runtime_step' || block.enabled === false) {
      continue;
    }

    const stepId = toRuntimeStepId(block.refId);
    if (stepId === null) {
      continue;
    }

    resolvedBlocks.push(
      hasPlaywrightActionBlockConfigOverrides(block.config)
        ? { stepId, config: block.config }
        : { stepId }
    );
  }

  return resolvedBlocks;
};

export async function fetchResolvedPlaywrightRuntimeActions(): Promise<PlaywrightAction[]> {
  const raw = await getSettingValue(PLAYWRIGHT_ACTIONS_SETTINGS_KEY);
  return parseStoredRuntimeActions(raw);
}

export async function resolvePlaywrightActionDefinitionById(
  actionId: string
): Promise<PlaywrightAction | null> {
  const normalizedActionId = actionId.trim();
  if (normalizedActionId.length === 0) {
    return null;
  }

  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const { runtimeActionErrorsById } = analyzeLoadedPlaywrightActions(actions);
  const action = actions.find((entry) => entry.id === normalizedActionId) ?? null;

  if (action === null) {
    return null;
  }

  if (action.runtimeKey !== null && runtimeActionErrorsById[action.id] !== undefined) {
    return null;
  }

  return action;
}

export async function resolveRuntimeActionDefinition(
  key: ActionSequenceKey
): Promise<PlaywrightAction> {
  const actions = await fetchResolvedPlaywrightRuntimeActions();
  const { runtimeActionErrorsById } = analyzeLoadedPlaywrightActions(actions);
  const action = actions.find(
    (entry) => entry.runtimeKey === key && runtimeActionErrorsById[entry.id] === undefined
  ) ?? null;

  return action ?? getPlaywrightRuntimeActionSeed(key) ?? mergeSeededPlaywrightActions([]).find(
    (entry) => entry.runtimeKey === key
  ) ?? normalizePlaywrightAction({
    id: `runtime_action__${key}`,
    name: key,
    description: null,
    runtimeKey: key,
    blocks: [],
    stepSetIds: [],
    personaId: null,
    executionSettings: defaultPlaywrightActionExecutionSettings,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  });
}

export async function resolveRuntimeActionExecutionSettings(
  key: ActionSequenceKey
): Promise<PlaywrightActionExecutionSettings> {
  return (await resolveRuntimeActionDefinition(key)).executionSettings;
}

export async function resolveRuntimeActionStepIds(
  key: ActionSequenceKey
): Promise<StepId[]> {
  const action = await resolveRuntimeActionDefinition(key);
  const runtimeStepIds = toResolvedRuntimeBlocks(action).map((block) => block.stepId);

  return runtimeStepIds.length > 0 ? runtimeStepIds : [...ACTION_SEQUENCES[key]];
}

export async function buildResolvedActionSteps(
  key: ActionSequenceKey
): Promise<BrowserExecutionStep[]> {
  const action = await resolveRuntimeActionDefinition(key);
  const runtimeBlocks = toResolvedRuntimeBlocks(action);
  const resolvedSteps: Array<{ stepId: StepId; config?: BrowserExecutionStep['config'] }> =
    runtimeBlocks.length > 0
      ? runtimeBlocks
      : ACTION_SEQUENCES[key].map((stepId) => ({ stepId }));

  return resolvedSteps.map((resolvedStep) => {
    const baseStep: BrowserExecutionStep = {
      ...STEP_REGISTRY[resolvedStep.stepId],
      status: 'pending',
      message: null,
    };

    if (resolvedStep.config !== undefined) {
      baseStep.config = resolvedStep.config;
    }

    return baseStep;
  });
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
