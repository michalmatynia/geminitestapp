import { z } from 'zod';

import {
  kangurAiTutorFocusKindSchema,
  kangurAiTutorSurfaceSchema,
} from './kangur-ai-tutor';

const nonEmptyTrimmedString = z.string().trim().min(1);

export const KANGUR_PAGE_CONTENT_COLLECTION = 'kangur_page_content';

export const kangurPageContentPageKeySchema = z.enum([
  'Game',
  'Lessons',
  'Tests',
  'LearnerProfile',
  'ParentDashboard',
  'Login',
  'SharedChrome',
]);
export type KangurPageContentPageKey = z.infer<typeof kangurPageContentPageKeySchema>;

export const kangurPageContentFragmentSchema = z.object({
  id: nonEmptyTrimmedString.max(160),
  text: z.string().trim().min(1).max(600),
  aliases: z.array(nonEmptyTrimmedString.max(600)).max(16).default([]),
  explanation: z.string().trim().min(1).max(5_000),
  nativeGuideIds: z.array(nonEmptyTrimmedString.max(160)).max(16).default([]),
  triggerPhrases: z.array(nonEmptyTrimmedString.max(160)).max(24).default([]),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type KangurPageContentFragment = z.infer<typeof kangurPageContentFragmentSchema>;

export const kangurPageContentEntrySchema = z.object({
  id: nonEmptyTrimmedString.max(160),
  pageKey: kangurPageContentPageKeySchema,
  screenKey: nonEmptyTrimmedString.max(120),
  surface: kangurAiTutorSurfaceSchema.nullable().default(null),
  route: z.string().trim().max(240).nullable().default(null),
  componentId: nonEmptyTrimmedString.max(160),
  widget: nonEmptyTrimmedString.max(160),
  sourcePath: nonEmptyTrimmedString.max(260),
  title: nonEmptyTrimmedString.max(160),
  summary: z.string().trim().min(1).max(600),
  body: z.string().trim().min(1).max(20_000),
  anchorIdPrefix: z.string().trim().max(160).nullable().default(null),
  focusKind: kangurAiTutorFocusKindSchema.nullable().default(null),
  contentIdPrefixes: z.array(nonEmptyTrimmedString.max(160)).max(24).default([]),
  nativeGuideIds: z.array(nonEmptyTrimmedString.max(160)).max(16).default([]),
  triggerPhrases: z.array(nonEmptyTrimmedString.max(160)).max(24).default([]),
  tags: z.array(nonEmptyTrimmedString.max(120)).max(24).default([]),
  fragments: z.array(kangurPageContentFragmentSchema).max(200).default([]),
  notes: z.string().trim().max(2_000).optional(),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type KangurPageContentEntry = z.infer<typeof kangurPageContentEntrySchema>;

export const kangurPageContentStoreSchema = z
  .object({
    locale: nonEmptyTrimmedString.max(16).default('pl'),
    version: z.number().int().positive().default(1),
    entries: z.array(kangurPageContentEntrySchema).max(400).default([]),
  })
  .superRefine((store, ctx) => {
    const seenIds = new Set<string>();
    const duplicateIds = new Set<string>();

    for (const entry of store.entries) {
      if (seenIds.has(entry.id)) {
        duplicateIds.add(entry.id);
      } else {
        seenIds.add(entry.id);
      }
    }

    if (duplicateIds.size > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entries'],
        message: `Duplicate page-content ids are not allowed: ${[...duplicateIds].join(', ')}`,
      });
    }
  });
export type KangurPageContentStore = z.infer<typeof kangurPageContentStoreSchema>;

const dedupeOrdered = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

const mergeEntry = (
  defaultEntry: KangurPageContentEntry,
  existingEntry: KangurPageContentEntry
): KangurPageContentEntry =>
  kangurPageContentEntrySchema.parse({
    ...defaultEntry,
    ...existingEntry,
    contentIdPrefixes: dedupeOrdered([
      ...defaultEntry.contentIdPrefixes,
      ...existingEntry.contentIdPrefixes,
    ]),
    nativeGuideIds: dedupeOrdered([
      ...defaultEntry.nativeGuideIds,
      ...existingEntry.nativeGuideIds,
    ]),
    triggerPhrases: dedupeOrdered([
      ...defaultEntry.triggerPhrases,
      ...existingEntry.triggerPhrases,
    ]),
    tags: dedupeOrdered([...defaultEntry.tags, ...existingEntry.tags]),
  });

export const parseKangurPageContentStore = (value: unknown): KangurPageContentStore =>
  kangurPageContentStoreSchema.parse(value);

export const mergeKangurPageContentStore = (
  defaults: KangurPageContentStore,
  existing: KangurPageContentStore | null | undefined
): KangurPageContentStore => {
  const parsedDefaults = parseKangurPageContentStore(defaults);
  const parsedExisting = existing ? parseKangurPageContentStore(existing) : null;
  const defaultIds = new Set(parsedDefaults.entries.map((entry) => entry.id));
  const existingById = new Map(
    (parsedExisting?.entries ?? []).map((entry) => [entry.id, entry] as const)
  );
  const mergedEntries = parsedDefaults.entries.map((entry) => {
    const existingEntry = existingById.get(entry.id);
    return existingEntry ? mergeEntry(entry, existingEntry) : entry;
  });

  for (const entry of parsedExisting?.entries ?? []) {
    if (defaultIds.has(entry.id)) {
      continue;
    }
    mergedEntries.push(entry);
  }

  mergedEntries.sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.id.localeCompare(right.id);
  });

  return kangurPageContentStoreSchema.parse({
    locale: parsedDefaults.locale,
    version: parsedDefaults.version,
    entries: mergedEntries,
  });
};
