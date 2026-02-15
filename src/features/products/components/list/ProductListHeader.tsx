'use client';

import {
  PlusIcon,
  Package,
} from 'lucide-react';
import { memo, useState } from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import {
  useProductListActionsContext,
  useProductListFiltersContext,
} from '@/features/products/context/ProductListContext';
import { useConvertAllImagesToBase64 } from '@/features/products/hooks/useProductsMutations';
import type { Catalog } from '@/features/products/types';
import type { ProductDraftDto } from '@/features/products/types/drafts';
import { Button, SelectSimple, useToast, Pagination, ConfirmDialog,  SectionHeader } from '@/shared/ui';

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

  const { toast } = useToast();
  const [showBase64AllConfirm, setShowBase64AllConfirm] = useState(false);
  const { mutateAsync: convertAll, isPending: isConvertingAll } = useConvertAllImagesToBase64();

  const handleConvertAllBase64 = async (): Promise<void> => {
    try {
      await convertAll();
      toast('Base64 images generated for all products.', { variant: 'success' });
    } catch (error) {
      toast(
        error instanceof Error ? error.message : 'An error occurred during conversion',
        { variant: 'error' }
      );
    } finally {
      setShowBase64AllConfirm(false);
    }
  };

  return (
    <div className='space-y-4'>
      {showHeader && (
        <SectionHeader
          title='Products'
          actions={
            <div className='flex items-center gap-3'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setShowBase64AllConfirm(true)}
                disabled={isConvertingAll}
              >
                {isConvertingAll ? 'Converting...' : 'Convert all products'}
              </Button>
              <TriggerButtonBar location='product_list' entityType='product' />
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

      {/* Controls section */}
      <div className='flex flex-col gap-4 rounded-lg border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[12, 24, 48, 96]}
          showPageSize
        />

        {/* Filter selectors */}
        <div className='flex flex-col gap-2 sm:flex-row sm:gap-3'>
          <SelectSimple size='sm'
            value={nameLocale}
            onValueChange={(value: string) =>
              setNameLocale(value as 'name_en' | 'name_pl' | 'name_de')
            }
            options={languageOptions}
            placeholder='Language'
            triggerClassName='w-full sm:w-44'
            ariaLabel='Select product name language'
          />

          <SelectSimple size='sm'
            value={currencyCode}
            onValueChange={setCurrencyCode}
            options={currencyOptions.map((code: string) => ({ value: code, label: code }))}
            placeholder='Currency'
            triggerClassName='w-full sm:w-32'
            ariaLabel='Select currency'
          />

          <SelectSimple size='sm'
            value={catalogFilter}
            onValueChange={setCatalogFilter}
            options={[
              { value: 'all', label: 'All catalogs' },
              { value: 'unassigned', label: 'Unassigned' },
              ...catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name }))
            ]}
            placeholder='Catalog'
            triggerClassName='w-full sm:w-52'
            ariaLabel='Filter by catalog'
          />
        </div>
      </div>

      <ConfirmDialog
        open={showBase64AllConfirm}
        onOpenChange={setShowBase64AllConfirm}
        title='Generate Base64 images for all products?'
        description='This will generate Base64 images for every product and may take time on large catalogs.'
        onConfirm={() => void handleConvertAllBase64()}
        confirmText='Convert'
        variant='success'
        loading={isConvertingAll}
      />
    </div>
  );
});
