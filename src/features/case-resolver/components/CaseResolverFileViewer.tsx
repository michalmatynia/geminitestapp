'use client';

import { ExternalLink, FileText, FolderOpen, Image as ImageIcon } from 'lucide-react';
import React from 'react';

import { Button, Label, Textarea, useToast } from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';

import type { CaseResolverAssetFile } from '../types';

const formatFileSize = (size: number | null): string => {
  if (size === null || size < 0 || !Number.isFinite(size)) return 'Unknown';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const resolveAssetSubtitle = (asset: CaseResolverAssetFile): string => {
  if (asset.kind === 'image') return 'Image asset';
  if (asset.kind === 'pdf') return 'PDF document';
  if (asset.kind === 'file') return 'Generic file';
  return 'Node file';
};

export function CaseResolverFileViewer(): React.JSX.Element {
  const {
    selectedAsset,
    selectedFolderPath,
    activeFile,
    onUpdateSelectedAsset,
    onAttachAssetFile,
  } = useCaseResolverPageContext();
  const { toast } = useToast();
  const imageUploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isAttachingImage, setIsAttachingImage] = React.useState(false);

  if (!selectedAsset) {
    return (
      <div className='flex h-[calc(100vh-120px)] flex-col rounded-lg border border-border/60 bg-card/35 p-6'>
        <div className='mb-4 text-lg font-semibold text-white'>File Viewer</div>
        <div className='rounded-lg border border-dashed border-border/60 bg-card/20 p-6 text-sm text-gray-400'>
          {selectedFolderPath !== null
            ? `Folder selected: ${selectedFolderPath || '(root)'}. Select a file to preview.`
            : activeFile
              ? `Case selected: ${activeFile.name}. Open a node file to enter canvas mode, or select another file to preview it here.`
              : 'Select a file from the tree to preview it here.'}
        </div>
      </div>
    );
  }

  const isImageAsset = selectedAsset.kind === 'image';
  const showImagePreview = isImageAsset && Boolean(selectedAsset.filepath);
  const showPdfPreview = selectedAsset.kind === 'pdf' && Boolean(selectedAsset.filepath);
  const showGenericPreview = !isImageAsset && !showPdfPreview;

  const handleAttachImageFile = React.useCallback(
    async (file: File): Promise<void> => {
      if (!selectedAsset || selectedAsset.kind !== 'image') return;
      setIsAttachingImage(true);
      try {
        await onAttachAssetFile(selectedAsset.id, file, { expectedKind: 'image' });
      } catch (error: unknown) {
        toast(
          error instanceof Error ? error.message : 'Failed to attach image file.',
          { variant: 'error' }
        );
      } finally {
        setIsAttachingImage(false);
        setIsDragActive(false);
      }
    },
    [onAttachAssetFile, selectedAsset, toast]
  );

  const triggerImageUpload = React.useCallback((): void => {
    if (isAttachingImage) return;
    imageUploadInputRef.current?.click();
  }, [isAttachingImage]);

  const handleImageInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      const file = event.target.files?.[0] ?? null;
      event.target.value = '';
      if (!file) return;
      void handleAttachImageFile(file);
    },
    [handleAttachImageFile]
  );

  const handleImageDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      if (isAttachingImage) return;
      const file = event.dataTransfer.files?.[0] ?? null;
      if (!file) {
        setIsDragActive(false);
        return;
      }
      void handleAttachImageFile(file);
    },
    [handleAttachImageFile, isAttachingImage]
  );

  return (
    <div className='flex h-[calc(100vh-120px)] flex-col gap-4 rounded-lg border border-border/60 bg-card/35 p-4'>
      <div className='rounded border border-border/60 bg-card/30 px-4 py-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='truncate text-sm font-semibold text-white'>{selectedAsset.name}</div>
            <div className='text-xs text-gray-400'>{resolveAssetSubtitle(selectedAsset)}</div>
          </div>
          {selectedAsset.filepath ? (
            <a
              href={selectedAsset.filepath}
              target='_blank'
              rel='noreferrer'
              className='inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-[11px] text-gray-200 hover:bg-muted/40'
            >
              Open
              <ExternalLink className='size-3.5' />
            </a>
          ) : null}
        </div>

        <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-gray-300 md:grid-cols-2'>
          <div className='flex items-center justify-between rounded border border-border/50 bg-card/20 px-2 py-1.5'>
            <span className='text-gray-500'>Kind</span>
            <span className='uppercase text-[10px]'>{selectedAsset.kind}</span>
          </div>
          <div className='flex items-center justify-between rounded border border-border/50 bg-card/20 px-2 py-1.5'>
            <span className='text-gray-500'>Size</span>
            <span>{formatFileSize(selectedAsset.size)}</span>
          </div>
          <div className='flex items-center justify-between rounded border border-border/50 bg-card/20 px-2 py-1.5'>
            <span className='text-gray-500'>MIME</span>
            <span className='truncate pl-2'>{selectedAsset.mimeType ?? 'Unknown'}</span>
          </div>
          <div className='flex items-center justify-between rounded border border-border/50 bg-card/20 px-2 py-1.5'>
            <span className='text-gray-500'>Folder</span>
            <span className='truncate pl-2'>{selectedAsset.folder || '(root)'}</span>
          </div>
        </div>

        <div className='mt-3 space-y-2'>
          <Label className='text-xs text-gray-400'>Description</Label>
          <Textarea
            value={selectedAsset.description}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void => {
              onUpdateSelectedAsset({ description: event.target.value });
            }}
            className='min-h-[72px] border-border bg-card/60 text-xs text-white'
            placeholder='Optional description for this file...'
          />
        </div>
      </div>

      <div className='min-h-0 flex-1 overflow-hidden rounded border border-border/60 bg-card/25'>
        {isImageAsset ? (
          <div className='h-full p-3'>
            <input
              ref={imageUploadInputRef}
              type='file'
              accept='image/*'
              className='hidden'
              onChange={handleImageInputChange}
            />
            <div
              role='button'
              tabIndex={0}
              className={`relative flex h-full items-center justify-center overflow-hidden rounded border border-dashed p-3 transition ${
                isDragActive
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-border/70 bg-card/40 hover:bg-card/55'
              } ${isAttachingImage ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
              onClick={triggerImageUpload}
              onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>): void => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  triggerImageUpload();
                }
              }}
              onDragEnter={(event: React.DragEvent<HTMLDivElement>): void => {
                event.preventDefault();
                setIsDragActive(true);
              }}
              onDragOver={(event: React.DragEvent<HTMLDivElement>): void => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
                setIsDragActive(true);
              }}
              onDragLeave={(event: React.DragEvent<HTMLDivElement>): void => {
                event.preventDefault();
                setIsDragActive(false);
              }}
              onDrop={handleImageDrop}
            >
              {showImagePreview ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedAsset.filepath ?? ''}
                    alt={selectedAsset.name}
                    className='max-h-full max-w-full rounded object-contain'
                  />
                  <div className='absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-black/55 px-2 py-1 text-[11px] text-white'>
                    {isAttachingImage ? 'Uploading image...' : 'Drop image to replace'}
                  </div>
                </>
              ) : (
                <div className='flex flex-col items-center gap-2 text-center'>
                  <ImageIcon className='size-9 text-gray-400' />
                  <div className='text-sm font-medium text-gray-200'>
                    {isAttachingImage ? 'Uploading image...' : 'Drop image here'}
                  </div>
                  <div className='text-xs text-gray-400'>or click to browse files</div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {showPdfPreview ? (
          <iframe
            title={selectedAsset.name}
            src={selectedAsset.filepath ?? ''}
            className='h-full w-full border-0'
          />
        ) : null}

        {showGenericPreview ? (
          <div className='flex h-full flex-col items-center justify-center gap-3 p-6 text-center'>
            {selectedAsset.kind === 'file' ? (
              <FileText className='size-10 text-gray-500' />
            ) : (
              <ImageIcon className='size-10 text-gray-500' />
            )}
            <div className='text-sm text-gray-300'>Preview not available for this file type.</div>
            <div className='text-xs text-gray-500'>
              Open the file in a new tab to inspect the full content.
            </div>
            {selectedAsset.filepath ? (
              <a
                href={selectedAsset.filepath}
                target='_blank'
                rel='noreferrer'
                className='inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-xs text-gray-200 hover:bg-muted/40'
              >
                <FolderOpen className='size-3.5' />
                Open file
                <ExternalLink className='size-3.5' />
              </a>
            ) : (
              <Button type='button' disabled className='h-8 rounded border border-border/50 text-xs text-gray-500'>
                File path unavailable
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
