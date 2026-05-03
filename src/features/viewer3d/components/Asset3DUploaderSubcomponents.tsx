'use client';

import { Upload, X } from 'lucide-react';
import type { JSX, DragEvent } from 'react';
import { Button } from '@/shared/ui/primitives.public';
import { FileUploadTrigger } from '@/shared/ui/forms-and-actions.public';
import { UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { cn } from '@/shared/utils/ui-utils';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  isDragOver: boolean;
  setIsDragOver: (is: boolean) => void;
}

export function FileDropZone({
  onFileSelect,
  onDrop,
  isDragOver,
  setIsDragOver,
}: FileDropZoneProps): JSX.Element {
  return (
    <FileUploadTrigger
      accept='.glb,.gltf'
      onFilesSelected={(files: File[]) => {
        const selectedFile = files[0];
        if (selectedFile !== undefined && selectedFile !== null) {
          onFileSelect(selectedFile);
        }
      }}
      asChild
    >
      <div
        className={cn(
          'relative flex h-32 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragOver
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-600 bg-gray-800/50 hover:border-blue-500 hover:bg-gray-800'
        )}
        onDragOver={(e: DragEvent<HTMLDivElement>): void => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={(e: DragEvent<HTMLDivElement>): void => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={onDrop}
      >
        <div className='flex flex-col items-center gap-2'>
          <Upload className='h-8 w-8 text-gray-500' />
          <span className='text-sm text-gray-400'>Drop .glb or .gltf file here</span>
          <span className='text-xs text-gray-500'>or click to browse</span>
        </div>
      </div>
    </FileUploadTrigger>
  );
}

interface SelectedFilePreviewProps {
  file: File;
  onClear: () => void;
  formatFileSize: (bytes: number) => string;
  isUploading: boolean;
}

export function SelectedFilePreview({
  file,
  onClear,
  formatFileSize,
  isUploading,
}: SelectedFilePreviewProps): JSX.Element {
  return (
    <div className='flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700'>
      <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
        <div className='h-10 w-10 bg-blue-500/20 rounded flex items-center justify-center'>
          <Upload className='h-5 w-5 text-blue-400' />
        </div>
        <div>
          <p className='text-sm font-medium text-white'>{file.name}</p>
          <p className='text-xs text-gray-400'>{formatFileSize(file.size)}</p>
        </div>
      </div>
      <Button
        variant='ghost'
        size='icon'
        onClick={onClear}
        disabled={isUploading}
        aria-label='Clear selected file'
        title='Clear selected file'
      >
        <X className='h-4 w-4' />
      </Button>
    </div>
  );
}
