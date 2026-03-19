'use client';

import React from 'react';

import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type {
  ProductValidationPattern,
  SequenceGroupDraft,
  SequenceGroupView,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

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

export const ValidatorPatternTreeContext =
  React.createContext<ValidatorPatternTreeContextValue | null>(null);

export function useValidatorPatternTreeContext(): ValidatorPatternTreeContextValue {
  const ctx = React.useContext(ValidatorPatternTreeContext);
  if (!ctx) {
    throw internalError(
      'useValidatorPatternTreeContext must be used within ValidatorPatternTreeContext.Provider'
    );
  }
  return ctx;
}
