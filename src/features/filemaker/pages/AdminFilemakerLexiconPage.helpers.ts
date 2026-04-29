import type {
  FilemakerDatabase,
  FilemakerJobListing,
  FilemakerJobListingLexiconLink,
  FilemakerLexiconTerm,
  FilemakerLexiconTermCategory,
} from '../types';
import {
  compareFilemakerLexiconTypeKeys,
  formatFilemakerLexiconCategory,
  type FilemakerLexiconTypeMetadataMap,
} from './AdminFilemakerLexiconPage.type-metadata';
import {
  createFilemakerJobListing,
  createFilemakerLexiconTerm,
} from '../settings';

export type FilemakerLexiconFormState = {
  category: FilemakerLexiconTermCategory;
  label: string;
};

export type FilemakerLexiconEditorState = {
  editing: FilemakerLexiconTerm | null;
  form: FilemakerLexiconFormState;
  open: boolean;
};

export const DEFAULT_FILEMAKER_LEXICON_FORM: FilemakerLexiconFormState = {
  category: 'other',
  label: '',
};

export const normalizeFilemakerLexiconLabel = (value: string): string =>
  value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

export const normalizeFilemakerLexiconKey = (value: string): string =>
  normalizeFilemakerLexiconLabel(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export type FilemakerLexiconTermFilters = {
  category: FilemakerLexiconTermCategory | 'all';
  query: string;
};

export type FilemakerLexiconTermRow = {
  linkedJobCount: number;
  term: FilemakerLexiconTerm;
};

export const buildFilemakerLexiconLinkedJobCounts = (
  database: FilemakerDatabase
): Map<string, number> => {
  const jobIdsByTermId = new Map<string, Set<string>>();
  const add = (termId: string, jobListingId: string): void => {
    if (termId.trim().length === 0 || jobListingId.trim().length === 0) return;
    const existing = jobIdsByTermId.get(termId) ?? new Set<string>();
    existing.add(jobListingId);
    jobIdsByTermId.set(termId, existing);
  };

  database.jobListingLexiconLinks.forEach((link: FilemakerJobListingLexiconLink): void => {
    add(link.lexiconTermId, link.jobListingId);
  });
  database.jobListings.forEach((listing: FilemakerJobListing): void => {
    listing.lexiconTermIds.forEach((termId: string): void => add(termId, listing.id));
  });

  return new Map(
    Array.from(jobIdsByTermId.entries()).map(([termId, jobIds]): [string, number] => [
      termId,
      jobIds.size,
    ])
  );
};

export const toFilemakerLexiconTermRows = (
  database: FilemakerDatabase
): FilemakerLexiconTermRow[] => {
  const linkedJobCounts = buildFilemakerLexiconLinkedJobCounts(database);
  return database.lexiconTerms.map((term: FilemakerLexiconTerm): FilemakerLexiconTermRow => ({
    linkedJobCount: linkedJobCounts.get(term.id) ?? 0,
    term,
  }));
};

const includesLexiconQuery = (
  row: FilemakerLexiconTermRow,
  query: string,
  typeMetadata?: FilemakerLexiconTypeMetadataMap
): boolean => {
  const normalizedQuery = normalizeFilemakerLexiconKey(query);
  if (normalizedQuery.length === 0) return true;
  const searchable = normalizeFilemakerLexiconKey(
    [
      row.term.label,
      row.term.normalizedLabel,
      row.term.typeKey,
      formatFilemakerLexiconCategory(row.term.typeKey, typeMetadata),
      row.term.sourceSite ?? '',
      row.term.sourceProvider ?? '',
    ].join(' ')
  );
  return searchable.includes(normalizedQuery);
};

export const filterFilemakerLexiconTermRows = (
  rows: FilemakerLexiconTermRow[],
  filters: FilemakerLexiconTermFilters,
  typeMetadata?: FilemakerLexiconTypeMetadataMap
): FilemakerLexiconTermRow[] =>
  rows
    .filter((row: FilemakerLexiconTermRow): boolean =>
      filters.category === 'all' ? true : row.term.typeKey === filters.category
    )
    .filter((row: FilemakerLexiconTermRow): boolean =>
      includesLexiconQuery(row, filters.query, typeMetadata)
    )
    .sort((left: FilemakerLexiconTermRow, right: FilemakerLexiconTermRow): number => {
      const typeCompare = compareFilemakerLexiconTypeKeys(
        left.term.typeKey,
        right.term.typeKey,
        typeMetadata
      );
      if (typeCompare !== 0) return typeCompare;
      return left.term.label.localeCompare(right.term.label);
    });

export const hasDuplicateFilemakerLexiconTerm = (
  database: FilemakerDatabase,
  editingId: string | null,
  form: FilemakerLexiconFormState
): boolean => {
  const normalizedLabel = normalizeFilemakerLexiconKey(form.label);
  if (normalizedLabel.length === 0) return false;
  return database.lexiconTerms.some((term: FilemakerLexiconTerm): boolean => {
    if (term.id === editingId) return false;
    return term.typeKey === form.category && term.normalizedLabel === normalizedLabel;
  });
};

export const withDeletedFilemakerLexiconTerm = (
  database: FilemakerDatabase,
  term: FilemakerLexiconTerm
): FilemakerDatabase => {
  const updatedAt = new Date().toISOString();
  return {
    ...database,
    lexiconTerms: database.lexiconTerms.filter(
      (entry: FilemakerLexiconTerm): boolean => entry.id !== term.id
    ),
    jobListingLexiconLinks: database.jobListingLexiconLinks.filter(
      (link): boolean => link.lexiconTermId !== term.id
    ),
    jobListings: database.jobListings.map((listing) =>
      withoutListingLexiconTerm(listing, term.id, updatedAt)
    ),
  };
};

type UpsertFilemakerLexiconTermInput = {
  database: FilemakerDatabase;
  editing: FilemakerLexiconTerm | null;
  fallbackId: string;
  form: FilemakerLexiconFormState;
  now: string;
};

export const upsertFilemakerLexiconTermInDatabase = (
  input: UpsertFilemakerLexiconTermInput
): FilemakerDatabase => {
  const term = createFilemakerLexiconTermFromForm(input);
  if (input.editing === null) {
    return { ...input.database, lexiconTerms: [...input.database.lexiconTerms, term] };
  }
  const editingId = input.editing.id;
  return {
    ...input.database,
    lexiconTerms: input.database.lexiconTerms.map((entry: FilemakerLexiconTerm) =>
      entry.id === editingId ? term : entry
    ),
  };
};

const withoutListingLexiconTerm = (
  listing: FilemakerJobListing,
  termId: string,
  updatedAt: string
): FilemakerJobListing => {
  if (!listing.lexiconTermIds.includes(termId)) return listing;
  return createFilemakerJobListing({
    ...listing,
    lexiconTermIds: listing.lexiconTermIds.filter((entry: string): boolean => entry !== termId),
    updatedAt,
  });
};

const createFilemakerLexiconTermFromForm = (
  input: UpsertFilemakerLexiconTermInput
): FilemakerLexiconTerm => {
  const label = normalizeFilemakerLexiconLabel(input.form.label);
  return createFilemakerLexiconTerm({
    ...getExistingLexiconTermFields(input.editing, input.now),
    id: getFilemakerLexiconTermId(input.editing, input.fallbackId),
    label,
    normalizedLabel: normalizeFilemakerLexiconKey(label),
    typeKey: input.form.category,
    category: input.form.category,
    updatedAt: input.now,
  });
};

const getFilemakerLexiconTermId = (
  editing: FilemakerLexiconTerm | null,
  fallbackId: string
): string => {
  if (editing === null) return fallbackId;
  return editing.id;
};

const getExistingLexiconTermFields = (
  editing: FilemakerLexiconTerm | null,
  now: string
): Pick<
  FilemakerLexiconTerm,
  'createdAt' | 'firstSeenAt' | 'lastSeenAt' | 'occurrenceCount' | 'sourceProvider' | 'sourceSite'
> => {
  if (editing === null) {
    return {
      createdAt: now,
      occurrenceCount: 0,
    };
  }
  return {
    createdAt: editing.createdAt,
    firstSeenAt: editing.firstSeenAt,
    lastSeenAt: editing.lastSeenAt,
    occurrenceCount: editing.occurrenceCount,
    sourceProvider: editing.sourceProvider,
    sourceSite: editing.sourceSite,
  };
};
