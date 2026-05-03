import { useMemo } from 'react';

import type { PatternFormData, SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationPattern,
  ProductValidationSemanticState,
} from '@/shared/contracts/products/validation';
import { getProductValidationSemanticTransition } from '@/shared/lib/products/utils/validator-semantic-state';

import { buildValidatorPatternPayloadDraft } from './validator-settings-payload';

type ModalSemanticStateArgs = {
  formData: PatternFormData;
  sequenceGroups: Map<string, SequenceGroupView>;
  editingPattern: ProductValidationPattern | null;
  semanticStateSeed: ProductValidationSemanticState | null;
};

type ModalSemanticTransitionArgs = {
  previous: ProductValidationSemanticState | null;
  current: ProductValidationSemanticState | null;
};

export function useValidatorModalSemanticState({
  formData,
  sequenceGroups,
  editingPattern,
  semanticStateSeed,
}: ModalSemanticStateArgs): ProductValidationSemanticState | null {
  return useMemo(() => {
    const result = buildValidatorPatternPayloadDraft({
      formData,
      sequenceGroups,
      editingPattern,
      semanticState: semanticStateSeed,
    });
    return result.status === 'ready' ? (result.payload.semanticState ?? null) : semanticStateSeed;
  }, [editingPattern, formData, semanticStateSeed, sequenceGroups]);
}

export function useValidatorModalSemanticTransition({
  previous,
  current,
}: ModalSemanticTransitionArgs): ReturnType<typeof getProductValidationSemanticTransition> {
  return useMemo(
    () =>
      getProductValidationSemanticTransition({
        previous,
        current,
      }),
    [current, previous]
  );
}
