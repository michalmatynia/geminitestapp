'use client';

import type React from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { ProductValidationPattern, SequenceGroupDraft } from '@/shared/contracts/products/validation';
import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface ValidatorPatternTreeContextValue {
  controller: MasterFolderTreeController;
  patternById: Map<string, ProductValidationPattern>;
  sequenceGroupById: Map<string, SequenceGroupView>;
  groupDrafts: Record<string, SequenceGroupDraft>;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  onEditPattern: (pattern: ProductValidationPattern) => void;
  onDuplicatePattern: (pattern: ProductValidationPattern) => void;
  onDeletePattern: (pattern: ProductValidationPattern) => void;
  onTogglePattern: (pattern: ProductValidationPattern) => Promise<void>;
  onOpenSemanticHistory: (patternId: string, auditKey: string) => void;
  onSaveSequenceGroup: (groupId: string) => Promise<void>;
  onUngroup: (groupId: string) => Promise<void>;
  isPending: boolean;
}

export const {
  Context: ValidatorPatternTreeContextInternal,
  useStrictContext: useValidatorPatternTreeContext,
} = createStrictContext<ValidatorPatternTreeContextValue>({
  hookName: 'useValidatorPatternTreeContext',
  providerName: 'ValidatorPatternTreeContext.Provider',
  displayName: 'ValidatorPatternTreeContext',
  errorFactory: internalError,
});

export const ValidatorPatternTreeContext =
  ValidatorPatternTreeContextInternal as React.Context<ValidatorPatternTreeContextValue | null>;
