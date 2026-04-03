import { z } from 'zod';

import type {
  PromptExploderBinding,
  PromptExploderDocument,
} from '@/shared/contracts/prompt-exploder';
import { promptExploderDocumentSchema } from '@/shared/contracts/prompt-exploder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { promptLibraryItemBaseSchema } from '@/shared/contracts/prompts';


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

const resolvePromptExploderLibraryItemId = (args: {
  existingItem: PromptExploderLibraryItem | null;
  createItemId: () => string;
}): string => args.existingItem?.id ?? args.createItemId();

const resolveNonEmptyTrimmedString = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolvePromptExploderLibraryItemCreatedAt = (args: {
  existingItem: PromptExploderLibraryItem | null;
  now: string;
}): string => args.existingItem?.createdAt ?? args.now;

const resolvePromptExploderLibraryItemName = (args: {
  prompt: string;
  libraryNameDraft: string;
  existingItem: PromptExploderLibraryItem | null;
}): string => {
  const draftName = resolveNonEmptyTrimmedString(args.libraryNameDraft);
  if (draftName) {
    return draftName;
  }

  return args.existingItem?.name || derivePromptExploderLibraryItemName(args.prompt);
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
  const itemId = resolvePromptExploderLibraryItemId({
    existingItem: args.existingItem,
    createItemId,
  });
  const itemName = resolvePromptExploderLibraryItemName({
    prompt: args.prompt,
    libraryNameDraft: args.libraryNameDraft,
    existingItem: args.existingItem,
  });
  const documentSnapshot = buildPromptExploderLibraryDocumentSnapshot({
    documentState: args.documentState,
    prompt: args.prompt,
  });

  return {
    id: itemId,
    name: itemName,
    prompt: args.prompt,
    document: documentSnapshot,
    createdAt: resolvePromptExploderLibraryItemCreatedAt(args),
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

export function getManualBindingsFromDocument(
  document: PromptExploderDocument | null
): PromptExploderBinding[] {
  return (document?.bindings ?? []).filter(
    (binding: PromptExploderBinding) => binding.origin === 'manual'
  );
}
