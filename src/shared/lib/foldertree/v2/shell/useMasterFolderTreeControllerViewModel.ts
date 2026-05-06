'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';

import type {
  FolderTreeProfileV2,
  MasterFolderTreeController,
} from '@/shared/contracts/master-folder-tree';
import {
  resolveFolderTreeKeyboardConfig,
  resolveFolderTreeMultiSelectConfig,
  resolveFolderTreeSearchConfig,
  type ResolvedFolderTreeKeyboardConfig,
  type ResolvedFolderTreeMultiSelectConfig,
  type ResolvedFolderTreeSearchConfig,
} from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  useMasterFolderTreeSearch,
  type MasterFolderTreeSearchState,
} from '../search/useMasterFolderTreeSearch';
import { useFolderTreeAppearance, type FolderTreeAppearance } from './useFolderTreeAppearance';

export type MasterFolderTreeControllerViewModel = {
  controller: MasterFolderTreeController;
  profile: FolderTreeProfileV2;
  capabilities: {
    keyboard: ResolvedFolderTreeKeyboardConfig;
    multiSelect: ResolvedFolderTreeMultiSelectConfig;
    search: ResolvedFolderTreeSearchConfig;
  };
  appearance: FolderTreeAppearance;
  searchState: MasterFolderTreeSearchState;
  viewport: {
    scrollToNodeRef: MutableRefObject<((nodeId: MasterTreeId) => void) | null>;
    scrollToNode: (nodeId: MasterTreeId) => void;
    revealNode: (nodeId: MasterTreeId) => void;
  };
};

export type UseMasterFolderTreeControllerViewModelOptions = {
  controller: MasterFolderTreeController;
  profile: FolderTreeProfileV2;
  nodes?: MasterTreeNode[] | undefined;
  searchQuery?: string | undefined;
};

export function useMasterFolderTreeControllerViewModel({
  controller,
  profile,
  nodes = [],
  searchQuery = '',
}: UseMasterFolderTreeControllerViewModelOptions): MasterFolderTreeControllerViewModel {
  const appearance = useFolderTreeAppearance(profile);
  const keyboardConfig = useMemo(() => resolveFolderTreeKeyboardConfig(profile), [profile]);
  const multiSelectConfig = useMemo(() => resolveFolderTreeMultiSelectConfig(profile), [profile]);
  const searchConfig = useMemo(() => resolveFolderTreeSearchConfig(profile), [profile]);
  const searchState = useMasterFolderTreeSearch(nodes, searchQuery, {
    config: searchConfig,
  });
  const scrollToNodeRef = useRef<((nodeId: MasterTreeId) => void) | null>(null);
  const revealNodeFrameRef = useRef<number | null>(null);
  const scrollToNode = useCallback((nodeId: MasterTreeId): void => {
    scrollToNodeRef.current?.(nodeId);
  }, []);
  const revealNode = useCallback(
    (nodeId: MasterTreeId): void => {
      controller.expandToNode?.(nodeId);
      controller.selectNode(nodeId);
      if (revealNodeFrameRef.current !== null) {
        window.cancelAnimationFrame(revealNodeFrameRef.current);
      }
      revealNodeFrameRef.current = window.requestAnimationFrame((): void => {
        revealNodeFrameRef.current = null;
        scrollToNode(nodeId);
      });
    },
    [controller, scrollToNode]
  );

  useEffect(() => {
    return (): void => {
      if (revealNodeFrameRef.current === null) return;
      window.cancelAnimationFrame(revealNodeFrameRef.current);
      revealNodeFrameRef.current = null;
    };
  }, []);

  return {
    controller,
    profile,
    capabilities: {
      keyboard: keyboardConfig,
      multiSelect: multiSelectConfig,
      search: searchConfig,
    },
    appearance,
    searchState,
    viewport: {
      scrollToNodeRef,
      scrollToNode,
      revealNode,
    },
  };
}
