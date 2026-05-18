import 'server-only';

/**
 * AI Brain Server Entry Point
 * 
 * Exports server-side segments for the AI Brain platform module, including
 * database interactions, settings management, and API integration layers.
 * Should only be accessed in server environments.
 */

export * from './segments/database';
export * from './segments/settings';
export * from './segments/api';
