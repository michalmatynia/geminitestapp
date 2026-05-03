import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';

import type { ActionSequenceKey } from './action-sequences';
import type { PlaywrightRuntimeActionRepairPreview } from './playwright-runtime-action-repair';
import { toActionSequenceKey } from './runtime-action-keys';

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
