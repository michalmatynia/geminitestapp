'use client';

import React, { useState } from 'react';

import type {
  MasterFolderTreeController,
  FolderTreeProfileV2,
} from '@/shared/contracts/master-folder-tree';

import {
  FolderTreeViewportV2,
  type FolderTreeViewportV2Props,
} from '../components/FolderTreeViewportV2';
import { FolderTreeSearchBar } from './FolderTreeSearchBar';
import { useMasterFolderTreeSearch } from './useMasterFolderTreeSearch';

export type FolderTreeSearchViewportProps = {
  controller: MasterFolderTreeController;
  /**
   * The active profile. When `profile.search?.enabled` is false (or undefined),
   * the search bar is hidden and the viewport renders directly.
   */
  profile?: FolderTreeProfileV2 | undefined;
  /** Placeholder text for the search input. */
  searchPlaceholder?: string | undefined;
  /** All other props are forwarded to FolderTreeViewportV2 (excluding controller). */
  viewportProps?: Omit<FolderTreeViewportV2Props, 'controller'> | undefined;
};

/**
 * Combines a search bar with the tree viewport and drives viewport search state.
 * Rendering mode (highlight vs filtered tree) is controlled by profile search config.
 *
 * Enabled when `profile.search?.enabled` is true (or when no profile is passed).
 */
export function FolderTreeSearchViewport({
  controller,
  profile,
  searchPlaceholder,
  viewportProps = {},
}: FolderTreeSearchViewportProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const searchState = useMasterFolderTreeSearch(controller.nodes, query, { profile });

  const searchEnabled = profile?.search?.enabled ?? true;

  return (
    <div className='flex flex-col gap-1'>
      {searchEnabled && (
        <FolderTreeSearchBar value={query} onChange={setQuery} placeholder={searchPlaceholder} />
      )}

      <FolderTreeViewportV2
        controller={controller}
        {...viewportProps}
        searchState={searchEnabled ? searchState : undefined}
      />
    </div>
  );
}
