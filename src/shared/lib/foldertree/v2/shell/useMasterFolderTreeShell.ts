'use client';

import React, { useEffect, useMemo, useRef } from 'react';

import type {
  FolderTreeProfileV2,
  MasterFolderTreeController,
} from '@/shared/contracts/master-folder-tree';
import { useToast } from '@/shared/ui/toast';
import {
  folderTreePersistFeedbackByInstance,
  resolveFolderTreeKeyboardConfig,
  resolveFolderTreeMultiSelectConfig,
  resolveFolderTreeSearchConfig,
  type ResolvedFolderTreeKeyboardConfig,
  type ResolvedFolderTreeMultiSelectConfig,
  type ResolvedFolderTreeSearchConfig,
  type FolderTreeInstance,
  type FolderTreePlaceholderClassSet,
} from '@/shared/utils/folder-tree-profiles-v2';
import type { MasterTreeId, MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import { useFolderTreeProfileConfig } from './useFolderTreeProfileConfig';
import { useFolderTreeUiState, type FolderTreePanelState } from './useFolderTreeUiState';
import {
  useFolderTreeInstanceV2,
  type UseFolderTreeInstanceV2Options,
} from '../hooks/useFolderTreeInstanceV2';
import { useFolderTreeKeyboardNav } from '../hooks/useFolderTreeKeyboardNav';

import type { ResolveFolderTreeIconInput } from './useFolderTreeAppearance';
import type { MasterFolderTreeShellRuntime } from './useFolderTreeShellRuntime';
import type { LucideIcon } from 'lucide-react';

export type UseMasterFolderTreeShellOptions = Omit<
  UseFolderTreeInstanceV2Options,
  'profile' | 'instanceId' | 'initialNodes' | 'initialSelectedNodeId' | 'initiallyExpandedNodeIds'
> & {
  instance: FolderTreeInstance;
  nodes: MasterTreeNode[];
  selectedNodeId?: MasterTreeId | null;
  expandedNodeIds?: MasterTreeId[] | undefined;
  initiallyExpandedNodeIds?: MasterTreeId[] | undefined;
  onKeyboardDeleteRequest?: ((nodeId: MasterTreeId) => void) | undefined;
  runtime?: MasterFolderTreeShellRuntime | undefined;
};

export type MasterFolderTreeShell = {
  controller: MasterFolderTreeController;
  profile: FolderTreeProfileV2;
  capabilities: {
    keyboard: ResolvedFolderTreeKeyboardConfig;
    multiSelect: ResolvedFolderTreeMultiSelectConfig;
    search: ResolvedFolderTreeSearchConfig;
  };
  appearance: {
    placeholderClasses: FolderTreePlaceholderClassSet;
    rootDropUi: {
      label: string;
      idleClassName: string;
      activeClassName: string;
      enabled?: boolean;
    };
    resolveIcon: (input: ResolveFolderTreeIconInput) => LucideIcon;
  };
  panel: FolderTreePanelState;
  viewport: {
    scrollToNodeRef: React.MutableRefObject<((nodeId: MasterTreeId) => void) | null>;
    scrollToNode: (nodeId: MasterTreeId) => void;
    revealNode: (nodeId: MasterTreeId) => void;
  };
};

export function useMasterFolderTreeShell({
  instance,
  nodes,
  selectedNodeId,
  onKeyboardDeleteRequest,
  initiallyExpandedNodeIds,
  expandedNodeIds,
  runtime,
  ...controllerOptions
}: UseMasterFolderTreeShellOptions): MasterFolderTreeShell {
  const { toast } = useToast();
  const { profile, appearance } = useFolderTreeProfileConfig(instance);
  const keyboardConfig = useMemo(() => resolveFolderTreeKeyboardConfig(profile), [profile]);
  const multiSelectConfig = useMemo(() => resolveFolderTreeMultiSelectConfig(profile), [profile]);
  const searchConfig = useMemo(() => resolveFolderTreeSearchConfig(profile), [profile]);
  const uiState = useFolderTreeUiState(
    instance,
    expandedNodeIds,
    initiallyExpandedNodeIds,
    runtime
  );

  const controller = useFolderTreeInstanceV2({
    ...controllerOptions,
    initialNodes: nodes,
    ...(selectedNodeId !== undefined ? { initialSelectedNodeId: selectedNodeId } : {}),
    ...(uiState.resolvedInitialExpandedNodeIds !== undefined
      ? { initiallyExpandedNodeIds: uiState.resolvedInitialExpandedNodeIds }
      : {}),
    profile,
    instanceId: instance,
    runtime,
  });

  const scrollToNodeRef = useRef<((nodeId: MasterTreeId) => void) | null>(null);
  const revealNodeFrameRef = useRef<number | null>(null);
  const scrollToNode = React.useCallback((nodeId: MasterTreeId): void => {
    scrollToNodeRef.current?.(nodeId);
  }, []);

  const revealNode = React.useCallback(
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

  useFolderTreeKeyboardNav({
    controller,
    instanceId: instance,
    onDeleteRequest: onKeyboardDeleteRequest,
    scrollToNode,
    keyboard: keyboardConfig,
    multiSelect: multiSelectConfig,
    runtime,
  });

  useEffect(() => {
    void controller.replaceNodes(nodes, 'external_sync');
  }, [controller.replaceNodes, nodes]);

  useEffect(() => {
    if (selectedNodeId === undefined) return;
    controller.selectNode(selectedNodeId ?? null);
  }, [controller.selectNode, selectedNodeId]);

  const hasHydratedExpandedStateRef = useRef<boolean>(false);
  useEffect(() => {
    hasHydratedExpandedStateRef.current = false;
  }, [instance]);

  useEffect(() => {
    if (uiState.isExpandedNodeIdsControlled) {
      if (uiState.resolvedExpandedNodeIds === undefined) return;
      controller.setExpandedNodeIds(uiState.resolvedExpandedNodeIds);
      return;
    }
    if (hasHydratedExpandedStateRef.current) return;
    if (!uiState.isSettingsReady) return;
    if (uiState.resolvedExpandedNodeIds === undefined) return;
    hasHydratedExpandedStateRef.current = true;
    controller.setExpandedNodeIds(uiState.resolvedExpandedNodeIds);
  }, [
    controller.setExpandedNodeIds,
    uiState.isExpandedNodeIdsControlled,
    uiState.isSettingsReady,
    uiState.resolvedExpandedNodeIds,
  ]);

  const normalizedExpandedNodeIds = useMemo(
    () => Array.from(controller.expandedNodeIds),
    [controller.expandedNodeIds]
  );

  useEffect(() => {
    uiState.persistExpandedNodeIds(normalizedExpandedNodeIds);
  }, [normalizedExpandedNodeIds, uiState.persistExpandedNodeIds]);

  const previousApplyingRef = useRef<boolean>(false);
  const lastErrorAtRef = useRef<string | null>(null);
  useEffect(() => {
    const feedback = folderTreePersistFeedbackByInstance[instance];
    const shouldNotifySuccess = feedback.notifySuccess;
    const shouldNotifyError = feedback.notifyError;
    if (!shouldNotifySuccess && !shouldNotifyError) {
      previousApplyingRef.current = controller.isApplying;
      return;
    }

    const wasApplying = previousApplyingRef.current;
    const isApplying = controller.isApplying;
    const lastError = controller.lastError;

    if (shouldNotifyError && lastError && lastError.at !== lastErrorAtRef.current) {
      lastErrorAtRef.current = lastError.at;
      toast(lastError.message || 'Failed to persist folder tree changes.', {
        variant: 'error',
      });
    } else if (shouldNotifySuccess && wasApplying && !isApplying && !lastError) {
      toast(feedback.successMessage, {
        variant: 'success',
      });
    }

    previousApplyingRef.current = isApplying;
  }, [controller.isApplying, controller.lastError, instance, toast]);

  return {
    controller,
    profile,
    capabilities: {
      keyboard: keyboardConfig,
      multiSelect: multiSelectConfig,
      search: searchConfig,
    },
    appearance,
    panel: uiState.panel,
    viewport: {
      scrollToNodeRef,
      scrollToNode,
      revealNode,
    },
  };
}
