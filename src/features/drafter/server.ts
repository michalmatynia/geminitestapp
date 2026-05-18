import 'server-only';

/**
 * Server-side entrypoint for the Drafter feature.
 * Exports server-side draft service for managing draft persistence.
 * Should only be accessed in server environments.
 */
export * from './services/draft-service';
