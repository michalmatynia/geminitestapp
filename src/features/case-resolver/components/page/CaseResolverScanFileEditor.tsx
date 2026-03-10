'use client';

import {
  Copy,
  File,
  FileText,
  History,
  Lock,
  Network,
  ScanLine,
  ScanText,
  Save,
  Settings2,
  X,
} from 'lucide-react';
import React, { useMemo } from 'react';

import {
  encodeFilemakerPartyReference,
  decodeFilemakerPartyReference,
} from '@/features/filemaker';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  FormField,
  Input,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';

import {
  useCaseResolverViewActionsContext,
  useCaseResolverViewStateContext,
} from '../CaseResolverViewContext';
import { CaseResolverHistoryEntries } from './CaseResolverHistoryEntries';
import { CaseResolverHistoryEntriesRuntimeProvider } from './CaseResolverHistoryEntriesRuntimeContext';
import { CaseResolverPartyFieldRuntimeProvider } from './CaseResolverPartyFieldRuntimeContext';
import { CaseResolverPartySelectField } from './CaseResolverPartySelectField';
import { DocumentRelationSearchPanel } from '../../relation-search';

import type { EditorDetailsTab } from './CaseResolverDocumentEditor';


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

const formatShortDate = (isoDate: string | null | undefined): string => {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
};

function LinkedFileTypeIcon({ fileType }: { fileType: string }): React.JSX.Element {
  if (fileType === 'document') return <FileText className='size-4 text-blue-400/70' />;
  if (fileType === 'scanfile') return <ScanText className='size-4 text-amber-400/70' />;
  return <File className='size-4 text-gray-500' />;
}

const IMAGE_PATH_PATTERN = /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|tiff?|webp)(\?.*)?$/i;
const PDF_PATH_PATTERN = /\.pdf(\?.*)?$/i;

const resolveScanSlotPreviewPath = (filepath: string | null | undefined): string | null => {
  if (typeof filepath !== 'string') return null;
  const trimmed = filepath.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return encodeURI(trimmed);
  }
  return encodeURI(`/${trimmed}`);
};

const resolveScanSlotPreviewKind = (slot: {
  filepath?: string | null;
  mimeType?: string | undefined;
}): 'image' | 'pdf' | 'other' => {
  const mimeType = slot.mimeType?.trim().toLowerCase() ?? '';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  const filepath = slot.filepath?.trim() ?? '';
  if (IMAGE_PATH_PATTERN.test(filepath)) return 'image';
  if (PDF_PATH_PATTERN.test(filepath)) return 'pdf';
  return 'other';
};

export function CaseResolverScanFileEditor(): React.JSX.Element | null {
  const {
    state,
    editorDetailsTab,
    isScanDraftDropActive,
    scanDraftUploadInputRef,
    isEditorDraftDirty,
    caseTagOptions,
    caseIdentifierOptions,
    caseCategoryOptions,
    partyOptions,
  } = useCaseResolverViewStateContext();
  const {
    setEditorDetailsTab,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    handleTriggerScanDraftUpload,
    handleDeleteScanDraftSlot,
    handleRunScanDraftOcr,
    handleScanDraftDragEnter,
    handleScanDraftDragOver,
    handleScanDraftDragLeave,
    handleScanDraftDrop,
    handleScanDraftUploadInputChange,
    handleUpdateDraftDocumentContent,
    updateEditingDocumentDraft,
    handleCopyDraftFileId,
    handleLinkRelatedFiles,
    handleUnlinkRelatedFile,
    handleUseHistoryEntry,
  } = useCaseResolverViewActionsContext();

  const { workspace, editingDocumentDraft, isUploadingScanDraftFiles } = state;

  const draftId = editingDocumentDraft?.id ?? null;
  const originalFile = useMemo(
    () => (draftId ? (workspace.files.find((f) => f.id === draftId) ?? null) : null),
    [workspace.files, draftId]
  );
  const relatedFiles = useMemo(() => {
    const ids = new Set(originalFile?.relatedFileIds ?? []);
    if (ids.size === 0) return [];
    return workspace.files.filter((file) => ids.has(file.id));
  }, [originalFile?.relatedFileIds, workspace.files]);

  if (editingDocumentDraft?.fileType !== 'scanfile') return null;
  const draft = editingDocumentDraft;

  const isEditingDocumentLocked = draft.isLocked;
  const isEditorSaveEnabled = isEditorDraftDirty || (draft.scanSlots ?? []).length > 0;

  const encodedAddresser = encodeFilemakerPartyReference(draft.addresser ?? null);
  const encodedAddressee = encodeFilemakerPartyReference(draft.addressee ?? null);

  const createdAtLabel = draft.createdAt ? formatHistoryTimestamp(draft.createdAt) : 'Unknown';
  const updatedAtLabel = draft.updatedAt ? formatHistoryTimestamp(draft.updatedAt) : 'Unknown';
  const historyEntriesRuntimeValue = useMemo(
    () => ({
      entries: draft.documentHistory ?? [],
      formatTimestamp: formatHistoryTimestamp,
      onRestore: handleUseHistoryEntry,
      isRestoreDisabled: Boolean(isEditingDocumentLocked),
    }),
    [draft.documentHistory, handleUseHistoryEntry, isEditingDocumentLocked]
  );
  const partyFieldRuntimeValue = useMemo(
    () => ({
      options: partyOptions,
      disabled: Boolean(isEditingDocumentLocked),
    }),
    [isEditingDocumentLocked, partyOptions]
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-auto pr-1'>
      {/* ── Header ── */}
      <div className='flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <div className='flex items-center gap-2'>
            <Button
              type='button'
              size='sm'
              onClick={handleSaveFileEditor}
              disabled={!isEditorSaveEnabled || isEditingDocumentLocked}
              className={`h-9 min-w-[120px] rounded-md border shadow-sm transition-all ${
                isEditorSaveEnabled
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  : 'border-border/60 text-gray-500 hover:bg-transparent'
              }`}
            >
              <Save className='mr-2 size-4' />
              Update
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={handleDiscardFileEditorDraft}
              className='h-9 text-gray-400 hover:text-gray-100 hover:bg-white/5'
            >
              <X className='mr-2 size-4' />
              Discard
            </Button>
          </div>
          <div className='h-6 w-px bg-border/40' />
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500'>
              <span className='truncate'>{draft.folder || 'Root'}</span>
              <span className='text-gray-700'>/</span>
              <span className='text-blue-400/80'>{draft.fileType}</span>
            </div>
            <div className='truncate text-sm font-semibold text-gray-100'>{draft.name}</div>
          </div>
        </div>

        {isEditingDocumentLocked && (
          <Badge
            variant='outline'
            className='h-7 border-amber-500/40 bg-amber-500/5 px-2 text-[10px] font-bold text-amber-500'
          >
            LOCKED
          </Badge>
        )}
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={editorDetailsTab}
        onValueChange={(v) => setEditorDetailsTab(v as EditorDetailsTab)}
        className='flex flex-1 flex-col min-h-0'
      >
        <div className='flex items-center justify-between gap-4'>
          <TabsList
            className='h-9 w-fit border border-border/40 bg-card/40 p-1'
            aria-label='Scan editor tabs'
          >
            <TabsTrigger
              value='document'
              className='h-7 px-4 text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400'
            >
              <ScanLine className='mr-2 size-3.5' />
              Scans
            </TabsTrigger>
            <TabsTrigger
              value='relations'
              className='h-7 px-4 text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400'
            >
              <Network className='mr-2 size-3.5' />
              Relations
            </TabsTrigger>
            <TabsTrigger
              value='metadata'
              className='h-7 px-4 text-xs data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400'
            >
              <Settings2 className='mr-2 size-3.5' />
              Metadata
            </TabsTrigger>
            <TabsTrigger
              value='revisions'
              className='h-7 px-4 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400'
            >
              <History className='mr-2 size-3.5' />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        <div className='flex-1 overflow-auto mt-4'>
          {/* ── Scans Tab ── */}
          <TabsContent value='document' className='m-0 flex flex-col gap-4'>
            {/* Upload section — compact, above the text field */}
            <div className='flex flex-col gap-2 rounded-lg border border-border/60 bg-card/10 p-3'>
              <div className='flex items-center justify-between gap-2'>
                <div className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
                  Scan Images / PDF Pages
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleTriggerScanDraftUpload}
                    disabled={isUploadingScanDraftFiles || isEditingDocumentLocked}
                    className='h-7 text-[11px]'
                  >
                    {isUploadingScanDraftFiles ? 'Uploading...' : 'Add Pages'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleRunScanDraftOcr}
                    disabled={(draft.scanSlots ?? []).length === 0 || isEditingDocumentLocked}
                    className='h-7 text-[11px]'
                  >
                    Run OCR
                  </Button>
                </div>
                <input
                  type='file'
                  ref={scanDraftUploadInputRef}
                  onChange={handleScanDraftUploadInputChange}
                  className='hidden'
                  multiple
                  accept='image/*,application/pdf'
                />
              </div>

              <div
                className={`min-h-[140px] rounded-md border-2 border-dashed p-3 transition-colors ${
                  isScanDraftDropActive
                    ? 'border-blue-500/50 bg-blue-500/5'
                    : 'border-border/30 bg-transparent'
                }`}
                onDragEnter={handleScanDraftDragEnter}
                onDragOver={handleScanDraftDragOver}
                onDragLeave={handleScanDraftDragLeave}
                onDrop={handleScanDraftDrop}
              >
                {(draft.scanSlots ?? []).length === 0 ? (
                  <EmptyState
                    icon={<FileText className='size-8 text-gray-700' />}
                    title='No pages yet'
                    description='Drag and drop images or PDF files here, or use the "Add Pages" button.'
                    className='border-none bg-transparent py-2'
                  />
                ) : (
                  <div className='max-h-[200px] overflow-auto'>
                    <div className='grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-8'>
                      {(draft.scanSlots ?? []).map((slot) => (
                        <Card
                          key={slot.id}
                          className='group relative aspect-[3/4] overflow-hidden border-border/60 bg-black/40'
                        >
                          {slot.filepath ? (
                            (() => {
                              const previewPath = resolveScanSlotPreviewPath(slot.filepath);
                              const previewKind = resolveScanSlotPreviewKind(slot);
                              if (previewKind === 'image' && previewPath) {
                                return (
                                  <img
                                    src={previewPath}
                                    alt={slot.name || 'Scan page'}
                                    loading='lazy'
                                    className='h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100'
                                  />
                                );
                              }
                              if (previewKind === 'pdf' && previewPath) {
                                return (
                                  <div className='flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-slate-900/70 to-slate-950/90 p-2 text-center'>
                                    <FileText className='size-6 text-rose-300/80' />
                                    <span className='rounded border border-rose-400/40 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-rose-200/90'>
                                      PDF
                                    </span>
                                    <a
                                      href={previewPath}
                                      target='_blank'
                                      rel='noreferrer'
                                      className='text-[9px] text-blue-300 underline-offset-2 hover:underline'
                                    >
                                      Open
                                    </a>
                                  </div>
                                );
                              }
                              return (
                                <div className='flex h-full flex-col items-center justify-center p-1 text-center'>
                                  <FileText className='mb-1 size-5 text-gray-600' />
                                  <div className='truncate text-[9px] text-gray-500'>
                                    {slot.name || 'File'}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className='flex h-full flex-col items-center justify-center p-1 text-center'>
                              <FileText className='mb-1 size-5 text-gray-600' />
                              <div className='truncate text-[9px] text-gray-500'>
                                {slot.name || 'Uploading...'}
                              </div>
                            </div>
                          )}
                          <div className='absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100'>
                            <Button
                              type='button'
                              variant='destructive'
                              size='sm'
                              onClick={() => handleDeleteScanDraftSlot(slot.id)}
                              disabled={isEditingDocumentLocked}
                              className='h-6 px-2 text-[10px]'
                            >
                              Remove
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* OCR / Markdown text area — main content */}
            <div className='flex flex-col gap-2'>
              <div className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
                OCR Results / Markdown Content
              </div>
              <div className='flex flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/10'>
                <textarea
                  className='min-h-[400px] flex-1 resize-none bg-transparent p-4 text-sm font-mono text-gray-300 focus:outline-none'
                  placeholder='OCR results will appear here after running OCR, or type/paste markdown content...'
                  value={draft.documentContent ?? ''}
                  onChange={(e) => handleUpdateDraftDocumentContent(e.target.value)}
                  readOnly={isEditingDocumentLocked}
                />
              </div>
            </div>

            {/* Footer */}
            <div className='flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/40'>
              <div className='flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-gray-500'>
                <div className='flex items-center gap-2'>
                  <span className='uppercase tracking-wider opacity-60'>Created:</span>
                  <span className='text-gray-300'>{createdAtLabel}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <span className='uppercase tracking-wider opacity-60'>Modified:</span>
                  <span className='text-gray-300'>{updatedAtLabel}</span>
                </div>
              </div>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-8 gap-2 px-2 text-[11px] text-gray-400 hover:bg-white/5 hover:text-gray-200'
                onClick={() => {
                  void handleCopyDraftFileId();
                }}
              >
                <span className='opacity-60'>ID:</span>
                <span className='font-mono'>{draft.id}</span>
                <Copy className='size-3 opacity-60' />
              </Button>
            </div>
          </TabsContent>

          {/* ── Relations Tab ── */}
          <TabsContent value='relations' className='m-0 flex flex-col gap-6'>
            {/* Advanced document search panel */}
            <DocumentRelationSearchPanel
              draftFileId={draft.id}
              isLocked={isEditingDocumentLocked ?? false}
              relationTreeInstance='case_resolver_scanfile_relations'
              defaultFileType='scanfile'
              onLinkFile={(fileId) => handleLinkRelatedFiles(draft.id, fileId)}
            />

            {/* Linked documents list */}
            <div>
              <div className='mb-2 flex items-center justify-between'>
                <div className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
                  Linked Documents
                </div>
                {relatedFiles.length > 0 && (
                  <span className='rounded-full border border-border/40 bg-card/60 px-2 py-0.5 text-[10px] text-gray-500'>
                    {relatedFiles.length}
                  </span>
                )}
              </div>
              {relatedFiles.length === 0 ? (
                <div className='rounded border border-dashed border-border/40 p-8 text-center text-xs text-gray-500'>
                  No related documents linked yet.
                </div>
              ) : (
                <div className='grid gap-2'>
                  {relatedFiles.map((file) => {
                    const dateLabel = formatShortDate(file.documentDate?.isoDate);
                    return (
                      <div
                        key={file.id}
                        className='flex items-start gap-3 rounded border border-border/60 bg-card/20 px-3 py-2'
                      >
                        {/* Type icon */}
                        <div className='mt-0.5 shrink-0'>
                          <LinkedFileTypeIcon fileType={file.fileType} />
                        </div>

                        {/* Name + meta row */}
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-1.5'>
                            <span className='truncate text-xs font-medium text-gray-200'>
                              {file.name}
                            </span>
                            {file.isLocked && (
                              <Lock className='size-3 shrink-0 text-amber-400/70' />
                            )}
                          </div>
                          <div className='mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-gray-500'>
                            {file.fileType && (
                              <span
                                className={
                                  file.fileType === 'document'
                                    ? 'text-blue-400/70'
                                    : file.fileType === 'scanfile'
                                      ? 'text-amber-400/70'
                                      : 'text-gray-500'
                                }
                              >
                                {file.fileType}
                              </span>
                            )}
                            {dateLabel && <span>{dateLabel}</span>}
                            {file.folder && (
                              <span className='truncate opacity-70'>{file.folder}</span>
                            )}
                          </div>
                        </div>

                        {/* Unlink button */}
                        <Button
                          variant='ghost'
                          size='sm'
                          className='mt-0.5 h-7 w-7 shrink-0 p-0 text-gray-500 hover:text-red-400'
                          onClick={() => handleUnlinkRelatedFile(draft.id, file.id)}
                          disabled={isEditingDocumentLocked}
                        >
                          <X className='size-4' />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Metadata Tab ── */}
          <TabsContent value='metadata' className='m-0'>
            <div className='grid gap-6 lg:grid-cols-2'>
              <FormField label='File Name'>
                <Input
                  value={draft.name}
                  onChange={(e) => updateEditingDocumentDraft({ name: e.target.value })}
                  disabled={isEditingDocumentLocked}
                  className='bg-card/20 border-border/60'
                />
              </FormField>
              <FormField label='Tag'>
                <SelectSimple
                  value={draft.tagId ?? '__none__'}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ tagId: v === '__none__' ? null : v })
                  }
                  options={caseTagOptions}
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
              </FormField>
              <FormField label='Case Identifier'>
                <SelectSimple
                  value={draft.caseIdentifierId ?? '__none__'}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ caseIdentifierId: v === '__none__' ? null : v })
                  }
                  options={caseIdentifierOptions}
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
              </FormField>
              <FormField label='Category'>
                <SelectSimple
                  value={draft.categoryId ?? '__none__'}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ categoryId: v === '__none__' ? null : v })
                  }
                  options={caseCategoryOptions}
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
              </FormField>
              <CaseResolverPartyFieldRuntimeProvider value={partyFieldRuntimeValue}>
                <CaseResolverPartySelectField
                  label='Addresser (From)'
                  value={encodedAddresser}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ addresser: decodeFilemakerPartyReference(v) })
                  }
                />
                <CaseResolverPartySelectField
                  label='Addressee (To)'
                  value={encodedAddressee}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ addressee: decodeFilemakerPartyReference(v) })
                  }
                />
              </CaseResolverPartyFieldRuntimeProvider>
              <FormField label='OCR Model'>
                <Input
                  value={draft.scanOcrModel ?? ''}
                  onChange={(e) => updateEditingDocumentDraft({ scanOcrModel: e.target.value })}
                  disabled={isEditingDocumentLocked}
                  placeholder='e.g. gpt-4o'
                  className='bg-card/20 border-border/60'
                />
              </FormField>
              <FormField label='OCR Prompt'>
                <Input
                  value={draft.scanOcrPrompt ?? ''}
                  onChange={(e) => updateEditingDocumentDraft({ scanOcrPrompt: e.target.value })}
                  disabled={isEditingDocumentLocked}
                  placeholder='Custom OCR instruction...'
                  className='bg-card/20 border-border/60'
                />
              </FormField>
            </div>
          </TabsContent>

          {/* ── History Tab ── */}
          <TabsContent value='revisions' className='m-0'>
            <CaseResolverHistoryEntriesRuntimeProvider value={historyEntriesRuntimeValue}>
              <CaseResolverHistoryEntries />
            </CaseResolverHistoryEntriesRuntimeProvider>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
