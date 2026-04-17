import {
  normalizePlaywrightAction,
  playwrightActionSchema,
  type PlaywrightAction,
} from '@/shared/contracts/playwright-steps';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import { validateRuntimeActionEditorBlocks } from './runtime-action-editor-validation';

type ValidationResult =
  | { ok: true; actions: PlaywrightAction[]; value: string }
  | { ok: false; error: string };

export type LoadedPlaywrightActionAnalysis = {
  runtimeActionErrorsById: Record<string, string>;
};

const toActionSequenceKey = (runtimeKey: string | null): ActionSequenceKey | null => {
  if (runtimeKey === null || !(runtimeKey in ACTION_SEQUENCES)) {
    return null;
  }

  return runtimeKey as ActionSequenceKey;
};

const collectActionsByRuntimeKey = (
  actions: PlaywrightAction[]
): {
  actionsByRuntimeKey: Map<ActionSequenceKey, PlaywrightAction[]>;
  runtimeActionErrorsById: Record<string, string>;
} => {
  const runtimeActionErrorsById: Record<string, string> = {};
  const actionsByRuntimeKey = new Map<ActionSequenceKey, PlaywrightAction[]>();

  for (const action of actions) {
    if (action.runtimeKey === null) {
      continue;
    }

    const runtimeKey = toActionSequenceKey(action.runtimeKey);
    if (runtimeKey === null) {
      runtimeActionErrorsById[action.id] =
        `playwright_actions contains an unknown runtimeKey: ${action.runtimeKey}.`;
      continue;
    }

    const bucket = actionsByRuntimeKey.get(runtimeKey) ?? [];
    bucket.push(action);
    actionsByRuntimeKey.set(runtimeKey, bucket);
  }

  return { actionsByRuntimeKey, runtimeActionErrorsById };
};

const buildGroupedRuntimeActionErrors = (
  actionsByRuntimeKey: Map<ActionSequenceKey, PlaywrightAction[]>
): Record<string, string> => {
  const runtimeActionErrorsById: Record<string, string> = {};

  for (const [runtimeKey, groupedActions] of actionsByRuntimeKey.entries()) {
    if (groupedActions.length > 1) {
      for (const action of groupedActions) {
        runtimeActionErrorsById[action.id] =
          `playwright_actions cannot define runtimeKey "${runtimeKey}" more than once.`;
      }
      continue;
    }

    const action = groupedActions[0];
    if (action === undefined) {
      continue;
    }

    const runtimeErrors = validateRuntimeActionEditorBlocks({
      runtimeKey,
      blocks: action.blocks,
    });
    if (runtimeErrors.length > 0) {
      runtimeActionErrorsById[action.id] =
        runtimeErrors[0] ?? 'playwright_actions contains an invalid runtime action.';
    }
  }

  return runtimeActionErrorsById;
};

export function analyzeLoadedPlaywrightActions(
  actions: PlaywrightAction[]
): LoadedPlaywrightActionAnalysis {
  const { actionsByRuntimeKey, runtimeActionErrorsById } = collectActionsByRuntimeKey(actions);
  const groupedRuntimeActionErrorsById = buildGroupedRuntimeActionErrors(actionsByRuntimeKey);

  return {
    runtimeActionErrorsById: {
      ...runtimeActionErrorsById,
      ...groupedRuntimeActionErrorsById,
    },
  };
}

export function parseAndValidatePlaywrightActionsSettingValue(value: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return { ok: false, error: 'playwright_actions must be valid JSON.' };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: 'playwright_actions must be a JSON array.' };
  }

  const actions: PlaywrightAction[] = [];

  for (const [index, entry] of parsed.entries()) {
    const result = playwrightActionSchema.safeParse(entry);
    if (!result.success) {
      return {
        ok: false,
        error: `playwright_actions contains an invalid action at index ${index}.`,
      };
    }

    actions.push(normalizePlaywrightAction(result.data));
  }

  const analysis = analyzeLoadedPlaywrightActions(actions);
  for (const action of actions) {
    const runtimeValidationError = analysis.runtimeActionErrorsById[action.id];
    if (runtimeValidationError !== undefined) {
      return { ok: false, error: runtimeValidationError };
    }
  }

  return {
    ok: true,
    actions,
    value: JSON.stringify(actions),
  };
}
