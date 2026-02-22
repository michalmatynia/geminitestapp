import { z } from 'zod';

import {
  folderTreeInstanceValues,
  type FolderTreeInstance,
} from './folder-tree-profiles-v2';

export { type FolderTreeInstance };

export const FOLDER_TREE_UI_STATE_V1_SETTING_KEY = 'folder_tree_ui_state_v1';

export type FolderTreeUiStateV1Entry = {
  expandedNodeIds: string[];
  panelCollapsed: boolean;
};

export type FolderTreeUiStateV1Map = Record<FolderTreeInstance, FolderTreeUiStateV1Entry>;

const normalizeIdList = (values: string[] | null | undefined): string[] => {
  if (!Array.isArray(values) || values.length === 0) return [];
  const normalized = new Set<string>();
  values.forEach((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    normalized.add(trimmed);
  });
  return Array.from(normalized);
};

const entrySchema: z.ZodType<FolderTreeUiStateV1Entry> = z.object({
  expandedNodeIds: z.array(z.string()),
  panelCollapsed: z.boolean(),
});

const mapSchema: z.ZodType<FolderTreeUiStateV1Map> = z.object({
  notes: entrySchema,
  image_studio: entrySchema,
  product_categories: entrySchema,
  cms_page_builder: entrySchema,
  case_resolver: entrySchema,
});

const createDefaultEntry = (): FolderTreeUiStateV1Entry => ({
  expandedNodeIds: [],
  panelCollapsed: false,
});

export const createDefaultFolderTreeUiStateV1 = (): FolderTreeUiStateV1Map => ({
  notes: createDefaultEntry(),
  image_studio: createDefaultEntry(),
  product_categories: createDefaultEntry(),
  cms_page_builder: createDefaultEntry(),
  case_resolver: createDefaultEntry(),
});

const coerceEntry = (
  candidate: unknown,
  fallback: FolderTreeUiStateV1Entry
): FolderTreeUiStateV1Entry => {
  const parsed = entrySchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      expandedNodeIds: [...fallback.expandedNodeIds],
      panelCollapsed: fallback.panelCollapsed,
    };
  }

  return {
    expandedNodeIds: normalizeIdList(parsed.data.expandedNodeIds),
    panelCollapsed: parsed.data.panelCollapsed,
  };
};

export const parseFolderTreeUiStateV1 = (
  raw: string | null | undefined
): FolderTreeUiStateV1Map => {
  const defaults = createDefaultFolderTreeUiStateV1();
  if (!raw) return defaults;

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return defaults;
  }

  if (!parsedJson || typeof parsedJson !== 'object') return defaults;
  const candidate = parsedJson as Partial<Record<FolderTreeInstance, unknown>>;
  const next = createDefaultFolderTreeUiStateV1();

  folderTreeInstanceValues.forEach((instance: FolderTreeInstance) => {
    next[instance] = coerceEntry(candidate[instance], defaults[instance]);
  });

  const parsedMap = mapSchema.safeParse(next);
  if (!parsedMap.success) return defaults;
  return parsedMap.data;
};

export const serializeFolderTreeUiStateV1 = (value: FolderTreeUiStateV1Map): string =>
  JSON.stringify(value);
