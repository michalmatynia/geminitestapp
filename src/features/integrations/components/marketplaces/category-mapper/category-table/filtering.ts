import { Check, CircleSlash, ListFilter } from 'lucide-react';

import { type CategoryRow } from './utils';

export type CategoryMappingFilter = 'all' | 'mapped' | 'unmapped';

export const CATEGORY_MAPPING_FILTER_OPTIONS = [
  { value: 'all', label: 'All', icon: ListFilter },
  { value: 'mapped', label: 'Mapped', icon: Check },
  { value: 'unmapped', label: 'Unmapped', icon: CircleSlash },
] as const;

type GetMappingForExternal = (externalCategoryId: string) => string | null;

const isPresentText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const normalizeCategorySearchValue = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, ' ');

const buildCategorySearchHaystack = (row: CategoryRow): string =>
  normalizeCategorySearchValue(
    [row.name, row.path, row.externalId].filter(isPresentText).join(' ')
  );

const matchesCategoryMappingFilter = (
  row: CategoryRow,
  filter: CategoryMappingFilter,
  getMappingForExternal: GetMappingForExternal
): boolean => {
  if (filter === 'all') return true;

  const isMapped = getMappingForExternal(row.externalId) !== null;
  return filter === 'mapped' ? isMapped : !isMapped;
};

export const getCategorySearchTerms = (query: string): string[] =>
  normalizeCategorySearchValue(query).split(' ').filter(isPresentText);

export const filterCategoryTree = ({
  rows,
  terms,
  mappingFilter,
  getMappingForExternal,
}: {
  rows: CategoryRow[];
  terms: string[];
  mappingFilter: CategoryMappingFilter;
  getMappingForExternal: GetMappingForExternal;
}): CategoryRow[] => {
  if (terms.length === 0 && mappingFilter === 'all') return rows;

  return rows.flatMap((row: CategoryRow): CategoryRow[] => {
    const filteredSubRows =
      row.subRows === undefined
        ? undefined
        : filterCategoryTree({
            rows: row.subRows,
            terms,
            mappingFilter,
            getMappingForExternal,
          });
    const matchesSearch = terms.every((term: string) =>
      buildCategorySearchHaystack(row).includes(term)
    );
    const matchesMapping = matchesCategoryMappingFilter(row, mappingFilter, getMappingForExternal);
    const hasFilteredSubRows = filteredSubRows !== undefined && filteredSubRows.length > 0;

    if ((!matchesSearch || !matchesMapping) && !hasFilteredSubRows) return [];

    return [{ ...row, subRows: hasFilteredSubRows ? filteredSubRows : undefined }];
  });
};

export const collectExpandedCategoryIds = (
  rows: CategoryRow[],
  ids = new Set<string>()
): Set<string> => {
  for (const row of rows) {
    const subRows = row.subRows ?? [];
    if (subRows.length > 0) {
      ids.add(row.id);
      collectExpandedCategoryIds(subRows, ids);
    }
  }
  return ids;
};

export const getFilteredEmptyTitle = ({
  hasSearch,
  mappingFilter,
}: {
  hasSearch: boolean;
  mappingFilter: CategoryMappingFilter;
}): string => {
  if (!hasSearch && mappingFilter === 'mapped') return 'No mapped external categories';
  if (!hasSearch && mappingFilter === 'unmapped') return 'No unmapped external categories';
  return 'No matching external categories';
};
