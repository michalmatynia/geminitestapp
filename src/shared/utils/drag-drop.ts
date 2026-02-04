export const DRAG_KEYS = {
  TEXT: "text/plain",
  NOTE_ID: "noteId",
  FOLDER_ID: "folderId",
  CATEGORY_ID: "categoryId",
  ADMIN_MENU_PATH: "application/x-admin-menu-path",
  AI_NODE: "application/x-ai-node",
  ASSET_ID: "assetId",
  FOLDER_PATH: "folderPath",
  BLOCK_ID: "blockId",
  BLOCK_TYPE: "blockType",
  SECTION_ID: "sectionId",
  SECTION_TYPE: "sectionType",
  SECTION_ZONE: "sectionZone",
  SECTION_INDEX: "sectionIndex",
  FROM_SECTION_ID: "fromSectionId",
  FROM_COLUMN_ID: "fromColumnId",
  FROM_PARENT_BLOCK_ID: "fromParentBlockId",
} as const;

export type DragDataRecord = Record<string, string | number | null | undefined>;

export const setDragData = (
  dataTransfer: DataTransfer,
  data: DragDataRecord,
  options?: {
    text?: string | null;
    effectAllowed?: DataTransfer["effectAllowed"];
  }
): void => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    dataTransfer.setData(key, String(value));
  });
  if (options?.text !== undefined && options?.text !== null) {
    dataTransfer.setData(DRAG_KEYS.TEXT, String(options.text));
  }
  if (options?.effectAllowed) {
    dataTransfer.effectAllowed = options.effectAllowed;
  }
};

export const getDragValue = (dataTransfer: DataTransfer, key: string): string | null => {
  const value = dataTransfer.getData(key);
  return value === "" ? null : value;
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
  const types = Array.from(dataTransfer.types ?? []);
  return keys.some((key) => types.includes(key));
};

export const parseDragIndex = (rawIndex?: string | null): number | null => {
  if (!rawIndex) return null;
  const parsed = Number.parseInt(rawIndex, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const setNoteDragData = (dataTransfer: DataTransfer, noteId: string): void => {
  setDragData(
    dataTransfer,
    { [DRAG_KEYS.NOTE_ID]: noteId },
    { text: noteId, effectAllowed: "linkMove" }
  );
};

export const setFolderDragData = (dataTransfer: DataTransfer, folderId: string): void => {
  setDragData(
    dataTransfer,
    { [DRAG_KEYS.FOLDER_ID]: folderId },
    { effectAllowed: "move" }
  );
};

export const getNoteDragId = (dataTransfer: DataTransfer, fallback?: string | null): string | null =>
  getFirstDragValue(dataTransfer, [DRAG_KEYS.NOTE_ID, DRAG_KEYS.TEXT], fallback);

export const getFolderDragId = (dataTransfer: DataTransfer, fallback?: string | null): string | null =>
  getFirstDragValue(dataTransfer, [DRAG_KEYS.FOLDER_ID], fallback);
