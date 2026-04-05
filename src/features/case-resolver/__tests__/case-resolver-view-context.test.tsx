// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { CaseResolverViewContextValue } from '@/features/case-resolver/components/CaseResolverViewContext';
import {
  CaseResolverViewProvider,
  useCaseResolverViewActionsContext,
  useCaseResolverViewStateContext,
} from '@/features/case-resolver/components/CaseResolverViewContext';

const createViewContextValue = (): CaseResolverViewContextValue =>
  ({
    activeCaseFile: null,
    activeCaseMetadataDraft: null,
    captureApplyDiagnostics: null,
    captureProposalTargetFileName: null,
    caseCategoryOptions: [],
    caseIdentifierOptions: [],
    caseReferenceOptions: [],
    caseTagOptions: [],
    editorContentRevisionSeed: 0,
    editorDetailsTab: 'details',
    editorSplitRef: { current: null },
    editorTextareaRef: { current: null },
    editorWidth: null,
    editingDocumentNodeMeta: null,
    handleApplyPromptExploderProposal: vi.fn(),
    handleClosePromptExploderProposalModal: vi.fn(),
    handleCopyDraftFileId: vi.fn(),
    handleCreateDocumentFromSearch: vi.fn(),
    handleDeactivateActiveFile: vi.fn(),
    handleDeleteAsset: vi.fn(),
    handleDeleteFile: vi.fn(),
    handleDiscardActiveCaseMetadata: vi.fn(),
    handleDiscardFileEditorDraft: vi.fn(),
    handleEditFileFromSearch: vi.fn(),
    handleExportDraftPdf: vi.fn(),
    handleGraphChange: vi.fn(),
    handleLinkRelatedFiles: vi.fn(),
    handleMoveFolder: vi.fn(),
    handleOpenFileFromSearch: vi.fn(),
    handleOpenPromptExploderForDraft: vi.fn(),
    handlePreviewDraftPdf: vi.fn(),
    handlePrintDraftDocument: vi.fn(),
    handleRelationGraphChange: vi.fn(),
    handleResetCaseContext: vi.fn(),
    handleRunScanDraftOcr: vi.fn(),
    handleSaveActiveCaseMetadata: vi.fn(),
    handleSaveFileEditor: vi.fn(),
    handleScanDraftDragEnter: vi.fn(),
    handleScanDraftDragLeave: vi.fn(),
    handleScanDraftDragOver: vi.fn(),
    handleScanDraftDrop: vi.fn(),
    handleScanDraftUploadInputChange: vi.fn(),
    handleToggleFileLock: vi.fn(),
    handleToggleFolderLock: vi.fn(),
    handleTriggerScanDraftUpload: vi.fn(),
    handleDeleteScanDraftSlot: vi.fn(),
    handleUnlinkRelatedFile: vi.fn(),
    handleUpdateActiveCaseMetadata: vi.fn(),
    handleUpdateActiveFileParties: vi.fn(),
    handleUpdateDraftDocumentContent: vi.fn(),
    handleUseHistoryEntry: vi.fn(),
    isActiveCaseMetadataDirty: false,
    isDraggingSplitter: false,
    isEditorDraftDirty: false,
    isScanDraftDropActive: false,
    parentCaseOptions: [],
    partyOptions: [],
    promptExploderProposalDraft: null,
    resolvePromptExploderMatchedPartyLabel: vi.fn(() => ''),
    scanDraftUploadInputRef: { current: null },
    setEditorDetailsTab: vi.fn(),
    setEditorWidth: vi.fn(),
    setIsDraggingSplitter: vi.fn(),
    setWorkspaceView: vi.fn(),
    state: {} as never,
    updateActiveCaseMetadataDraft: vi.fn(),
    updateEditingDocumentDraft: vi.fn(),
    updateEditingDocumentNodeMeta: vi.fn(),
    updatePromptExploderProposalAction: vi.fn(),
    updatePromptExploderProposalDateAction: vi.fn(),
    updatePromptExploderProposalReference: vi.fn(),
    workspaceView: 'workspace',
  }) as unknown as CaseResolverViewContextValue;

describe('CaseResolverViewContext', () => {
  it('provides split state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CaseResolverViewProvider value={createViewContextValue()}>{children}</CaseResolverViewProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useCaseResolverViewActionsContext(),
        state: useCaseResolverViewStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      activeCaseFile: null,
      editorDetailsTab: 'details',
      workspaceView: 'workspace',
    });
    expect(result.current.actions.handleDeleteFile).toBeTypeOf('function');
    expect(result.current.actions.handleGraphChange).toBeTypeOf('function');
    expect(result.current.actions.setWorkspaceView).toBeTypeOf('function');
  });
});
