import { z } from 'zod';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
} from '@/shared/contracts/prompt-exploder';
import { promptExploderDocumentSchema } from '@/shared/contracts/prompt-exploder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { promptLibraryItemBaseSchema } from '@/shared/contracts/prompts';
import {
  resolvePromptExploderLibraryItemIdentity,
  resolvePromptExploderLibraryItemName,
} from './prompt-library.helpers';


export const PROMPT_EXPLODER_LIBRARY_KEY = 'image_studio_prompt_exploder_library';

export const promptExploderLibraryItemSchema = promptLibraryItemBaseSchema.extend({
  document: promptExploderDocumentSchema.nullable().optional(),
});

export type PromptExploderLibraryItem = z.infer<typeof promptExploderLibraryItemSchema>;

export const promptExploderLibraryStateSchema = z.object({
  version: z.number().int().positive().default(1),
  items: z.array(promptExploderLibraryItemSchema).default([]),
});

export type PromptExploderLibraryState = z.infer<typeof promptExploderLibraryStateSchema>;

export const defaultPromptExploderLibraryState: PromptExploderLibraryState = {
  version: 1,
  items: [],
};

export const parsePromptExploderLibrary = (
  rawValue: string | null | undefined
): PromptExploderLibraryState => {
  if (!rawValue?.trim()) return defaultPromptExploderLibraryState;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    const result = promptExploderLibraryStateSchema.safeParse(parsed);
    if (!result.success) return defaultPromptExploderLibraryState;
    return result.data;
  } catch (error) {
    logClientError(error);
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
  document: PromptExploderDocument | null | undefined
): PromptExploderDocument | null => {
  if (!document) return null;
  try {
    return JSON.parse(JSON.stringify(document)) as PromptExploderDocument;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const buildPromptExploderLibraryDocumentSnapshot = (args: {
  documentState: PromptExploderDocument | null;
  prompt: string;
}): PromptExploderDocument | null =>
  args.documentState
    ? clonePromptExploderDocument({
        ...args.documentState,
        sourcePrompt: args.prompt,
      })
    : null;

export const buildPromptExploderLibraryItem = (args: {
  prompt: string;
  libraryNameDraft: string;
  existingItem: PromptExploderLibraryItem | null;
  documentState: PromptExploderDocument | null;
  now: string;
  createItemId?: () => string;
}): PromptExploderLibraryItem => {
  const createItemId = args.createItemId ?? createPromptExploderLibraryItemId;
  const itemIdentity = resolvePromptExploderLibraryItemIdentity({
    existingItem: args.existingItem,
    now: args.now,
    createItemId,
  });
  const itemName = resolvePromptExploderLibraryItemName({
    prompt: args.prompt,
    libraryNameDraft: args.libraryNameDraft,
    existingItem: args.existingItem,
    deriveName: derivePromptExploderLibraryItemName,
  });
  const documentSnapshot = buildPromptExploderLibraryDocumentSnapshot({
    documentState: args.documentState,
    prompt: args.prompt,
  });

  return {
    ...itemIdentity,
    name: itemName,
    prompt: args.prompt,
    document: documentSnapshot,
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

export function getManualBindingsFromDocument(
  document: PromptExploderDocument | null
): PromptExploderBinding[] {
  return (document?.bindings ?? []).filter(
    (binding: PromptExploderBinding) => binding.origin === 'manual'
  );
}
