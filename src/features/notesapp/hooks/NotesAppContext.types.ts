import type { NotesAppContextValue } from '@/shared/contracts/notes';
import { PickActions, OmitState } from '@/shared/lib/react/types';

export type NotesAppActionsValue = Omit<
  PickActions<NotesAppContextValue>,
  'getThemeForNote'
> &
  Pick<NotesAppContextValue, 'operations'>;
export type NotesAppStateValue = Omit<OmitState<NotesAppContextValue>, 'operations'> &
  Pick<NotesAppContextValue, 'getThemeForNote'>;

export interface NotesAppConfirmationState {
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  isDangerous?: boolean;
}

export interface NotesAppPromptState {
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void | Promise<void>;
  required?: boolean;
}
