'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui';
import { useDocumentRelationSearchContext } from '../../context/DocumentRelationSearchContext';
import { FileTypeIcon, formatShortDate } from './document-relation-search-utils';

export function DocumentPreviewDialog(): React.JSX.Element {
  const {
    previewFile: file,
    previewRow,
    isLocked,
    onLinkFile,
    setPreviewFileId,
  } = useDocumentRelationSearchContext();

  const onClose = () => setPreviewFileId(null);
  const onLink = (fileId: string) => {
    onLinkFile(fileId);
    onClose();
  };

  const snippet = file
    ? (file.documentContentPlainText || file.documentContent || '').slice(0, 600)
    : '';

  return (
    <Dialog open={file !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className='max-w-xl'>
        {file && (
          <>
            <DialogHeader>
              <DialogTitle className='flex items-center gap-2 text-sm font-semibold'>
                <FileTypeIcon fileType={file.fileType} className='size-4' />
                <span className='min-w-0 truncate'>{file.name}</span>
                {file.isLocked && (
                  <span className='ml-auto shrink-0 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-300'>
                    LOCKED
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                Document preview for {file.name}
              </DialogDescription>
            </DialogHeader>

            <div className='grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs'>
              <div>
                <span className='text-gray-500'>Folder: </span>
                <span className='text-gray-300'>{file.folder || 'Root'}</span>
              </div>
              <div>
                <span className='text-gray-500'>Date: </span>
                <span className='text-gray-300'>{formatShortDate(file.documentDate?.isoDate)}</span>
              </div>
              {previewRow?.addresserLabel && (
                <div>
                  <span className='text-gray-500'>From: </span>
                  <span className='text-gray-300'>{previewRow.addresserLabel}</span>
                </div>
              )}
              {previewRow?.addresseeLabel && (
                <div>
                  <span className='text-gray-500'>To: </span>
                  <span className='text-gray-300'>{previewRow.addresseeLabel}</span>
                </div>
              )}
              {previewRow?.signatureLabel && (
                <div>
                  <span className='text-gray-500'>Signature: </span>
                  <span className='text-cyan-400/80'>{previewRow.signatureLabel}</span>
                </div>
              )}
              {file.categoryId && (
                <div>
                  <span className='text-gray-500'>Category: </span>
                  <span className='text-gray-300'>{file.categoryId}</span>
                </div>
              )}
            </div>

            <div className='mt-3 max-h-[200px] overflow-auto rounded border border-border/40 bg-card/20 p-3 font-mono text-[11px] leading-relaxed text-gray-400 whitespace-pre-wrap'>
              {snippet || '(No content preview)'}
            </div>

            <DialogFooter>
              <button
                type='button'
                onClick={onClose}
                className='rounded border border-border/50 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:text-gray-200'
              >
                Cancel
              </button>
              <button
                type='button'
                disabled={isLocked}
                onClick={() => { onLink(file.id); }}
                className='flex items-center gap-1.5 rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:pointer-events-none disabled:opacity-40'
              >
                Link this document
                <ChevronRight className='size-3' />
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
