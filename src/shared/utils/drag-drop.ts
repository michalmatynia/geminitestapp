/**
 * Drag and Drop Utilities
 * 
 * Standardized drag and drop data transfer keys and utilities.
 * Provides:
 * - Consistent data transfer key definitions
 * - Type-safe drag data handling
 * - Cross-component drag and drop support
 * - Structured data transfer for complex objects
 */

// Standardized keys for drag and drop data transfer
export const DRAG_KEYS = {
  TEXT: 'text/plain', // Standard text content
  NOTE_ID: 'noteId', // Note identifier for note management
  FOLDER_ID: 'folderId', // Folder identifier for file organization
  CATEGORY_ID: 'categoryId', // Category identifier for content classification
  ADMIN_MENU_PATH: 'application/x-admin-menu-path', // Admin navigation paths
  AI_NODE: 'application/x-ai-node', // AI workflow node data
  ASSET_ID: 'assetId', // Asset identifier for media management
  FOLDER_PATH: 'folderPath', // Full folder path for navigation
  BLOCK_ID: 'blockId', // Page builder block identifier
  BLOCK_TYPE: 'blockType', // Page builder block type
  SECTION_ID: 'sectionId', // Page section identifier
  SECTION_TYPE: 'sectionType', // Page section type
  SECTION_ZONE: 'sectionZone', // Page section zone placement
  SECTION_INDEX: 'sectionIndex', // Page section ordering index
  FROM_SECTION_ID: 'fromSectionId',
  FROM_COLUMN_ID: 'fromColumnId',
  FROM_PARENT_BLOCK_ID: 'fromParentBlockId',
  CASE_RESOLVER_ITEM: 'application/x-case-resolver-item',
} as const;

export type DragDataRecord = Record<string, string | number | null | undefined>;

export const setDragData = (
  dataTransfer: DataTransfer,
  data: DragDataRecord,
  options?: {
    text?: string | null;
    effectAllowed?: DataTransfer['effectAllowed'];
  }
): void => {
  Object.entries(data).forEach(([key, value]: [string, string | number | null | undefined]) => {
    if (value === undefined || value === null) return;
    dataTransfer.setData(key, String(value));
  });
  if (options?.text !== undefined && options.text !== null) {
    dataTransfer.setData(DRAG_KEYS.TEXT, String(options.text));
  }
  if (options?.effectAllowed !== undefined && options.effectAllowed !== 'none') {
    // eslint-disable-next-line no-param-reassign
    dataTransfer.effectAllowed = options.effectAllowed;
  }
};

export const getDragValue = (dataTransfer: DataTransfer, key: string): string | null => {
  const value = dataTransfer.getData(key);
  return value === '' ? null : value;
};

export const getFirstDragValue = (
  dataTransfer: DataTransfer,
  keys: string[],
  fallback?: string | null
): string | null => {
  for (const key of keys) {
    const value = getDragValue(dataTransfer, key);
    if (value !== null) return value;
  }
  return fallback ?? null;
};

export const hasDragType = (dataTransfer: DataTransfer, keys: string[]): boolean => {
  const types = Array.from(dataTransfer.types);
  return keys.some((key: string) => types.includes(key));
};

export const parseDragIndex = (rawIndex?: string | null): number | null => {
  if (rawIndex === undefined || rawIndex === null || rawIndex.length === 0) return null;
  const parsed = Number.parseInt(rawIndex, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const resolveVerticalDropPosition = (
  clientY: number,
  rect: DOMRect,
  options?: { thresholdRatio?: number; thresholdPx?: number }
): 'before' | 'after' | null => {
  const ratio = options?.thresholdRatio ?? 0.3;
  const threshold = options?.thresholdPx ?? Math.max(8, rect.height * ratio);
  if (clientY - rect.top <= threshold) return 'before';
  if (rect.bottom - clientY <= threshold) return 'after';
  return null;
};

export const setNoteDragData = (dataTransfer: DataTransfer, noteId: string): void => {
  setDragData(dataTransfer, { [DRAG_KEYS.NOTE_ID]: noteId }, { effectAllowed: 'linkMove' });
};

export const setFolderDragData = (dataTransfer: DataTransfer, folderId: string): void => {
  setDragData(dataTransfer, { [DRAG_KEYS.FOLDER_ID]: folderId }, { effectAllowed: 'move' });
};

export const getNoteDragId = (
  dataTransfer: DataTransfer,
  fallback?: string | null
): string | null => getFirstDragValue(dataTransfer, [DRAG_KEYS.NOTE_ID], fallback);

export const getFolderDragId = (
  dataTransfer: DataTransfer,
  fallback?: string | null
): string | null => getFirstDragValue(dataTransfer, [DRAG_KEYS.FOLDER_ID], fallback);
