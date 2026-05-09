/**
 * Viewer3D Feature - Server Entry Point
 *
 * This is the server-side entry point for the viewer3d feature.
 * It must only be imported into server-side code (Node.js runtime).
 */
import 'server-only';

/** Re-exports the 3D asset repository for server-side database operations */
export * from './services/asset3d-repository';

/** Re-exports utilities for 3D asset uploads */
export * from './utils/asset3dUploader';

/** Re-exports 3D asset validation logic */
export * from './utils/validateAsset3d';

/** Re-exports 3D asset reindexing utilities */
export * from './utils/asset3dReindex';

/** Re-exports shared 3D asset contracts and type definitions */
export * from '@/shared/contracts/viewer3d';
