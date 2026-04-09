'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BookType, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  useCatalogs,
  useDeleteTitleTermMutation,
  useSaveTitleTermMutation,
  useTitleTerms,
} from '@/features/products/hooks/useProductMetadataQueries';
import type {
  ProductTitleTerm,
  ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { AdminProductsPageLayout } from '@/shared/ui/admin-products-page-layout';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { SearchInput } from '@/shared/ui/search-input';
import { SelectSimple } from '@/shared/ui/select-simple';
import { SettingsPanelBuilder } from '@/shared/ui/templates/SettingsPanelBuilder';
import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';

type TitleTermFormState = {
  catalogId: string;
  type: ProductTitleTermType;
  name_en: string;
  name_pl: string;
};

const TITLE_TERM_TYPE_OPTIONS: ReadonlyArray<{
  label: string;
  value: ProductTitleTermType;
}> = [
  { label: 'Size', value: 'size' },
  { label: 'Material', value: 'material' },
  { label: 'Theme', value: 'theme' },
] as const;

const TITLE_TERM_TYPE_LABELS = new Map(
  TITLE_TERM_TYPE_OPTIONS.map((option) => [option.value, option.label])
);

const ALL_FILTER_VALUE = 'all';

const resolveTitleTermTypeLabel = (value: ProductTitleTermType): string =>
  TITLE_TERM_TYPE_LABELS.get(value) ?? value;

const resolveInitialCatalogFilter = (value: string | null): string => {
  const normalizedValue = value?.trim() ?? '';
  return normalizedValue || ALL_FILTER_VALUE;
};

const resolveInitialTypeFilter = (value: string | null): string => {
  if (value === 'size' || value === 'material' || value === 'theme') {
    return value;
  }
  return ALL_FILTER_VALUE;
};

export function AdminProductTitleTermsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const searchParams = useSearchParams();
  const catalogsQuery = useCatalogs();
  const initialCatalogFilter = useMemo(
    () => resolveInitialCatalogFilter(searchParams.get('catalogId')),
    [searchParams]
  );
  const initialTypeFilter = useMemo(
    () => resolveInitialTypeFilter(searchParams.get('type')),
    [searchParams]
  );
  const [catalogFilter, setCatalogFilter] = useState<string>(initialCatalogFilter);
  const [typeFilter, setTypeFilter] = useState<string>(initialTypeFilter);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductTitleTerm | null>(null);
  const [form, setForm] = useState<TitleTermFormState>({
    catalogId: '',
    type: 'size',
    name_en: '',
    name_pl: '',
  });

  useEffect(() => {
    setCatalogFilter(initialCatalogFilter);
  }, [initialCatalogFilter]);

  useEffect(() => {
    setTypeFilter(initialTypeFilter);
  }, [initialTypeFilter]);

  const selectedCatalogId = catalogFilter !== ALL_FILTER_VALUE ? catalogFilter : undefined;
  const selectedType =
    typeFilter !== ALL_FILTER_VALUE ? (typeFilter as ProductTitleTermType) : undefined;
  const titleTermsQuery = useTitleTerms(selectedCatalogId, selectedType, {
    allowWithoutCatalog: true,
  });
  const saveMutation = useSaveTitleTermMutation();
  const deleteMutation = useDeleteTitleTermMutation();

  const catalogOptions = useMemo(
    () =>
      (catalogsQuery.data ?? []).map((catalog) => ({
        label: catalog.name,
        value: catalog.id,
      })),
    [catalogsQuery.data]
  );
  const catalogNameById = useMemo(
    () => new Map((catalogsQuery.data ?? []).map((catalog) => [catalog.id, catalog.name])),
    [catalogsQuery.data]
  );

  const filteredTerms = useMemo((): ProductTitleTerm[] => {
    const normalizedQuery = query.trim().toLowerCase();
    const titleTerms = titleTermsQuery.data ?? [];
    if (!normalizedQuery) return titleTerms;
    return titleTerms.filter((term) => {
      const haystack = [
        term.name_en,
        term.name_pl ?? '',
        catalogNameById.get(term.catalogId) ?? '',
        resolveTitleTermTypeLabel(term.type),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [catalogNameById, query, titleTermsQuery.data]);

  const fields = useMemo<SettingsPanelField<TitleTermFormState>[]>(
    () => [
      {
        key: 'catalogId',
        label: 'Catalog',
        type: 'select',
        required: true,
        placeholder: 'Choose catalog',
        options: catalogOptions,
      },
      {
        key: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        options: TITLE_TERM_TYPE_OPTIONS,
      },
      {
        key: 'name_en',
        label: 'English name',
        type: 'text',
        required: true,
        placeholder: 'Attack On Titan',
      },
      {
        key: 'name_pl',
        label: 'Polish translation',
        type: 'text',
        placeholder: 'Atak Tytanow',
      },
    ],
    [catalogOptions]
  );

  const openCreate = (): void => {
    setEditing(null);
    setForm({
      catalogId:
        selectedCatalogId ??
        catalogsQuery.data?.find((catalog) => catalog.isDefault)?.id ??
        catalogsQuery.data?.[0]?.id ??
        '',
      type: selectedType ?? 'size',
      name_en: '',
      name_pl: '',
    });
    setOpen(true);
  };

  const openEdit = useCallback((titleTerm: ProductTitleTerm): void => {
    setEditing(titleTerm);
    setForm({
      catalogId: titleTerm.catalogId,
      type: titleTerm.type,
      name_en: titleTerm.name_en,
      name_pl: titleTerm.name_pl ?? '',
    });
    setOpen(true);
  }, []);

  const handleChange = (values: Partial<TitleTermFormState>): void => {
    setForm((prev) => ({ ...prev, ...values }));
  };

  const handleSave = async (): Promise<void> => {
    const catalogId = form.catalogId.trim();
    const name_en = form.name_en.trim();
    if (!catalogId) {
      toast('Catalog is required.', { variant: 'error' });
      return;
    }
    if (!name_en) {
      toast('English name is required.', { variant: 'error' });
      return;
    }
    try {
      await saveMutation.mutateAsync({
        id: editing?.id,
        data: {
          catalogId,
          type: form.type,
          name_en,
          name_pl: form.name_pl.trim() || null,
        },
      });
      toast(editing ? 'Title term updated.' : 'Title term created.', {
        variant: 'success',
      });
      setOpen(false);
    } catch (error) {
      logClientCatch(error, {
        source: 'AdminProductTitleTermsPage',
        action: 'saveTitleTerm',
        titleTermId: editing?.id,
      });
      toast(error instanceof Error ? error.message : 'Failed to save title term.', {
        variant: 'error',
      });
    }
  };

  const confirmDelete = (titleTerm: ProductTitleTerm): void => {
    confirm({
      title: 'Delete title term?',
      message: `This will delete "${titleTerm.name_en}".`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync({
            id: titleTerm.id,
            catalogId: titleTerm.catalogId,
          });
          toast('Title term deleted.', { variant: 'success' });
        } catch (error) {
          logClientCatch(error, {
            source: 'AdminProductTitleTermsPage',
            action: 'deleteTitleTerm',
            titleTermId: titleTerm.id,
          });
          toast(error instanceof Error ? error.message : 'Failed to delete title term.', {
            variant: 'error',
          });
        }
      },
    });
  };

  const columns = useMemo<ColumnDef<ProductTitleTerm>[]>(
    () => [
      {
        accessorKey: 'name_en',
        header: 'English',
        cell: ({ row }) => {
          const titleTerm = row.original;
          return (
            <div className='min-w-0'>
              <div className='truncate text-sm font-medium text-gray-100'>
                {titleTerm.name_en}
              </div>
              <div className='truncate text-xs text-muted-foreground'>
                {titleTerm.name_pl || 'No Polish translation'}
              </div>
            </div>
          );
        },
      },
      {
        id: 'catalog',
        header: 'Catalog',
        cell: ({ row }) => catalogNameById.get(row.original.catalogId) ?? row.original.catalogId,
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => resolveTitleTermTypeLabel(row.original.type),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const titleTerm = row.original;
          return (
            <div className='flex items-center justify-end gap-2'>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={(): void => openEdit(titleTerm)}
              >
                Edit
              </Button>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={(): void => confirmDelete(titleTerm)}
                className='text-red-300 hover:text-red-200'
                title='Delete title term'
                aria-label='Delete title term'
              >
                <Trash2 className='size-3.5' />
              </Button>
            </div>
          );
        },
      },
    ],
    [catalogNameById, openEdit]
  );

  return (
    <AdminProductsPageLayout
      title='Product Title Terms'
      current='Product Title Terms'
      description='Manage catalog-specific size, material, and theme terms for structured product names.'
      icon={<BookType className='size-4' />}
      headerActions={
        <div className='flex items-center gap-2'>
          <Button type='button' size='sm' variant='outline' asChild>
            <Link href='/admin/products/settings'>Back to Settings</Link>
          </Button>
          <Button type='button' size='sm' variant='outline' onClick={openCreate}>
            <Plus className='mr-1 size-4' />
            Add Title Term
          </Button>
        </div>
      }
    >
      <StandardDataTablePanel
        filters={
          <div className='flex flex-wrap items-center gap-2'>
            <div className='w-full max-w-sm'>
              <SearchInput
                placeholder='Search title terms...'
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onClear={() => setQuery('')}
                size='sm'
              />
            </div>
            <div className='min-w-[180px]'>
              <SelectSimple
                size='sm'
                value={catalogFilter}
                onValueChange={setCatalogFilter}
                ariaLabel='Filter by catalog'
                options={[
                  { label: 'All catalogs', value: ALL_FILTER_VALUE },
                  ...catalogOptions,
                ]}
                placeholder='All catalogs'
              />
            </div>
            <div className='min-w-[160px]'>
              <SelectSimple
                size='sm'
                value={typeFilter}
                onValueChange={setTypeFilter}
                ariaLabel='Filter by type'
                options={[
                  { label: 'All types', value: ALL_FILTER_VALUE },
                  ...TITLE_TERM_TYPE_OPTIONS,
                ]}
                placeholder='All types'
              />
            </div>
          </div>
        }
        columns={columns}
        data={filteredTerms}
        isLoading={titleTermsQuery.isLoading || catalogsQuery.isLoading}
        emptyState={
          <EmptyState
            title='No title terms'
            description={
              query
                ? 'No title terms match your search.'
                : 'Create size, material, and theme terms for structured product names.'
            }
            action={
              !query ? (
                <Button onClick={openCreate} variant='outline'>
                  <Plus className='mr-2 size-4' />
                  Create Title Term
                </Button>
              ) : undefined
            }
          />
        }
      />

      <SettingsPanelBuilder
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Title Term' : 'Create Title Term'}
        fields={fields}
        values={form}
        onChange={handleChange}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        size='sm'
      />

      <ConfirmationModal />
    </AdminProductsPageLayout>
  );
}
