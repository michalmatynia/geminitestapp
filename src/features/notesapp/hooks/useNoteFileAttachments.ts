import { useState } from 'react';

import type { NoteFileDto as NoteFileRecord } from '@/shared/contracts/notes';

// Why: File attachment management has multiple interdependent states:
// - Upload slots track in-progress uploads
// - Multiple files can be attached with validation
// - Lightbox for preview management
// - Paste handling for direct image insertion
// Extracting prevents form component bloat and makes attachment logic testable.
export function useNoteFileAttachments(initialFiles: NoteFileRecord[] = []): {
  noteFiles: NoteFileRecord[];
  setNoteFiles: React.Dispatch<React.SetStateAction<NoteFileRecord[]>>;
  uploadingSlots: Set<number>;
  addUploadingSlot: (slotIndex: number) => void;
  removeUploadingSlot: (slotIndex: number) => void;
  isSlotUploading: (slotIndex: number) => boolean;
  lightboxImage: string | null;
  openLightbox: (imageUrl: string) => void;
  closeLightbox: () => void;
  isPasting: boolean;
  setIsPasting: (isPasting: boolean) => void;
  MAX_SLOTS: number;
  canAddMoreFiles: () => boolean;
  addFile: (file: NoteFileRecord) => boolean;
  removeFile: (fileId: string) => void;
  updateFile: (fileId: string, updates: Partial<NoteFileRecord>) => void;
} {
  const [noteFiles, setNoteFiles] = useState<NoteFileRecord[]>(initialFiles);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  const MAX_SLOTS = 10;

  const addUploadingSlot = (slotIndex: number): void => {
    setUploadingSlots((prev: Set<number>) => new Set([...prev, slotIndex]));
  };

  const removeUploadingSlot = (slotIndex: number): void => {
    setUploadingSlots((prev: Set<number>) => {
      const next = new Set(prev);
      next.delete(slotIndex);
      return next;
    });
  };

  const isSlotUploading = (slotIndex: number): boolean =>
    uploadingSlots.has(slotIndex);

  const canAddMoreFiles = (): boolean => noteFiles.length < MAX_SLOTS;

  const addFile = (file: NoteFileRecord): boolean => {
    if (canAddMoreFiles()) {
      setNoteFiles((prev: NoteFileRecord[]) => [...prev, file]);
      return true;
    }
    return false;
  };

  const removeFile = (fileId: string): void => {
    setNoteFiles((prev: NoteFileRecord[]) =>
      prev.filter((f: NoteFileRecord) => f.id !== fileId),
    );
  };

  const updateFile = (
    fileId: string,
    updates: Partial<NoteFileRecord>,
  ): void => {
    setNoteFiles((prev: NoteFileRecord[]) =>
      prev.map((f: NoteFileRecord) =>
        f.id === fileId ? { ...f, ...updates } : f,
      ),
    );
  };

  const openLightbox = (imageUrl: string): void => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = (): void => {
    setLightboxImage(null);
  };

  return {
    noteFiles,
    setNoteFiles,
    uploadingSlots,
    addUploadingSlot,
    removeUploadingSlot,
    isSlotUploading,
    lightboxImage,
    openLightbox,
    closeLightbox,
    isPasting,
    setIsPasting,
    MAX_SLOTS,
    canAddMoreFiles,
    addFile,
    removeFile,
    updateFile,
  };
}
