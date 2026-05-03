import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { internalError } from '@/shared/errors/app-error';

import type { NoteFileRecord } from '@/shared/contracts/notes';

export interface NoteFilesData {
  noteFiles: NoteFileRecord[];
  uploadingSlots: Set<number>;
  addUploadingSlot: (slot: number) => void;
  removeUploadingSlot: (slot: number) => void;
  lightboxImage: string | null;
  setLightboxImage: (img: string | null) => void;
  isPasting: boolean;
  setIsPasting: (isPasting: boolean) => void;
  MAX_SLOTS: number;
  handleFileUpload: (
    slotIndex: number,
    file: File,
    helpers?: { reportProgress: (loaded: number, total?: number) => void }
  ) => Promise<void>;
  handleMultiFileUpload: (
    files: FileList | File[],
    helpers?: { setProgress: (value: number) => void }
  ) => Promise<void>;
  handleFileDelete: (slotIndex: number) => Promise<void>;
  insertFileReference: (file: NoteFileRecord) => void;
  getNextAvailableSlot: () => number | null;
  handlePaste: (e: React.ClipboardEvent) => Promise<void>;
  formatFileSize: (bytes: number) => string;
  isImageFile: (mimetype: string) => boolean;
}

const { Context: NoteFilesContext, useStrictContext: useNoteFilesContext } =
  createStrictContext<NoteFilesData>({
    hookName: 'useNoteFilesContext',
    providerName: 'NoteFormProvider',
    displayName: 'NoteFilesContext',
    errorFactory: internalError,
  });

export { NoteFilesContext, useNoteFilesContext };
