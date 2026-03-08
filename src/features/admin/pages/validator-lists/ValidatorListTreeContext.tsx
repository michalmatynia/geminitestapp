'use client';

import React from 'react';

import type { FolderTreeViewportV2Props } from '@/features/foldertree';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import { internalError } from '@/shared/errors/app-error';

export interface ValidatorListTreeContextValue {
  controller: MasterFolderTreeController;
  scrollToNodeRef: FolderTreeViewportV2Props['scrollToNodeRef'];
  rootDropUi: FolderTreeViewportV2Props['rootDropUi'];
  renderNode: FolderTreeViewportV2Props['renderNode'];
  listById: Map<string, ValidatorPatternList>;
  onEdit: (list: ValidatorPatternList) => void;
  onToggleLock: (listId: string) => void;
  onRemove: (list: ValidatorPatternList) => void;
  isPending: boolean;
}

export const ValidatorListTreeContext = React.createContext<ValidatorListTreeContextValue | null>(
  null
);

export function useValidatorListTreeContext(): ValidatorListTreeContextValue {
  const ctx = React.useContext(ValidatorListTreeContext);
  if (!ctx) {
    throw internalError(
      'useValidatorListTreeContext must be used within ValidatorListTreeContext.Provider'
    );
  }
  return ctx;
}
