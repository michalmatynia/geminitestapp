import { type ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';

import type { InternalCategoryOption } from '@/shared/contracts/integrations/context';
import type { MultiSelectOption } from '@/shared/contracts/ui/controls';

import { CategoryMapperNameCell } from './CategoryMapperNameCell';
import { CategoryMapperSelectCell } from './CategoryMapperSelectCell';
import { type CategoryRow } from './utils';

type BuildCategoryMapperColumnsParams = {
  getMappingForExternal: (externalCategoryId: string) => string | null;
  pendingMappings: ReadonlyMap<string, string | null>;
  toggleExpand: (categoryId: string) => void;
  handleMappingChange: (externalCategoryId: string, internalCategoryId: string | null) => void;
  internalCategoriesLoading: boolean;
  isTraderaConnection: boolean;
  selectedCatalogId: string | null;
  internalCategoryOptions: InternalCategoryOption[];
};

const getTraderaCategoryStatusHint = (
  isTraderaConnection: boolean,
  isLeaf: boolean | null | undefined
): string | null => {
  if (!isTraderaConnection) return null;
  return isLeaf === false ? 'Parent category, choose a leaf child instead' : null;
};

const isMappingSelectDisabled = ({
  currentMapping,
  internalCategoriesLoading,
  isTraderaConnection,
  isLeaf,
  selectedCatalogId,
}: {
  currentMapping: string | null;
  internalCategoriesLoading: boolean;
  isTraderaConnection: boolean;
  isLeaf: boolean | null | undefined;
  selectedCatalogId: string | null;
}): boolean =>
  internalCategoriesLoading ||
  selectedCatalogId === null ||
  selectedCatalogId.trim().length === 0 ||
  (isTraderaConnection && isLeaf === false && currentMapping === null);

const resolveInternalCategoryOptions = ({
  internalCategoryOptions,
  isTraderaConnection,
  isLeaf,
}: {
  internalCategoryOptions: InternalCategoryOption[];
  isTraderaConnection: boolean;
  isLeaf: boolean | null | undefined;
}): ReadonlyArray<MultiSelectOption> => {
  if (!isTraderaConnection || isLeaf !== false) return internalCategoryOptions;

  return internalCategoryOptions.map((option) => ({
    ...option,
    disabled: true,
  }));
};

export const buildCategoryMapperColumns = ({
  getMappingForExternal,
  pendingMappings,
  toggleExpand,
  handleMappingChange,
  internalCategoriesLoading,
  isTraderaConnection,
  selectedCatalogId,
  internalCategoryOptions,
}: BuildCategoryMapperColumnsParams): ColumnDef<CategoryRow>[] => [
  {
    accessorKey: 'name',
    header: 'External Category',
    cell: ({ row }) => {
      const mappingKey = row.original.externalId;
      const currentMapping = getMappingForExternal(mappingKey);

      return (
        <CategoryMapperNameCell
          name={row.original.name}
          path={row.original.path}
          statusHint={getTraderaCategoryStatusHint(isTraderaConnection, row.original.isLeaf)}
          depth={row.depth}
          canExpand={row.getCanExpand()}
          isExpanded={row.getIsExpanded()}
          onToggleExpand={() => toggleExpand(row.original.id)}
          isMapped={currentMapping !== null}
          hasPendingChange={pendingMappings.has(mappingKey)}
        />
      );
    },
  },
  {
    id: 'mapping',
    header: 'Internal Category',
    cell: ({ row }) => {
      const mappingKey = row.original.externalId;
      const currentMapping = getMappingForExternal(mappingKey);

      return (
        <CategoryMapperSelectCell
          value={currentMapping}
          onChange={(value) => handleMappingChange(mappingKey, value)}
          options={resolveInternalCategoryOptions({
            internalCategoryOptions,
            isTraderaConnection,
            isLeaf: row.original.isLeaf,
          })}
          disabled={isMappingSelectDisabled({
            currentMapping,
            internalCategoriesLoading,
            isTraderaConnection,
            isLeaf: row.original.isLeaf,
            selectedCatalogId,
          })}
        />
      );
    },
  },
];

export function useCategoryMapperColumns(
  params: BuildCategoryMapperColumnsParams
): ColumnDef<CategoryRow>[] {
  return useMemo(
    () => buildCategoryMapperColumns(params),
    [
      params.getMappingForExternal,
      params.pendingMappings,
      params.toggleExpand,
      params.handleMappingChange,
      params.internalCategoriesLoading,
      params.isTraderaConnection,
      params.selectedCatalogId,
      params.internalCategoryOptions,
    ]
  );
}
