import { Upload } from 'lucide-react';
import dynamic from 'next/dynamic';
import React from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { ImageFileRecord, ImageFileSelection } from '@/shared/contracts/files';
import { useToast, FileUploadButton, type FileUploadHelpers } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

import { useUploadCmsMedia } from '../../hooks/useCmsQueries';

const FileManager = dynamic(() => import('@/features/files/components/FileManager'), {
  ssr: false,
  loading: () => <div>Loading file manager...</div>,
});

interface MediaLibraryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (filepaths: string[]) => void;
  selectionMode?: 'single' | 'multiple';
  autoConfirmSelection?: boolean;
  onFilesSelected?: (files: File[], helpers?: FileUploadHelpers) => void | Promise<void>;
  title?: string;
  accept?: string;
  supportedFormatsLabel?: string;
  uploadButtonLabel?: string;
  filepathFilter?: (filepath: string) => boolean;
  filterUploadFiles?: (files: File[]) => File[];
  invalidSelectionMessage?: string;
  invalidUploadMessage?: string;
}

export function MediaLibraryPanel(props: MediaLibraryPanelProps): React.JSX.Element {
  const {
    open,
    onOpenChange,
    onSelect,
    selectionMode = 'single',
    autoConfirmSelection,
    onFilesSelected,
    title = 'Media Library',
    accept = 'image/*',
    supportedFormatsLabel = 'images',
    uploadButtonLabel = 'Upload images',
    filepathFilter,
    filterUploadFiles,
    invalidSelectionMessage = 'The selected file is not supported here.',
    invalidUploadMessage = 'No supported files were selected.',
  } = props;

  const { toast } = useToast();
  const shouldAutoConfirm = autoConfirmSelection ?? selectionMode === 'single';

  const uploadMutation = useUploadCmsMedia();

  const handleSelect = (files: ImageFileSelection[]): void => {
    const filepaths = files
      .map((file: ImageFileSelection) => file.filepath)
      .filter((path): path is string => typeof path === 'string' && path.length > 0);
    const acceptedFilepaths = filepathFilter ? filepaths.filter(filepathFilter) : filepaths;
    if (acceptedFilepaths.length === 0) {
      toast(invalidSelectionMessage, { variant: 'info' });
      return;
    }
    onSelect(acceptedFilepaths);
    if (selectionMode === 'single') {
      onOpenChange(false);
    }
  };

  const handleUpload = async (files: File[], helpers?: FileUploadHelpers): Promise<void> => {
    if (!files || files.length === 0) return;

    const acceptedFiles = filterUploadFiles ? filterUploadFiles(files) : files;
    if (acceptedFiles.length === 0) {
      toast(invalidUploadMessage, { variant: 'info' });
      return;
    }
    if (acceptedFiles.length !== files.length) {
      toast(invalidUploadMessage, { variant: 'info' });
    }

    try {
      const uploaded: ImageFileRecord[] = [];
      for (let index = 0; index < acceptedFiles.length; index += 1) {
        const file = acceptedFiles[index]!;
        const result = await uploadMutation.mutateAsync({
          file,
          onProgress: (loaded: number, total?: number) => {
            if (!helpers) return;
            if (!total) return;
            const pct = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
            const combined = Math.round(((index + pct / 100) / acceptedFiles.length) * 100);
            helpers.setProgress(combined);
          },
        });
        uploaded.push(result);
      }

      if (uploaded.length > 0) {
        toast('Upload complete.', { variant: 'success' });
        if (shouldAutoConfirm) {
          const selections: ImageFileSelection[] = uploaded
            .map(
              (file: ImageFileRecord): ImageFileSelection => ({
                id: file.id,
                filepath: file.filepath,
              })
            )
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
      title={title}
      size='xl'
      padding='none'
    >
      <div className='flex flex-col h-full overflow-hidden'>
        <div className='p-4 border-b border-border/40'>
          <div className='flex items-center gap-3'>
            <FileUploadButton
              variant='outline'
              size='sm'
              accept={accept}
              multiple
              disabled={uploadMutation.isPending}
              onFilesSelected={(files: File[], helpers?: FileUploadHelpers) =>
                onFilesSelected ? onFilesSelected(files, helpers) : handleUpload(files, helpers)
              }
            >
              <Upload className='mr-2 size-4' />
              {uploadMutation.isPending ? 'Uploading...' : uploadButtonLabel}
            </FileUploadButton>
            <p className='text-xs text-gray-500'>Supported formats: {supportedFormatsLabel}</p>
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
            {...(filepathFilter !== undefined ? { filepathFilter } : {})}
          />
        </div>
      </div>
    </DetailModal>
  );
}
