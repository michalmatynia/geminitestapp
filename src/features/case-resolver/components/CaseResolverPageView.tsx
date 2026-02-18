import { Copy, FileText } from 'lucide-react';
import React, { useCallback } from 'react';

import type {
  CaseResolverCaptureProposalState,
} from '@/features/case-resolver-capture/proposals';
import {
  type CaseResolverCaptureAction,
} from '@/features/case-resolver-capture/settings';
import {
  DocumentWysiwygEditor,
  ensureHtmlForPreview,
  MarkdownSplitEditor,
} from '@/features/document-editor';
import {
  decodeFilemakerPartyReference,
  encodeFilemakerPartyReference,
} from '@/features/filemaker/settings';
import {
  AppModal,
  Button,
  Input,
  Label,
  MultiSelect,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  PanelHeader,
  EmptyState,
} from '@/shared/ui';
import { sanitizeHtml } from '@/shared/utils';

import { CaseResolverCanvasWorkspace } from './CaseResolverCanvasWorkspace';
import { CaseResolverFileViewer } from './CaseResolverFileViewer';
import { CaseResolverFolderTree } from './CaseResolverFolderTree';
import { CaseResolverRelationsWorkspace } from './CaseResolverRelationsWorkspace';
import { PromptExploderCaptureMappingModal } from './PromptExploderCaptureMappingModal';
import {
  CaseResolverPageProvider,
} from '../context/CaseResolverPageContext';
import { useCaseResolverState } from '../hooks/useCaseResolverState';

import type {
  CaseResolverDocumentHistoryEntry,
  CaseResolverFileEditDraft,
  CaseResolverGraph,
  CaseResolverRelationGraph,
} from '../types';

const ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR =
  process.env['NEXT_PUBLIC_CASE_RESOLVER_MULTIFORMAT_EDITOR'] !== 'false';

type SelectOption = {
  value: string;
  label: string;
};

type WorkspaceView = 'document' | 'relations';
type EditorDetailsTab = 'document' | 'metadata' | 'history';

type CaseResolverPageViewProps = {
  state: ReturnType<typeof useCaseResolverState>;
  workspaceView: WorkspaceView;
  setWorkspaceView: React.Dispatch<React.SetStateAction<WorkspaceView>>;
  handleMoveFolder: (fromPath: string, toPath: string) => Promise<void>;
  handleToggleFolderLock: (folderPath: string) => void;
  handleToggleFileLock: (fileId: string) => void;
  handleDeleteFile: (fileId: string) => void;
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
  handleRunScanDraftOcr: () => void;
  updateEditingDocumentDraft: (patch: Partial<CaseResolverFileEditDraft>) => void;
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
  promptExploderProposalDraft: CaseResolverCaptureProposalState | null;
  captureProposalTargetFileName: string | null;
  handleClosePromptExploderProposalModal: () => void;
  handleApplyPromptExploderProposal: () => void;
  updatePromptExploderProposalAction: (
    role: 'addresser' | 'addressee',
    action: CaseResolverCaptureAction
  ) => void;
  updatePromptExploderProposalReference: (
    role: 'addresser' | 'addressee',
    value: string
  ) => void;
  resolvePromptExploderMatchedPartyLabel: (
    reference: CaseResolverCaptureProposalState['addresser'] extends infer T
      ? T extends { existingReference?: infer R | null }
        ? R | null | undefined
        : null | undefined
      : null | undefined
  ) => string;
};

const formatHistoryTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(parsed);
};

export function CaseResolverPageView(props: CaseResolverPageViewProps): React.JSX.Element {
  const {
    state,
    workspaceView,
    setWorkspaceView,
    handleMoveFolder,
    handleToggleFolderLock,
    handleToggleFileLock,
    handleDeleteFile,
    handleGraphChange,
    handleRelationGraphChange,
    editorDetailsTab,
    setEditorDetailsTab,
    isScanDraftDropActive,
    scanDraftUploadInputRef,
    handleScanDraftDragEnter,
    handleScanDraftDragOver,
    handleScanDraftDragLeave,
    handleScanDraftDrop,
    handleScanDraftUploadInputChange,
    handleTriggerScanDraftUpload,
    handleRunScanDraftOcr,
    updateEditingDocumentDraft,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    caseReferenceOptions,
    parentCaseOptions,
    partyOptions,
    handleUseHistoryEntry,
    isEditorDraftDirty,
    handleOpenPromptExploderForDraft,
    editorContentRevisionSeed,
    handleUpdateDraftDocumentContent,
    editorTextareaRef,
    editorSplitRef,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
    handleCopyDraftFileId,
    promptExploderProposalDraft,
    captureProposalTargetFileName,
    handleClosePromptExploderProposalModal,
    handleApplyPromptExploderProposal,
    updatePromptExploderProposalAction,
    updatePromptExploderProposalReference,
    resolvePromptExploderMatchedPartyLabel,
  } = props;

  const {
    workspace,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    folderPanelCollapsed,
    setFolderPanelCollapsed,
    setActiveMainView,
    editingDocumentDraft,
    isUploadingScanDraftFiles,
    uploadingScanSlotId,
    caseResolverTags,
    caseResolverIdentifiers,
    caseResolverCategories,
    handleSelectFile,
    handleSelectAsset,
    handleSelectFolder,
    handleCreateFolder,
    handleCreateFile,
    handleCreateScanFile,
    handleCreateImageAsset,
    handleUploadScanFiles,
    handleRunScanFileOcr,
    handleUploadAssets,
    handleAttachAssetFile,
    handleDeleteFolder,
    handleOpenFileEditor,
    activeFile,
    selectedAsset,
    handleUpdateSelectedAsset,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    promptExploderPartyProposal,
    isPromptExploderPartyProposalOpen,
    setIsPromptExploderPartyProposalOpen,
    isApplyingPromptExploderPartyProposal,
    ConfirmationModal,
    PromptInputModal,
  } = state;

  const handleCreateNodeFile = useCallback((): void => {
    handleCreateFile(null);
  }, [handleCreateFile]);

  const handleCreateDocumentFromSearch = useCallback((): void => {
    setActiveMainView('workspace');
    handleCreateFile(null);
  }, [handleCreateFile, setActiveMainView]);

  const handleOpenFileFromSearch = useCallback((id: string): void => {
    setActiveMainView('workspace');
    handleSelectFile(id);
  }, [handleSelectFile, setActiveMainView]);

  const handleEditFileFromSearch = useCallback((id: string): void => {
    setActiveMainView('workspace');
    handleOpenFileEditor(id);
  }, [handleOpenFileEditor, setActiveMainView]);

  // Main Render
  return (
    <CaseResolverPageProvider value={{
      workspace,
      activeCaseId,
      requestedCaseStatus,
      canCreateInActiveCase,
      selectedFileId,
      selectedAssetId,
      selectedFolderPath,
      activeFile,
      selectedAsset,
      panelCollapsed: folderPanelCollapsed,
      onPanelCollapsedChange: setFolderPanelCollapsed,
      onSelectFile: handleSelectFile,
      onSelectAsset: handleSelectAsset,
      onSelectFolder: handleSelectFolder,
      onCreateFile: handleCreateFile,
      onCreateFolder: handleCreateFolder,
      onDeleteFolder: handleDeleteFolder,
      onCreateScanFile: handleCreateScanFile,
      onCreateImageAsset: handleCreateImageAsset,
      onCreateNodeFile: handleCreateNodeFile,
      onUploadScanFiles: handleUploadScanFiles,
      onRunScanFileOcr: handleRunScanFileOcr,
      onUploadAssets: handleUploadAssets,
      onAttachAssetFile: handleAttachAssetFile,
      onMoveFile: state.handleMoveFile,
      onMoveAsset: state.handleMoveAsset,
      onMoveFolder: handleMoveFolder,
      onRenameFile: state.handleRenameFile,
      onRenameAsset: state.handleRenameAsset,
      onRenameFolder: state.handleRenameFolder,
      onToggleFolderLock: handleToggleFolderLock,
      onDeleteFile: handleDeleteFile,
      onToggleFileLock: handleToggleFileLock,
      onEditFile: handleOpenFileEditor,
      caseResolverTags,
      caseResolverIdentifiers,
      caseResolverCategories,
      onCreateDocumentFromSearch: handleCreateDocumentFromSearch,
      onOpenFileFromSearch: handleOpenFileFromSearch,
      onEditFileFromSearch: handleEditFileFromSearch,
      onUpdateSelectedAsset: handleUpdateSelectedAsset,
      onGraphChange: handleGraphChange,
      onRelationGraphChange: handleRelationGraphChange,
    }}>
      <div className='flex h-full flex-col overflow-hidden bg-background'>
        <div className='flex flex-1 overflow-hidden'>
          {!folderPanelCollapsed && (
            <div className='w-80 flex-shrink-0 border-r border-border bg-card/20'>
              <CaseResolverFolderTree />
            </div>
          )}
          
          <div className='flex flex-1 flex-col overflow-hidden p-6'>
            <PanelHeader
              title='Case Resolver'
              description='Admin / Case Resolver'
              className='mb-6'
              actions={[
                {
                  key: 'document',
                  label: 'Document Canvas',
                  variant: workspaceView === 'document' ? 'default' : 'outline',
                  onClick: () => setWorkspaceView('document'),
                },
                {
                  key: 'relations',
                  label: 'Relations Canvas',
                  variant: workspaceView === 'relations' ? 'default' : 'outline',
                  onClick: () => setWorkspaceView('relations'),
                },
                {
                  key: 'parties',
                  label: 'Parties & References',
                  variant: 'default',
                  onClick: () => {
                    if (!activeFile) return;
                    handleOpenFileEditor(activeFile.id);
                  },
                  disabled: Boolean(selectedAsset) || !activeFile || activeFile.fileType === 'case',
                }
              ]}
            />

            {workspaceView === 'relations' ? (
              <CaseResolverRelationsWorkspace />
            ) : selectedAsset ? (
              <CaseResolverFileViewer />
            ) : activeFile ? (
              <CaseResolverCanvasWorkspace />
            ) : (
              <div className='flex flex-1 items-center justify-center rounded-lg border border-dashed border-border'>
                <EmptyState
                  icon={<FileText className='size-12 text-gray-600' />}
                  title='No case selected'
                  description='Select a file from the tree to begin.'
                  className='border-none p-0'
                />
              </div>
            )}
          </div>
        </div>

        {/* All Modals */}
        <AppModal
          open={editingDocumentDraft !== null}
          onOpenChange={(open) => { if (!open) handleSaveFileEditor(); }}
          title={editingDocumentDraft?.fileType === 'scanfile' ? 'Edit Scan' : 'Edit Document'}
          size='xl'
        >
          {editingDocumentDraft && (
            <div className='space-y-4'>
              <div className='rounded border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='font-mono text-[11px] text-gray-400'>
                    File ID: {editingDocumentDraft.id}
                  </div>
                  <div className='text-[11px] text-gray-400'>
                    Folder: {editingDocumentDraft.folder || '(root)'}
                  </div>
                </div>
              </div>

              {editingDocumentDraft.fileType === 'scanfile' ? (
                <div
                  className={`rounded border px-3 py-3 transition ${
                    isScanDraftDropActive
                      ? 'border-cyan-500/70 bg-cyan-500/10'
                      : 'border-border/60 bg-card/30'
                  }`}
                  onDragEnter={handleScanDraftDragEnter}
                  onDragOver={handleScanDraftDragOver}
                  onDragLeave={handleScanDraftDragLeave}
                  onDrop={handleScanDraftDrop}
                >
                  <input
                    ref={scanDraftUploadInputRef}
                    type='file'
                    accept='image/*'
                    multiple
                    className='hidden'
                    onChange={handleScanDraftUploadInputChange}
                  />
                  <div className='flex flex-wrap items-center gap-2'>
                    <div className='text-xs font-medium text-gray-200'>Image Slots</div>
                    <div className='ml-auto flex items-center gap-2'>
                      <Button
                        type='button'
                        onClick={handleTriggerScanDraftUpload}
                        disabled={isUploadingScanDraftFiles}
                        className='h-8 rounded-md border border-border text-xs text-gray-100 hover:bg-muted/60 disabled:opacity-60'
                      >
                        {isUploadingScanDraftFiles ? 'Uploading...' : 'Upload Images'}
                      </Button>
                      <Button
                        type='button'
                        onClick={handleRunScanDraftOcr}
                        disabled={
                          editingDocumentDraft.scanSlots.length === 0 ||
                          isUploadingScanDraftFiles ||
                          uploadingScanSlotId !== null
                        }
                        className='h-8 rounded-md border border-cyan-500/40 text-xs text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-60'
                      >
                        {uploadingScanSlotId !== null ? 'Running OCR...' : 'Run OCR'}
                      </Button>
                    </div>
                  </div>
                  <div className='mt-1 text-[11px] text-gray-500'>
                    Drag and drop image files here, or use Upload Images.
                  </div>
                  <div className='mt-2 max-h-32 space-y-1 overflow-auto pr-1'>
                    {editingDocumentDraft.scanSlots.length === 0 ? (
                      <div className='rounded border border-dashed border-border/60 px-2 py-1.5 text-[11px] text-gray-500'>
                        No images uploaded yet.
                      </div>
                    ) : (
                      editingDocumentDraft.scanSlots.map((slot) => (
                        <div
                          key={slot.id}
                          className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-2 py-1.5 text-[11px]'
                        >
                          <div className='min-w-0'>
                            <div className='truncate text-gray-200'>{slot.name || 'Untitled image'}</div>
                            <div className='text-gray-500'>
                              {uploadingScanSlotId === 'all' || uploadingScanSlotId === slot.id
                                ? 'Processing OCR...'
                                : slot.ocrText.trim().length > 0
                                  ? 'OCR extracted'
                                  : 'OCR pending'}
                            </div>
                          </div>
                          {slot.filepath ? (
                            <a
                              href={slot.filepath}
                              target='_blank'
                              rel='noreferrer'
                              className='text-cyan-200 hover:text-cyan-100'
                            >
                              Open
                            </a>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <Tabs
                value={editorDetailsTab}
                onValueChange={(value: string): void => {
                  if (value === 'document' || value === 'metadata' || value === 'history') {
                    setEditorDetailsTab(value);
                  }
                }}
                className='space-y-3'
              >
                <TabsList className='h-9'>
                  <TabsTrigger value='document' className='text-xs'>Document</TabsTrigger>
                  <TabsTrigger value='metadata' className='text-xs'>Case Metadata</TabsTrigger>
                  <TabsTrigger value='history' className='text-xs'>History</TabsTrigger>
                </TabsList>

                <TabsContent value='document' className='mt-0'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Name</Label>
                      <Input
                        value={editingDocumentDraft.name}
                        onChange={(event) => {
                          updateEditingDocumentDraft({ name: event.target.value });
                        }}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Document Date</Label>
                      <Input
                        type='date'
                        value={editingDocumentDraft.documentDate}
                        onChange={(event) => {
                          updateEditingDocumentDraft({ documentDate: event.target.value });
                        }}
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Addresser</Label>
                      <SelectSimple
                        size='sm'
                        value={encodeFilemakerPartyReference(editingDocumentDraft.addresser)}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            addresser: decodeFilemakerPartyReference(value),
                          });
                        }}
                        options={partyOptions}
                        placeholder='Select addresser'
                        triggerClassName='h-9'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Addressee</Label>
                      <SelectSimple
                        size='sm'
                        value={encodeFilemakerPartyReference(editingDocumentDraft.addressee)}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            addressee: decodeFilemakerPartyReference(value),
                          });
                        }}
                        options={partyOptions}
                        placeholder='Select addressee'
                        triggerClassName='h-9'
                      />
                    </div>

                  </div>
                </TabsContent>

                <TabsContent value='metadata' className='mt-0'>
                  <div className='grid gap-3 md:grid-cols-2'>
                    <div className='md:col-span-2'>
                      <Label className='mb-2 block text-xs text-gray-400'>Reference Cases</Label>
                      <MultiSelect
                        options={caseReferenceOptions.filter(
                          (option) => option.value !== editingDocumentDraft.id
                        )}
                        selected={editingDocumentDraft.referenceCaseIds.filter(
                          (referenceId: string) => referenceId !== editingDocumentDraft.id
                        )}
                        onChange={(values: string[]): void => {
                          updateEditingDocumentDraft({
                            referenceCaseIds: values.filter(
                              (referenceId: string) => referenceId !== editingDocumentDraft.id
                            ),
                          });
                        }}
                        placeholder='Select reference cases'
                        searchPlaceholder='Search cases...'
                        emptyMessage='No cases available.'
                        className='w-full'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Parent Case</Label>
                      <SelectSimple
                        size='sm'
                        value={editingDocumentDraft.parentCaseId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            parentCaseId: value === '__none__' ? null : value,
                          });
                        }}
                        options={parentCaseOptions.filter(
                          (option) => option.value === '__none__' || option.value !== editingDocumentDraft.id
                        )}
                        placeholder='Parent case'
                        triggerClassName='h-9'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Tag</Label>
                      <SelectSimple
                        size='sm'
                        value={editingDocumentDraft.tagId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            tagId: value === '__none__' ? null : value,
                          });
                        }}
                        options={caseTagOptions}
                        placeholder='Select tag'
                        triggerClassName='h-9'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Case Identifier</Label>
                      <SelectSimple
                        size='sm'
                        value={editingDocumentDraft.caseIdentifierId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            caseIdentifierId: value === '__none__' ? null : value,
                          });
                        }}
                        options={caseIdentifierOptions}
                        placeholder='Select case identifier'
                        triggerClassName='h-9'
                      />
                    </div>

                    <div className='space-y-2'>
                      <Label className='text-xs text-gray-400'>Category</Label>
                      <SelectSimple
                        size='sm'
                        value={editingDocumentDraft.categoryId ?? '__none__'}
                        onValueChange={(value: string): void => {
                          updateEditingDocumentDraft({
                            categoryId: value === '__none__' ? null : value,
                          });
                        }}
                        options={caseCategoryOptions}
                        placeholder='Select category'
                        triggerClassName='h-9'
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value='history' className='mt-0'>
                  {editingDocumentDraft.documentHistory.length === 0 ? (
                    <div className='rounded border border-dashed border-border/60 px-3 py-3 text-xs text-gray-500'>
                      No saved versions yet. Once you save an overwrite, the previous text will appear here.
                    </div>
                  ) : (
                    <div className='space-y-2'>
                      {editingDocumentDraft.documentHistory.map((entry: CaseResolverDocumentHistoryEntry) => (
                        <div
                          key={entry.id}
                          className='rounded border border-border/60 bg-card/20 px-3 py-2 text-xs'
                        >
                          <div className='flex flex-wrap items-center justify-between gap-2'>
                            <div className='text-gray-300'>
                              Version {entry.documentContentVersion} · {entry.editorType.toUpperCase()}
                            </div>
                            <div className='text-[11px] text-gray-500'>
                              {formatHistoryTimestamp(entry.savedAt)}
                            </div>
                          </div>
                          <div className='mt-2 max-h-28 overflow-auto rounded border border-border/60 bg-card/30 px-2 py-1.5 font-mono text-[11px] text-gray-400 whitespace-pre-wrap'>
                            {entry.documentContentPlainText.trim().length > 0
                              ? entry.documentContentPlainText
                              : '(Empty version)'}
                          </div>
                          <div className='mt-2 flex justify-end'>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 text-[11px]'
                              onClick={(): void => {
                                handleUseHistoryEntry(entry);
                              }}
                            >
                              Load Into Editor
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className='flex items-center justify-between gap-2 rounded border border-border/60 bg-card/30 px-3 py-2 text-xs'>
                <span className='text-gray-400'>
                  Revision {editingDocumentDraft.baseDocumentContentVersion}
                  {isEditorDraftDirty ? ' · unsaved changes' : ' · saved'}
                </span>
                {editingDocumentDraft.documentConversionWarnings.length > 0 ? (
                  <span className='text-amber-300'>
                    {editingDocumentDraft.documentConversionWarnings[0]}
                  </span>
                ) : null}
              </div>

              <div className='flex justify-end gap-2'>
                {promptExploderPartyProposal?.targetFileId === editingDocumentDraft.id ? (
                  <Button
                    type='button'
                    variant='outline'
                    className='h-8'
                    onClick={(): void => {
                      setIsPromptExploderPartyProposalOpen(true);
                    }}
                  >
                    Review Capture Mapping
                  </Button>
                ) : null}
                <Button
                  type='button'
                  variant='outline'
                  className='h-8'
                  onClick={handleOpenPromptExploderForDraft}
                >
                  Prompt Exploder: Extract + Reassemble
                </Button>
              </div>

              {ENABLE_CASE_RESOLVER_MULTIFORMAT_EDITOR ? (
                <>
                  {editingDocumentDraft.editorType === 'wysiwyg' ? (
                    <DocumentWysiwygEditor
                      key={`case-resolver-wysiwyg-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentHtml}
                      onChange={handleUpdateDraftDocumentContent}
                      allowFontFamily
                      allowTextAlign
                      surfaceClassName='min-h-[300px]'
                      editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                    />
                  ) : (
                    <MarkdownSplitEditor
                      key={`case-resolver-markdown-${editorContentRevisionSeed}`}
                      value={editingDocumentDraft.documentContentMarkdown}
                      onChange={handleUpdateDraftDocumentContent}
                      showPreview
                      renderPreviewHtml={(value: string): string => ensureHtmlForPreview(value, 'markdown')}
                      sanitizePreviewHtml={sanitizeHtml}
                      textareaRef={editorTextareaRef}
                      splitRef={editorSplitRef}
                      editorWidth={editorWidth}
                      onEditorWidthChange={setEditorWidth}
                      isDraggingSplitter={isDraggingSplitter}
                      onDraggingSplitterChange={setIsDraggingSplitter}
                      placeholder='Enter document content'
                      textareaClassName='w-full min-h-[300px] rounded-lg border px-4 py-2 font-mono'
                    />
                  )}
                </>
              ) : (
                <DocumentWysiwygEditor
                  key={`case-resolver-wysiwyg-fallback-${editorContentRevisionSeed}`}
                  value={editingDocumentDraft.documentContentHtml}
                  onChange={handleUpdateDraftDocumentContent}
                  allowFontFamily
                  allowTextAlign
                  surfaceClassName='min-h-[300px]'
                  editorContentClassName='[&_.ProseMirror]:!min-h-[300px]'
                />
              )}

              <div className='flex justify-end gap-2'>
                <Button variant='outline' onClick={handleDiscardFileEditorDraft}>Discard</Button>
                <Button onClick={handleSaveFileEditor}>
                  Save Changes
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-9 max-w-[220px] gap-1.5 truncate px-2 text-[11px] text-gray-400 hover:text-gray-100'
                  onClick={(): void => {
                    void handleCopyDraftFileId();
                  }}
                  title='Copy file ID'
                >
                  <span className='truncate'>ID: {editingDocumentDraft.id}</span>
                  <Copy className='size-3' />
                </Button>
              </div>
            </div>
          )}
        </AppModal>

        <PromptExploderCaptureMappingModal
          open={isPromptExploderPartyProposalOpen}
          draft={promptExploderProposalDraft}
          applying={isApplyingPromptExploderPartyProposal}
          targetFileName={captureProposalTargetFileName}
          partyOptions={partyOptions}
          onClose={handleClosePromptExploderProposalModal}
          onApply={handleApplyPromptExploderProposal}
          onUpdateAction={updatePromptExploderProposalAction}
          onUpdateReference={updatePromptExploderProposalReference}
          resolveMatchedPartyLabel={resolvePromptExploderMatchedPartyLabel}
        />
        
        <ConfirmationModal />
        <PromptInputModal />
      </div>
    </CaseResolverPageProvider>
  );
}
