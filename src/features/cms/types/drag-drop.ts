/**
 * Drag and Drop Type Definitions
 * 
 * Type definitions for CMS drag-and-drop operations.
 * Provides:
 * - Block drag payload interfaces
 * - Source location tracking
 * - Parent-child relationship types
 * - Section and column identification
 * - Drag operation state management
 */

export interface BlockDragPayload {
  id: string | null;
  type: string | null;
  fromSectionId: string | null;
  fromColumnId: string | null;
  fromParentBlockId: string | null;
}
