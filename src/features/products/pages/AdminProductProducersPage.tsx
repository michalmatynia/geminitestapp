'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useProducers, useSaveProducerMutation, useDeleteProducerMutation } from '@/features/products/hooks/useProductMetadata';
import type { Producer } from '@/features/products/types';
import { logClientError } from '@/features/observability';
import { Button, ConfirmDialog, EmptyState, Input, Label, SharedModal, useToast } from '@/shared/ui';

type ProducerFormState = {
  name: string;
  website: string;
};

export function AdminProductProducersPage(): React.JSX.Element {
  const { toast } = useToast();
  const producersQuery = useProducers();
  const saveMutation = useSaveProducerMutation();
  const deleteMutation = useDeleteProducerMutation();

  const loading = producersQuery.isLoading;

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [toDelete, setToDelete] = useState<Producer | null>(null);
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

  const openEdit = (producer: Producer): void => {
    setEditing(producer);
    setForm({ name: producer.name ?? '', website: producer.website ?? '' });
    setOpen(true);
  };

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
      logClientError(error, { context: { source: 'AdminProductProducersPage', action: 'saveProducer', producerId: editing?.id } });
      toast(error instanceof Error ? error.message : 'Failed to save producer.', { variant: 'error' });
    }
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!toDelete) return;
    try {
      await deleteMutation.mutateAsync(toDelete.id);
      toast('Producer deleted.', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'AdminProductProducersPage', action: 'deleteProducer', producerId: toDelete.id } });
      toast(error instanceof Error ? error.message : 'Failed to delete producer.', { variant: 'error' });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className='space-y-5'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h1 className='text-xl font-semibold text-white'>Producers</h1>
          <p className='text-xs text-muted-foreground'>
            Manage producers and assign them in Product Edit.
          </p>
        </div>
        <Button onClick={openCreate} className='bg-white text-gray-900 hover:bg-gray-200'>
          <Plus className='size-4 mr-2' />
          Add Producer
        </Button>
      </div>

      <div className='rounded-md border border-border bg-card/60 p-4'>
        <div className='mb-3'>
          <Label htmlFor='producer-search' className='text-sm font-semibold text-white'>
            Search
          </Label>
          <Input
            id='producer-search'
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            placeholder='Search by name...'
            className='mt-2 max-w-sm'
          />
        </div>

        {loading ? (
          <div className='rounded-md border border-dashed border p-4 text-center text-sm text-gray-400'>
            Loading producers...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title='No producers'
            description='Create a producer to attach it to products.'
            action={
              <Button onClick={openCreate} variant='outline'>
                <Plus className='size-4 mr-2' />
                Create Producer
              </Button>
            }
          />
        ) : (
          <div className='space-y-2'>
            {filtered.map((producer: Producer) => (
              <div
                key={producer.id}
                className='flex items-center justify-between gap-3 rounded-md border border-border bg-gray-900 px-3 py-2'
              >
                <div className='min-w-0'>
                  <div className='text-sm text-gray-100 truncate'>{producer.name}</div>
                  {producer.website && (
                    <div className='text-xs text-muted-foreground truncate'>{producer.website}</div>
                  )}
                </div>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    onClick={(): void => openEdit(producer)}
                    className='rounded bg-gray-800 px-2 py-1 text-xs text-gray-100 hover:bg-gray-700'
                  >
                    Edit
                  </Button>
                  <Button
                    type='button'
                    onClick={(): void => setToDelete(producer)}
                    className='rounded bg-red-600/80 px-2 py-1 text-xs text-white hover:bg-red-600'
                    title='Delete producer'
                  >
                    <Trash2 className='size-3' />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SharedModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit Producer' : 'Create Producer'}
        size='sm'
      >
        <div className='space-y-4'>
          <div>
            <Label htmlFor='producer-name'>Name</Label>
            <Input
              id='producer-name'
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev: ProducerFormState) => ({ ...prev, name: e.target.value }))
              }
              placeholder='Producer name'
            />
          </div>
          <div>
            <Label htmlFor='producer-website'>Website (optional)</Label>
            <Input
              id='producer-website'
              value={form.website}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm((prev: ProducerFormState) => ({ ...prev, website: e.target.value }))
              }
              placeholder='https://...'
            />
          </div>
          <div className='flex justify-end gap-2'>
            <Button variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSave();
              }}
              disabled={saveMutation.isPending}
              aria-disabled={saveMutation.isPending}
              className='bg-white text-gray-900 hover:bg-gray-200'
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </SharedModal>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(next: boolean) => {
          if (!next) setToDelete(null);
        }}
        title='Delete producer?'
        description={`This will delete "${toDelete?.name ?? ''}".`}
        confirmText='Delete'
        cancelText='Cancel'
        variant='destructive'
        loading={deleteMutation.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={() => {
          void handleConfirmDelete();
        }}
      />
    </div>
  );
}