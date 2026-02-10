import type { NoteWithRelations } from '@/shared/types/domain/notes';

export interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface NoteFormProps {
  note?: NoteWithRelations | null;
  onSuccess: () => void;
}
