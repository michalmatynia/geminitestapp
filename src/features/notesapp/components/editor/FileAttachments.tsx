'use client';

import { Upload, FileIcon, Link2, Trash2 } from 'lucide-react';
import Image from 'next/image';
import React from 'react';

import { useNoteFormContext } from '@/features/notesapp/context/NoteFormContext';
import type { NoteFileDto as NoteFileRecord } from '@/shared/contracts/notes';
import {
  Button,
  Label,
  FileUploadTrigger,
  type FileUploadHelpers,
  Card,
  LoadingState,
} from '@/shared/ui';

export function FileAttachments(): React.JSX.Element {
  const {
    note,
    noteFiles,
    MAX_SLOTS: maxSlots,
    uploadingSlots,
    getNextAvailableSlot,
    handleFileUpload: onFileUpload,
    handleMultiFileUpload: onMultiFileUpload,
    handleFileDelete: onFileDelete,
    insertFileReference: onInsertFileReference,
    formatFileSize,
    isImageFile,
  } = useNoteFormContext();

  if (!note?.id) {
    return (
      <Card
        variant='subtle-compact'
        padding='md'
        className='border-dashed border-border/60 bg-card/30 text-center text-sm text-gray-400'
      >
        Save the note first to enable file attachments ({maxSlots} slots
        available)
      </Card>
    );
  }

  return (
    <div className='space-y-2'>
      <Label className='mb-2 block text-sm font-medium text-white'>
        Attachments ({noteFiles.length}/{maxSlots} slots used)
      </Label>
      <div className='flex flex-wrap gap-3'>
        {((): React.JSX.Element => {
          const nextSlot = getNextAvailableSlot();
          const isUploading = nextSlot !== null && uploadingSlots.has(nextSlot);
          return (
            <Card
              variant='subtle-compact'
              padding='none'
              className='relative h-20 w-20 border-border bg-card/40'
              onDragOver={(e: React.DragEvent): void => e.preventDefault()}
              onDrop={(e: React.DragEvent): void => {
                if (nextSlot === null) return;
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  void onFileUpload(nextSlot, file);
                }
              }}
            >
              {isUploading ? (
                <LoadingState size='sm' />
              ) : nextSlot === null ? (
                <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                  Full
                </div>
              ) : (
                <Label className='flex h-full cursor-pointer flex-col items-center justify-center text-gray-500 hover:bg-card/60 hover:text-gray-400 transition-colors'>
                  <FileUploadTrigger
                    multiple
                    asChild
                    onFilesSelected={(
                      files: File[],
                      helpers?: FileUploadHelpers,
                    ) => onMultiFileUpload(files, helpers)}
                  >
                    <span className='flex h-full w-full flex-col items-center justify-center'>
                      <Upload size={14} />
                      <span className='mt-1 text-[10px]'>Upload</span>
                      <span className='mt-0.5 text-[10px] text-gray-400'>
                        {maxSlots - noteFiles.length} left
                      </span>
                    </span>
                  </FileUploadTrigger>
                </Label>
              )}
            </Card>
          );
        })()}

        {noteFiles.map((file: NoteFileRecord) => (
          <Card
            key={file.slotIndex}
            variant='subtle-compact'
            padding='none'
            className='relative h-20 w-24 border-border bg-card/50'
          >
            <div className='group relative h-full'>
              {isImageFile(file.mimetype) ? (
                <Image
                  src={file.filepath}
                  alt={file.filename}
                  width={96}
                  height={80}
                  className='h-full w-full rounded-md object-cover'
                />
              ) : (
                <div className='flex h-full flex-col items-center justify-center p-2'>
                  <FileIcon className='h-6 w-6 text-gray-400' />
                  <span className='mt-1 text-[10px] text-gray-400 truncate w-full text-center'>
                    {file.filename.length > 12
                      ? file.filename.slice(0, 10) + '...'
                      : file.filename}
                  </span>
                </div>
              )}
              <div className='absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-black/60 opacity-0 transition-opacity group-hover:opacity-100'>
                <Button
                  type='button'
                  onClick={(): void => onInsertFileReference(file)}
                  variant='solid'
                  size='icon'
                  className='h-7 w-7'
                  title='Insert into content'
                >
                  <Link2 size={12} />
                </Button>
                <Button
                  type='button'
                  onClick={(): void => {
                    void onFileDelete(file.slotIndex);
                  }}
                  variant='solid-destructive'
                  size='icon'
                  className='h-7 w-7'
                  title='Delete file'
                >
                  <Trash2 size={12} />
                </Button>
              </div>
              <div className='absolute bottom-0 left-0 right-0 rounded-b-md bg-black/70 px-1 py-0.5 text-[9px] text-gray-300 truncate'>
                {formatFileSize(file.size)}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className='text-xs text-gray-500'>
        Drag and drop files or click to upload. Max 10MB per file.
      </p>
    </div>
  );
}
