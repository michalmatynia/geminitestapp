'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
} from '@/shared/lib/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useReorderValidationPatternsMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { SequenceGroupDraft } from '@/shared/contracts/products/validation';
import { Button } from '@/shared/ui/button';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { PatternNodeItem } from './pattern-tree/PatternNodeItem';
import { SequenceGroupFolderNodeItem } from './pattern-tree/SequenceGroupFolderNodeItem';
import { ValidatorPatternSemanticHistoryPanel } from './ValidatorPatternSemanticHistoryPanel';
import {
  fromPatternMasterNodeId,
  buildValidatorPatternMasterNodes,
  fromSeqGroupMasterNodeId,
  resolveValidatorPatternReorderUpdates,
} from './validator-pattern-master-tree';
import { ValidatorPatternTreeContext } from './ValidatorPatternTreeContext';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

// ─── Group Settings Panel ─────────────────────────────────────────────────────

function GroupSettingsPanel(props: {
  groupId: string;
  draft: SequenceGroupDraft;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  onSave: () => void;
  onUngroup: () => void;
  isPending: boolean;
}): React.JSX.Element {
  const { groupId, draft, setGroupDrafts, onSave, onUngroup, isPending } = props;

  return (
    <div className='mt-2 flex flex-wrap items-end gap-3 rounded-md border border-cyan-500/25 bg-cyan-500/5 px-3 py-2'>
      <FormField label='Group Label' className='min-w-[160px] flex-1'>
        <Input
          className='h-8'
          value={draft.label}
          disabled={isPending}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setGroupDrafts((prev) => ({
              ...prev,
              [groupId]: { ...draft, label: event.target.value },
            }));
          }}
          placeholder='Sequence / Group'
         aria-label='Sequence / Group' title='Sequence / Group'/>
      </FormField>
      <FormField label='Debounce (ms)' className='w-28 shrink-0'>
        <Input
          type='number'
          min={0}
          max={30000}
          className='h-8'
          value={draft.debounceMs}
          disabled={isPending}
          onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
            setGroupDrafts((prev) => ({
              ...prev,
              [groupId]: { ...draft, debounceMs: event.target.value },
            }));
          }}
         aria-label='Debounce (ms)' title='Debounce (ms)'/>
      </FormField>
      <div className='flex shrink-0 items-end gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8'
          disabled={isPending}
          onClick={onSave}
        >
          Save Group
        </Button>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
          disabled={isPending}
          onClick={onUngroup}
        >
          Ungroup
        </Button>
      </div>
    </div>
  );
}

// ─── ValidatorPatternTree ─────────────────────────────────────────────────────

export function ValidatorPatternTree(): React.JSX.Element {
  const {
    patterns,
    orderedPatterns,
    sequenceGroups,
    groupDrafts,
    setGroupDrafts,
    getGroupDraft,
    handleEditPattern,
    handleDuplicatePattern,
    setPatternToDelete,
    handleTogglePattern,
    handleSaveSequenceGroup,
    handleUngroup,
    patternActionsPending,
    reorderPending,
  } = useValidatorSettingsContext();

  const reorderPatternsMutation = useReorderValidationPatternsMutation();
  const [focusedSemanticHistoryRequest, setFocusedSemanticHistoryRequest] = React.useState<{
    patternId: string;
    auditKey: string;
    requestId: number;
  } | null>(null);
  const [dismissedSemanticHistoryPatternId, setDismissedSemanticHistoryPatternId] =
    React.useState<string | null>(null);

  // Build master nodes from ordered patterns + sequence groups
  const masterNodes = useMemo(
    () => buildValidatorPatternMasterNodes(orderedPatterns, sequenceGroups),
    [orderedPatterns, sequenceGroups]
  );

  const reorderPatternsMutationRef = useRef(reorderPatternsMutation);
  useEffect(() => {
    reorderPatternsMutationRef.current = reorderPatternsMutation;
  }, [reorderPatternsMutation]);

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (tx) => {
          const updates = resolveValidatorPatternReorderUpdates({
            previousNodes: tx.previousNodes,
            nextNodes: tx.nextNodes,
          });

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

  const {
    appearance: { rootDropUi },
    controller,
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'validator_pattern_tree',
    nodes: masterNodes,
    initiallyExpandedNodeIds: masterNodes
      .filter((node) => node.type === 'folder')
      .map((node) => node.id),
    adapter,
  });

  const patternById = useMemo(() => new Map(patterns.map((p) => [p.id, p])), [patterns]);

  const isPending = patternActionsPending || reorderPending || reorderPatternsMutation.isPending;

  const contextValue = useMemo(
    () => ({
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
      onOpenSemanticHistory: (patternId: string, auditKey: string) => {
        setDismissedSemanticHistoryPatternId(null);
        setFocusedSemanticHistoryRequest((prev) => ({
          patternId,
          auditKey,
          requestId:
            prev?.patternId === patternId && prev.auditKey === auditKey
              ? prev.requestId + 1
              : 1,
        }));
      },
      onSaveSequenceGroup: handleSaveSequenceGroup,
      onUngroup: handleUngroup,
      isPending,
    }),
    [
      controller,
      patternById,
      sequenceGroups,
      groupDrafts,
      setGroupDrafts,
      getGroupDraft,
      handleEditPattern,
      handleDuplicatePattern,
      setPatternToDelete,
      handleTogglePattern,
      setFocusedSemanticHistoryRequest,
      handleSaveSequenceGroup,
      handleUngroup,
      isPending,
    ]
  );

  const renderNode = useCallback((input: FolderTreeViewportRenderNodeInput): React.ReactNode => {
    if (input.node.type === 'folder') {
      return <SequenceGroupFolderNodeItem {...input} />;
    }
    return <PatternNodeItem {...input} />;
  }, []);

  // Show group settings panel below tree when a sequence-group folder is selected
  const selectedGroupId = controller.selectedNodeId
    ? fromSeqGroupMasterNodeId(controller.selectedNodeId)
    : null;
  const selectedPatternId = controller.selectedNodeId
    ? fromPatternMasterNodeId(controller.selectedNodeId)
    : null;
  const selectedGroupDraft = selectedGroupId ? getGroupDraft(selectedGroupId) : null;
  const selectedPattern = selectedPatternId ? patternById.get(selectedPatternId) ?? null : null;
  const semanticHistoryVisible =
    selectedPattern !== null && dismissedSemanticHistoryPatternId !== selectedPattern.id;

  React.useEffect(() => {
    setDismissedSemanticHistoryPatternId(null);
  }, [selectedPattern?.id]);

  return (
    <ValidatorPatternTreeContext.Provider value={contextValue}>
      <FolderTreePanel masterInstance='validator_pattern_tree' className='h-auto min-h-0'>
        <FolderTreeViewportV2
          controller={controller}
          scrollToNodeRef={scrollToNodeRef}
          rootDropUi={rootDropUi}
          renderNode={renderNode}
          enableDnd={!isPending}
          emptyLabel='No patterns — click Add Pattern to create the first one'
        />
      </FolderTreePanel>
      {selectedGroupId && selectedGroupDraft && (
        <GroupSettingsPanel
          groupId={selectedGroupId}
          draft={selectedGroupDraft}
          setGroupDrafts={setGroupDrafts}
          onSave={(): void => {
            void handleSaveSequenceGroup(selectedGroupId);
          }}
          onUngroup={(): void => {
            void handleUngroup(selectedGroupId);
          }}
          isPending={isPending}
        />
      )}
      {selectedPattern && semanticHistoryVisible ? (
        <ValidatorPatternSemanticHistoryPanel
          pattern={selectedPattern}
          focusedAuditKey={
            focusedSemanticHistoryRequest?.patternId === selectedPattern.id
              ? focusedSemanticHistoryRequest.auditKey
              : null
          }
          focusRequestId={
            focusedSemanticHistoryRequest?.patternId === selectedPattern.id
              ? focusedSemanticHistoryRequest.requestId
              : 0
          }
          onClose={() => {
            setDismissedSemanticHistoryPatternId(selectedPattern.id);
            setFocusedSemanticHistoryRequest(null);
          }}
        />
      ) : null}
    </ValidatorPatternTreeContext.Provider>
  );
}
