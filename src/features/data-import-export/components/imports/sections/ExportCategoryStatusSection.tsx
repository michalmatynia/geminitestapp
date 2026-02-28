'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useImportExport } from '@/features/data-import-export/context/ImportExportContext';
import { useCategoryMappingsByConnection } from '@/shared/lib/integrations/hooks/useMarketplaceQueries';
import { Badge, Hint } from '@/shared/ui';

export function ExportCategoryStatusSection(): React.JSX.Element {
  const CATEGORY_TEMPLATE_PRODUCT_FIELDS = new Set(['categoryid', 'category_id', 'category']);

  const { selectedBaseConnectionId, exportTemplateMappings } = useImportExport();

  const usesCategoryMapper = useMemo(
    (): boolean =>
      exportTemplateMappings.some((mapping) =>
        CATEGORY_TEMPLATE_PRODUCT_FIELDS.has(mapping.targetField.trim().toLowerCase())
      ),
    [exportTemplateMappings]
  );

  const categoryMappingsQuery = useCategoryMappingsByConnection(selectedBaseConnectionId, {
    enabled: usesCategoryMapper && !!selectedBaseConnectionId,
  });

  const activeCategoryMappings = useMemo(
    () => (categoryMappingsQuery.data ?? []).filter((mapping) => mapping.isActive),
    [categoryMappingsQuery.data]
  );

  const mappedInternalCategoryCount = useMemo(
    () => new Set(activeCategoryMappings.map((mapping) => mapping.internalCategoryId)).size,
    [activeCategoryMappings]
  );

  const mappedExternalCategoryCount = useMemo(
    () => new Set(activeCategoryMappings.map((mapping) => mapping.externalCategoryId)).size,
    [activeCategoryMappings]
  );

  return (
    <div className='rounded-md border border-border/60 bg-card/30 p-3'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <Hint size='xs' uppercase className='font-semibold text-gray-300'>
            Category Mapping Status
          </Hint>
          <p className='mt-1 text-xs text-gray-500'>
            Pre-export validation for template category field mapping.
          </p>
        </div>
        {!usesCategoryMapper ? (
          <Badge variant='neutral' className='text-[11px] font-normal'>
            Not used by template
          </Badge>
        ) : !selectedBaseConnectionId ? (
          <Badge variant='warning' className='text-[11px] font-normal'>
            Select connection
          </Badge>
        ) : categoryMappingsQuery.isLoading ? (
          <Badge variant='info' className='text-[11px] font-normal'>
            Checking mappings...
          </Badge>
        ) : activeCategoryMappings.length > 0 ? (
          <Badge variant='success' className='text-[11px] font-normal'>
            Ready
          </Badge>
        ) : (
          <Badge variant='error' className='text-[11px] font-normal'>
            Missing mappings
          </Badge>
        )}
      </div>
      <div className='mt-2 text-xs text-gray-400'>
        {!usesCategoryMapper ? (
          <span>Current export template does not map product category field (`categoryId`).</span>
        ) : !selectedBaseConnectionId ? (
          <span>Select a Base connection to validate category mappings.</span>
        ) : categoryMappingsQuery.isError ? (
          <span>Failed to load category mappings for this connection.</span>
        ) : activeCategoryMappings.length === 0 ? (
          <span>
            No active mappings found for this connection. Add mappings in{' '}
            <Link
              href='/admin/integrations/aggregators/base-com/category-mapping'
              className='text-amber-300 underline'
            >
              Category Mapper
            </Link>
            .
          </span>
        ) : (
          <span>
            Found {activeCategoryMappings.length} active mapping(s), {mappedInternalCategoryCount}{' '}
            internal category(ies) and {mappedExternalCategoryCount} Base category(ies).
          </span>
        )}
      </div>
    </div>
  );
}
