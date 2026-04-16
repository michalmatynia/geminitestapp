import type { BrowserExecutionStep } from './step-registry';
import { STEP_REGISTRY } from './step-registry';
import type { ActionSequenceKey } from './action-sequences';
import { ACTION_SEQUENCES } from './action-sequences';

/**
 * Builds a fresh array of BrowserExecutionStep objects for an action sequence.
 * All steps start with status 'pending' and no message.
 */
export const buildActionSteps = (key: ActionSequenceKey): BrowserExecutionStep[] =>
  ACTION_SEQUENCES[key].map((id) => ({
    ...STEP_REGISTRY[id],
    status: 'pending' as const,
    message: null,
  }));

/**
 * Returns the ordered step manifest (id + label only) for an action sequence.
 * Useful for pre-registering step IDs without allocating full step state.
 */
export const getActionStepManifest = (
  key: ActionSequenceKey,
): Array<{ id: string; label: string }> =>
  ACTION_SEQUENCES[key].map((id) => ({
    id: STEP_REGISTRY[id].id,
    label: STEP_REGISTRY[id].label,
  }));

/**
 * Returns the ordered step IDs for an action sequence.
 */
export const getActionStepIds = (key: ActionSequenceKey): string[] =>
  ACTION_SEQUENCES[key].map((id) => STEP_REGISTRY[id].id);
