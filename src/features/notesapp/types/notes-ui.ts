import type { NoteWithRelationsDto } from '@/shared/contracts/notes';
import type { ModalStateProps } from '@/shared/types/modal-props';

export interface CreateNoteModalProps extends ModalStateProps {}

export interface NoteFormProps {
  note?: NoteWithRelationsDto | null;
  onSuccess: () => void;
}

