'use client';

import React from 'react';

import type { FolderTreeViewportRenderNodeInput, FolderTreeViewportV2Props } from '../v2/components/FolderTreeViewportV2';
import { FolderTreeViewportV2 } from '../v2/components/FolderTreeViewportV2';

export type MasterFolderTreeRenderNodeInput = FolderTreeViewportRenderNodeInput;
export type MasterFolderTreeProps = FolderTreeViewportV2Props;

export function MasterFolderTree(props: MasterFolderTreeProps): React.JSX.Element {
  return <FolderTreeViewportV2 {...props} />;
}
