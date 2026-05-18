import 'server-only';

/**
 * Server-side entrypoint for the NotesApp feature.
 * Exports server-side services (note management and file services).
 * Should only be accessed in server environments.
 */
export * from './services/notes';
export * from './services/note-file-service';
