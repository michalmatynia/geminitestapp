/**
 * Public API entrypoint for the NotesApp feature.
 * Exports public hooks, pages, contracts, utilities, and validation schemas for managing notes.
 */
export * from './hooks/NoteSettingsContext';
export * from './pages/AdminNotesNotebooksPage';
export * from './pages/AdminNotesPage';
export * from './pages/AdminNotesSettingsPage';
export * from './pages/AdminNotesTagsPage';
export * from './pages/AdminNotesThemesPage';
export * from '@/shared/contracts/notes';
export * from './utils';
export * from './validations/notes';
