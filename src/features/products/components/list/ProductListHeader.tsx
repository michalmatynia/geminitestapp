'use client';

import {
  PlusIcon,
  Package,
} from 'lucide-react';
import { memo } from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import {
  useProductListActionsContext,
  useProductListFiltersContext,
} from '@/features/products/context/ProductListContext';
import type { Catalog } from '@/features/products/types';
import type { ProductDraftDto } from '@/features/products/types/drafts';
import { Button, SelectSimple, Pagination, SectionHeader } from '@/shared/ui';

interface ProductListHeaderProps {
  showHeader?: boolean;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const resolveDraftIconColor = (draft: ProductDraftDto): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

export const ProductListHeader = memo(function ProductListHeader({
  showHeader = true,
}: ProductListHeaderProps) {
  const {
    onCreateProduct,
    onCreateFromDraft,
    activeDrafts,
  } = useProductListActionsContext();
  const {
    page,
    totalPages,
    setPage,
    pageSize,
    setPageSize,
    nameLocale,
    setNameLocale,
    languageOptions,
    currencyCode,
    setCurrencyCode,
    currencyOptions,
    catalogFilter,
    setCatalogFilter,
    catalogs,
  } = useProductListFiltersContext();

  return (
    <div className='space-y-4'>
      {showHeader && (
        <SectionHeader
          className='relative'
          actionsClassName='!w-full !shrink lg:!flex-1 lg:min-w-0 lg:!justify-stretch'
          title='Products'
          actions={
            <div className='grid w-full grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center'>
              <div className='hidden lg:block' aria-hidden />
              <div className='flex justify-center'>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[12, 24, 48, 96]}
                  showPageSize
                  showLabels={false}
                  variant='compact'
                />
              </div>
              <div className='flex w-full justify-end gap-2 max-sm:flex-wrap lg:flex-nowrap'>
                <SelectSimple
                  size='sm'
                  value={nameLocale}
                  onValueChange={(value: string) =>
                    setNameLocale(value as 'name_en' | 'name_pl' | 'name_de')
                  }
                  options={languageOptions}
                  placeholder='Language'
                  triggerClassName='w-40'
                  ariaLabel='Select product name language'
                />

                <SelectSimple
                  size='sm'
                  value={currencyCode}
                  onValueChange={setCurrencyCode}
                  options={currencyOptions.map((code: string) => ({ value: code, label: code }))}
                  placeholder='Currency'
                  triggerClassName='w-28'
                  ariaLabel='Select currency'
                />

                <SelectSimple
                  size='sm'
                  value={catalogFilter}
                  onValueChange={setCatalogFilter}
                  options={[
                    { value: 'all', label: 'All catalogs' },
                    { value: 'unassigned', label: 'Unassigned' },
                    ...catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name })),
                  ]}
                  placeholder='Catalog'
                  triggerClassName='w-48'
                  ariaLabel='Filter by catalog'
                />

                <TriggerButtonBar location='product_list' entityType='product' />
              </div>
            </div>
          }
          eyebrow={
            <div className='flex flex-wrap items-center gap-2 mb-2'>
              <Button
                onClick={onCreateProduct}
                size='icon-lg'
                variant='outline'
                aria-label='Create new product'
              >
                <PlusIcon className='h-6 w-6' />
              </Button>
              <div className='flex flex-wrap items-center gap-1.5'>
                {activeDrafts.map((draft: ProductDraftDto) => {
                  const IconComponent = draft.icon ? ICON_LIBRARY_MAP[draft.icon] : null;
                  const iconColor = resolveDraftIconColor(draft);
                  return (
                    <Button
                      key={draft.id}
                      onClick={() => onCreateFromDraft?.(draft.id)}
                      className='h-8 w-8 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
                      aria-label={`Create product from ${draft.name}`}
                      title={draft.name}
                    >
                      {IconComponent ? (
                        <IconComponent className='h-3.5 w-3.5' style={iconColor ? { color: iconColor } : undefined} />
                      ) : (
                        <Package className='h-3.5 w-3.5' style={iconColor ? { color: iconColor } : undefined} />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          }
        />
      )}
    </div>
  );
});
