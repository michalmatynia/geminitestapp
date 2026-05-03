import { type QueryClient } from '@tanstack/react-query';

import type {
  CreateValidationPatternPayload,
  UpdateValidationPatternPayload,
} from '@/features/products/api/settings';
import { type ProductValidationPattern, type SequenceGroupDraft } from '@/shared/contracts/products/validation';
import { type SequenceGroupView } from '@/shared/contracts/products/drafts';

type ValidationPatternMutation<TPayload> = {
  mutateAsync: (payload: TPayload) => Promise<unknown>;
};

type CreatePatternMutation = ValidationPatternMutation<CreateValidationPatternPayload>;

type UpdatePatternMutation = ValidationPatternMutation<{
  id: string;
  data: UpdateValidationPatternPayload;
}>;

export type { CreatePatternMutation, UpdatePatternMutation };

type SequenceGroup = SequenceGroupView;

export type { SequenceGroup };

export type SequenceActionInput = {
  patterns: ProductValidationPattern[];
  orderedPatterns: ProductValidationPattern[];
  sequenceGroups: Map<string, SequenceGroup>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  setGroupDrafts: (
    updater: (prev: Record<string, SequenceGroupDraft>) => Record<string, SequenceGroupDraft>
  ) => void;
  createPattern: CreatePatternMutation;
  updatePattern: UpdatePatternMutation;
  queryClient: QueryClient;
  notifySuccess: (message: string) => void;
  notifyError: (message: string) => void;
  notifyInfo: (message: string) => void;
};

export type SequenceActionResult = {
  handleCreateSkuAutoIncrementSequence: () => Promise<void>;
  handleCreateLatestPriceStockSequence: () => Promise<void>;
  handleCreateNameLengthMirrorPattern: () => Promise<void>;
  handleCreateNameCategoryMirrorPattern: () => Promise<void>;
  handleCreateStarGaterProducerPattern: () => Promise<void>;
  handleCreateNameMirrorPolishSequence: () => Promise<void>;
  handleSaveSequenceGroup: (groupId: string) => Promise<void>;
  handleUngroup: (groupId: string) => Promise<void>;
  handleMoveGroup: (groupId: string, targetIndex: number) => Promise<void>;
  handleReorderInGroup: (patternId: string, targetIndex: number) => Promise<void>;
  handleMoveToGroup: (patternId: string, groupId: string) => Promise<void>;
  handleRemoveFromGroup: (patternId: string) => Promise<void>;
  handleCreateGroup: (patternIds: string[]) => Promise<void>;
  handleRenameGroup: (groupId: string, label: string) => Promise<void>;
  handleUpdateGroupDebounce: (groupId: string, debounceMs: number) => Promise<void>;
};
