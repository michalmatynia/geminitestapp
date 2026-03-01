'use client';

import React, { useState } from 'react';

import type { MasterFolderTreeController, FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { FolderTreeViewportV2, type FolderTreeViewportV2Props } from '../components/FolderTreeViewportV2';
import { FolderTreeSearchBar } from './FolderTreeSearchBar';
import { MasterFolderTreeSearchResults } from './MasterFolderTreeSearchResults';
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
  /** Called when the user selects a search result. The node will be expanded to and selected. */
  onSelectSearchResult?: ((node: MasterTreeNode) => void) | undefined;
  /** All other props are forwarded to FolderTreeViewportV2 (excluding controller). */
  viewportProps?: Omit<FolderTreeViewportV2Props, 'controller'> | undefined;
};

/**
 * Combines a search bar with the tree viewport. When a search is active,
 * replaces the tree with flat search results. Selecting a result expands
 * the tree to that node and clears the query.
 *
 * Enabled when `profile.search?.enabled` is true (or when no profile is passed).
 */
export function FolderTreeSearchViewport({
  controller,
  profile,
  searchPlaceholder,
  onSelectSearchResult,
  viewportProps = {},
}: FolderTreeSearchViewportProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const { results, isActive } = useMasterFolderTreeSearch(controller.nodes, query);

  const searchEnabled = profile?.search?.enabled ?? true;

  const handleSelectResult = (node: MasterTreeNode): void => {
    controller.expandToNode?.(node.id);
    controller.selectNode(node.id);
    onSelectSearchResult?.(node);
    setQuery('');
    // Scroll after a tick so the expanded ancestors are included in the virtualizer's row list
    if (viewportProps.scrollToNodeRef) {
      const ref = viewportProps.scrollToNodeRef;
      setTimeout((): void => {
        ref.current?.(node.id);
      }, 0);
    }
  };

  return (
    <div className='flex flex-col gap-1'>
      {searchEnabled && (
        <FolderTreeSearchBar
          value={query}
          onChange={setQuery}
          placeholder={searchPlaceholder}
        />
      )}

      {isActive && searchEnabled ? (
        <MasterFolderTreeSearchResults
          results={results}
          query={query}
          onSelect={handleSelectResult}
        />
      ) : (
        <FolderTreeViewportV2 controller={controller} {...viewportProps} />
      )}
    </div>
  );
}
