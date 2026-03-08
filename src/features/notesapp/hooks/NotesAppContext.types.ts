import type { NotesAppContextValue } from '@/shared/contracts/notes';

type NotesAppActionKey =
  | 'updateSettings'
  | 'setSelectedNote'
  | 'setIsEditing'
  | 'setIsCreating'
  | 'setIsFolderTreeCollapsed'
  | 'setDraggedNoteId'
  | 'handleThemeChange'
  | 'fetchTags'
  | 'setSelectedFolderId'
  | 'handleSelectNoteFromTree'
  | 'handleToggleFavorite'
  | 'handleDeleteNote'
  | 'handleUpdateSuccess'
  | 'handleCreateSuccess'
  | 'handleUnlinkRelatedNote'
  | 'handleFilterByTag'
  | 'setConfirmation'
  | 'confirmAction'
  | 'setPrompt'
  | 'promptAction'
  | 'operations'
  | 'handleUndoFolderTree'
  | 'handleUndoAtIndex'
  | 'fetchFolderTree';

export type NotesAppActionsValue = Pick<NotesAppContextValue, NotesAppActionKey>;
export type NotesAppStateValue = Omit<NotesAppContextValue, NotesAppActionKey>;

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
