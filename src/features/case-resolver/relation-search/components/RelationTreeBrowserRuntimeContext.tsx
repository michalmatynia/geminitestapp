import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import type { RelationTreeInstance, RelationTreeLookup } from '../types';

export type RelationTreeBrowserRuntimeValue = {
  instance: RelationTreeInstance;
  nodes: MasterTreeNode[];
  lookup: RelationTreeLookup;
  isLocked?: boolean | undefined;
  selectedFileIds?: Set<string> | undefined;
  onToggleFileSelection?: ((fileId: string) => void) | undefined;
  onLinkFile?: ((fileId: string) => void) | undefined;
  onAddFile?: ((fileId: string) => void) | undefined;
  onPreviewFile?: ((fileId: string) => void) | undefined;
  searchQuery?: string | undefined;
};

export const {
  Context: RelationTreeBrowserRuntimeContext,
  useStrictContext: useRelationTreeBrowserRuntime,
  useOptionalContext: useOptionalRelationTreeBrowserRuntime,
} = createStrictContext<RelationTreeBrowserRuntimeValue>({
  hookName: 'useRelationTreeBrowserRuntime',
  providerName: 'RelationTreeBrowserRuntimeProvider',
  displayName: 'RelationTreeBrowserRuntimeContext',
});
