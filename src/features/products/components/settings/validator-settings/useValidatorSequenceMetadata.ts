import { useMemo } from 'react';

import type { SequenceGroupView } from '@/shared/contracts/products/drafts';

type ValidatorSequenceMetadata = {
  sequenceScopedPatternIds: Set<string>;
  firstPatternIdByGroup: Map<string, string>;
};

const buildSequenceScopedPatternIds = (
  sequenceGroups: Map<string, SequenceGroupView>
): Set<string> => {
  const ids = new Set<string>();
  sequenceGroups.forEach((group) => {
    group.patternIds.forEach((patternId) => ids.add(patternId));
  });
  return ids;
};

const buildFirstPatternIdByGroup = (
  sequenceGroups: Map<string, SequenceGroupView>
): Map<string, string> => {
  const map = new Map<string, string>();
  sequenceGroups.forEach((group, groupId) => {
    const firstPatternId = group.patternIds[0];
    if (firstPatternId !== undefined) map.set(groupId, firstPatternId);
  });
  return map;
};

export function useValidatorSequenceMetadata(
  sequenceGroups: Map<string, SequenceGroupView>
): ValidatorSequenceMetadata {
  return useMemo(
    () => ({
      sequenceScopedPatternIds: buildSequenceScopedPatternIds(sequenceGroups),
      firstPatternIdByGroup: buildFirstPatternIdByGroup(sequenceGroups),
    }),
    [sequenceGroups]
  );
}
