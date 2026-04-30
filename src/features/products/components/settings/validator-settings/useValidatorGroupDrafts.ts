import { useCallback } from 'react';

import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import type { SequenceGroupDraft } from '@/shared/contracts/products/validation';

type ValidatorGroupDraftArgs = {
  groupDrafts: Record<string, SequenceGroupDraft>;
  sequenceGroups: Map<string, SequenceGroupView>;
};

export function useValidatorGroupDraftGetter({
  groupDrafts,
  sequenceGroups,
}: ValidatorGroupDraftArgs): (groupId: string) => SequenceGroupDraft {
  return useCallback(
    (groupId: string): SequenceGroupDraft => {
      const existing = groupDrafts[groupId];
      if (existing !== undefined) return existing;

      const group = sequenceGroups.get(groupId);
      return {
        label: group?.label ?? '',
        debounceMs: String(group?.debounceMs ?? 0),
      };
    },
    [groupDrafts, sequenceGroups]
  );
}
