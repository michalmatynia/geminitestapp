'use client';

import React from 'react';

import { MasterFolderTreeViewport } from '@/shared/lib/foldertree/public';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';

import { ValidatorPatternTreeGroupSettingsPanel } from './ValidatorPatternTreeGroupSettingsPanel';
import {
  useValidatorPatternSemanticHistory,
  useValidatorPatternTreeContextValue,
  useValidatorPatternTreeRenderNode,
  useValidatorPatternTreeSelection,
  useValidatorPatternTreeShellModel,
  type ValidatorPatternTreeSelection,
} from './ValidatorPatternTree.hooks';
import { ValidatorPatternSemanticHistoryPanel } from './ValidatorPatternSemanticHistoryPanel';
import { ValidatorPatternTreeContext } from './ValidatorPatternTreeContext';
import { useValidatorSettingsContext } from './ValidatorSettingsContext';

function ValidatorPatternTreeSelectedGroupPanel({
  isPending,
  onSaveSequenceGroup,
  onUngroup,
  selection,
  setGroupDrafts,
}: {
  isPending: boolean;
  onSaveSequenceGroup: (groupId: string) => Promise<void>;
  onUngroup: (groupId: string) => Promise<void>;
  selection: ValidatorPatternTreeSelection;
  setGroupDrafts: React.Dispatch<
    React.SetStateAction<ValidatorPatternTreeSelection['groupDrafts']>
  >;
}): React.JSX.Element | null {
  const { selectedGroup, selectedGroupDraft, selectedGroupId } = selection;
  if (
    selectedGroupId === null ||
    selectedGroup === null ||
    selectedGroupDraft === null
  ) {
    return null;
  }

  return (
    <ValidatorPatternTreeGroupSettingsPanel
      groupId={selectedGroupId}
      draft={selectedGroupDraft}
      setGroupDrafts={setGroupDrafts}
      onSave={(): void => {
        void onSaveSequenceGroup(selectedGroupId);
      }}
      onDeleteSequence={(): void => {
        void onUngroup(selectedGroupId);
      }}
      isPending={isPending}
    />
  );
}

const resolveSemanticHistoryFocusProps = (
  focusedRequest: { patternId: string; auditKey: string; requestId: number } | null,
  selectedPatternId: string
): { focusedAuditKey: string | null; focusRequestId: number } => {
  if (focusedRequest?.patternId !== selectedPatternId) {
    return { focusedAuditKey: null, focusRequestId: 0 };
  }

  return {
    focusedAuditKey: focusedRequest.auditKey,
    focusRequestId: focusedRequest.requestId,
  };
};

function ValidatorPatternTreeSemanticHistory({
  focusedRequest,
  dismissedPatternId,
  onClose,
  selection,
}: {
  focusedRequest: { patternId: string; auditKey: string; requestId: number } | null;
  dismissedPatternId: string | null;
  onClose: (patternId: string) => void;
  selection: ValidatorPatternTreeSelection;
}): React.JSX.Element | null {
  const { selectedPattern } = selection;
  if (selectedPattern === null || dismissedPatternId === selectedPattern.id) {
    return null;
  }

  const focusProps = resolveSemanticHistoryFocusProps(focusedRequest, selectedPattern.id);

  return (
    <ValidatorPatternSemanticHistoryPanel
      pattern={selectedPattern}
      focusedAuditKey={focusProps.focusedAuditKey}
      focusRequestId={focusProps.focusRequestId}
      onClose={() => {
        onClose(selectedPattern.id);
      }}
    />
  );
}

export function ValidatorPatternTree(): React.JSX.Element {
  const settings = useValidatorSettingsContext();
  const treeShell = useValidatorPatternTreeShellModel({
    orderedPatterns: settings.orderedPatterns,
    sequenceGroups: settings.sequenceGroups,
  });
  const patternById = React.useMemo(
    () => new Map(settings.patterns.map((pattern) => [pattern.id, pattern])),
    [settings.patterns]
  );
  const selection = useValidatorPatternTreeSelection({
    controller: treeShell.controller,
    getGroupDraft: settings.getGroupDraft,
    groupDrafts: settings.groupDrafts,
    patternById,
    sequenceGroups: settings.sequenceGroups,
  });
  const semanticHistory = useValidatorPatternSemanticHistory(selection.selectedPatternId);
  const isPending =
    settings.patternActionsPending || settings.reorderPending || treeShell.reorderPending;
  const contextValue = useValidatorPatternTreeContextValue({
    controller: treeShell.controller,
    isPending,
    onOpenSemanticHistory: semanticHistory.open,
    patternById,
    settings,
  });
  const renderNode = useValidatorPatternTreeRenderNode();

  return (
    <ValidatorPatternTreeContext.Provider value={contextValue}>
      <FolderTreePanel masterInstance='validator_pattern_tree' className='h-auto min-h-0'>
        <MasterFolderTreeViewport
          tree={treeShell.tree}
          renderNode={renderNode}
          enableDnd={!isPending}
          emptyLabel='No patterns — click Add Pattern to create the first one'
        />
      </FolderTreePanel>
      <ValidatorPatternTreeSelectedGroupPanel
        isPending={isPending}
        onSaveSequenceGroup={settings.handleSaveSequenceGroup}
        onUngroup={settings.handleUngroup}
        selection={selection}
        setGroupDrafts={settings.setGroupDrafts}
      />
      <ValidatorPatternTreeSemanticHistory
        focusedRequest={semanticHistory.focusedRequest}
        dismissedPatternId={semanticHistory.dismissedPatternId}
        onClose={semanticHistory.close}
        selection={selection}
      />
    </ValidatorPatternTreeContext.Provider>
  );
}
