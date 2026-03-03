import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CaseResolverStateValue } from '@/features/case-resolver/types';
import type { CaseResolverViewContextValue } from '@/features/case-resolver/components/CaseResolverViewContext';
import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
} from '@/shared/contracts/case-resolver';
import { CaseResolverDocumentEditor } from '@/features/case-resolver/components/page/CaseResolverDocumentEditor';
import { CaseResolverScanFileEditor } from '@/features/case-resolver/components/page/CaseResolverScanFileEditor';

vi.mock('next/image', () => ({
  default: () => <div data-testid='mock-next-image' />,
}));

vi.mock('@/features/document-editor', () => ({
  DocumentWysiwygEditor: () => <div data-testid='mock-wysiwyg-editor' />,
}));

vi.mock('@/features/case-resolver/relation-search', () => ({
  DocumentRelationSearchPanel: () => <div data-testid='mock-relation-search-panel' />,
}));

vi.mock('@/features/case-resolver/hooks/prompt-exploder-transfer-lifecycle', () => ({
  resolvePromptExploderTransferStatusLabel: () => 'Idle',
}));

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: vi.fn() }),
  };
});

const handleUseHistoryEntryMock = vi.fn();
const setEditorDetailsTabMock = vi.fn();

const buildHistoryEntry = (
  overrides: Partial<CaseResolverDocumentHistoryEntry> = {}
): CaseResolverDocumentHistoryEntry => ({
  id: 'history-1',
  savedAt: '2026-02-25T10:00:00.000Z',
  documentContentVersion: 10,
  activeDocumentVersion: 'original',
  editorType: 'wysiwyg',
  documentContent: '',
  documentContentMarkdown: '',
  documentContentHtml: '',
  documentContentPlainText: '',
  ...overrides,
});

const buildDraft = (
  fileType: 'document' | 'scanfile',
  history: CaseResolverDocumentHistoryEntry[]
): CaseResolverFileEditDraft => ({
  id: `${fileType}-1`,
  name: `${fileType} file`,
  fileType,
  folder: '',
  content: '',
  documentContent: '',
  documentContentHtml: '',
  documentContentMarkdown: '',
  documentContentPlainText: '',
  documentContentVersion: 1,
  documentContentFormatVersion: 1,
  activeDocumentVersion: 'original',
  editorType: fileType === 'scanfile' ? 'markdown' : 'wysiwyg',
  documentHistory: history,
  createdAt: '2026-02-25T09:00:00.000Z',
  updatedAt: '2026-02-25T09:30:00.000Z',
  isLocked: false,
  addresser: null,
  addressee: null,
  tagId: null,
  caseIdentifierId: null,
  categoryId: null,
  referenceCaseIds: [],
  documentCity: null,
  documentDate: null,
  documentConversionWarnings: [],
  scanSlots: [],
  scanOcrModel: '',
  scanOcrPrompt: '',
  originalDocumentContent: '',
  explodedDocumentContent: '',
});

let viewContextMock: CaseResolverViewContextValue;

vi.mock('@/features/case-resolver/components/CaseResolverViewContext', () => ({
  useCaseResolverViewContext: (): CaseResolverViewContextValue => viewContextMock,
}));

const createContextMock = (
  editingDocumentDraft: CaseResolverFileEditDraft
): CaseResolverViewContextValue => {
  const state = {
    workspace: {
      id: 'workspace-1',
      files: [
        {
          id: editingDocumentDraft.id,
          name: editingDocumentDraft.name,
          fileType: editingDocumentDraft.fileType,
          folder: editingDocumentDraft.folder,
          relatedFileIds: [],
        },
      ],
      assets: [],
    },
    editingDocumentDraft,
    pendingPromptExploderPayload: null,
    handleApplyPendingPromptExploderPayload: vi.fn(),
    handleDiscardPendingPromptExploderPayload: vi.fn(),
    isUploadingScanDraftFiles: false,
  } as unknown as CaseResolverStateValue;

  return {
    state,
    workspaceView: 'document',
    setWorkspaceView: vi.fn(),
    handleMoveFolder: vi.fn(),
    handleToggleFolderLock: vi.fn(),
    handleToggleFileLock: vi.fn(),
    handleDeleteFile: vi.fn(),
    handleDeleteAsset: vi.fn(),
    handleGraphChange: vi.fn(),
    handleRelationGraphChange: vi.fn(),
    editorDetailsTab: 'revisions',
    setEditorDetailsTab: setEditorDetailsTabMock,
    isScanDraftDropActive: false,
    scanDraftUploadInputRef: { current: null },
    handleScanDraftDragEnter: vi.fn(),
    handleScanDraftDragOver: vi.fn(),
    handleScanDraftDragLeave: vi.fn(),
    handleScanDraftDrop: vi.fn(),
    handleScanDraftUploadInputChange: vi.fn(),
    handleTriggerScanDraftUpload: vi.fn(),
    handleDeleteScanDraftSlot: vi.fn(),
    handleRunScanDraftOcr: vi.fn(),
    updateEditingDocumentDraft: vi.fn(),
    editingDocumentNodeMeta: null,
    updateEditingDocumentNodeMeta: vi.fn(),
    caseTagOptions: [],
    caseIdentifierOptions: [],
    caseCategoryOptions: [],
    caseReferenceOptions: [],
    parentCaseOptions: [],
    partyOptions: [],
    handleUseHistoryEntry: handleUseHistoryEntryMock,
    isEditorDraftDirty: false,
    handleOpenPromptExploderForDraft: vi.fn(),
    editorContentRevisionSeed: 0,
    handleUpdateDraftDocumentContent: vi.fn(),
    editorTextareaRef: { current: null },
    editorSplitRef: { current: null },
    editorWidth: null,
    setEditorWidth: vi.fn(),
    isDraggingSplitter: false,
    setIsDraggingSplitter: vi.fn(),
    handleCopyDraftFileId: vi.fn(),
    handlePreviewDraftPdf: vi.fn(),
    handlePrintDraftDocument: vi.fn(),
    handleExportDraftPdf: vi.fn(),
    promptExploderProposalDraft: null,
    captureProposalTargetFileName: null,
    handleClosePromptExploderProposalModal: vi.fn(),
    handleApplyPromptExploderProposal: vi.fn(),
    updatePromptExploderProposalAction: vi.fn(),
    updatePromptExploderProposalReference: vi.fn(),
    updatePromptExploderProposalDateAction: vi.fn(),
    resolvePromptExploderMatchedPartyLabel: vi.fn(() => 'None'),
    captureApplyDiagnostics: null,
    handleUpdateActiveFileParties: vi.fn(),
    handleLinkRelatedFiles: vi.fn(),
    handleUnlinkRelatedFile: vi.fn(),
    handleSaveFileEditor: vi.fn(),
    handleDiscardFileEditorDraft: vi.fn(),
    handleDeactivateActiveFile: vi.fn(),
    handleCreateDocumentFromSearch: vi.fn(),
    handleOpenFileFromSearch: vi.fn(),
    handleEditFileFromSearch: vi.fn(),
    handleUpdateActiveCaseMetadata: vi.fn(),
    activeCaseFile: null,
  } as unknown as CaseResolverViewContextValue;
};

describe('case resolver editor history previews', () => {
  beforeEach(() => {
    handleUseHistoryEntryMock.mockReset();
    setEditorDetailsTabMock.mockReset();
  });

  it('renders preview and fallback in document editor history tab and keeps restore action', () => {
    const withPreview = buildHistoryEntry({
      id: 'history-preview',
      documentContentPlainText: 'Document preview text',
    });
    const withoutPreview = buildHistoryEntry({
      id: 'history-empty',
      documentContentPlainText: '',
      documentContentMarkdown: '',
      documentContentHtml: '',
      documentContent: '',
    });
    viewContextMock = createContextMock(buildDraft('document', [withPreview, withoutPreview]));

    render(<CaseResolverDocumentEditor />);

    expect(screen.getByText('Document preview text')).toBeInTheDocument();
    expect(screen.getByText('No preview text.')).toBeInTheDocument();

    const restoreButtons = screen.getAllByRole('button', { name: 'Restore' });
    fireEvent.click(restoreButtons[0] as HTMLButtonElement);
    expect(handleUseHistoryEntryMock).toHaveBeenCalledWith(withPreview);
  });

  it('renders preview and fallback in scan editor history tab and keeps restore action', () => {
    const withPreview = buildHistoryEntry({
      id: 'scan-history-preview',
      documentContentPlainText: 'Scan preview text',
    });
    const withoutPreview = buildHistoryEntry({
      id: 'scan-history-empty',
      documentContentPlainText: '',
      documentContentMarkdown: '',
      documentContentHtml: '',
      documentContent: '',
    });
    viewContextMock = createContextMock(buildDraft('scanfile', [withPreview, withoutPreview]));

    render(<CaseResolverScanFileEditor />);

    expect(screen.getByText('Scan preview text')).toBeInTheDocument();
    expect(screen.getByText('No preview text.')).toBeInTheDocument();

    const restoreButtons = screen.getAllByRole('button', { name: 'Restore' });
    fireEvent.click(restoreButtons[0] as HTMLButtonElement);
    expect(handleUseHistoryEntryMock).toHaveBeenCalledWith(withPreview);
  });
});
