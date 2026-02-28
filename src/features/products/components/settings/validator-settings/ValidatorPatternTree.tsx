'use client';

import React, { useCallback, useEffect, useMemo } from 'react';

import {
  FolderTreeViewportV2,
  MasterFolderTreeRuntimeProvider,
  useFolderTreeInstanceV2,
} from '@/features/foldertree/v2';
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/v2';
import { useReorderValidationPatternsMutation } from '@/features/products/hooks/useProductSettingsQueries';
import type { FolderTreeProfileV2 } from '@/shared/contracts/master-folder-tree';
import type { SequenceGroupDraft } from '@/shared/contracts/products';
import { Button, FormField, Input } from '@/shared/ui';

import {
  buildValidatorPatternMasterNodes,
  fromSeqGroupMasterNodeId,
} from './validator-pattern-master-tree';
import { ValidatorPatternTreeContext } from './ValidatorPatternTreeContext';
import { useValidatorPatternTreeActions } from './useValidatorPatternTreeActions';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';
import { PatternNodeItem } from './pattern-tree/PatternNodeItem';
import { SequenceGroupFolderNodeItem } from './pattern-tree/SequenceGroupFolderNodeItem';

// ─── Tree Profile ─────────────────────────────────────────────────────────────

const VALIDATOR_PATTERN_TREE_PROFILE: FolderTreeProfileV2 = {
  version: 2,
  placeholders: {
    preset: 'sublime',
    style: 'line',
    emphasis: 'subtle',
    rootDropLabel: 'Move to root',
    inlineDropLabel: 'Add to group',
  },
  icons: {
    slots: {
      folderClosed: null,
      folderOpen: null,
      file: null,
      root: null,
      dragHandle: null,
    },
    byKind: {},
  },
  nesting: {
    defaultAllow: false,
    blockedTargetKinds: [],
    rules: [
      // Patterns allowed at root
      {
        childType: 'file',
        childKinds: ['pattern'],
        targetType: 'root',
        targetKinds: ['*'],
        allow: true,
      },
      // Patterns allowed inside sequence-group folders
      {
        childType: 'file',
        childKinds: ['pattern'],
        targetType: 'folder',
        targetKinds: ['sequence-group'],
        allow: true,
      },
      // Sequence groups allowed at root only
      {
        childType: 'folder',
        childKinds: ['sequence-group'],
        targetType: 'root',
        targetKinds: ['*'],
        allow: true,
      },
    ],
  },
  interactions: {
    selectionBehavior: 'click_away',
  },
};

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

  // Create tree controller — group folders start expanded
  const controller = useFolderTreeInstanceV2({
    instanceId: 'validator_pattern_tree',
    profile: VALIDATOR_PATTERN_TREE_PROFILE,
    initialNodes: masterNodes,
    initiallyExpandedNodeIds: masterNodes.filter((n) => n.type === 'folder').map((n) => n.id),
  });

  // Keep controller in sync with server-driven data changes
  useEffect(() => {
    void controller.replaceNodes(masterNodes, 'external_sync');
    // controller is a stable object; masterNodes changes are the trigger
  }, [masterNodes]);

  const { onNodeDrop } = useValidatorPatternTreeActions({
    reorderPatterns: reorderPatternsMutation,
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
      return (
        <SequenceGroupFolderNodeItem
          node={input.node}
          depth={input.depth}
          hasChildren={input.hasChildren}
          isExpanded={input.isExpanded}
          isSelected={input.isSelected}
          isRenaming={input.isRenaming}
          isDragging={input.isDragging}
          isDropTarget={input.isDropTarget}
          dropPosition={input.dropPosition}
          select={input.select}
          toggleExpand={input.toggleExpand}
          startRename={input.startRename}
        />
      );
    }
    return (
      <PatternNodeItem
        node={input.node}
        depth={input.depth}
        hasChildren={input.hasChildren}
        isExpanded={input.isExpanded}
        isSelected={input.isSelected}
        isRenaming={input.isRenaming}
        isDragging={input.isDragging}
        isDropTarget={input.isDropTarget}
        dropPosition={input.dropPosition}
        select={input.select}
        toggleExpand={input.toggleExpand}
      />
    );
  }, []);

  // Show group settings panel below tree when a sequence-group folder is selected
  const selectedGroupId = controller.selectedNodeId
    ? fromSeqGroupMasterNodeId(controller.selectedNodeId)
    : null;
  const selectedGroupDraft = selectedGroupId ? getGroupDraft(selectedGroupId) : null;

  return (
    <MasterFolderTreeRuntimeProvider>
      <ValidatorPatternTreeContext.Provider value={contextValue}>
        <FolderTreeViewportV2
          controller={controller}
          renderNode={renderNode}
          onNodeDrop={onNodeDrop}
          enableDnd={!isPending}
          emptyLabel='No patterns — click Add Pattern to create the first one'
        />
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
    </MasterFolderTreeRuntimeProvider>
  );
}
