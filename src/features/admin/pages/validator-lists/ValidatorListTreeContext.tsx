'use client';

import type React from 'react';

import type { FolderTreeViewportV2Props } from '@/shared/lib/foldertree/public';
import type { ValidatorPatternList } from '@/shared/contracts/admin';
import type { MasterFolderTreeController } from '@/shared/contracts/master-folder-tree';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

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

export const {
  Context: ValidatorListTreeContextInternal,
  useStrictContext: useValidatorListTreeContext,
} = createStrictContext<ValidatorListTreeContextValue>({
  hookName: 'useValidatorListTreeContext',
  providerName: 'ValidatorListTreeContext.Provider',
  displayName: 'ValidatorListTreeContext',
  errorFactory: internalError,
});

export const ValidatorListTreeContext =
  ValidatorListTreeContextInternal as React.Context<ValidatorListTreeContextValue | null>;
