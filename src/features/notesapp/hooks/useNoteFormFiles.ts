'use client';

import { useCallback } from 'react';

import type { NoteFileRecord } from '@/shared/contracts/notes';
import type { Toast } from '@/shared/contracts/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { autoformatMarkdown } from '../utils';

export function useNoteFormFiles({
  addUploadingSlot,
  content,
  contentRef,
  createFile,
  deleteFile,
  maxSlots,
  noteFiles,
  noteId,
  removeFile,
  removeUploadingSlot,
  setContent,
  setIsPasting,
  setNoteFiles,
  settingsAutoformatOnPaste,
  toast,
}: {
  addUploadingSlot: (slotIndex: number) => void;
  content: string;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;
  createFile: (input: {
    slotIndex: number;
    file: File;
    onProgress?: (loaded: number, total?: number) => void;
  }) => Promise<NoteFileRecord>;
  deleteFile: (slotIndex: number) => Promise<unknown>;
  maxSlots: number;
  noteFiles: NoteFileRecord[];
  noteId: string | undefined;
  removeFile: (fileId: string) => void;
  removeUploadingSlot: (slotIndex: number) => void;
  setContent: (content: string) => void;
  setIsPasting: (isPasting: boolean) => void;
  setNoteFiles: React.Dispatch<React.SetStateAction<NoteFileRecord[]>>;
  settingsAutoformatOnPaste: boolean;
  toast: Toast;
}) {
  const getNextAvailableSlot = useCallback((): number | null => {
    const usedSlots: Set<number> = new Set(
      noteFiles.map((file: NoteFileRecord): number => file.slotIndex)
    );
    for (let index = 0; index < maxSlots; index += 1) {
      if (!usedSlots.has(index)) return index;
    }
    return null;
  }, [maxSlots, noteFiles]);

  const isImageFile = useCallback((mimetype: string): boolean => mimetype.startsWith('image/'), []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const handleFileUpload = useCallback(
    async (
      slotIndex: number,
      file: File,
      helpers?: { reportProgress: (loaded: number, total?: number) => void }
    ): Promise<void> => {
      if (!noteId) {
        toast('Please save the note first before uploading files');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast('File size exceeds 10MB limit');
        return;
      }

      addUploadingSlot(slotIndex);

      try {
        const newFile = await createFile({
          slotIndex,
          file,
          onProgress: (loaded: number, total?: number) => helpers?.reportProgress(loaded, total),
        });
        setNoteFiles((previous: NoteFileRecord[]): NoteFileRecord[] =>
          [...previous.filter((item: NoteFileRecord): boolean => item.slotIndex !== slotIndex), newFile].sort(
            (left: NoteFileRecord, right: NoteFileRecord): number => left.slotIndex - right.slotIndex
          )
        );
        toast('File uploaded successfully');
      } catch (error: unknown) {
        logClientError(error);
        logClientError(error, {
          context: {
            source: 'NoteForm',
            action: 'uploadFile',
            noteId,
            slotIndex,
          },
        });
        const message = error instanceof Error ? error.message : 'Failed to upload file';
        toast(message);
      } finally {
        removeUploadingSlot(slotIndex);
      }
    },
    [addUploadingSlot, createFile, noteId, removeUploadingSlot, setNoteFiles, toast]
  );

  const handleFileDelete = useCallback(
    async (slotIndex: number): Promise<void> => {
      if (!noteId) return;

      try {
        await deleteFile(slotIndex);
        removeFile(
          noteFiles.find((file: NoteFileRecord): boolean => file.slotIndex === slotIndex)?.id || ''
        );
        toast('File deleted successfully');
      } catch (error: unknown) {
        logClientError(error);
        logClientError(error, {
          context: {
            source: 'NoteForm',
            action: 'deleteFile',
            noteId,
            slotIndex,
          },
        });
        toast('Failed to delete file');
      }
    },
    [deleteFile, noteFiles, noteId, removeFile, toast]
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
      const uploadPastedImage = async (file: File): Promise<void> => {
        if (!noteId) {
          toast('Please save the note first before pasting images');
          return;
        }

        const nextSlot: number | null = getNextAvailableSlot();
        if (nextSlot === null) {
          toast('All file slots are full. Delete a file to paste a new image.');
          return;
        }

        if (file.size > 10 * 1024 * 1024) {
          toast('Image size exceeds 10MB limit');
          return;
        }

        setIsPasting(true);
        addUploadingSlot(nextSlot);

        const textarea: HTMLTextAreaElement | null = contentRef.current;
        const cursorPosition: number = textarea?.selectionStart ?? content.length;

        try {
          const timestamp: number = Date.now();
          const extension: string = file.type.split('/')[1] || 'png';
          const renamedFile: File = new File([file], `pasted-image-${timestamp}.${extension}`, {
            type: file.type,
          });

          const newFile = await createFile({
            slotIndex: nextSlot,
            file: renamedFile,
          });

          setNoteFiles((previous: NoteFileRecord[]): NoteFileRecord[] =>
            [...previous.filter((item: NoteFileRecord): boolean => item.slotIndex !== nextSlot), newFile].sort(
              (left: NoteFileRecord, right: NoteFileRecord): number => left.slotIndex - right.slotIndex
            )
          );

          const altText: string = renamedFile.name;
          const reference: string = `![${altText}](${newFile.filepath})`;
          const nextValue: string =
            content.slice(0, cursorPosition) + reference + content.slice(cursorPosition);
          setContent(nextValue);

          toast('Image pasted and uploaded');
        } catch (error: unknown) {
          logClientError(error);
          logClientError(error, {
            context: {
              source: 'NoteForm',
              action: 'uploadPastedImage',
              noteId,
            },
          });
          toast('Failed to upload pasted image');
        } finally {
          setIsPasting(false);
          removeUploadingSlot(nextSlot);
        }
      };

      const pastedText: string | undefined = event.clipboardData?.getData('text/plain');
      if (pastedText) {
        if (settingsAutoformatOnPaste) {
          event.preventDefault();
          const formattedText: string = autoformatMarkdown(pastedText);
          const textarea: HTMLTextAreaElement | null = contentRef.current;
          const selectionStart: number = textarea?.selectionStart ?? content.length;
          const selectionEnd: number = textarea?.selectionEnd ?? content.length;
          const newContent: string =
            content.slice(0, selectionStart) + formattedText + content.slice(selectionEnd);
          setContent(newContent);
          window.requestAnimationFrame((): void => {
            if (textarea) {
              const newPosition: number = selectionStart + formattedText.length;
              textarea.selectionStart = newPosition;
              textarea.selectionEnd = newPosition;
              textarea.focus();
            }
          });
        }
        return;
      }

      const items: DataTransferItemList | undefined = event.clipboardData?.items;
      if (!items) return;

      for (let index = 0; index < items.length; index += 1) {
        const item: DataTransferItem | null = items[index] ?? null;
        if (item?.type.startsWith('image/')) {
          event.preventDefault();
          const file: File | null = item.getAsFile();
          if (!file) return;
          await uploadPastedImage(file);
          return;
        }
      }

      const pastedFiles: FileList | undefined = event.clipboardData?.files;
      if (pastedFiles && pastedFiles.length > 0) {
        const file: File | null = pastedFiles[0] ?? null;
        if (file?.type.startsWith('image/')) {
          event.preventDefault();
          await uploadPastedImage(file);
        }
      }
    },
    [
      addUploadingSlot,
      content,
      contentRef,
      createFile,
      getNextAvailableSlot,
      noteId,
      removeUploadingSlot,
      setContent,
      setIsPasting,
      setNoteFiles,
      settingsAutoformatOnPaste,
      toast,
    ]
  );

  const handleMultiFileUpload = useCallback(
    async (
      files: FileList | File[],
      helpers?: { setProgress: (value: number) => void }
    ): Promise<void> => {
      const queue: File[] = Array.from(files);
      for (let index = 0; index < queue.length; index += 1) {
        const file = queue[index]!;
        const nextSlot: number | null = getNextAvailableSlot();
        if (nextSlot === null) {
          toast('All file slots are full. Delete a file to upload more.');
          return;
        }
        await handleFileUpload(nextSlot, file, {
          reportProgress: (loaded: number, total?: number) => {
            if (!helpers || !total) return;
            const pct = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
            const combined = Math.round(((index + pct / 100) / queue.length) * 100);
            helpers.setProgress(combined);
          },
        });
      }
    },
    [getNextAvailableSlot, handleFileUpload, toast]
  );

  const insertFileReference = useCallback((file: NoteFileRecord): void => {
    window.dispatchEvent(new CustomEvent('note-insert-file', { detail: file }));
  }, []);

  return {
    getNextAvailableSlot,
    isImageFile,
    formatFileSize,
    handleFileUpload,
    handleFileDelete,
    handlePaste,
    handleMultiFileUpload,
    insertFileReference,
  };
}
