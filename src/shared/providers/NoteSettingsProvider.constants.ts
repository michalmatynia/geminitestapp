/**
 * Note Settings Provider Constants
 * 
 * Default configuration and storage keys for note application settings.
 * Provides:
 * - Default note settings values
 * - Storage key constants for persistence
 * - Settings property keys for granular updates
 */

import type { NoteSettings } from '@/shared/contracts/notes';

/**
 * Default note application settings
 * Used for initialization and reset operations
 */
export const DEFAULT_NOTE_SETTINGS: NoteSettings = {
  /** Whether sidebar is collapsed */
  sidebarCollapsed: false,
  /** Whether to show pinned notes section */
  showPinnedSection: true,
  /** Default notebook to open on load */
  defaultNotebookId: null,
  /** Sort field for notes list */
  sortBy: 'created',
  /** Sort direction (asc/desc) */
  sortOrder: 'desc',
  /** Whether to show timestamps in notes */
  showTimestamps: true,
  /** Whether to show breadcrumb navigation */
  showBreadcrumbs: true,
  /** Whether to show related notes suggestions */
  showRelatedNotes: true,
  /** Search scope (current, all, both) */
  searchScope: 'both',
  /** Currently selected folder ID */
  selectedFolderId: null,
  /** Currently selected notebook ID */
  selectedNotebookId: null,
  /** View mode for notes (grid/list) */
  viewMode: 'grid',
  /** Grid density level (1-5) */
  gridDensity: 4,
  /** Whether to auto-format on paste */
  autoformatOnPaste: false,
  /** Editor mode (markdown/rich-text) */
  editorMode: 'markdown',
};

/** Storage key for all note settings */
export const NOTE_SETTINGS_STORAGE_KEY = 'noteSettings';
/** Storage key for selected folder ID */
export const NOTE_SETTINGS_FOLDER_ID_KEY = 'noteSettings:selectedFolderId';
/** Storage key for selected notebook ID */
export const NOTE_SETTINGS_NOTEBOOK_ID_KEY = 'noteSettings:selectedNotebookId';
/** Storage key for autoformat on paste setting */
export const NOTE_SETTINGS_AUTOFORMAT_KEY = 'noteSettings:autoformatOnPaste';
/** Storage key for editor mode setting */
export const NOTE_SETTINGS_EDITOR_MODE_KEY = 'noteSettings:editorMode';
