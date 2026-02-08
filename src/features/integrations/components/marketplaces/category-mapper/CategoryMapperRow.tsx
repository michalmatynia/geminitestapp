'use client';

import { ChevronDown, ChevronRight, Check } from 'lucide-react';
import React from 'react';

import { useCategoryMapper } from '@/features/integrations/context/CategoryMapperContext';
import type { ExternalCategory } from '@/features/integrations/types/category-mapping';
import { Button, UnifiedSelect } from '@/shared/ui';

interface CategoryMapperRowProps {
  category: ExternalCategory;
  depth?: number;
}

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

export function CategoryMapperRow({ category, depth = 0 }: CategoryMapperRowProps): React.JSX.Element {
  const {
    externalCategories,
    expandedIds,
    toggleExpand,
    getMappingForExternal,
    pendingMappings,
    handleMappingChange,
    internalCategoriesLoading,
    selectedCatalogId,
    internalCategoryOptions,
  } = useCategoryMapper();

  const children = externalCategories.filter(
    (candidate: ExternalCategory): boolean =>
      normalizeParentExternalId(candidate.parentExternalId) === category.externalId
  );
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const currentMapping = getMappingForExternal(category.id);
  const hasPendingChange = pendingMappings.has(category.id);

  return (
    <React.Fragment>
      <tr className={`border-b border-border ${hasPendingChange ? 'bg-yellow-500/5' : ''}`}>
        <td className='px-4 py-2'>
          <div className='flex items-center' style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <Button
                onClick={(): void => toggleExpand(category.id)}
                className='mr-2 rounded p-0.5 text-gray-400 hover:bg-muted/50 hover:text-white'
              >
                {isExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </Button>
            ) : (
              <span className='mr-2 w-5' />
            )}
            <span className='text-sm text-gray-200'>{category.name}</span>
            {currentMapping && (
              <Check className='ml-2 h-3 w-3 text-emerald-400' />
            )}
          </div>
        </td>
        <td className='px-4 py-2'>
          <UnifiedSelect
            value={currentMapping ?? '__unmapped__'}
            onValueChange={(v: string): void =>
              handleMappingChange(category.id, v === '__unmapped__' ? null : v)
            }
            disabled={internalCategoriesLoading || !selectedCatalogId}
            options={[
              { value: '__unmapped__', label: '— Not mapped —' },
              ...internalCategoryOptions
            ]}
            triggerClassName='w-full bg-gray-800 border-border text-white text-sm h-8'
          />
        </td>
      </tr>
      {hasChildren && isExpanded && (
        <React.Fragment>
          {children
            .sort((a: ExternalCategory, b: ExternalCategory) => a.name.localeCompare(b.name))
            .map((child: ExternalCategory) => (
              <CategoryMapperRow key={child.id} category={child} depth={depth + 1} />
            ))}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}
