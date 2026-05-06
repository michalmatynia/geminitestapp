'use client';

import React from 'react';

import type { MasterFolderTreeViewModel } from '../shell/useMasterFolderTreeViewModel';
import {
  FolderTreeViewportV2,
  type FolderTreeViewportV2Props,
} from './FolderTreeViewportV2';

export type MasterFolderTreeViewportProps = Omit<
  FolderTreeViewportV2Props,
  'controller' | 'scrollToNodeRef'
> & {
  tree: Pick<
    MasterFolderTreeViewModel,
    'appearance' | 'capabilities' | 'controller' | 'searchState' | 'viewport'
  >;
};

export function MasterFolderTreeViewport({
  tree,
  multiSelectConfig,
  rootDropUi,
  searchState,
  ...props
}: MasterFolderTreeViewportProps): React.JSX.Element {
  return (
    <FolderTreeViewportV2
      {...props}
      controller={tree.controller}
      scrollToNodeRef={tree.viewport.scrollToNodeRef}
      rootDropUi={rootDropUi ?? tree.appearance.rootDropUi}
      multiSelectConfig={multiSelectConfig ?? tree.capabilities.multiSelect}
      searchState={searchState ?? tree.searchState}
    />
  );
}
