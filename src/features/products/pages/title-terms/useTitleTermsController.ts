import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTitleTerms, useSaveTitleTermMutation, useDeleteTitleTermMutation } from '@/features/products/hooks/useProductMetadataQueries';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import {
  productTitleTermTypeSchema,
  type ProductTitleTerm,
  type ProductTitleTermType,
} from '@/shared/contracts/products/title-terms';

type TitleTermsController = {
  query: string;
  setQuery: (query: string) => void;
  typeFilter: string;
  setTypeFilter: (type: string) => void;
  filteredTerms: ProductTitleTerm[];
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

const resolveTypeFilter = (typeFilter: string): ProductTitleTermType | undefined => {
  const parsed = productTitleTermTypeSchema.safeParse(typeFilter);
  return parsed.success ? parsed.data : undefined;
};

const filterTitleTerms = (
  terms: readonly ProductTitleTerm[],
  query: string
): ProductTitleTerm[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0) return [...terms];

  return terms.filter((term) =>
    [term.name_en, term.name_pl, term.type]
      .join(' ')
      .toLowerCase()
      .includes(normalizedQuery)
  );
};

const useTitleTermsData = (typeFilter: string, query: string): TitleTermsData => {
  const titleTermsQuery = useTitleTerms(undefined, resolveTypeFilter(typeFilter), {
    allowWithoutCatalog: true,
  });
  const filteredTerms = useMemo(
    () => filterTitleTerms(titleTermsQuery.data ?? [], query),
    [query, titleTermsQuery.data]
  );
  return {
    filteredTerms,
    isLoading: titleTermsQuery.isLoading,
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
          await deleteMutation.mutateAsync({ id: term.id });
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
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') ?? 'all');
  const [query, setQuery] = useState('');
  const titleTermsData = useTitleTermsData(typeFilter, query);
  const titleTermModal = useTitleTermModalState();
  const titleTermDeleteAction = useTitleTermDeleteAction();
  const saveMutation = useSaveTitleTermMutation();

  return {
    query,
    setQuery,
    typeFilter,
    setTypeFilter,
    ...titleTermsData,
    ...titleTermModal,
    ...titleTermDeleteAction,
    saveMutation,
  };
}
