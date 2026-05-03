import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCatalogs, useTitleTerms, useSaveTitleTermMutation, useDeleteTitleTermMutation } from '@/features/products/hooks/useProductMetadataQueries';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import {
  productTitleTermTypeSchema,
  type ProductTitleTerm,
  type ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';

type TitleTermCatalogOption = {
  label: string;
  value: string;
};

type TitleTermsController = {
  query: string;
  setQuery: (query: string) => void;
  catalogFilter: string;
  setCatalogFilter: (catalogId: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  filteredTerms: ProductTitleTerm[];
  catalogOptions: TitleTermCatalogOption[];
  catalogNameById: Map<string, string>;
  openCreate: () => void;
  openEdit: (term: ProductTitleTerm) => void;
  deleteTerm: (term: ProductTitleTerm) => void;
  isLoading: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: ProductTitleTerm | null;
  saveMutation: ReturnType<typeof useSaveTitleTermMutation>;
  ConfirmationModal: ReturnType<typeof useConfirm>['ConfirmationModal'];
};

type TitleTermsData = {
  filteredTerms: ProductTitleTerm[];
  catalogOptions: TitleTermCatalogOption[];
  catalogNameById: Map<string, string>;
  isLoading: boolean;
};

type TitleTermModalState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  editing: ProductTitleTerm | null;
  openCreate: () => void;
  openEdit: (term: ProductTitleTerm) => void;
};

type TitleTermDeleteAction = {
  deleteTerm: (term: ProductTitleTerm) => void;
  ConfirmationModal: ReturnType<typeof useConfirm>['ConfirmationModal'];
};

const resolveCatalogFilter = (catalogFilter: string): string | undefined =>
  catalogFilter !== 'all' ? catalogFilter : undefined;

const resolveTypeFilter = (typeFilter: string): ProductTitleTermType | undefined => {
  const parsed = productTitleTermTypeSchema.safeParse(typeFilter);
  return parsed.success ? parsed.data : undefined;
};

const filterTitleTerms = (
  terms: readonly ProductTitleTerm[],
  query: string,
  catalogNameById: ReadonlyMap<string, string>
): ProductTitleTerm[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) return [...terms];

  return terms.filter((term) =>
    [term.name_en, term.name_pl, catalogNameById.get(term.catalogId), term.type]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
};

const useTitleTermsData = (
  catalogFilter: string,
  typeFilter: string,
  query: string
): TitleTermsData => {
  const catalogsQuery = useCatalogs();
  const titleTermsQuery = useTitleTerms(resolveCatalogFilter(catalogFilter), resolveTypeFilter(typeFilter), {
    allowWithoutCatalog: true,
  });
  const catalogOptions = useMemo<TitleTermCatalogOption[]>(
    () => (catalogsQuery.data ?? []).map((catalog) => ({ label: catalog.name, value: catalog.id })),
    [catalogsQuery.data]
  );
  const catalogNameById = useMemo(
    () => new Map((catalogsQuery.data ?? []).map((catalog) => [catalog.id, catalog.name])),
    [catalogsQuery.data]
  );
  const filteredTerms = useMemo(
    () => filterTitleTerms(titleTermsQuery.data ?? [], query, catalogNameById),
    [catalogNameById, query, titleTermsQuery.data]
  );
  return {
    filteredTerms,
    catalogOptions,
    catalogNameById,
    isLoading: titleTermsQuery.isLoading || catalogsQuery.isLoading,
  };
};

const useTitleTermModalState = (): TitleTermModalState => {
  const [editing, setEditing] = useState<ProductTitleTerm | null>(null);
  const [open, setOpen] = useState(false);
  const openCreate = (): void => {
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (term: ProductTitleTerm): void => {
    setEditing(term);
    setOpen(true);
  };
  return { open, setOpen, editing, openCreate, openEdit };
};

const useTitleTermDeleteAction = (): TitleTermDeleteAction => {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const deleteMutation = useDeleteTitleTermMutation();
  const deleteTerm = (term: ProductTitleTerm): void => {
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
  return { deleteTerm, ConfirmationModal };
};

export function useTitleTermsController(): TitleTermsController {
  const searchParams = useSearchParams();
  const [catalogFilter, setCatalogFilter] = useState(searchParams.get('catalogId') ?? 'all');
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? 'all');
  const [query, setQuery] = useState('');
  const titleTermsData = useTitleTermsData(catalogFilter, typeFilter, query);
  const titleTermModal = useTitleTermModalState();
  const titleTermDeleteAction = useTitleTermDeleteAction();
  const saveMutation = useSaveTitleTermMutation();

  return {
    query,
    setQuery,
    catalogFilter,
    setCatalogFilter,
    typeFilter,
    setTypeFilter,
    ...titleTermsData,
    ...titleTermModal,
    ...titleTermDeleteAction,
    saveMutation,
  };
}
