'use client';

import React, { useState } from 'react';

import type {
  MasterFolderTreeController,
  FolderTreeProfileV2,
} from '@/shared/contracts/master-folder-tree';

import { FolderTreeSearchBar } from './FolderTreeSearchBar';
import { useMasterFolderTreeSearch } from './useMasterFolderTreeSearch';
import {
  FolderTreeViewportV2,
  type FolderTreeViewportV2Props,
} from '../components/FolderTreeViewportV2';

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

type FolderTreeSearchStateValue = ReturnType<typeof useMasterFolderTreeSearch>;

type FolderTreeSearchViewportResolvedProps = {
  controller: MasterFolderTreeController;
  query: string;
  onQueryChange: (query: string) => void;
  searchEnabled: boolean;
  searchPlaceholder?: string | undefined;
  searchState: FolderTreeSearchStateValue;
  viewportProps: Omit<FolderTreeViewportV2Props, 'controller'>;
};

const renderFolderTreeSearchViewportSearchBar = ({
  query,
  onQueryChange,
  searchEnabled,
  searchPlaceholder,
}: Pick<
  FolderTreeSearchViewportResolvedProps,
  'query' | 'onQueryChange' | 'searchEnabled' | 'searchPlaceholder'
>): React.JSX.Element | null => {
  if (!searchEnabled) return null;
  return (
    <FolderTreeSearchBar value={query} onChange={onQueryChange} placeholder={searchPlaceholder} />
  );
};

const renderFolderTreeSearchViewportTree = ({
  controller,
  viewportProps,
  searchEnabled,
  searchState,
}: Pick<
  FolderTreeSearchViewportResolvedProps,
  'controller' | 'viewportProps' | 'searchEnabled' | 'searchState'
>): React.JSX.Element => (
  <FolderTreeViewportV2
    controller={controller}
    {...viewportProps}
    searchState={searchEnabled ? searchState : undefined}
  />
);

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
  const resolvedProps: FolderTreeSearchViewportResolvedProps = {
    controller,
    query,
    onQueryChange: setQuery,
    searchEnabled,
    searchPlaceholder,
    searchState,
    viewportProps,
  };

  return (
    <div className='flex flex-col gap-1'>
      {renderFolderTreeSearchViewportSearchBar(resolvedProps)}
      {renderFolderTreeSearchViewportTree(resolvedProps)}
    </div>
  );
}
