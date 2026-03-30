import type { NoteSettings } from '@/shared/contracts/notes';

export const DEFAULT_NOTE_SETTINGS: NoteSettings = {
  sidebarCollapsed: false,
  showPinnedSection: true,
  defaultNotebookId: null,
  sortBy: 'created',
  sortOrder: 'desc',
  showTimestamps: true,
  showBreadcrumbs: true,
  showRelatedNotes: true,
  searchScope: 'both',
  selectedFolderId: null,
  selectedNotebookId: null,
  viewMode: 'grid',
  gridDensity: 4,
  autoformatOnPaste: false,
  editorMode: 'markdown',
};

export const NOTE_SETTINGS_STORAGE_KEY = 'noteSettings';
export const NOTE_SETTINGS_FOLDER_ID_KEY = 'noteSettings:selectedFolderId';
export const NOTE_SETTINGS_NOTEBOOK_ID_KEY = 'noteSettings:selectedNotebookId';
export const NOTE_SETTINGS_AUTOFORMAT_KEY = 'noteSettings:autoformatOnPaste';
export const NOTE_SETTINGS_EDITOR_MODE_KEY = 'noteSettings:editorMode';
