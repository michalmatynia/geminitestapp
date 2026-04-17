import {
  normalizePlaywrightAction,
  type PlaywrightAction,
  type PlaywrightActionBlock,
} from '@/shared/contracts/playwright-steps';
import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import { getPlaywrightRuntimeActionSeed } from './playwright-runtime-action-seeds';

type RuntimeActionRepairMode = 'reset_to_seed' | 'clone_to_draft_and_restore';

type RuntimeActionRepairInput = {
  actions: PlaywrightAction[];
  createId: () => string;
  mode: RuntimeActionRepairMode;
  nowIso: string;
  targetActionId: string;
};

type RuntimeActionRepairSuccess = {
  actions: PlaywrightAction[];
  clonedDraftAction: PlaywrightAction | null;
  replacedActionIds: string[];
  runtimeKey: ActionSequenceKey;
};

type RuntimeActionRepairResult = { ok: true; result: RuntimeActionRepairSuccess } | { ok: false; error: string };

type BulkRuntimeActionRepairInput = {
  actions: PlaywrightAction[];
  createId: () => string;
  mode: RuntimeActionRepairMode;
  nowIso: string;
  targetActionIds: string[];
};

type BulkRuntimeActionRepairSuccess = {
  actions: PlaywrightAction[];
  clonedDraftActions: Array<{ action: PlaywrightAction; sourceActionId: string }>;
  repairedRuntimeKeys: ActionSequenceKey[];
  replacedActionIds: string[];
};

type BulkRuntimeActionRepairResult =
  | { ok: true; result: BulkRuntimeActionRepairSuccess }
  | { ok: false; error: string };
export type PlaywrightRuntimeActionRepairPreview = {
  nonRepairableQuarantinedActionIds: string[];
  repairableActionIds: string[];
  repairedRuntimeKeys: ActionSequenceKey[];
  replacedActionIds: string[];
};

const toActionSequenceKey = (runtimeKey: string | null): ActionSequenceKey | null => {
  if (runtimeKey === null || !(runtimeKey in ACTION_SEQUENCES)) {
    return null;
  }

  return runtimeKey as ActionSequenceKey;
};

const cloneBlocksWithNewIds = (
  blocks: PlaywrightActionBlock[],
  createId: () => string
): PlaywrightActionBlock[] =>
  blocks.map((block) => ({
    ...block,
    id: createId(),
  }));

const buildDraftClone = (
  action: PlaywrightAction,
  createId: () => string,
  nowIso: string
): PlaywrightAction =>
  normalizePlaywrightAction({
    ...action,
    id: createId(),
    name: `${action.name} (draft)`,
    runtimeKey: null,
    blocks: cloneBlocksWithNewIds(action.blocks, createId),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

const getRuntimeKeyForAction = (action: PlaywrightAction): ActionSequenceKey | null =>
  toActionSequenceKey(action.runtimeKey);

const collectTargetRuntimeKeys = (
  actions: PlaywrightAction[],
  targetActionIds: string[]
): ActionSequenceKey[] => {
  const targetIdSet = new Set(targetActionIds);
  const runtimeKeys = new Set<ActionSequenceKey>();

  for (const action of actions) {
    if (!targetIdSet.has(action.id)) {
      continue;
    }

    const runtimeKey = getRuntimeKeyForAction(action);
    if (runtimeKey !== null) {
      runtimeKeys.add(runtimeKey);
    }
  }

  return [...runtimeKeys];
};

const buildActionsByRuntimeKey = (
  actions: PlaywrightAction[],
  runtimeKeysToRepair: Set<ActionSequenceKey>
): Map<ActionSequenceKey, PlaywrightAction[]> => {
  const actionsByRuntimeKey = new Map<ActionSequenceKey, PlaywrightAction[]>();

  for (const action of actions) {
    const runtimeKey = getRuntimeKeyForAction(action);
    if (runtimeKey === null || !runtimeKeysToRepair.has(runtimeKey)) {
      continue;
    }

    const bucket = actionsByRuntimeKey.get(runtimeKey) ?? [];
    bucket.push(action);
    actionsByRuntimeKey.set(runtimeKey, bucket);
  }

  return actionsByRuntimeKey;
};

const buildDraftClones = (
  actions: PlaywrightAction[],
  createId: () => string,
  nowIso: string
): Array<{ action: PlaywrightAction; sourceActionId: string }> =>
  actions.map((action) => ({
    action: buildDraftClone(normalizePlaywrightAction(action), createId, nowIso),
    sourceActionId: action.id,
  }));

export function analyzePlaywrightRuntimeActionRepairPreview(input: {
  actions: PlaywrightAction[];
  runtimeActionLoadErrorsById: Record<string, string>;
}): PlaywrightRuntimeActionRepairPreview {
  const { actions, runtimeActionLoadErrorsById } = input;
  const quarantinedActionIdSet = new Set(Object.keys(runtimeActionLoadErrorsById));
  const repairableActionIds = actions
    .filter(
      (action) =>
        quarantinedActionIdSet.has(action.id) && getRuntimeKeyForAction(action) !== null
    )
    .map((action) => action.id);
  const repairedRuntimeKeys = collectTargetRuntimeKeys(actions, repairableActionIds);
  const runtimeKeysToRepair = new Set(repairedRuntimeKeys);
  const replacedActionIds = actions
    .filter((action) => {
      const runtimeKey = getRuntimeKeyForAction(action);
      return runtimeKey !== null && runtimeKeysToRepair.has(runtimeKey);
    })
    .map((action) => action.id);

  return {
    nonRepairableQuarantinedActionIds: [...quarantinedActionIdSet].filter(
      (actionId) => !repairableActionIds.includes(actionId)
    ),
    repairableActionIds,
    repairedRuntimeKeys,
    replacedActionIds,
  };
}

export function selectPlaywrightRuntimeActionRepairPreview(input: {
  actions: PlaywrightAction[];
  preview: PlaywrightRuntimeActionRepairPreview;
  runtimeKeys: ActionSequenceKey[];
}): PlaywrightRuntimeActionRepairPreview {
  const { actions, preview, runtimeKeys } = input;
  const runtimeKeySet = new Set(runtimeKeys);
  const actionRuntimeKeyById = new Map(
    actions.map((action) => [action.id, getRuntimeKeyForAction(action)])
  );

  return {
    nonRepairableQuarantinedActionIds: [...preview.nonRepairableQuarantinedActionIds],
    repairableActionIds: preview.repairableActionIds.filter((actionId) => {
      const runtimeKey = actionRuntimeKeyById.get(actionId) ?? null;
      return runtimeKey !== null && runtimeKeySet.has(runtimeKey);
    }),
    repairedRuntimeKeys: preview.repairedRuntimeKeys.filter((runtimeKey) =>
      runtimeKeySet.has(runtimeKey)
    ),
    replacedActionIds: preview.replacedActionIds.filter((actionId) => {
      const runtimeKey = actionRuntimeKeyById.get(actionId) ?? null;
      return runtimeKey !== null && runtimeKeySet.has(runtimeKey);
    }),
  };
}

const appendRepairedRuntimeGroup = (input: {
  actionsByRuntimeKey: Map<ActionSequenceKey, PlaywrightAction[]>;
  clonedDraftActions: Array<{ action: PlaywrightAction; sourceActionId: string }>;
  createId: () => string;
  mode: RuntimeActionRepairMode;
  nowIso: string;
  repairedActions: PlaywrightAction[];
  runtimeKey: ActionSequenceKey;
}): BulkRuntimeActionRepairResult | null => {
  const {
    actionsByRuntimeKey,
    clonedDraftActions,
    createId,
    mode,
    nowIso,
    repairedActions,
    runtimeKey,
  } = input;
  const seedAction = getPlaywrightRuntimeActionSeed(runtimeKey);
  if (seedAction === null) {
    return { ok: false, error: `Missing seeded runtime action for "${runtimeKey}".` };
  }

  repairedActions.push(seedAction);
  if (mode !== 'clone_to_draft_and_restore') {
    return null;
  }

  const runtimeActions = actionsByRuntimeKey.get(runtimeKey) ?? [];
  const runtimeDraftClones = buildDraftClones(runtimeActions, createId, nowIso);
  clonedDraftActions.push(...runtimeDraftClones);
  repairedActions.push(...runtimeDraftClones.map((entry) => entry.action));
  return null;
};

export function repairPlaywrightRuntimeActionsBulk(
  input: BulkRuntimeActionRepairInput
): BulkRuntimeActionRepairResult {
  const { actions, createId, mode, nowIso, targetActionIds } = input;
  const repairedRuntimeKeys = collectTargetRuntimeKeys(actions, targetActionIds);
  if (repairedRuntimeKeys.length === 0) {
    return { ok: false, error: 'No seeded runtime actions selected for repair.' };
  }

  const runtimeKeysToRepair = new Set(repairedRuntimeKeys);
  const actionsByRuntimeKey = buildActionsByRuntimeKey(actions, runtimeKeysToRepair);
  const replacedActionIds = actions
    .filter((action) => {
      const runtimeKey = getRuntimeKeyForAction(action);
      return runtimeKey !== null && runtimeKeysToRepair.has(runtimeKey);
    })
    .map((action) => action.id);

  const repairedActions: PlaywrightAction[] = [];
  const clonedDraftActions: Array<{ action: PlaywrightAction; sourceActionId: string }> = [];
  const handledRuntimeKeys = new Set<ActionSequenceKey>();

  for (const action of actions) {
    const runtimeKey = getRuntimeKeyForAction(action);
    if (runtimeKey === null || !runtimeKeysToRepair.has(runtimeKey)) {
      repairedActions.push(action);
      continue;
    }

    if (handledRuntimeKeys.has(runtimeKey)) {
      continue;
    }
    handledRuntimeKeys.add(runtimeKey);

    const appendResult = appendRepairedRuntimeGroup({
      actionsByRuntimeKey,
      clonedDraftActions,
      createId,
      mode,
      nowIso,
      repairedActions,
      runtimeKey,
    });
    if (appendResult !== null) {
      return appendResult;
    }
  }

  return {
    ok: true,
    result: {
      actions: repairedActions,
      clonedDraftActions,
      repairedRuntimeKeys,
      replacedActionIds,
    },
  };
}

export function repairPlaywrightRuntimeAction(
  input: RuntimeActionRepairInput
): RuntimeActionRepairResult {
  const { actions, createId, mode, nowIso, targetActionId } = input;
  const targetAction = actions.find((action) => action.id === targetActionId) ?? null;
  if (targetAction === null) {
    return { ok: false, error: 'Runtime action not found.' };
  }

  const runtimeKey = toActionSequenceKey(targetAction.runtimeKey);
  if (runtimeKey === null) {
    return { ok: false, error: 'Selected action is not a seeded runtime action.' };
  }

  const seedAction = getPlaywrightRuntimeActionSeed(runtimeKey);
  if (seedAction === null) {
    return { ok: false, error: `Missing seeded runtime action for "${runtimeKey}".` };
  }

  const replacedActionIds = actions
    .filter((action) => action.runtimeKey === runtimeKey)
    .map((action) => action.id);
  const insertIndex = Math.max(
    0,
    actions.findIndex((action) => action.runtimeKey === runtimeKey)
  );
  const preservedActions = actions.filter((action) => action.runtimeKey !== runtimeKey);
  const clonedDraftAction =
    mode === 'clone_to_draft_and_restore'
      ? buildDraftClone(normalizePlaywrightAction(targetAction), createId, nowIso)
      : null;

  const repairedActions = [...preservedActions];
  repairedActions.splice(
    insertIndex,
    0,
    seedAction,
    ...(clonedDraftAction === null ? [] : [clonedDraftAction])
  );

  return {
    ok: true,
    result: {
      actions: repairedActions,
      clonedDraftAction,
      replacedActionIds,
      runtimeKey,
    },
  };
}
