import { z } from 'zod';

import {
  kangurAiTutorFocusKindSchema,
  kangurAiTutorFollowUpActionSchema,
  kangurAiTutorSurfaceSchema,
} from './kangur-ai-tutor';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { KANGUR_NATIVE_GUIDE_ENTRIES } from './kangur-ai-tutor-native-guide-entries';

const nonEmptyTrimmedString = z.string().trim().min(1);
const tutorGuideCopySchema = nonEmptyTrimmedString.max(1_200);
const tutorGuideBulletSchema = nonEmptyTrimmedString.max(240);
const tutorGuideTagSchema = nonEmptyTrimmedString.max(120);

export const kangurAiTutorNativeGuideEntrySchema = z.object({
  id: nonEmptyTrimmedString.max(120),
  surface: kangurAiTutorSurfaceSchema.nullable().default(null),
  focusKind: kangurAiTutorFocusKindSchema.nullable().default(null),
  focusIdPrefixes: z.array(tutorGuideTagSchema).max(16).default([]),
  contentIdPrefixes: z.array(tutorGuideTagSchema).max(16).default([]),
  title: nonEmptyTrimmedString.max(120),
  shortDescription: nonEmptyTrimmedString.max(240),
  fullDescription: tutorGuideCopySchema,
  hints: z.array(tutorGuideBulletSchema).max(8).default([]),
  relatedGames: z.array(tutorGuideTagSchema).max(8).default([]),
  relatedTests: z.array(tutorGuideTagSchema).max(8).default([]),
  followUpActions: z.array(kangurAiTutorFollowUpActionSchema).max(6).default([]),
  triggerPhrases: z.array(tutorGuideTagSchema).max(16).default([]),
  enabled: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
export type KangurAiTutorNativeGuideEntry = z.infer<
  typeof kangurAiTutorNativeGuideEntrySchema
>;

export const kangurAiTutorNativeGuideStoreSchema = z.object({
  locale: nonEmptyTrimmedString.max(16).default('pl'),
  version: z.number().int().positive().default(6),
  entries: z.array(kangurAiTutorNativeGuideEntrySchema).max(200).default([]),
});
export type KangurAiTutorNativeGuideStore = z.infer<
  typeof kangurAiTutorNativeGuideStoreSchema
>;

export const DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE: Readonly<KangurAiTutorNativeGuideStore> =
  Object.freeze(
    kangurAiTutorNativeGuideStoreSchema.parse(
      repairKangurPolishCopy({
        locale: 'pl',
        version: 9,
        entries: KANGUR_NATIVE_GUIDE_ENTRIES,
      })
    )
  );

const isPlainNativeGuideObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeNativeGuideEntry = (
  baseEntry: KangurAiTutorNativeGuideEntry,
  entry: unknown
): KangurAiTutorNativeGuideEntry => {
  const nextEntry = isPlainNativeGuideObject(entry) ? entry : {};
  return kangurAiTutorNativeGuideEntrySchema.parse({
    ...baseEntry,
    ...nextEntry,
    surface: nextEntry['surface'] === undefined ? baseEntry.surface : nextEntry['surface'],
    focusKind: nextEntry['focusKind'] === undefined ? baseEntry.focusKind : nextEntry['focusKind'],
    focusIdPrefixes:
      nextEntry['focusIdPrefixes'] === undefined ? baseEntry.focusIdPrefixes : nextEntry['focusIdPrefixes'],
    contentIdPrefixes:
      nextEntry['contentIdPrefixes'] === undefined
        ? baseEntry.contentIdPrefixes
        : nextEntry['contentIdPrefixes'],
    hints: nextEntry['hints'] === undefined ? baseEntry.hints : nextEntry['hints'],
    relatedGames:
      nextEntry['relatedGames'] === undefined ? baseEntry.relatedGames : nextEntry['relatedGames'],
    relatedTests:
      nextEntry['relatedTests'] === undefined ? baseEntry.relatedTests : nextEntry['relatedTests'],
    followUpActions:
      nextEntry['followUpActions'] === undefined
        ? baseEntry.followUpActions
        : nextEntry['followUpActions'],
    triggerPhrases:
      nextEntry['triggerPhrases'] === undefined
        ? baseEntry.triggerPhrases
        : nextEntry['triggerPhrases'],
    enabled: nextEntry['enabled'] === undefined ? baseEntry.enabled : nextEntry['enabled'],
    sortOrder: nextEntry['sortOrder'] === undefined ? baseEntry.sortOrder : nextEntry['sortOrder'],
  });
};

export const mergeKangurAiTutorNativeGuideStore = (
  baseStore: KangurAiTutorNativeGuideStore,
  value: unknown
): KangurAiTutorNativeGuideStore => {
  const valueObject = isPlainNativeGuideObject(value) ? value : {};
  const rawEntries = Array.isArray(valueObject['entries']) ? valueObject['entries'] : [];
  const baseEntriesById = new Map(baseStore.entries.map((entry) => [entry.id, entry]));
  const seenEntryIds = new Set<string>();
  const mergedEntries: KangurAiTutorNativeGuideEntry[] = [];

  for (const rawEntry of rawEntries) {
    if (!isPlainNativeGuideObject(rawEntry)) {
      continue;
    }

    const rawId = typeof rawEntry['id'] === 'string' ? rawEntry['id'].trim() : '';
    if (!rawId || seenEntryIds.has(rawId)) {
      continue;
    }
    seenEntryIds.add(rawId);

    const baseEntry = baseEntriesById.get(rawId);
    mergedEntries.push(
      baseEntry
        ? mergeNativeGuideEntry(baseEntry, rawEntry)
        : kangurAiTutorNativeGuideEntrySchema.parse(rawEntry)
    );
  }

  for (const baseEntry of baseStore.entries) {
    if (!seenEntryIds.has(baseEntry.id)) {
      mergedEntries.push(baseEntry);
    }
  }

  return kangurAiTutorNativeGuideStoreSchema.parse({
    ...baseStore,
    ...valueObject,
    locale:
      typeof valueObject['locale'] === 'string' && valueObject['locale'].trim().length > 0
        ? valueObject['locale']
        : baseStore.locale,
    version: Math.max(
      baseStore.version,
      typeof valueObject['version'] === 'number' && Number.isInteger(valueObject['version'])
        ? valueObject['version']
        : baseStore.version
    ),
    entries: mergedEntries,
  });
};

export function parseKangurAiTutorNativeGuideStore(
  raw: unknown
): KangurAiTutorNativeGuideStore {
  return kangurAiTutorNativeGuideStoreSchema.parse(raw);
}
