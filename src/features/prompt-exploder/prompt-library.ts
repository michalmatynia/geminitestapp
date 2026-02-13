import { z } from 'zod';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
} from './types';

export const PROMPT_EXPLODER_LIBRARY_KEY = 'image_studio_prompt_exploder_library';

export type PromptExploderLibraryItem = {
  id: string;
  name: string;
  prompt: string;
  document: PromptExploderDocument | null;
  createdAt: string;
  updatedAt: string;
};

export type PromptExploderLibraryState = {
  version: 1;
  items: PromptExploderLibraryItem[];
};

export const defaultPromptExploderLibraryState: PromptExploderLibraryState = {
  version: 1,
  items: [],
};

const libraryItemSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  document: z.unknown().nullable().optional().default(null),
  createdAt: z.string().trim().min(1),
  updatedAt: z.string().trim().min(1),
});

const promptExploderLibrarySchema = z.object({
  version: z.literal(1),
  items: z.array(libraryItemSchema).default([]),
});

const isPromptExploderDocument = (value: unknown): value is PromptExploderDocument => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record['version'] === 1 &&
    typeof record['sourcePrompt'] === 'string' &&
    Array.isArray(record['segments']) &&
    Array.isArray(record['bindings']) &&
    Array.isArray(record['warnings']) &&
    typeof record['reassembledPrompt'] === 'string'
  );
};

const toLibraryItem = (raw: z.infer<typeof libraryItemSchema>): PromptExploderLibraryItem => ({
  id: raw.id,
  name: raw.name,
  prompt: raw.prompt,
  document: isPromptExploderDocument(raw.document) ? raw.document : null,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const parsePromptExploderLibrary = (
  rawValue: string | null | undefined
): PromptExploderLibraryState => {
  if (!rawValue?.trim()) return defaultPromptExploderLibraryState;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    const result = promptExploderLibrarySchema.safeParse(parsed);
    if (!result.success) return defaultPromptExploderLibraryState;
    return {
      version: 1,
      items: result.data.items.map(toLibraryItem),
    };
  } catch {
    return defaultPromptExploderLibraryState;
  }
};

export const createPromptExploderLibraryItemId = (): string =>
  `prompt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const derivePromptExploderLibraryItemName = (prompt: string): string => {
  const firstLine =
    prompt
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? '';
  if (firstLine) return firstLine.slice(0, 80);
  return `Prompt ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`;
};

export const sortPromptExploderLibraryItemsByUpdated = (
  items: PromptExploderLibraryItem[]
): PromptExploderLibraryItem[] =>
  [...items].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

export const clonePromptExploderDocument = (
  document: PromptExploderDocument | null
): PromptExploderDocument | null => {
  if (!document) return null;
  try {
    return JSON.parse(JSON.stringify(document)) as PromptExploderDocument;
  } catch {
    return null;
  }
};

export const buildPromptExploderLibraryItem = (args: {
  prompt: string;
  libraryNameDraft: string;
  existingItem: PromptExploderLibraryItem | null;
  documentState: PromptExploderDocument | null;
  now: string;
  createItemId?: () => string;
}): PromptExploderLibraryItem => {
  const createItemId = args.createItemId ?? createPromptExploderLibraryItemId;
  const itemId = args.existingItem?.id ?? createItemId();
  const itemName =
    args.libraryNameDraft.trim() ||
    args.existingItem?.name ||
    derivePromptExploderLibraryItemName(args.prompt);
  const documentSnapshot = args.documentState
    ? clonePromptExploderDocument({
      ...args.documentState,
      sourcePrompt: args.prompt,
    })
    : null;

  return {
    id: itemId,
    name: itemName,
    prompt: args.prompt,
    document: documentSnapshot,
    createdAt: args.existingItem?.createdAt ?? args.now,
    updatedAt: args.now,
  };
};

export const upsertPromptExploderLibraryItems = (args: {
  items: PromptExploderLibraryItem[];
  nextItem: PromptExploderLibraryItem;
  maxItems?: number;
}): PromptExploderLibraryItem[] => {
  const byId = new Map(args.items.map((item) => [item.id, item]));
  byId.set(args.nextItem.id, args.nextItem);
  const maxItems = args.maxItems ?? 200;
  return sortPromptExploderLibraryItemsByUpdated([...byId.values()]).slice(0, maxItems);
};

export const removePromptExploderLibraryItemById = (
  items: PromptExploderLibraryItem[],
  itemId: string
): PromptExploderLibraryItem[] => {
  return items.filter((item) => item.id !== itemId);
};

export const hydratePromptExploderLibraryDocument = (
  item: PromptExploderLibraryItem
): PromptExploderDocument | null => {
  const clonedDocument = clonePromptExploderDocument(item.document);
  if (!clonedDocument) return null;
  return {
    ...clonedDocument,
    sourcePrompt: item.prompt,
  };
};

export const getManualBindingsFromDocument = (
  document: PromptExploderDocument | null
): PromptExploderBinding[] => {
  return (document?.bindings ?? []).filter((binding) => binding.origin === 'manual');
};
