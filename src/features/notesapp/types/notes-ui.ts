import type { NoteWithRelations } from '@/shared/types/domain/notes';
import type { ModalStateProps } from '@/shared/types/modal-props';

export interface CreateNoteModalProps extends ModalStateProps {}

export interface NoteFormProps {
  note?: NoteWithRelations | null;
  onSuccess: () => void;
}
