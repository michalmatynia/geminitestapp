import type { QueryClient } from '@tanstack/react-query';

import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationPattern,
  SequenceGroupDraft,
} from '@/shared/contracts/products/validation';

import { createSequenceActions } from './controller-sequence-actions';
import type { SequenceActionResult } from './sequence-actions/types';
import type {
  ValidatorSettingsMutations,
  ValidatorToast,
} from './useValidatorSettingsController.types';

type ValidatorSequenceActionsArgs = {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  sequenceGroups: Map<string, SequenceGroupView>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  setGroupDrafts: (
    updater: (prev: Record<string, SequenceGroupDraft>) => Record<string, SequenceGroupDraft>
  ) => void;
  queryClient: QueryClient;
  mutations: Pick<ValidatorSettingsMutations, 'createPattern' | 'updatePattern'>;
  toast: ValidatorToast;
};

export function useValidatorSequenceActions({
  patterns,
  orderedPatterns,
  sequenceGroups,
  getGroupDraft,
  setGroupDrafts,
  queryClient,
  mutations,
  toast,
}: ValidatorSequenceActionsArgs): SequenceActionResult {
  return createSequenceActions({
    patterns,
    orderedPatterns,
    sequenceGroups,
    getGroupDraft,
    setGroupDrafts,
    createPattern: mutations.createPattern,
    updatePattern: mutations.updatePattern,
    queryClient,
    notifySuccess: (msg) => {
      toast(msg, { variant: 'success' });
    },
    notifyError: (msg) => {
      toast(msg, { variant: 'error' });
    },
    notifyInfo: (msg) => {
      toast(msg, { variant: 'info' });
    },
  });
}
