'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import {
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
} from '@/features/foldertree/v2';
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { useReorderValidationPatternsMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type {
  MasterFolderTreeAdapterV3,
  MasterFolderTreeTransaction,
} from '@/shared/contracts/master-folder-tree';
import type { SequenceGroupDraft } from '@/shared/contracts/products';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { Button, FolderTreePanel, FormField, Input } from '@/shared/ui';

import {
  buildValidatorPatternMasterNodes,
  fromSeqGroupMasterNodeId,
  resolveValidatorPatternReorderUpdates,
} from './validator-pattern-master-tree';
import { ValidatorPatternTreeContext } from './ValidatorPatternTreeContext';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';
import { PatternNodeItem } from './pattern-tree/PatternNodeItem';
import { SequenceGroupFolderNodeItem } from './pattern-tree/SequenceGroupFolderNodeItem';

// ─── Group Settings Panel ─────────────────────────────────────────────────────

function GroupSettingsPanel({
  groupId,
  draft,
  setGroupDrafts,
  onSave,
  onUngroup,
  isPending,
}: {
  groupId: string;
  draft: SequenceGroupDraft;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  onSave: () => void;
  onUngroup: () => void;
  isPending: boolean;
}): React.JSX.Element {
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
        />
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
        />
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

  // Build master nodes from ordered patterns + sequence groups
  const masterNodes = useMemo(
    () => buildValidatorPatternMasterNodes(orderedPatterns, sequenceGroups),
    [orderedPatterns, sequenceGroups]
  );

  const reorderPatternsMutationRef = useRef(reorderPatternsMutation);
  useEffect(() => {
    reorderPatternsMutationRef.current = reorderPatternsMutation;
  }, [reorderPatternsMutation]);

  const adapter = useMemo<MasterFolderTreeAdapterV3>(
    () => ({
      prepare: async (tx: MasterFolderTreeTransaction) => ({
        tx,
        preparedAt: Date.now(),
      }),
      apply: async (tx: MasterFolderTreeTransaction) => {
        const updates = resolveValidatorPatternReorderUpdates({
          previousNodes: tx.previousNodes,
          nextNodes: tx.nextNodes,
        });

        if (updates.length > 0) {
          try {
            await reorderPatternsMutationRef.current.mutateAsync({ updates });
          } catch (error: unknown) {
            logClientError(error, {
              context: {
                source: 'ValidatorPatternTree',
                action: 'reorder',
                operationType: tx.operation.type,
                updateCount: updates.length,
              },
            });
            throw error instanceof Error ? error : new Error('Failed to reorder patterns.');
          }
        }

        return {
          tx,
          appliedAt: Date.now(),
        };
      },
      commit: async () => {},
      rollback: async () => {},
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
  const selectedGroupDraft = selectedGroupId ? getGroupDraft(selectedGroupId) : null;

  return (
    <ValidatorPatternTreeContext.Provider value={contextValue}>
      <FolderTreePanel masterInstance='validator_pattern_tree'>
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
    </ValidatorPatternTreeContext.Provider>
  );
}
