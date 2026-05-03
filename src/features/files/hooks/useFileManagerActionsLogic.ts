
import { useCallback } from 'react';
import type { ImageFileSelection } from '@/shared/contracts/files';
import type { ExpandedImageFile } from '@/shared/contracts/products/drafts';
import { useDeleteFile, useUpdateFileTags } from '@/features/files/hooks/useFileQueries';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export function useFileManagerActionsLogic(
  selectedFiles: ImageFileSelection[],
  setSelectedFiles: (files: ImageFileSelection[]) => void,
  bulkTagInput: string,
  setBulkTagInput: (input: string) => void,
  bulkTagMode: 'add' | 'replace',
  fileById: Map<string, ExpandedImageFile>,
  parseTagInput: (input: string) => string[]
) {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const deleteFileMutation = useDeleteFile();
  const updateTagsMutation = useUpdateFileTags();

  const deleteSelected = useCallback(async () => {
    confirm({
      title: 'Delete Files?',
      message: 'Are you sure you want to delete the selected files? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          for (const file of selectedFiles) {
            await deleteFileMutation.mutateAsync(file.id);
          }
          setSelectedFiles([]);
          toast('Selected files deleted.', { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'FileManager',
            action: 'deleteSelected',
            count: selectedFiles.length,
          });
          toast('Failed to delete selected files.', { variant: 'error' });
        }
      },
    });
  }, [selectedFiles, deleteFileMutation, toast, confirm, setSelectedFiles]);

  const applyTags = useCallback(async () => {
    const tags = parseTagInput(bulkTagInput);
    if (selectedFiles.length === 0) {
      toast('Select at least one file to tag.', { variant: 'info' });
      return;
    }
    if (tags.length === 0) {
      toast('Enter at least one tag.', { variant: 'info' });
      return;
    }
    try {
      await Promise.all(
        selectedFiles.map((file) => {
          const existing = fileById.get(file.id)?.tags ?? [];
          const nextTags =
            bulkTagMode === 'replace' ? tags : Array.from(new Set([...existing, ...tags]));
          return updateTagsMutation.mutateAsync({ id: file.id, tags: nextTags });
        })
      );
      toast('Tags updated.', { variant: 'success' });
      setBulkTagInput('');
    } catch (error) {
      logClientCatch(error, {
        source: 'FileManager',
        action: 'applyTags',
        count: selectedFiles.length,
      });
      toast('Failed to update tags.', { variant: 'error' });
    }
  }, [bulkTagInput, selectedFiles, bulkTagMode, fileById, updateTagsMutation, toast, setBulkTagInput, parseTagInput]);

  const deleteFile = useCallback(async (fileId: string) => {
    confirm({
      title: 'Delete File?',
      message: 'Are you sure you want to delete this file? This action cannot be undone.',
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteFileMutation.mutateAsync(fileId);
          toast('File deleted successfully.', { variant: 'success' });
        } catch (error) {
          logClientCatch(error, { source: 'FileManager', action: 'deleteFile', fileId });
          toast('Failed to delete file.', { variant: 'error' });
        }
      },
    });
  }, [deleteFileMutation, toast, confirm]);

  return {
    deleteSelected,
    applyTags,
    deleteFile,
    isPending: updateTagsMutation.isPending || deleteFileMutation.isPending,
  };
}
