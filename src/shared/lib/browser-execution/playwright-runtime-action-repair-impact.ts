import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

import { ACTION_SEQUENCES, type ActionSequenceKey } from './action-sequences';
import type { PlaywrightRuntimeActionRepairPreview } from './playwright-runtime-action-repair';

export type PlaywrightRuntimeActionRepairImpactEntry = {
  actionId: string;
  actionName: string;
  draftName: string;
  runtimeKey: ActionSequenceKey;
};

export type PlaywrightRuntimeActionRepairImpactGroup = {
  actions: PlaywrightRuntimeActionRepairImpactEntry[];
  runtimeKey: ActionSequenceKey;
};

export type PlaywrightRuntimeActionRepairImpact = {
  groups: PlaywrightRuntimeActionRepairImpactGroup[];
};

const toActionSequenceKey = (runtimeKey: string | null): ActionSequenceKey | null => {
  if (runtimeKey === null || !(runtimeKey in ACTION_SEQUENCES)) {
    return null;
  }

  return runtimeKey as ActionSequenceKey;
};

export function buildPlaywrightRuntimeActionRepairImpact(input: {
  actions: PlaywrightAction[];
  preview: PlaywrightRuntimeActionRepairPreview;
}): PlaywrightRuntimeActionRepairImpact {
  const { actions, preview } = input;
  const replacedActionIdSet = new Set(preview.replacedActionIds);
  const groupedEntries = new Map<ActionSequenceKey, PlaywrightRuntimeActionRepairImpactEntry[]>();

  for (const action of actions) {
    if (!replacedActionIdSet.has(action.id)) {
      continue;
    }

    const runtimeKey = toActionSequenceKey(action.runtimeKey);
    if (runtimeKey === null) {
      continue;
    }

    const bucket = groupedEntries.get(runtimeKey) ?? [];
    bucket.push({
      actionId: action.id,
      actionName: action.name,
      draftName: `${action.name} (draft)`,
      runtimeKey,
    });
    groupedEntries.set(runtimeKey, bucket);
  }

  return {
    groups: preview.repairedRuntimeKeys
      .map((runtimeKey) => ({
        runtimeKey,
        actions: groupedEntries.get(runtimeKey) ?? [],
      }))
      .filter((group) => group.actions.length > 0),
  };
}
