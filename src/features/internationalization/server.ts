/**
 * Internationalization Feature - Server Entry Point
 *
 * This is the server-side entry point for the internationalization feature.
 * It must only be imported into server-side code (Node.js runtime).
 */
import 'server-only';

/** Re-exports seeding utilities for internationalization data */
export * from './lib/seedInternationalization';

/** Re-exports default internationalization settings and values */
export * from './lib/internationalizationDefaults';

/** Re-exports internationalization fallback logic */
export * from './lib/internationalizationFallback';

/** Re-exports the currency repository for server-side currency operations */
export * from './services/currency-repository';

/** Re-exports the internationalization provider service */
export * from './services/internationalization-provider';

/** Re-exports site-specific internationalization configuration */
export * from './services/site-i18n-config';
