'use client';

import {
  ExternalLink as ExternalLinkIcon,
  FileText,
  FolderOpen,
  Image as ImageIcon,
} from 'lucide-react';
import React from 'react';

import type { CaseResolverAssetFile } from '@/shared/contracts/case-resolver';
import {
  Button,
  ExternalLink,
  Label,
  Textarea,
  useToast,
  FileUploadTrigger,
  EmptyState,
  Card,
} from '@/shared/ui';
import { PanelHeader } from '@/shared/ui/templates/panels';

import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


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
  const { selectedAsset, selectedFolderPath, activeFile } = useCaseResolverPageState();
  const { onUpdateSelectedAsset, onAttachAssetFile } = useCaseResolverPageActions();
  const { toast } = useToast();
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [isAttachingImage, setIsAttachingImage] = React.useState(false);

  if (!selectedAsset) {
    return (
      <Card variant='glass' padding='md' className='flex h-[calc(100vh-120px)] flex-col gap-4'>
        <PanelHeader title='File Viewer' refreshable={false} />
        <EmptyState
          title='No file selected'
          description={
            selectedFolderPath !== null
              ? `Folder selected: ${selectedFolderPath || '(root)'}. Select a file to preview.`
              : activeFile
                ? `Case selected: ${activeFile.name}. Open a node file to enter canvas mode, or select another file to preview it here.`
                : 'Select a file from the tree to preview it here.'
          }
          icon={<FolderOpen className='size-12' />}
          className='flex-1 border-none bg-transparent'
        />
      </Card>
    );
  }

  const isImageAsset = selectedAsset.kind === 'image';
  const showImagePreview = isImageAsset && Boolean(selectedAsset.filepath);
  const showPdfPreview = selectedAsset.kind === 'pdf' && Boolean(selectedAsset.filepath);
  const showGenericPreview = !isImageAsset && !showPdfPreview;

  const handleAttachImageFile = React.useCallback(
    async (file: File): Promise<void> => {
      if (selectedAsset?.kind !== 'image') return;
      setIsAttachingImage(true);
      try {
        await onAttachAssetFile(selectedAsset.id, file, { expectedKind: 'image' });
      } catch (error: unknown) {
        logClientError(error);
        toast(error instanceof Error ? error.message : 'Failed to attach image file.', {
          variant: 'error',
        });
      } finally {
        setIsAttachingImage(false);
        setIsDragActive(false);
      }
    },
    [onAttachAssetFile, selectedAsset, toast]
  );

  return (
    <Card variant='glass' padding='md' className='flex h-[calc(100vh-120px)] flex-col gap-4'>
      <PanelHeader
        title={selectedAsset.name}
        subtitle={resolveAssetSubtitle(selectedAsset)}
        refreshable={false}
        customActions={
          selectedAsset.filepath ? (
            <ExternalLink
              href={selectedAsset.filepath}
              className='rounded border border-border/60 px-2 py-1 text-[11px] text-gray-200 hover:bg-muted/40'
            >
              Open
            </ExternalLink>
          ) : null
        }
      />

      <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-gray-300 md:grid-cols-2'>
        <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-gray-300 md:grid-cols-2'>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-center justify-between border-border/50 bg-card/20'
          >
            <span className='text-gray-500'>Kind</span>
            <span className='uppercase text-[10px]'>{selectedAsset.kind}</span>
          </Card>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-center justify-between border-border/50 bg-card/20'
          >
            <span className='text-gray-500'>Size</span>
            <span>{formatFileSize(selectedAsset.size)}</span>
          </Card>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-center justify-between border-border/50 bg-card/20'
          >
            <span className='text-gray-500'>MIME</span>
            <span className='truncate pl-2'>{selectedAsset.mimeType ?? 'Unknown'}</span>
          </Card>
          <Card
            variant='subtle-compact'
            padding='sm'
            className='flex items-center justify-between border-border/50 bg-card/20'
          >
            <span className='text-gray-500'>Folder</span>
            <span className='truncate pl-2'>{selectedAsset.folder || '(root)'}</span>
          </Card>
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
           aria-label='Optional description for this file...' title='Optional description for this file...'/>
        </div>
      </div>

      <Card
        variant='subtle-compact'
        padding='none'
        className='min-h-0 flex-1 overflow-hidden border-border/60 bg-card/25'
      >
        {isImageAsset ? (
          <div className='h-full p-3'>
            <FileUploadTrigger
              accept='image/*'
              onFilesSelected={(files) => {
                if (files[0]) void handleAttachImageFile(files[0]);
              }}
              disabled={isAttachingImage}
              asChild
            >
              <Card
                variant='subtle-compact'
                padding='sm'
                className={`relative flex h-full items-center justify-center overflow-hidden border-dashed transition ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-border/70 bg-card/40 hover:bg-card/55'
                } ${isAttachingImage ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
              >
                {showImagePreview ? (
                  <>
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
              </Card>
            </FileUploadTrigger>
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
              <ExternalLink
                href={selectedAsset.filepath}
                className='inline-flex items-center gap-1 rounded border border-border/60 px-2 py-1 text-xs text-gray-200 hover:bg-muted/40'
              >
                <FolderOpen className='size-3.5' />
                Open file
                <ExternalLinkIcon className='size-3.5' />
              </ExternalLink>
            ) : (
              <Button
                type='button'
                disabled
                variant='outline'
                className='h-8 text-xs text-gray-500'
              >
                File path unavailable
              </Button>
            )}
          </div>
        ) : null}
      </Card>
    </Card>
  );
}
