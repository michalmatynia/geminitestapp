import type {
  FilemakerDatabase,
  FilemakerLexiconTermCategory,
  FilemakerLexiconType,
} from '../types';
import { createFilemakerLexiconType, FILEMAKER_LEXICON_TYPE_DEFINITIONS } from '../settings';

export type FilemakerLexiconTypeMetadata = Pick<
  FilemakerLexiconType,
  'description' | 'key' | 'label' | 'sortOrder'
>;

export type FilemakerLexiconTypeMetadataMap = ReadonlyMap<
  FilemakerLexiconTermCategory,
  FilemakerLexiconTypeMetadata
>;

export type FilemakerLexiconTypeOption = {
  label: string;
  value: FilemakerLexiconTermCategory;
};

export type FilemakerLexiconTypeDraft = {
  description: string;
  key: FilemakerLexiconTermCategory;
  label: string;
  sortOrder: string;
};

const DEFAULT_FILEMAKER_LEXICON_TYPE_OPTIONS = FILEMAKER_LEXICON_TYPE_DEFINITIONS.map(
  (definition): FilemakerLexiconTypeOption => ({
    label: definition.label,
    value: definition.key,
  })
);

export const FILEMAKER_LEXICON_CATEGORY_OPTIONS = [
  { label: 'All types', value: 'all' },
  ...DEFAULT_FILEMAKER_LEXICON_TYPE_OPTIONS,
];

export const FILEMAKER_LEXICON_EDIT_CATEGORY_OPTIONS =
  FILEMAKER_LEXICON_CATEGORY_OPTIONS.filter((option) => option.value !== 'all') as Array<{
    label: string;
    value: FilemakerLexiconTermCategory;
  }>;

const DEFAULT_TYPE_METADATA = new Map<FilemakerLexiconTermCategory, FilemakerLexiconTypeMetadata>(
  FILEMAKER_LEXICON_TYPE_DEFINITIONS.map((definition) => [
    definition.key,
    {
      description: definition.description,
      key: definition.key,
      label: definition.label,
      sortOrder: definition.sortOrder,
    },
  ])
);

export const buildFilemakerLexiconTypeMetadata = (
  database?: Pick<FilemakerDatabase, 'lexiconTypes'>
): Map<FilemakerLexiconTermCategory, FilemakerLexiconTypeMetadata> => {
  const metadata = new Map(DEFAULT_TYPE_METADATA);
  database?.lexiconTypes.forEach((type: FilemakerLexiconType): void => {
    metadata.set(type.key, {
      description: type.description,
      key: type.key,
      label: type.label,
      sortOrder: type.sortOrder,
    });
  });
  return metadata;
};

export const formatFilemakerLexiconCategory = (
  category: FilemakerLexiconTermCategory,
  typeMetadata?: FilemakerLexiconTypeMetadataMap
): string =>
  typeMetadata?.get(category)?.label ?? DEFAULT_TYPE_METADATA.get(category)?.label ?? category;

const getSortOrder = (
  category: FilemakerLexiconTermCategory,
  typeMetadata?: FilemakerLexiconTypeMetadataMap
): number =>
  (typeMetadata?.get(category) ?? DEFAULT_TYPE_METADATA.get(category))?.sortOrder ??
  Number.MAX_SAFE_INTEGER;

export const compareFilemakerLexiconTypeKeys = (
  left: FilemakerLexiconTermCategory,
  right: FilemakerLexiconTermCategory,
  typeMetadata?: FilemakerLexiconTypeMetadataMap
): number => {
  const sortCompare = getSortOrder(left, typeMetadata) - getSortOrder(right, typeMetadata);
  if (sortCompare !== 0) return sortCompare;
  return formatFilemakerLexiconCategory(left, typeMetadata).localeCompare(
    formatFilemakerLexiconCategory(right, typeMetadata)
  );
};

export const buildFilemakerLexiconTypeFilterOptions = (
  database: Pick<FilemakerDatabase, 'lexiconTypes'>
): Array<FilemakerLexiconTypeOption | { label: string; value: 'all' }> => [
  { label: 'All types', value: 'all' },
  ...buildFilemakerLexiconTypeEditOptions(database),
];

export const buildFilemakerLexiconTypeEditOptions = (
  database: Pick<FilemakerDatabase, 'lexiconTypes'>
): FilemakerLexiconTypeOption[] =>
  database.lexiconTypes
    .slice()
    .sort((left: FilemakerLexiconType, right: FilemakerLexiconType): number => {
      const sortCompare = left.sortOrder - right.sortOrder;
      if (sortCompare !== 0) return sortCompare;
      return left.label.localeCompare(right.label);
    })
    .map((type: FilemakerLexiconType): FilemakerLexiconTypeOption => ({
      label: type.label,
      value: type.key,
    }));

export const isFilemakerLexiconCategory = (
  value: string
): value is FilemakerLexiconTermCategory =>
  FILEMAKER_LEXICON_EDIT_CATEGORY_OPTIONS.some((option) => option.value === value);

export const parseFilemakerLexiconCategoryFilter = (
  value: string
): FilemakerLexiconTermCategory | 'all' => {
  if (value === 'all') return 'all';
  if (isFilemakerLexiconCategory(value)) return value;
  return 'all';
};

export const getFilemakerLexiconCreateCategory = (
  categoryFilter: FilemakerLexiconTermCategory | 'all'
): FilemakerLexiconTermCategory => {
  if (categoryFilter === 'all') return 'other';
  return categoryFilter;
};

export const toFilemakerLexiconTypeDrafts = (
  database: Pick<FilemakerDatabase, 'lexiconTypes'>
): FilemakerLexiconTypeDraft[] =>
  database.lexiconTypes
    .slice()
    .sort((left: FilemakerLexiconType, right: FilemakerLexiconType): number => {
      const sortCompare = left.sortOrder - right.sortOrder;
      if (sortCompare !== 0) return sortCompare;
      return left.label.localeCompare(right.label);
    })
    .map((type: FilemakerLexiconType): FilemakerLexiconTypeDraft => ({
      description: type.description ?? '',
      key: type.key,
      label: type.label,
      sortOrder: String(type.sortOrder),
    }));

export const hasInvalidFilemakerLexiconTypeDraft = (
  draft: FilemakerLexiconTypeDraft
): boolean => draft.label.trim().length === 0 || !Number.isFinite(Number(draft.sortOrder));

export const withUpdatedFilemakerLexiconTypes = (
  database: FilemakerDatabase,
  drafts: FilemakerLexiconTypeDraft[],
  now: string
): FilemakerDatabase => {
  const existingTypesByKey = new Map(
    database.lexiconTypes.map((type: FilemakerLexiconType) => [type.key, type])
  );
  return {
    ...database,
    lexiconTypes: drafts.map((draft: FilemakerLexiconTypeDraft): FilemakerLexiconType => {
      const existing = existingTypesByKey.get(draft.key);
      return createFilemakerLexiconType({
        id: existing?.id,
        key: draft.key,
        label: draft.label,
        description: draft.description,
        sortOrder: Number(draft.sortOrder),
        system: existing?.system ?? true,
        createdAt: existing?.createdAt,
        updatedAt: now,
      });
    }),
  };
};
