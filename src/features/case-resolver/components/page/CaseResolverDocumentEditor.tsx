'use client';

import {
  File,
  FileText,
  History,
  Lock,
  Network,
  Pencil,
  ScanText,
  Settings2,
  Save,
  X,
  ExternalLink,
  Printer,
  Download,
  Terminal,
  Copy,
} from 'lucide-react';
import React, { useMemo } from 'react';

import { DocumentWysiwygEditor } from '@/shared/lib/document-editor';
import {
  encodeFilemakerPartyReference,
  decodeFilemakerPartyReference,
} from '@/features/filemaker/settings';
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useCaseResolverViewContext } from '../CaseResolverViewContext';
import { DocumentRelationSearchPanel } from '../../relation-search';
import {
  resolvePromptExploderTransferStatusLabel,
  type PromptExploderTransferUiStatus,
} from '../../hooks/prompt-exploder-transfer-lifecycle';
import { CaseResolverHistoryEntries } from './CaseResolverHistoryEntries';

export type EditorDetailsTab = 'document' | 'relations' | 'metadata' | 'revisions';

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

export function CaseResolverDocumentEditor(): React.JSX.Element | null {
  const contextValue = useCaseResolverViewContext();
  const {
    state,
    editorDetailsTab,
    setEditorDetailsTab,
    updateEditingDocumentDraft,
    caseTagOptions,
    handleUseHistoryEntry,
    isEditorDraftDirty,
    editorContentRevisionSeed,
    handleUpdateDraftDocumentContent,
    handleCopyDraftFileId,
    handlePreviewDraftPdf,
    handlePrintDraftDocument,
    handleExportDraftPdf,
    handleSaveFileEditor,
    handleLinkRelatedFiles,
    handleUnlinkRelatedFile,
    captureApplyDiagnostics,
    caseIdentifierOptions,
    caseCategoryOptions,
    partyOptions,
    handleOpenPromptExploderForDraft,
  } = contextValue;

  const {
    workspace,
    editingDocumentDraft,
    pendingPromptExploderPayload,
    handleApplyPendingPromptExploderPayload,
    handleDiscardPendingPromptExploderPayload,
  } = state;

  const [isRenamingName, setIsRenamingName] = React.useState(false);
  const [nameInputValue, setNameInputValue] = React.useState('');
  const nameInputRef = React.useRef<HTMLInputElement>(null);

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

  if (!editingDocumentDraft || editingDocumentDraft.fileType === 'scanfile') return null;
  const draft = editingDocumentDraft;

  const isEditingDocumentLocked = draft.isLocked;
  const isEditorSaveEnabled = isEditorDraftDirty;

  const encodedAddresser = encodeFilemakerPartyReference(draft.addresser ?? null);
  const encodedAddressee = encodeFilemakerPartyReference(draft.addressee ?? null);

  const createdAtLabel = draft.createdAt ? formatHistoryTimestamp(draft.createdAt) : 'Unknown';
  const updatedAtLabel = draft.updatedAt ? formatHistoryTimestamp(draft.updatedAt) : 'Unknown';

  const canApplyPendingPromptOutput = Boolean(pendingPromptExploderPayload);
  const promptTransferStatus =
    captureApplyDiagnostics?.status ?? (pendingPromptExploderPayload ? 'pending' : 'idle');
  const promptTransferStatusLabel = resolvePromptExploderTransferStatusLabel(
    promptTransferStatus as PromptExploderTransferUiStatus
  );

  const showPromptExploderApplyAction = canApplyPendingPromptOutput;

  const pendingPromptTransferId = pendingPromptExploderPayload?.transferId ?? '';

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-6 overflow-auto pr-1'>
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
          </div>
          <div className='h-6 w-px bg-border/40' />
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2 text-[10px] uppercase tracking-wider text-gray-500'>
              <span className='truncate'>{editingDocumentDraft.folder || 'Root'}</span>
              <span className='text-gray-700'>/</span>
              <span className='text-blue-400/80'>{editingDocumentDraft.fileType}</span>
            </div>

            {isRenamingName ? (
              <input
                ref={nameInputRef}
                autoFocus
                value={nameInputValue}
                onChange={(e) => setNameInputValue(e.target.value)}
                onBlur={() => {
                  const trimmed = nameInputValue.trim();
                  if (trimmed && trimmed !== draft.name) {
                    updateEditingDocumentDraft({ name: trimmed });
                  }
                  setIsRenamingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  } else if (e.key === 'Escape') {
                    setIsRenamingName(false);
                  }
                }}
                className='w-full rounded border border-border/60 bg-card/30 px-1.5 py-0.5 text-sm font-semibold text-gray-100 outline-none focus:border-blue-500/60 focus:ring-0'
              />
            ) : (
              <button
                type='button'
                disabled={isEditingDocumentLocked}
                onClick={() => {
                  setNameInputValue(draft.name);
                  setIsRenamingName(true);
                }}
                className='group flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-white/5 disabled:pointer-events-none'
                title='Click to rename'
              >
                <span className='truncate text-sm font-semibold text-gray-100'>{draft.name}</span>
                <Pencil className='size-3 shrink-0 text-gray-600 opacity-0 transition-opacity group-hover:opacity-100' />
              </button>
            )}
          </div>
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleOpenPromptExploderForDraft}
            disabled={isEditingDocumentLocked}
            className='h-8 border-violet-500/40 text-violet-300 hover:bg-violet-500/10'
            title='Send document text to Prompt Exploder for AI segmentation'
          >
            <Terminal className='mr-1.5 size-3.5' />
            Send to AI
          </Button>

          <div className='flex items-center rounded-md border border-border/60 bg-card/40 p-1'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handlePreviewDraftPdf}
              className='h-7 px-2.5 text-[11px] text-gray-400 hover:text-gray-200'
              title='Preview PDF'
            >
              <ExternalLink className='mr-1.5 size-3.5' />
              Preview
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={handlePrintDraftDocument}
              className='h-7 px-2.5 text-[11px] text-gray-400 hover:text-gray-200'
              title='Print'
            >
              <Printer className='mr-1.5 size-3.5' />
              Print
            </Button>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                void handleExportDraftPdf();
              }}
              className='h-7 px-2.5 text-[11px] text-gray-400 hover:text-gray-200'
              title='Export PDF'
            >
              <Download className='mr-1.5 size-3.5' />
              Export
            </Button>
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
      </div>

      <Tabs
        value={editorDetailsTab}
        onValueChange={(v) => setEditorDetailsTab(v as EditorDetailsTab)}
        className='flex flex-1 flex-col min-h-0'
      >
        <div className='flex items-center justify-between gap-4'>
          <TabsList className='h-9 w-fit border border-border/40 bg-card/40 p-1'>
            <TabsTrigger
              value='document'
              className='h-7 px-4 text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400'
            >
              <FileText className='mr-2 size-3.5' />
              Content
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
          <TabsContent value='document' className='m-0 space-y-6'>
            <div className='flex flex-col gap-6'>
              {showPromptExploderApplyAction && (
                <Card className='border-blue-500/30 bg-blue-500/5 p-4'>
                  <div className='flex items-center justify-between gap-4'>
                    <div className='flex items-center gap-3'>
                      <div className='rounded-full bg-blue-500/20 p-2'>
                        <Terminal className='size-5 text-blue-400' />
                      </div>
                      <div>
                        <div className='text-sm font-semibold text-blue-100'>
                          Pending Prompt Exploder Output
                        </div>
                        <div className='text-[11px] text-blue-300/60'>
                          {promptTransferStatusLabel} • {pendingPromptTransferId}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 border-blue-500/40 text-blue-200'
                        onClick={() => {
                          void handleApplyPendingPromptExploderPayload();
                        }}
                      >
                        Apply Output
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-8 text-blue-400'
                        onClick={(): void => {
                          handleDiscardPendingPromptExploderPayload();
                        }}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              <div className='grid grid-cols-2 gap-4'>
                <Input
                  value={draft.documentCity ?? ''}
                  onChange={(e) =>
                    updateEditingDocumentDraft({ documentCity: e.target.value || null })
                  }
                  placeholder='City...'
                  disabled={isEditingDocumentLocked}
                  className='bg-card/20 border-border/60'
                />
                <Input
                  type='date'
                  value={draft.documentDate?.isoDate ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    updateEditingDocumentDraft({
                      documentDate: val
                        ? {
                          source: 'metadata',
                          sourceLine: null,
                          cityHint: null,
                          action: 'useDetectedDate',
                          ...draft.documentDate,
                          isoDate: val,
                        }
                        : null,
                    });
                  }}
                  disabled={isEditingDocumentLocked}
                  className='bg-card/20 border-border/60'
                />
                <SelectSimple
                  value={encodedAddresser === 'none' ? '' : encodedAddresser}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ addresser: decodeFilemakerPartyReference(v) })
                  }
                  options={partyOptions}
                  placeholder='From...'
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
                <SelectSimple
                  value={encodedAddressee === 'none' ? '' : encodedAddressee}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ addressee: decodeFilemakerPartyReference(v) })
                  }
                  options={partyOptions}
                  placeholder='To...'
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
              </div>

              <DocumentWysiwygEditor
                key={`case-resolver-wysiwyg-${editorContentRevisionSeed}`}
                value={editingDocumentDraft.documentContentHtml ?? ''}
                onChange={handleUpdateDraftDocumentContent}
                disabled={isEditingDocumentLocked}
                allowFontFamily
                allowTextAlign
                enableAdvancedTools
                surfaceClassName='min-h-[400px]'
                editorContentClassName='[&_.ProseMirror]:!min-h-[400px]'
              />

              <div className='flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border/40'>
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
                  <span className='font-mono'>{editingDocumentDraft.id}</span>
                  <Copy className='size-3 opacity-60' />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='relations' className='m-0 flex flex-col gap-6'>
            {/* Advanced document search panel */}
            <DocumentRelationSearchPanel
              draftFileId={draft.id}
              isLocked={isEditingDocumentLocked ?? false}
              onLinkFile={(fileId) => handleLinkRelatedFiles(editingDocumentDraft.id, fileId)}
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
                          onClick={() => handleUnlinkRelatedFile(editingDocumentDraft.id, file.id)}
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

          <TabsContent value='metadata' className='m-0'>
            <div className='grid gap-6 lg:grid-cols-2'>
              <FormField label='Document Tag'>
                <SelectSimple
                  value={editingDocumentDraft.tagId ?? '__none__'}
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
                  value={editingDocumentDraft.caseIdentifierId ?? '__none__'}
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
                  value={editingDocumentDraft.categoryId ?? '__none__'}
                  onValueChange={(v) =>
                    updateEditingDocumentDraft({ categoryId: v === '__none__' ? null : v })
                  }
                  options={caseCategoryOptions}
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
              </FormField>
            </div>
          </TabsContent>

          <TabsContent value='revisions' className='m-0'>
            <CaseResolverHistoryEntries
              entries={editingDocumentDraft.documentHistory || []}
              formatTimestamp={formatHistoryTimestamp}
              onRestore={handleUseHistoryEntry}
              isRestoreDisabled={!!isEditingDocumentLocked}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
