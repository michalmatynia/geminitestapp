/**
 * 3D Viewer View Mode Types
 * 
 * Type definitions for 3D asset viewer display modes.
 * Provides:
 * - View mode type aliases for consistency
 * - Integration with shared viewer contracts
 * - Type safety for view mode operations
 * - Centralized view mode type management
 */

import type { Asset3dViewMode } from '@/shared/contracts/viewer3d';

/** Type alias for 3D asset view modes (e.g., 'wireframe', 'solid', 'textured') */
export type ViewMode = Asset3dViewMode;
