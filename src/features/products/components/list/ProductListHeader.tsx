'use client';

import { Eye, EyeOff, PlusIcon, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import { memo, useEffect, useMemo, type ComponentProps, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import {
  useProductListFiltersContext,
  useProductListHeaderActionsContext,
} from '@/features/products/context/ProductListContext';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products';
import type { ProductDraft } from '@/shared/contracts/products';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { PRODUCT_PAGE_SIZE_OPTIONS } from '@/shared/lib/products/constants';
import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminProductsBreadcrumbs, Button, SelectSimple, Pagination } from '@/shared/ui';

type TriggerButtonBarProps = ComponentProps<
  typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').TriggerButtonBar
>;

const TriggerButtonBar = dynamic<TriggerButtonBarProps>(
  () =>
    import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar').then(
      (
        mod: typeof import('@/shared/lib/ai-paths/components/trigger-buttons/TriggerButtonBar')
      ) => mod.TriggerButtonBar
    ),
  {
    ssr: false,
    loading: () => null,
  }
);

interface ProductListHeaderProps {
  showHeader?: boolean;
  filtersContent?: ReactNode;
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const ALL_CATALOGS_OPTION: LabeledOptionDto<string> = {
  value: 'all',
  label: 'All catalogs',
};

const UNASSIGNED_CATALOG_OPTION: LabeledOptionDto<string> = {
  value: 'unassigned',
  label: 'Unassigned',
};

const resolveDraftIconColor = (draft: ProductDraft): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

export const ProductListHeader = memo(function ProductListHeader({
  showHeader = true,
  filtersContent,
}: ProductListHeaderProps) {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const {
    onCreateProduct,
    onCreateFromDraft,
    activeDrafts,
    showTriggerRunFeedback,
    setShowTriggerRunFeedback,
  } = useProductListHeaderActionsContext();
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
  const catalogFilterOptions = useMemo(
    (): Array<LabeledOptionDto<string>> => [
      ALL_CATALOGS_OPTION,
      UNASSIGNED_CATALOG_OPTION,
      ...catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name })),
    ],
    [catalogs]
  );
  const currencySelectOptions = useMemo(
    (): Array<LabeledOptionDto<string>> =>
      currencyOptions.map((code: string) => ({ value: code, label: code })),
    [currencyOptions]
  );

  useEffect(() => {
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [setIsMenuHidden]);

  const menuToggleButton =
    typeof document === 'undefined'
      ? null
      : createPortal(
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={() => setIsMenuHidden(!isMenuHidden)}
          title={isMenuHidden ? 'Show side panels' : 'Show canvas only'}
          aria-label={isMenuHidden ? 'Show side panels' : 'Show canvas only'}
          className='fixed left-1/2 top-0 z-40 h-8 w-10 -translate-x-1/2 rounded-b-lg rounded-t-none border-t-0 bg-background/90 px-0 shadow-md backdrop-blur-sm animate-in fade-in slide-in-from-top-2'
        >
          {isMenuHidden ? <EyeOff className='size-4' /> : <Eye className='size-4' />}
        </Button>,
        document.body
      );

  const renderHeaderBreadcrumb = (): React.JSX.Element => (
    <AdminProductsBreadcrumbs current='Product List' className='mt-1' />
  );

  const renderCreateActions = (): React.JSX.Element => (
    <div className='flex flex-wrap items-center gap-2'>
      <Button
        onClick={onCreateProduct}
        size='icon-lg'
        variant='outline'
        aria-label='Create new product'
        title={'Create new product'}>
        <PlusIcon className='h-6 w-6' />
      </Button>
      <div className='flex flex-wrap items-center gap-1.5'>
        {activeDrafts.map((draft: ProductDraft) => {
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
                <IconComponent
                  className='h-3.5 w-3.5'
                  style={iconColor ? { color: iconColor } : undefined}
                />
              ) : (
                <Package
                  className='h-3.5 w-3.5'
                  style={iconColor ? { color: iconColor } : undefined}
                />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderSelectorsAndTriggers = (): React.JSX.Element => (
    <>
      <SelectSimple
        size='sm'
        value={nameLocale}
        onValueChange={(value: string) => setNameLocale(value as 'name_en' | 'name_pl' | 'name_de')}
        options={languageOptions}
        placeholder='Language'
        className='w-full shrink-0 sm:w-40'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Select product name language'
       title='Language'/>

      <SelectSimple
        size='sm'
        value={currencyCode}
        onValueChange={setCurrencyCode}
        options={currencySelectOptions}
        placeholder='Currency'
        className='w-full shrink-0 sm:w-28'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Select currency'
       title='Currency'/>

      <SelectSimple
        size='sm'
        value={catalogFilter}
        onValueChange={setCatalogFilter}
        options={catalogFilterOptions}
        placeholder='Catalog'
        className='w-full shrink-0 sm:w-48'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Filter by catalog'
       title='Catalog'/>

      <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'>
        <TriggerButtonBar
          location='product_list'
          entityType='product'
          className='w-full flex-nowrap sm:w-auto'
        />
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={() => setShowTriggerRunFeedback(!showTriggerRunFeedback)}
          aria-label={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
          title={showTriggerRunFeedback ? 'Hide trigger run pills' : 'Show trigger run pills'}
          className='h-8 w-full gap-1.5 px-2 text-xs sm:w-auto'
        >
          {showTriggerRunFeedback ? <EyeOff className='size-3.5' /> : <Eye className='size-3.5' />}
          <span>{showTriggerRunFeedback ? 'Hide Statuses' : 'Show Statuses'}</span>
        </Button>
      </div>
    </>
  );

  const renderPaginationControl = (): React.JSX.Element => (
    <Pagination
      page={page}
      totalPages={totalPages}
      onPageChange={setPage}
      pageSize={pageSize}
      onPageSizeChange={setPageSize}
      pageSizeOptions={[...PRODUCT_PAGE_SIZE_OPTIONS]}
      showPageSize
      showLabels={false}
      variant='compact'
    />
  );

  return (
    <div className='space-y-4'>
      {showHeader ? menuToggleButton : null}
      {showHeader && (
        <div className='space-y-3'>
          <div className='space-y-3 lg:hidden'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight text-white'>Products</h1>
              {renderHeaderBreadcrumb()}
              <div className='mt-3'>{renderCreateActions()}</div>
            </div>

            <div className='space-y-3'>
              <div className='relative z-10 flex justify-center'>{renderPaginationControl()}</div>
              <div className='flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
                {renderSelectorsAndTriggers()}
              </div>
              {filtersContent ? <div className='w-full'>{filtersContent}</div> : null}
            </div>
          </div>

          <div className='hidden grid-cols-[minmax(0,1fr)_auto_minmax(0,1.5fr)] items-start gap-3 lg:grid'>
            <div className='min-w-0'>
              <h1 className='text-3xl font-bold tracking-tight text-white'>Products</h1>
              {renderHeaderBreadcrumb()}
              <div className='mt-3'>{renderCreateActions()}</div>
            </div>

            <div className='relative z-10 flex justify-center pt-1'>{renderPaginationControl()}</div>

            <div className='relative z-0 flex w-full flex-col gap-3 pt-1'>
              <div className='flex w-full items-center justify-end gap-2 lg:flex-nowrap'>
                {renderSelectorsAndTriggers()}
              </div>
              {filtersContent ? <div className='w-full'>{filtersContent}</div> : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
