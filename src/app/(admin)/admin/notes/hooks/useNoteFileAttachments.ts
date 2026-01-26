import { useState } from "react";
import type { NoteFileRecord } from "@/types/notes";

// Why: File attachment management has multiple interdependent states:
// - Upload slots track in-progress uploads
// - Multiple files can be attached with validation
// - Lightbox for preview management
// - Paste handling for direct image insertion
// Extracting prevents form component bloat and makes attachment logic testable.
export function useNoteFileAttachments(initialFiles: NoteFileRecord[] = []) {
  const [noteFiles, setNoteFiles] = useState<NoteFileRecord[]>(initialFiles);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);

  const MAX_SLOTS = 10;

  const addUploadingSlot = (slotIndex: number) => {
    setUploadingSlots((prev) => new Set([...prev, slotIndex]));
  };

  const removeUploadingSlot = (slotIndex: number) => {
    setUploadingSlots((prev) => {
      const next = new Set(prev);
      next.delete(slotIndex);
      return next;
    });
  };

  const isSlotUploading = (slotIndex: number) => uploadingSlots.has(slotIndex);

  const canAddMoreFiles = () => noteFiles.length < MAX_SLOTS;

  const addFile = (file: NoteFileRecord) => {
    if (canAddMoreFiles()) {
      setNoteFiles((prev) => [...prev, file]);
      return true;
    }
    return false;
  };

  const removeFile = (fileId: string) => {
    setNoteFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const updateFile = (fileId: string, updates: Partial<NoteFileRecord>) => {
    setNoteFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
    );
  };

  const openLightbox = (imageUrl: string) => {
    setLightboxImage(imageUrl);
  };

  const closeLightbox = () => {
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
