'use client';

import {
  PlusIcon,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import {
  useProductListActionsContext,
  useProductListFiltersContext,
} from '@/features/products/context/ProductListContext';
import type { Catalog } from '@/features/products/types';
import type { ProductDraftDto } from '@/features/products/types/drafts';
import { Button, SelectSimple, Pagination } from '@/shared/ui';

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

  const headerBreadcrumb = (
    <nav
      aria-label='Breadcrumb'
      className='mt-1 flex flex-wrap items-center gap-1 text-xs text-gray-400'
    >
      <Link href='/admin' className='transition-colors hover:text-gray-200'>
        Admin
      </Link>
      <span>/</span>
      <Link href='/admin/products' className='transition-colors hover:text-gray-200'>
        Products
      </Link>
      <span>/</span>
      <span className='text-gray-300'>Product List</span>
    </nav>
  );

  return (
    <div className='space-y-4'>
      {showHeader && (
        <div className='space-y-3'>
          <div className='mb-2 flex flex-wrap items-center gap-2'>
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

          <div className='space-y-3 lg:hidden'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-white'>Products</h1>
              {headerBreadcrumb}
            </div>
            <div className='flex w-full items-center justify-end gap-2 max-sm:flex-wrap'>
              <SelectSimple
                size='sm'
                value={nameLocale}
                onValueChange={(value: string) =>
                  setNameLocale(value as 'name_en' | 'name_pl' | 'name_de')
                }
                options={languageOptions}
                placeholder='Language'
                className='w-40 shrink-0'
                triggerClassName='h-8 text-xs'
                ariaLabel='Select product name language'
              />

              <SelectSimple
                size='sm'
                value={currencyCode}
                onValueChange={setCurrencyCode}
                options={currencyOptions.map((code: string) => ({ value: code, label: code }))}
                placeholder='Currency'
                className='w-28 shrink-0'
                triggerClassName='h-8 text-xs'
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
                className='w-48 shrink-0'
                triggerClassName='h-8 text-xs'
                ariaLabel='Filter by catalog'
              />

              <TriggerButtonBar
                location='product_list'
                entityType='product'
                className='shrink-0 flex-nowrap'
              />
            </div>
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
          </div>

          <div className='hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center lg:grid'>
            <div className='min-w-0'>
              <h1 className='text-3xl font-bold tracking-tight text-white'>Products</h1>
              {headerBreadcrumb}
            </div>
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
            <div className='flex w-full items-center justify-end gap-2 lg:flex-nowrap'>
              <div className='flex shrink-0 items-center justify-end gap-2'>
                <SelectSimple
                  size='sm'
                  value={nameLocale}
                  onValueChange={(value: string) =>
                    setNameLocale(value as 'name_en' | 'name_pl' | 'name_de')
                  }
                  options={languageOptions}
                  placeholder='Language'
                  className='w-40 shrink-0'
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Select product name language'
                />

                <SelectSimple
                  size='sm'
                  value={currencyCode}
                  onValueChange={setCurrencyCode}
                  options={currencyOptions.map((code: string) => ({ value: code, label: code }))}
                  placeholder='Currency'
                  className='w-28 shrink-0'
                  triggerClassName='h-8 text-xs'
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
                  className='w-48 shrink-0'
                  triggerClassName='h-8 text-xs'
                  ariaLabel='Filter by catalog'
                />
              </div>

              <TriggerButtonBar
                location='product_list'
                entityType='product'
                className='shrink-0 flex-nowrap'
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
