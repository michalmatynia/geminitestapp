import { useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCatalogs, useTitleTerms, useSaveTitleTermMutation, useDeleteTitleTermMutation } from '@/features/products/hooks/useProductMetadataQueries';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import type { ProductTitleTerm, ProductTitleTermType } from '@/shared/contracts/products/title-terms';

export function useTitleTermsController() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const searchParams = useSearchParams();
  const [catalogFilter, setCatalogFilter] = useState(searchParams.get('catalogId') ?? 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? 'all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ProductTitleTerm | null>(null);
  const [open, setOpen] = useState(false);

  const catalogsQuery = useCatalogs();
  const titleTermsQuery = useTitleTerms(catalogFilter !== 'all' ? catalogFilter : undefined, typeFilter !== 'all' ? (typeFilter as ProductTitleTermType) : undefined, { allowWithoutCatalog: true });
  const saveMutation = useSaveTitleTermMutation();
  const deleteMutation = useDeleteTitleTermMutation();

  const catalogOptions = useMemo(() => (catalogsQuery.data ?? []).map((c) => ({ label: c.name, value: c.id })), [catalogsQuery.data]);
  const catalogNameById = useMemo(() => new Map((catalogsQuery.data ?? []).map((c) => [c.id, c.name])), [catalogsQuery.data]);

  const filteredTerms = useMemo(() => {
    const q = query.trim().toLowerCase();
    const data = titleTermsQuery.data ?? [];
    if (!q) return data;
    return data.filter(t => [t.name_en, t.name_pl, catalogNameById.get(t.catalogId), t.type].join(' ').toLowerCase().includes(q));
  }, [catalogNameById, query, titleTermsQuery.data]);

  const openCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (term: ProductTitleTerm) => {
    setEditing(term);
    setOpen(true);
  };

  const deleteTerm = async (term: ProductTitleTerm) => {
    confirm({
      title: 'Delete title term?',
      message: `Delete "${term.name_en}"?`,
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync({ id: term.id, catalogId: term.catalogId });
          toast('Deleted.');
        } catch (e) {
          logClientCatch(e, { source: 'TitleTerms', action: 'delete' });
          toast('Failed to delete.', { variant: 'error' });
        }
      }
    });
  };

  return {
    query, setQuery,
    catalogFilter, setCatalogFilter,
    typeFilter, setTypeFilter,
    filteredTerms,
    catalogOptions,
    catalogNameById,
    openCreate,
    openEdit,
    deleteTerm,
    isLoading: titleTermsQuery.isLoading || catalogsQuery.isLoading,
    open, setOpen,
    editing,
    saveMutation,
    ConfirmationModal
  };
}
