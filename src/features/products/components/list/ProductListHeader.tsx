'use client';
'use no memo';

import { PlusIcon, Package } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  cloneElement,
  isValidElement,
  memo,
  useEffect,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react';

import {
  useProductListFiltersContext,
  useProductListHeaderActionsContext,
} from '@/features/products/context/ProductListContext';
import type { ProductTriggerButtonBarProps } from '@/features/products/lib/product-integrations-adapter-loader';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { PRODUCT_PAGE_SIZE_OPTIONS } from '@/shared/lib/products/constants';
import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminProductsBreadcrumbs } from '@/shared/ui/admin-products-breadcrumbs';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Button } from '@/shared/ui/button';
import { FocusModeTogglePortal } from '@/shared/ui/FocusModeTogglePortal';
import { Pagination } from '@/shared/ui/pagination';
import { SelectSimple } from '@/shared/ui/select-simple';

const TriggerButtonBar = dynamic<ProductTriggerButtonBarProps>(
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

export const ProductListHeader = memo(({
  showHeader = true,
  filtersContent,
}: ProductListHeaderProps) => {
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const {
    onCreateProduct,
    onCreateFromDraft,
    activeDrafts,
    triggerButtonsReady = true,
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
  let resolvedFiltersContent: ReactNode = filtersContent ?? null;
  if (
    resolvedFiltersContent &&
    isValidElement(resolvedFiltersContent) &&
    typeof resolvedFiltersContent.type !== 'string'
  ) {
    resolvedFiltersContent = cloneElement(
      resolvedFiltersContent as ReactElement<Record<string, unknown>>,
      {
        instanceId: 'header',
      }
    );
  }

  useEffect(() => {
    return (): void => {
      setIsMenuHidden(false);
    };
  }, [setIsMenuHidden]);

  const renderHeaderBreadcrumb = (): React.JSX.Element => (
    <AdminProductsBreadcrumbs current='Product List' />
  );

  const renderCreateActions = (): React.JSX.Element => (
    <div className='flex flex-wrap items-center gap-1'>
      <Button
        onClick={onCreateProduct}
        variant='outline'
        aria-label='Create new product'
        title='Create new product'
        className='h-7 w-7 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
      >
        <PlusIcon className='h-3 w-3' />
      </Button>
      <div className='flex flex-wrap items-center gap-1'>
        {activeDrafts.map((draft: ProductDraft) => {
          const IconComponent = draft.icon ? ICON_LIBRARY_MAP[draft.icon] : null;
          const iconColor = resolveDraftIconColor(draft);

          return (
            <Button
              key={draft.id}
              onClick={() => onCreateFromDraft?.(draft.id)}
              className='h-7 w-7 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
              aria-label={`Create product from ${draft.name}`}
              title={draft.name}
            >
              {IconComponent ? (
                <IconComponent
                  className='h-3 w-3'
                  style={iconColor ? { color: iconColor } : undefined}
                />
              ) : (
                <Package
                  className='h-3 w-3'
                  style={iconColor ? { color: iconColor } : undefined}
                />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );

  const renderTitle = (): React.JSX.Element => (
    <h1 className='text-3xl font-bold tracking-tight text-white'>Products</h1>
  );

  const renderTitleBreadcrumbHeader = (
    titleStackClassName?: string,
    actions?: ReactNode,
    actionsClassName?: string
  ): React.JSX.Element => (
    <AdminTitleBreadcrumbHeader
      title={renderTitle()}
      breadcrumb={renderHeaderBreadcrumb()}
      titleStackClassName={titleStackClassName}
      actions={actions}
      actionsClassName={actionsClassName}
    />
  );

  const renderSelectorsAndTriggers = (): React.JSX.Element => (
    <>
      <SelectSimple
        size='sm'
        value={nameLocale}
        onValueChange={(value: string) =>
          setNameLocale(value as 'name_en' | 'name_pl' | 'name_de')
        }
        options={languageOptions}
        placeholder='Language'
        className='w-full shrink-0 sm:w-40'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Select product name language'
        title='Language'
      />

      <SelectSimple
        size='sm'
        value={currencyCode}
        onValueChange={setCurrencyCode}
        options={currencySelectOptions}
        placeholder='Currency'
        className='w-full shrink-0 sm:w-28'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Select currency'
        title='Currency'
      />

      <SelectSimple
        size='sm'
        value={catalogFilter}
        onValueChange={setCatalogFilter}
        options={catalogFilterOptions}
        placeholder='Catalog'
        className='w-full shrink-0 sm:w-48'
        triggerClassName='h-8 w-full text-xs'
        ariaLabel='Filter by catalog'
        title='Catalog'
      />

      {triggerButtonsReady ? (
        <div className='flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap'>
          <TriggerButtonBar
            location='product_list'
            entityType='product'
            className='w-full flex-nowrap sm:w-auto'
          />
        </div>
      ) : null}
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
      showPageJump
      showLabels={false}
      variant='compact'
    />
  );

  return (
    <div className='space-y-4'>
      {showHeader ? (
        <FocusModeTogglePortal
          isFocusMode={!isMenuHidden}
          onToggleFocusMode={() => setIsMenuHidden(!isMenuHidden)}
        />
      ) : null}
      {showHeader && (
        <div className='space-y-3'>
          <div className='space-y-3 lg:hidden'>
            {renderTitleBreadcrumbHeader(undefined, renderCreateActions(), 'pt-0')}

            <div className='space-y-3'>
              <div className='relative z-10 flex justify-center'>{renderPaginationControl()}</div>
              <div className='flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-end'>
                {renderSelectorsAndTriggers()}
              </div>
            </div>
          </div>

          <div className='hidden space-y-3 lg:block'>
            {renderTitleBreadcrumbHeader(
              'shrink-0 min-w-max',
              <>
                {renderCreateActions()}
                {renderPaginationControl()}
                {renderSelectorsAndTriggers()}
              </>,
              'relative z-0 min-w-0 flex-1 justify-end'
            )}
          </div>
          {resolvedFiltersContent ? <div className='w-full'>{resolvedFiltersContent}</div> : null}
        </div>
      )}
    </div>
  );
});
