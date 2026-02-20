import { Upload } from 'lucide-react';
import dynamic from 'next/dynamic';
import React from 'react';

import { logClientError } from '@/features/observability';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/contracts/files';
import {
  useToast,
  FileUploadButton,
  type FileUploadHelpers,
} from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { useUploadCmsMedia } from '../../hooks/useCmsQueries';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
  loading: () => <div>Loading file manager...</div>
});

interface MediaLibraryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (filepaths: string[]) => void;
  selectionMode?: 'single' | 'multiple';
  autoConfirmSelection?: boolean;
  onFilesSelected?: (files: File[], helpers?: FileUploadHelpers) => void | Promise<void>;
}

export function MediaLibraryPanel({
  open,
  onOpenChange,
  onSelect,
  selectionMode = 'single',
  autoConfirmSelection,
  onFilesSelected,
}: MediaLibraryPanelProps): React.JSX.Element {
  const { toast } = useToast();
  const shouldAutoConfirm = autoConfirmSelection ?? selectionMode === 'single';

  const uploadMutation = useUploadCmsMedia();

  const handleSelect = (files: ImageFileSelection[]): void => {
    const filepaths = files.map((file: ImageFileSelection) => file.filepath).filter(Boolean);
    if (filepaths.length === 0) return;
    onSelect(filepaths);
    if (selectionMode === 'single') {
      onOpenChange(false);
    }
  };

  const handleUpload = async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
    if (!files || files.length === 0) return;

    try {
      const uploaded: ImageFileRecord[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const result = await uploadMutation.mutateAsync({
          file,
          onProgress: (loaded: number, total?: number) => {
            if (!helpers) return;
            if (!total) return;
            const pct = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
            const combined = Math.round(((index + pct / 100) / files.length) * 100);
            helpers.setProgress(combined);
          },
        });
        uploaded.push(result);
      }
      
      if (uploaded.length > 0) {
        toast('Upload complete.', { variant: 'success' });
        if (shouldAutoConfirm) {
          const selections: ImageFileSelection[] = uploaded
            .map((file: ImageFileRecord): ImageFileSelection => ({ id: file.id, filepath: file.filepath }))
            .filter((file: ImageFileSelection): boolean => Boolean(file.filepath));
          if (selections.length > 0) {
            handleSelect(selections);
          }
        }
      }
    } catch (error) {
      logClientError(error, { context: { source: 'MediaLibraryPanel', action: 'handleUpload' } });
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast(message, { variant: 'error' });
    }
  };

  return (
    <DetailModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title='Media Library'
      size='xl'
      padding='none'
    >
      <div className='flex flex-col h-full overflow-hidden'>
        <div className='p-4 border-b border-border/40'>
          <div className='flex items-center gap-3'>
            <FileUploadButton
              variant='outline'
              size='sm'
              accept='image/*'
              multiple
              disabled={uploadMutation.isPending}
              onFilesSelected={(files: File[], helpers?: FileUploadHelpers) => 
                onFilesSelected ? onFilesSelected(files, helpers) : handleUpload(files, helpers)
              }
            >
              <Upload className='mr-2 size-4' />
              {uploadMutation.isPending ? 'Uploading...' : 'Upload images'}
            </FileUploadButton>
            <p className='text-xs text-gray-500'>Supported formats: images</p>
          </div>
        </div>

        <div className='flex-1 overflow-auto bg-gray-950/20'>
          <FileManager
            onSelectFile={handleSelect}
            selectionMode={selectionMode}
            autoConfirmSelection={shouldAutoConfirm}
            showFolderFilter
            defaultFolder='cms'
            showBulkActions={selectionMode === 'multiple'}
            showTagSearch
          />
        </div>
      </div>
    </DetailModal>
  );
}
