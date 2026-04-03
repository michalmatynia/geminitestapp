'use client';

import React, { useMemo } from 'react';

import type {
  CaseResolverCaptureProposalState,
  CaseResolverCaptureDocumentDateAction,
} from '@/features/case-resolver/capture/public';
import type { CaseResolverCaptureAction } from '@/features/case-resolver/capture/public';
import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  CaseResolverGraph,
  CaseResolverRelationGraph,
  EditorDetailsTab,
  CaseResolverFileEditDraft,
  CaseResolverNodeMeta,
  CaseResolverDocumentHistoryEntry,
  CaseResolverFile,
  CaseMetadataDraft,
  WorkspaceView as CaseResolverWorkspaceView,
} from '@/shared/contracts/case-resolver';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

import type { CaseResolverStateValue } from '../types';
export type { EditorDetailsTab };

type WorkspaceView = CaseResolverWorkspaceView;

export type { WorkspaceView };

type SelectOption = LabeledOptionWithDescriptionDto<string>;

export type CaseResolverViewContextValue = {
  state: CaseResolverStateValue;
  workspaceView: WorkspaceView;
  setWorkspaceView: React.Dispatch<React.SetStateAction<WorkspaceView>>;
  handleMoveFolder: (fromPath: string, toPath: string) => Promise<void>;
  handleToggleFolderLock: (folderPath: string) => void;
  handleToggleFileLock: (fileId: string) => void;
  handleDeleteFile: (fileId: string) => void;
  handleDeleteAsset: (assetId: string) => void;
  handleGraphChange: (nextGraph: CaseResolverGraph) => void;
  handleRelationGraphChange: (nextGraph: CaseResolverRelationGraph) => void;
  editorDetailsTab: EditorDetailsTab;
  setEditorDetailsTab: React.Dispatch<React.SetStateAction<EditorDetailsTab>>;
  isScanDraftDropActive: boolean;
  scanDraftUploadInputRef: React.MutableRefObject<HTMLInputElement | null>;
  handleScanDraftDragEnter: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleScanDraftUploadInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleTriggerScanDraftUpload: () => void;
  handleDeleteScanDraftSlot: (slotId: string) => void;
  handleRunScanDraftOcr: () => void;
  updateEditingDocumentDraft: (patch: Partial<CaseResolverFileEditDraft>) => void;
  editingDocumentNodeMeta:
    | (CaseResolverNodeMeta & {
        nodeId: string;
        nodeTitle: string;
        canvasFileId: string;
        canvasFileName: string;
      })
    | null;
  updateEditingDocumentNodeMeta: (patch: Partial<CaseResolverNodeMeta>) => void;
  caseTagOptions: SelectOption[];
  caseIdentifierOptions: SelectOption[];
  caseCategoryOptions: SelectOption[];
  caseReferenceOptions: SelectOption[];
  parentCaseOptions: SelectOption[];
  partyOptions: SelectOption[];
  handleUseHistoryEntry: (entry: CaseResolverDocumentHistoryEntry) => void;
  isEditorDraftDirty: boolean;
  handleOpenPromptExploderForDraft: () => void;
  editorContentRevisionSeed: number;
  handleUpdateDraftDocumentContent: (next: string) => void;
  editorTextareaRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  editorSplitRef: React.MutableRefObject<HTMLDivElement | null>;
  editorWidth: number | null;
  setEditorWidth: React.Dispatch<React.SetStateAction<number | null>>;
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: React.Dispatch<React.SetStateAction<boolean>>;
  handleCopyDraftFileId: () => Promise<void>;
  handlePreviewDraftPdf: () => void;
  handlePrintDraftDocument: () => void;
  handleExportDraftPdf: () => Promise<void>;
  promptExploderProposalDraft: CaseResolverCaptureProposalState | null;
  captureProposalTargetFileName: string | null;
  handleClosePromptExploderProposalModal: () => void;
  handleApplyPromptExploderProposal: () => void;
  updatePromptExploderProposalAction: (
    role: 'addresser' | 'addressee',
    action: CaseResolverCaptureAction
  ) => void;
  updatePromptExploderProposalReference: (role: 'addresser' | 'addressee', value: string) => void;
  updatePromptExploderProposalDateAction: (action: CaseResolverCaptureDocumentDateAction) => void;
  resolvePromptExploderMatchedPartyLabel: (
    reference:
      | {
          id: string;
          kind: 'person' | 'organization';
          name?: string | undefined;
          role?: string | undefined;
        }
      | null
      | undefined
  ) => string;
  captureApplyDiagnostics: {
    status: 'idle' | 'success' | 'failed';
    stage: 'precheck' | 'mutation' | 'rebase' | null;
    message: string;
    targetFileId: string | null;
    resolvedTargetFileId: string | null;
    workspaceRevision: number;
    attempts: number;
    at: string;
    cleanupDurationMs?: number | null;
    mutationDurationMs?: number | null;
    totalDurationMs?: number | null;
  } | null;
  handleUpdateActiveFileParties: (
    patch: Partial<Pick<CaseResolverFile, 'addresser' | 'addressee' | 'referenceCaseIds'>>
  ) => void;
  handleLinkRelatedFiles: (fileIdA: string, fileIdB: string) => void;
  handleUnlinkRelatedFile: (sourceFileId: string, targetFileId: string) => void;
  handleSaveFileEditor: () => void;
  handleDiscardFileEditorDraft: () => void;
  handleDeactivateActiveFile: () => void;
  handleCreateDocumentFromSearch: () => void;
  handleOpenFileFromSearch: (id: string) => void;
  handleEditFileFromSearch: (id: string) => void;
  handleUpdateActiveCaseMetadata: (
    patch: Partial<
      Pick<
        CaseResolverFile,
        | 'name'
        | 'parentCaseId'
        | 'referenceCaseIds'
        | 'tagId'
        | 'caseIdentifierId'
        | 'categoryId'
        | 'caseStatus'
        | 'happeningDate'
      >
    >
  ) => void;
  activeCaseFile: CaseResolverFile | null;
  activeCaseMetadataDraft: CaseMetadataDraft | null;
  isActiveCaseMetadataDirty: boolean;
  updateActiveCaseMetadataDraft: (patch: Partial<CaseMetadataDraft>) => void;
  handleSaveActiveCaseMetadata: () => void;
  handleDiscardActiveCaseMetadata: () => void;
  handleResetCaseContext: () => void;
};

type FunctionKey<T> = {
  [K in keyof T]-?: T[K] extends (...args: infer _Args) => infer _Return ? K : never;
}[keyof T];

type CaseResolverViewActionKey = FunctionKey<CaseResolverViewContextValue>;

export type CaseResolverViewActionsValue = Pick<
  CaseResolverViewContextValue,
  CaseResolverViewActionKey
>;
export type CaseResolverViewStateValue = Omit<
  CaseResolverViewContextValue,
  CaseResolverViewActionKey
>;

const {
  Context: CaseResolverViewStateContext,
  useStrictContext: useCaseResolverViewStateContext,
} = createStrictContext<CaseResolverViewStateValue>({
  hookName: 'useCaseResolverViewStateContext',
  providerName: 'CaseResolverViewProvider',
  displayName: 'CaseResolverViewStateContext',
  errorFactory: internalError,
});

const {
  Context: CaseResolverViewActionsContext,
  useStrictContext: useCaseResolverViewActionsContext,
} = createStrictContext<CaseResolverViewActionsValue>({
  hookName: 'useCaseResolverViewActionsContext',
  providerName: 'CaseResolverViewProvider',
  displayName: 'CaseResolverViewActionsContext',
  errorFactory: internalError,
});

export { useCaseResolverViewActionsContext, useCaseResolverViewStateContext };

export function CaseResolverViewProvider({
  value,
  children,
}: {
  value: CaseResolverViewContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const stateValue = useMemo(() => value as CaseResolverViewStateValue, [value]);
  const actionsValue = useMemo(() => value as CaseResolverViewActionsValue, [value]);

  return (
    <CaseResolverViewStateContext.Provider value={stateValue}>
      <CaseResolverViewActionsContext.Provider value={actionsValue}>
        {children}
      </CaseResolverViewActionsContext.Provider>
    </CaseResolverViewStateContext.Provider>
  );
}
