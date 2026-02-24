'use client';

import { FileText } from 'lucide-react';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  EmptyState,
} from '@/shared/ui';
import { useCaseResolverViewContext } from '../CaseResolverViewContext';

export function CaseResolverScanFileEditor(): React.JSX.Element | null {
  const {
    state,
    handleSaveFileEditor,
    handleDiscardFileEditorDraft,
    handleTriggerScanDraftUpload,
    handleDeleteScanDraftSlot,
    handleRunScanDraftOcr,
    isScanDraftDropActive,
    handleScanDraftDragEnter,
    handleScanDraftDragOver,
    handleScanDraftDragLeave,
    handleScanDraftDrop,
    handleScanDraftUploadInputChange,
    scanDraftUploadInputRef,
    updateEditingDocumentDraft,
  } = useCaseResolverViewContext();

  const {
    editingDocumentDraft,
    isUploadingScanDraftFiles,
  } = state;

  if (editingDocumentDraft?.fileType !== 'scanfile') return null;
  const draft = editingDocumentDraft;

  const isEditingDocumentLocked = draft.isLocked;
  const isEditorSaveEnabled = (draft.scanSlots ?? []).length > 0;

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-auto pr-1'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <Button
            type='button'
            size='sm'
            onClick={handleSaveFileEditor}
            disabled={!isEditorSaveEnabled || isEditingDocumentLocked}
            className={`h-8 min-w-[100px] flex-shrink-0 rounded-md border text-xs transition-colors ${
              isEditorSaveEnabled
                ? 'border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/10'
                : 'border-border/60 text-gray-500 hover:bg-transparent'
            }`}
          >
            Update
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={handleDiscardFileEditorDraft}
            className='h-8 text-xs text-gray-400 hover:text-gray-100'
          >
            Discard Changes
          </Button>
          <div className='h-4 w-px bg-border/40 mx-1' />
          <div className='min-w-0 flex-1 truncate text-xs font-medium text-gray-400'>
            {editingDocumentDraft.folder ? `${editingDocumentDraft.folder} / ` : ''}
            <span className='text-gray-200'>{editingDocumentDraft.name}</span>
          </div>
        </div>
        {isEditingDocumentLocked && (
          <Badge variant='outline' className='border-amber-500/40 text-amber-500 bg-amber-500/5 text-[10px] h-5'>
            LOCKED
          </Badge>
        )}
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <div className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
              Scan Images / PDF Pages
            </div>
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
            className={`flex min-h-[400px] flex-col gap-3 rounded-lg border-2 border-dashed p-4 transition-colors ${
              isScanDraftDropActive
                ? 'border-blue-500/50 bg-blue-500/5'
                : 'border-border/40 bg-card/10'
            }`}
            onDragEnter={handleScanDraftDragEnter}
            onDragOver={handleScanDraftDragOver}
            onDragLeave={handleScanDraftDragLeave}
            onDrop={handleScanDraftDrop}
          >
            {(editingDocumentDraft.scanSlots ?? []).length === 0 ? (
              <EmptyState
                icon={<FileText className='size-10 text-gray-700' />}
                title='No pages yet'
                description='Drag and drop images or PDF files here, or use the "Add Pages" button.'
                className='flex-1 border-none bg-transparent'
              />
            ) : (
              <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'>
                {(editingDocumentDraft.scanSlots ?? []).map((slot) => (
                  <Card
                    key={slot.id}
                    className='group relative aspect-[3/4] overflow-hidden border-border/60 bg-black/40'
                  >
                    {slot.filepath ? (
                      <img
                        src={`/api/files/download?path=${encodeURIComponent(
                          slot.filepath
                        )}`}
                        alt={slot.name || 'Scan page'}
                        className='h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100'
                      />
                    ) : (
                      <div className='flex h-full flex-col items-center justify-center p-2 text-center'>
                        <FileText className='mb-2 size-8 text-gray-600' />
                        <div className='truncate text-[10px] text-gray-500'>
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
                        className='h-7 text-[10px]'
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between'>
            <div className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
              OCR Results / Reassembled Content
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleRunScanDraftOcr}
              disabled={
                (editingDocumentDraft.scanSlots ?? []).length === 0 ||
                isEditingDocumentLocked
              }
              className='h-7 text-[11px]'
            >
              Run OCR
            </Button>
          </div>
          <div className='flex flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/10'>
            <textarea
              className='flex-1 resize-none bg-transparent p-4 text-sm font-mono text-gray-300 focus:outline-none'
              placeholder='OCR results will appear here...'
              value={editingDocumentDraft.documentContent}
              onChange={(e) => updateEditingDocumentDraft({ documentContent: e.target.value })}
              readOnly={isEditingDocumentLocked}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
