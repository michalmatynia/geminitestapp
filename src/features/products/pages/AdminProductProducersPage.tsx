'use client';

import { Plus, Trash2, Factory } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';

import {
  useDeleteProducerMutation,
  useProducers,
  useSaveProducerMutation,
} from '@/features/products/hooks/useProductMetadataQueries';
import type { Producer } from '@/shared/contracts/products';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import {
  AdminProductsBreadcrumbs,
  Button,
  EmptyState,
  useToast,
  StandardDataTablePanel,
  PanelHeader,
  SearchInput,
} from '@/shared/ui';
import {
  SettingsPanelBuilder,
  type SettingsField,
} from '@/shared/ui/templates/SettingsPanelBuilder';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { ColumnDef } from '@tanstack/react-table';

type ProducerFormState = {
  name: string;
  website: string;
};

const FIELDS: SettingsField<ProducerFormState>[] = [
  {
    key: 'name',
    label: 'Name',
    type: 'text',
    placeholder: 'Producer name',
    required: true,
  },
  {
    key: 'website',
    label: 'Website',
    type: 'text',
    placeholder: 'https://...',
    helperText: 'Optional official website URL',
  },
];

export function AdminProductProducersPage(): React.JSX.Element {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const producersQuery = useProducers();
  const saveMutation = useSaveProducerMutation();
  const deleteMutation = useDeleteProducerMutation();

  const loading = producersQuery.isLoading;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [form, setForm] = useState<ProducerFormState>({ name: '', website: '' });

  const filtered = useMemo((): Producer[] => {
    const producersData: Producer[] = producersQuery.data ?? [];
    const q: string = query.trim().toLowerCase();
    if (!q) return producersData;
    return producersData.filter((p: Producer) => p.name.toLowerCase().includes(q));
  }, [producersQuery.data, query]);

  const openCreate = (): void => {
    setEditing(null);
    setForm({ name: '', website: '' });
    setOpen(true);
  };

  const openEdit = useCallback((producer: Producer): void => {
    setEditing(producer);
    setForm({ name: producer.name ?? '', website: producer.website ?? '' });
    setOpen(true);
  }, []);

  const handleSave = async (): Promise<void> => {
    const name = form.name.trim();
    if (!name) {
      toast('Producer name is required.', { variant: 'error' });
      return;
    }
    const website = form.website.trim();
    try {
      await saveMutation.mutateAsync({
        id: editing?.id,
        data: { name, website: website ? website : null },
      });
      toast(editing ? 'Producer updated.' : 'Producer created.', { variant: 'success' });
      setOpen(false);
    } catch (error) {
      logClientError(error, {
        context: {
          source: 'AdminProductProducersPage',
          action: 'saveProducer',
          producerId: editing?.id,
        },
      });
      toast(error instanceof Error ? error.message : 'Failed to save producer.', {
        variant: 'error',
      });
    }
  };

  const handleChange = (vals: Partial<ProducerFormState>) => {
    setForm((prev) => ({ ...prev, ...vals }));
  };

  const confirmDelete = (producer: Producer): void => {
    confirm({
      title: 'Delete producer?',
      message: `This will delete "${producer.name}".`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(producer.id);
          toast('Producer deleted.', { variant: 'success' });
        } catch (error) {
          logClientError(error, {
            context: {
              source: 'AdminProductProducersPage',
              action: 'deleteProducer',
              producerId: producer.id,
            },
          });
          toast(error instanceof Error ? error.message : 'Failed to delete producer.', {
            variant: 'error',
          });
        }
      },
    });
  };

  const columns = useMemo<ColumnDef<Producer>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Producer Name',
        cell: ({ row }) => {
          const producer = row.original;
          return (
            <div className='min-w-0'>
              <div className='text-sm font-medium text-gray-100 truncate'>{producer.name}</div>
              {producer.website && (
                <div className='text-xs text-muted-foreground truncate'>{producer.website}</div>
              )}
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => {
          const producer = row.original;
          return (
            <div className='flex items-center justify-end gap-2'>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={(): void => openEdit(producer)}
              >
                Edit
              </Button>
              <Button
                type='button'
                size='xs'
                variant='outline'
                onClick={(): void => confirmDelete(producer)}
                className='text-red-300 hover:text-red-200'
                title='Delete producer'
              >
                <Trash2 className='size-3.5' />
              </Button>
            </div>
          );
        },
      },
    ],
    [openEdit]
  );

  return (
    <div className='space-y-6'>
      <PanelHeader
        title='Producers'
        description='Manage producers and assign them in Product Edit.'
        icon={<Factory className='size-4' />}
        subtitle={<AdminProductsBreadcrumbs current='Producers' />}
        actions={[
          {
            key: 'add',
            label: 'Add Producer',
            icon: <Plus className='size-4' />,
            onClick: openCreate,
          },
        ]}
      />

      <StandardDataTablePanel
        filters={
          <div className='max-w-sm'>
            <SearchInput
              placeholder='Search by name...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery('')}
              size='sm'
            />
          </div>
        }
        columns={columns}
        data={filtered}
        isLoading={loading}
        emptyState={
          <EmptyState
            title='No producers'
            description={
              query
                ? 'No producers match your search.'
                : 'Create a producer to attach it to products.'
            }
            action={
              !query ? (
                <Button onClick={openCreate} variant='outline'>
                  <Plus className='size-4 mr-2' />
                  Create Producer
                </Button>
              ) : undefined
            }
          />
        }
      />

      <SettingsPanelBuilder
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Producer' : 'Create Producer'}
        fields={FIELDS}
        values={form}
        onChange={handleChange}
        onSave={handleSave}
        isSaving={saveMutation.isPending}
        size='sm'
      />

      <ConfirmationModal />
    </div>
  );
}
