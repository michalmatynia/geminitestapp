import { StandardDataTablePanel } from '@/shared/ui/templates/StandardDataTablePanel';
import { Button } from '@/shared/ui/button';
import { Trash2 } from 'lucide-react';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';
import type React from 'react';

type TitleTermsTableProps = {
  filteredTerms: ProductTitleTerm[];
  isLoading: boolean;
  catalogNameById: Map<string, string>;
  openEdit: (term: ProductTitleTerm) => void;
  deleteTerm: (term: ProductTitleTerm) => void;
};

const normalizeTranslatedLabel = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveTitleTermTranslatedSubtext = (term: ProductTitleTerm): string | null => {
  const baseName = normalizeTranslatedLabel(term.name_en) ?? term.name_en.trim();
  const translation = normalizeTranslatedLabel(term.name_pl);
  if (translation === null) return null;
  return translation.localeCompare(baseName, undefined, { sensitivity: 'accent' }) === 0
    ? null
    : translation;
};

export function TitleTermsTable({
  filteredTerms,
  isLoading,
  catalogNameById,
  openEdit,
  deleteTerm,
}: TitleTermsTableProps): React.JSX.Element {
  const columns = [
    {
      accessorKey: 'name_en',
      header: 'English',
      cell: ({ row }: { row: { original: ProductTitleTerm } }) => {
        const translatedSubtext = resolveTitleTermTranslatedSubtext(row.original);
        const title = translatedSubtext !== null
          ? `${row.original.name_en}\n${translatedSubtext}`
          : row.original.name_en;
        return (
          <div className='min-w-0' title={title}>
            <div className='truncate text-sm font-medium text-gray-100'>{row.original.name_en}</div>
            {translatedSubtext !== null ? (
              <div className='truncate pt-0.5 text-[11px] leading-tight text-gray-400'>
                {translatedSubtext}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: 'catalog',
      header: 'Catalog',
      cell: ({ row }: { row: { original: ProductTitleTerm } }) =>
        catalogNameById.get(row.original.catalogId) ?? row.original.catalogId,
    },
    {
      accessorKey: 'type',
      header: 'Type',
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }: { row: { original: ProductTitleTerm } }) => (
        <div className='flex justify-end gap-2'>
          <Button size='xs' variant='outline' onClick={() => openEdit(row.original)}>
            Edit
          </Button>
          <Button
            size='xs'
            variant='outline'
            onClick={() => deleteTerm(row.original)}
            className='text-rose-400'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ];

  return <StandardDataTablePanel columns={columns} data={filteredTerms} isLoading={isLoading} />;
}
