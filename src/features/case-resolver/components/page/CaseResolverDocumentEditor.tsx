'use client';

import { 
  FileText, 
  History, 
  Network, 
  Settings2, 
  Save, 
  X, 
  ExternalLink, 
  Printer, 
  Download,
  Terminal,
  Copy
} from 'lucide-react';
import React from 'react';

import { DocumentWysiwygEditor } from '@/features/document-editor';
import {
  type CaseResolverDocumentHistoryEntry,
} from '@/shared/contracts/case-resolver';
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  SearchInput,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { useCaseResolverViewContext } from '../CaseResolverViewContext';
import { 
  resolvePromptExploderTransferStatusLabel,
  type PromptExploderTransferUiStatus 
} from '../../hooks/prompt-exploder-transfer-lifecycle';
import { canCaseResolverDraftPerformInitialManualSave } from '../../hooks/useCaseResolverState.helpers';

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
    handleDiscardFileEditorDraft,
    handleLinkRelatedFiles,
    handleUnlinkRelatedFile,
    captureApplyDiagnostics,
    activeCaseFile,
  } = contextValue;

  const {
    workspace,
    editingDocumentDraft,
    pendingPromptExploderPayload,
    handleApplyPendingPromptExploderPayload,
    handleDiscardPendingPromptExploderPayload,
  } = state;

  const [relateSearchQuery, setRelateSearchQuery] = React.useState('');

  if (!editingDocumentDraft || editingDocumentDraft.fileType === 'scanfile' || !activeCaseFile) return null;
  const draft = editingDocumentDraft;

  const isEditingDocumentLocked = draft.isLocked;
  const isEditorSaveEnabled = isEditorDraftDirty || canCaseResolverDraftPerformInitialManualSave({ draft, file: activeCaseFile });

  const createdAtLabel = draft.createdAt ? formatHistoryTimestamp(draft.createdAt) : 'Unknown';
  const updatedAtLabel = draft.updatedAt ? formatHistoryTimestamp(draft.updatedAt) : 'Unknown';

  const canApplyPendingPromptOutput = Boolean(pendingPromptExploderPayload);
  const promptTransferStatus =
    captureApplyDiagnostics?.status ??
    (pendingPromptExploderPayload ? 'pending' : 'idle');
  const promptTransferStatusLabel =
    resolvePromptExploderTransferStatusLabel(promptTransferStatus as PromptExploderTransferUiStatus);

  const showPromptExploderApplyAction =
    canApplyPendingPromptOutput;

  const pendingPromptTransferId = pendingPromptExploderPayload?.transferId ?? '';

  const originalFile = workspace.files.find((f) => f.id === draft.id);
  const draftRelatedFileIds = originalFile?.relatedFileIds;
  const relatedFiles = workspace.files.filter((file) =>
    (draftRelatedFileIds ?? []).includes(file.id)
  );

  const relateSearchResults = relateSearchQuery.trim()
    ? workspace.files
      .filter((file) => {
        if (file.id === draft.id) return false;
        if ((draftRelatedFileIds ?? []).includes(file.id)) return false;
        const query = relateSearchQuery.toLowerCase();
        return (
          file.name.toLowerCase().includes(query) ||
          (file.folder ?? '').toLowerCase().includes(query)
        );
      })
      .slice(0, 10)
    : [];

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
              <span className='truncate'>{editingDocumentDraft.folder || 'Root'}</span>
              <span className='text-gray-700'>/</span>
              <span className='text-blue-400/80'>{editingDocumentDraft.fileType}</span>
            </div>
            <div className='truncate text-sm font-semibold text-gray-100'>
              {editingDocumentDraft.name}
            </div>
          </div>
        </div>

        <div className='flex items-center gap-2'>
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
              onClick={() => { void handleExportDraftPdf(); }}
              className='h-7 px-2.5 text-[11px] text-gray-400 hover:text-gray-200'
              title='Export PDF'
            >
              <Download className='mr-1.5 size-3.5' />
              Export
            </Button>
          </div>

          {isEditingDocumentLocked && (
            <Badge variant='outline' className='h-7 border-amber-500/40 bg-amber-500/5 px-2 text-[10px] font-bold text-amber-500'>
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
            <TabsTrigger value='document' className='h-7 px-4 text-xs data-[state=active]:bg-blue-600/20 data-[state=active]:text-blue-400'>
              <FileText className='mr-2 size-3.5' />
              Content
            </TabsTrigger>
            <TabsTrigger value='relations' className='h-7 px-4 text-xs data-[state=active]:bg-purple-600/20 data-[state=active]:text-purple-400'>
              <Network className='mr-2 size-3.5' />
              Relations
            </TabsTrigger>
            <TabsTrigger value='metadata' className='h-7 px-4 text-xs data-[state=active]:bg-amber-600/20 data-[state=active]:text-amber-400'>
              <Settings2 className='mr-2 size-3.5' />
              Metadata
            </TabsTrigger>
            <TabsTrigger value='revisions' className='h-7 px-4 text-xs data-[state=active]:bg-emerald-600/20 data-[state=active]:text-emerald-400'>
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
                        <div className='text-sm font-semibold text-blue-100'>Pending Prompt Exploder Output</div>
                        <div className='text-[11px] text-blue-300/60'>{promptTransferStatusLabel} • {pendingPromptTransferId}</div>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        className='h-8 border-blue-500/40 text-blue-200'
                        onClick={() => { void handleApplyPendingPromptExploderPayload(); }}
                      >
                        Apply Output
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-8 text-blue-400'
                        onClick={(): void => { handleDiscardPendingPromptExploderPayload(); }}
                      >
                        Discard
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

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
                  onClick={() => { void handleCopyDraftFileId(); }}
                >
                  <span className='opacity-60'>ID:</span>
                  <span className='font-mono'>{editingDocumentDraft.id}</span>
                  <Copy className='size-3 opacity-60' />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value='relations' className='m-0'>
            <div className='grid gap-6 md:grid-cols-2'>
              <FormField label='Related Documents'>
                <div className='flex flex-col gap-2'>
                  {relatedFiles.length === 0 ? (
                    <div className='rounded border border-dashed border-border/40 p-8 text-center text-xs text-gray-500'>
                      No related documents linked yet.
                    </div>
                  ) : (
                    <div className='grid gap-2'>
                      {relatedFiles.map(file => (
                        <div key={file.id} className='flex items-center justify-between gap-3 rounded border border-border/60 bg-card/20 px-3 py-2'>
                          <div className='flex items-center gap-3 min-w-0'>
                            <FileText className='size-4 text-gray-500' />
                            <span className='truncate text-xs font-medium text-gray-200'>{file.name}</span>
                          </div>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='h-7 w-7 p-0 text-gray-500 hover:text-red-400'
                            onClick={() => handleUnlinkRelatedFile(editingDocumentDraft.id, file.id)}
                            disabled={isEditingDocumentLocked}
                          >
                            <X className='size-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormField>
              
              <FormField label='Link a Document'>
                <div className='space-y-3'>
                  <SearchInput
                    size='sm'
                    value={relateSearchQuery}
                    onChange={(e) => setRelateSearchQuery(e.target.value)}
                    onClear={() => setRelateSearchQuery('')}
                    placeholder='Search by name or folder...'
                    disabled={isEditingDocumentLocked}
                  />
                  {relateSearchQuery.trim() && (
                    <div className='rounded border border-border/60 bg-card/40 overflow-hidden shadow-xl'>
                      {relateSearchResults.length === 0 ? (
                        <div className='p-4 text-center text-xs text-gray-500'>No documents found.</div>
                      ) : (
                        relateSearchResults.map(result => (
                          <button
                            key={result.id}
                            className='flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-white/10 transition-colors'
                            onClick={() => {
                              handleLinkRelatedFiles(editingDocumentDraft.id, result.id);
                              setRelateSearchQuery('');
                            }}
                          >
                            <FileText className='size-4 text-gray-500' />
                            <div className='min-w-0'>
                              <div className='text-xs text-gray-200 truncate'>{result.name}</div>
                              <div className='text-[10px] text-gray-500 truncate'>{result.folder || 'Root'}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          </TabsContent>

          <TabsContent value='metadata' className='m-0'>
            <div className='grid gap-6 lg:grid-cols-2'>
              <FormField label='Document Name'>
                <Input 
                  value={editingDocumentDraft.name}
                  onChange={(e) => updateEditingDocumentDraft({ name: e.target.value })}
                  disabled={isEditingDocumentLocked}
                  className='bg-card/20 border-border/60'
                />
              </FormField>
              <FormField label='Document Tag'>
                <SelectSimple
                  value={editingDocumentDraft.tagId ?? '__none__'}
                  onValueChange={(v) => updateEditingDocumentDraft({ tagId: v === '__none__' ? null : v })}
                  options={caseTagOptions}
                  disabled={isEditingDocumentLocked}
                  triggerClassName='bg-card/20 border-border/60'
                />
              </FormField>
            </div>
          </TabsContent>

          <TabsContent value='revisions' className='m-0'>
            <div className='rounded-lg border border-border/40 bg-card/20 overflow-hidden'>
              {(editingDocumentDraft.documentHistory || []).length === 0 ? (
                <div className='p-12 text-center'>
                  <History className='mx-auto mb-3 size-8 text-gray-700' />
                  <div className='text-xs text-gray-500'>No version history available.</div>
                </div>
              ) : (
                <div className='max-h-[600px] overflow-auto'>
                  {(editingDocumentDraft.documentHistory || []).map((entry: CaseResolverDocumentHistoryEntry) => (
                    <div key={entry.id || idx} className='group flex items-center justify-between p-4 hover:bg-white/5 transition-colors'>
                      <div className='flex items-center gap-4'>
                        <div className='flex size-10 items-center justify-center rounded-full bg-blue-500/10 text-blue-400'>
                          <History className='size-5' />
                        </div>
                        <div>
                          <div className='text-sm font-medium text-gray-200'>{formatHistoryTimestamp(entry.savedAt)}</div>
                          <div className='text-[11px] text-gray-500 uppercase tracking-wider'>
                            {entry.editorType} <span className='mx-1 opacity-30'>•</span> Version {entry.documentContentVersion}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-8 opacity-0 group-hover:opacity-100 transition-opacity'
                        onClick={() => handleUseHistoryEntry(entry)}
                        disabled={isEditingDocumentLocked}
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
