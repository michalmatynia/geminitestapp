'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import type { SequenceGroupView } from '@/shared/contracts/products/drafts';
import type {
  ProductValidationPattern,
  SequenceGroupDraft,
} from '@/shared/contracts/products/validation';
import {
  createMasterFolderTreeProjectionAdapter,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';

import { useReorderValidationPatternsMutation } from '@/features/products/hooks/useProductSettingsQueries';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { PatternNodeItem } from './pattern-tree/PatternNodeItem';
import { SequenceGroupFolderNodeItem } from './pattern-tree/SequenceGroupFolderNodeItem';
import {
  buildValidatorPatternMasterNodes,
  fromPatternMasterNodeId,
  fromSeqGroupMasterNodeId,
  resolveValidatorPatternReorderUpdates,
} from './validator-pattern-master-tree';
import type { ValidatorPatternTreeContextValue } from './ValidatorPatternTreeContext';
import type { useValidatorSettingsContext } from './ValidatorSettingsContext';

type ValidatorSettingsContextValue = ReturnType<typeof useValidatorSettingsContext>;
type MasterFolderTreeShell = ReturnType<typeof useMasterFolderTreeViewModel>;

export type ValidatorPatternTreeSelection = {
  selectedGroupId: string | null;
  selectedPatternId: string | null;
  selectedGroup: SequenceGroupView | null;
  selectedGroupDraft: SequenceGroupDraft | null;
  selectedPattern: ProductValidationPattern | null;
  groupDrafts: Record<string, SequenceGroupDraft>;
};

type ValidatorPatternTreeShellModel = {
  tree: MasterFolderTreeShell;
  controller: MasterFolderTreeShell['controller'];
  reorderPending: boolean;
};

type ValidatorPatternSemanticHistoryRequest = {
  patternId: string;
  auditKey: string;
  requestId: number;
};

const resolveNextSemanticHistoryRequestId = (
  previous: ValidatorPatternSemanticHistoryRequest | null,
  patternId: string,
  auditKey: string
): number => {
  if (previous === null) return 1;
  return previous.patternId === patternId && previous.auditKey === auditKey
    ? previous.requestId + 1
    : 1;
};

const resolveSelectedNodeIds = (
  selectedNodeId: string | null | undefined
): Pick<ValidatorPatternTreeSelection, 'selectedGroupId' | 'selectedPatternId'> => {
  if (typeof selectedNodeId !== 'string' || selectedNodeId.length === 0) {
    return { selectedGroupId: null, selectedPatternId: null };
  }

  return {
    selectedGroupId: fromSeqGroupMasterNodeId(selectedNodeId),
    selectedPatternId: fromPatternMasterNodeId(selectedNodeId),
  };
};

export const useValidatorPatternTreeShellModel = ({
  orderedPatterns,
  sequenceGroups,
}: Pick<
  ValidatorSettingsContextValue,
  'orderedPatterns' | 'sequenceGroups'
>): ValidatorPatternTreeShellModel => {
  const masterNodes = useMemo(
    () => buildValidatorPatternMasterNodes(orderedPatterns, sequenceGroups),
    [orderedPatterns, sequenceGroups]
  );
  const reorderPatternsMutation = useReorderValidationPatternsMutation();
  const reorderPatternsMutationRef = useRef(reorderPatternsMutation);

  useEffect(() => {
    reorderPatternsMutationRef.current = reorderPatternsMutation;
  }, [reorderPatternsMutation]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeProjectionAdapter({
        project: (tx) =>
          resolveValidatorPatternReorderUpdates({
            previousNodes: tx.previousNodes,
            nextNodes: tx.nextNodes,
          }),
        onPersistProjection: async (updates, tx): Promise<void> => {
          if (updates.length === 0) return;

          try {
            await reorderPatternsMutationRef.current.mutateAsync({ updates });
          } catch (error: unknown) {
            logClientCatch(error, {
              source: 'ValidatorPatternTree',
              action: 'reorder',
              operationType: tx.operation.type,
              updateCount: updates.length,
            });
            throw error instanceof Error ? error : new Error('Failed to reorder patterns.');
          }
        },
      }),
    []
  );
  const tree = useMasterFolderTreeViewModel({
    instance: 'validator_pattern_tree',
    nodes: masterNodes,
    initiallyExpandedNodeIds: masterNodes
      .filter((node) => node.type === 'folder')
      .map((node) => node.id),
    adapter,
  });

  return {
    tree,
    controller: tree.controller,
    reorderPending: reorderPatternsMutation.isPending,
  };
};

export const useValidatorPatternTreeSelection = ({
  controller,
  getGroupDraft,
  groupDrafts,
  patternById,
  sequenceGroups,
}: {
  controller: ValidatorPatternTreeShellModel['controller'];
  getGroupDraft: (groupId: string) => SequenceGroupDraft;
  groupDrafts: Record<string, SequenceGroupDraft>;
  patternById: Map<string, ProductValidationPattern>;
  sequenceGroups: Map<string, SequenceGroupView>;
}): ValidatorPatternTreeSelection => {
  return useMemo((): ValidatorPatternTreeSelection => {
    const { selectedGroupId, selectedPatternId } = resolveSelectedNodeIds(
      controller.selectedNodeId
    );
    const selectedGroup =
      selectedGroupId !== null ? sequenceGroups.get(selectedGroupId) ?? null : null;
    const selectedGroupDraft =
      selectedGroupId !== null ? getGroupDraft(selectedGroupId) : null;
    const selectedPattern =
      selectedPatternId !== null ? patternById.get(selectedPatternId) ?? null : null;

    return {
      selectedGroupId,
      selectedPatternId,
      selectedGroup,
      selectedGroupDraft,
      selectedPattern,
      groupDrafts,
    };
  }, [controller.selectedNodeId, getGroupDraft, groupDrafts, patternById, sequenceGroups]);
};

export const useValidatorPatternSemanticHistory = (
  selectedPatternId: string | null
): {
  focusedRequest: ValidatorPatternSemanticHistoryRequest | null;
  dismissedPatternId: string | null;
  open: (patternId: string, auditKey: string) => void;
  close: (patternId: string) => void;
} => {
  const [focusedRequest, setFocusedRequest] =
    React.useState<ValidatorPatternSemanticHistoryRequest | null>(null);
  const [dismissedPatternId, setDismissedPatternId] = React.useState<string | null>(null);

  useEffect(() => {
    setDismissedPatternId(null);
  }, [selectedPatternId]);

  const open = useCallback((patternId: string, auditKey: string): void => {
    setDismissedPatternId(null);
    setFocusedRequest((previous) => ({
      patternId,
      auditKey,
      requestId: resolveNextSemanticHistoryRequestId(previous, patternId, auditKey),
    }));
  }, []);

  const close = useCallback((patternId: string): void => {
    setDismissedPatternId(patternId);
    setFocusedRequest(null);
  }, []);

  return { focusedRequest, dismissedPatternId, open, close };
};

export const useValidatorPatternTreeContextValue = ({
  controller,
  isPending,
  onOpenSemanticHistory,
  patternById,
  settings,
}: {
  controller: ValidatorPatternTreeShellModel['controller'];
  isPending: boolean;
  onOpenSemanticHistory: (patternId: string, auditKey: string) => void;
  patternById: Map<string, ProductValidationPattern>;
  settings: ValidatorSettingsContextValue;
}): ValidatorPatternTreeContextValue => {
  const {
    getGroupDraft,
    groupDrafts,
    handleDuplicatePattern,
    handleEditPattern,
    handleSaveSequenceGroup,
    handleTogglePattern,
    handleUngroup,
    sequenceGroups,
    setGroupDrafts,
    setPatternToDelete,
  } = settings;

  return useMemo(
    (): ValidatorPatternTreeContextValue => ({
      controller,
      patternById,
      sequenceGroupById: sequenceGroups,
      groupDrafts,
      setGroupDrafts,
      getGroupDraft,
      onEditPattern: handleEditPattern,
      onDuplicatePattern: handleDuplicatePattern,
      onDeletePattern: setPatternToDelete,
      onTogglePattern: handleTogglePattern,
      onOpenSemanticHistory,
      onSaveSequenceGroup: handleSaveSequenceGroup,
      onUngroup: handleUngroup,
      isPending,
    }),
    [
      controller,
      getGroupDraft,
      groupDrafts,
      handleDuplicatePattern,
      handleEditPattern,
      handleSaveSequenceGroup,
      handleTogglePattern,
      handleUngroup,
      isPending,
      onOpenSemanticHistory,
      patternById,
      sequenceGroups,
      setGroupDrafts,
      setPatternToDelete,
    ]
  );
};

export const useValidatorPatternTreeRenderNode = (): ((
  input: FolderTreeViewportRenderNodeInput
) => React.ReactNode) =>
  useCallback((input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
    if (input.node.type === 'folder') {
      return <SequenceGroupFolderNodeItem {...input} />;
    }
    return <PatternNodeItem {...input} />;
  }, []);
