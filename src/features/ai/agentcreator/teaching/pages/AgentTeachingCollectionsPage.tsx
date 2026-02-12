'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

import { buildModelProfile } from '@/features/ai/chatbot/utils';
import type { AgentTeachingAgentRecord, AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/domain/agent-teaching';
import { Button, ConfirmDialog, Input, Label, SectionHeader, SectionPanel, AppModal, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, useToast, UnifiedSelect } from '@/shared/ui';

import { useAgentTeachingContext } from '../context/AgentTeachingContext';
import { useDeleteEmbeddingCollectionMutation, useUpsertEmbeddingCollectionMutation } from '../hooks/useAgentTeaching';

const isEmbeddingModel = (model: string): boolean => buildModelProfile(model).isEmbedding;

export function AgentTeachingCollectionsPage(): React.JSX.Element {
  const { toast } = useToast();
  const { collections, agents, modelOptions, isLoading } = useAgentTeachingContext();

  const embeddingModels = React.useMemo(
    () => modelOptions.filter((m: string) => m.trim().length > 0 && isEmbeddingModel(m)),
    [modelOptions]
  );

  const { mutateAsync: upsert, isPending: saving } = useUpsertEmbeddingCollectionMutation();
  const { mutateAsync: remove, isPending: deleting } = useDeleteEmbeddingCollectionMutation();

  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AgentTeachingEmbeddingCollectionRecord | null>(null);
  const [draft, setDraft] = React.useState<Partial<AgentTeachingEmbeddingCollectionRecord>>({});
  const [itemToDelete, setItemToDelete] = React.useState<AgentTeachingEmbeddingCollectionRecord | null>(null);

  const openCreate = (): void => {
    setEditing(null);
    setDraft({
      name: '',
      description: '',
      embeddingModel: embeddingModels[0] ?? '',
    });
    setModalOpen(true);
  };

  const openEdit = (item: AgentTeachingEmbeddingCollectionRecord): void => {
    setEditing(item);
    setDraft({ ...item });
    setModalOpen(true);
  };

  const closeModal = (): void => {
    setModalOpen(false);
    setEditing(null);
    setDraft({});
  };

  const handleSave = async (): Promise<void> => {
    const name = draft.name?.trim();
    if (!name) {
      toast('Collection name is required.', { variant: 'error' });
      return;
    }
    const embeddingModel = draft.embeddingModel?.trim();
    if (!embeddingModel) {
      toast('Embedding model is required.', { variant: 'error' });
      return;
    }
    try {
      await upsert({
        ...(editing?.id ? { id: editing.id } : {}),
        name,
        description: typeof draft.description === 'string' ? draft.description : null,
        embeddingModel,
      });
      toast(editing ? 'Collection updated.' : 'Collection created.', { variant: 'success' });
      closeModal();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save collection.', { variant: 'error' });
    }
  };

  const usedByCount = (collectionId: string): number =>
    agents.filter((agent: AgentTeachingAgentRecord) => (agent.collectionIds ?? []).includes(collectionId)).length;

  return (
    <div className='container mx-auto py-10 space-y-6'>
      <SectionHeader
        title='Embedding School'
        description='Store original text + embedding vectors. Collections can be attached to learner agents.'
        eyebrow={(
          <Link href='/admin/agentcreator/teaching' className='text-blue-300 hover:text-blue-200'>
            ← Back to learners
          </Link>
        )}
        actions={(
          <Button onClick={openCreate} className='gap-2'>
            New Collection
          </Button>
        )}
      />

      <SectionPanel className='p-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='text-xs text-gray-500'>
            {isLoading ? 'Loading...' : `${collections.length} collection(s)`}
          </div>
        </div>
      </SectionPanel>

      <SectionPanel variant='subtle' className='p-0 overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow className='border-border/60'>
              <TableHead className='text-xs text-gray-400'>Name</TableHead>
              <TableHead className='text-xs text-gray-400'>Embedding model</TableHead>
              <TableHead className='text-xs text-gray-400'>Used by</TableHead>
              <TableHead className='text-xs text-gray-400'>Updated</TableHead>
              <TableHead className='text-xs text-gray-400 text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection: AgentTeachingEmbeddingCollectionRecord) => (
              <TableRow key={collection.id} className='border-border/50'>
                <TableCell className='text-sm text-white'>
                  <div className='flex flex-col'>
                    <Link
                      href={`/admin/agentcreator/teaching/collections/${encodeURIComponent(collection.id)}`}
                      className='font-medium text-white hover:text-gray-200'
                    >
                      {collection.name}
                    </Link>
                    {collection.description?.trim() ? (
                      <span className='mt-0.5 text-xs text-gray-500 line-clamp-1'>
                        {collection.description}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className='text-xs text-gray-300'>{collection.embeddingModel}</TableCell>
                <TableCell className='text-xs text-gray-300'>{usedByCount(collection.id)} learner(s)</TableCell>
                <TableCell className='text-xs text-gray-400'>
                  {collection.updatedAt ? new Date(collection.updatedAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell className='text-right'>
                  <div className='flex items-center justify-end gap-2'>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(): void => openEdit(collection)}
                      disabled={saving || deleting}
                    >
                      <Pencil className='mr-1 size-3' />
                      Edit
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={(): void => setItemToDelete(collection)}
                      disabled={saving || deleting}
                    >
                      <Trash2 className='mr-1 size-3' />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}

            {collections.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={5} className='h-24 text-center text-sm text-gray-400'>
                  No collections yet. Create one to start storing embeddings.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SectionPanel>

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) setItemToDelete(null);
        }}
        title='Delete collection'
        description={`Delete collection "${itemToDelete?.name}" and all its documents? This cannot be undone.`}
        confirmText='Delete'
        variant='destructive'
        onConfirm={(): void => {
          if (!itemToDelete) return;
          void (async (): Promise<void> => {
            try {
              await remove({ id: itemToDelete.id });
              toast('Collection deleted.', { variant: 'success' });
            } catch (error) {
              toast(error instanceof Error ? error.message : 'Failed to delete collection.', { variant: 'error' });
            } finally {
              setItemToDelete(null);
            }
          })();
        }}
      />

      <AppModal
        open={modalOpen}
        onClose={closeModal}
        size='sm'
        title={editing ? 'Edit Collection' : 'New Collection'}
        footer={(
          <>
            <Button type='button' variant='outline' onClick={closeModal} disabled={saving || deleting}>
              Cancel
            </Button>
            <Button type='button' onClick={() => void handleSave()} disabled={saving || deleting || !draft.name?.trim()}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        )}
      >
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Name</Label>
            <Input
              value={draft.name ?? ''}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setDraft((prev: Partial<AgentTeachingEmbeddingCollectionRecord>): Partial<AgentTeachingEmbeddingCollectionRecord> => ({ ...prev, name: event.target.value }))
              }
              placeholder='Collection name'
            />
          </div>
          <div className='space-y-2'>
            <Label>Description</Label>
            <Textarea
              value={draft.description ?? ''}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
                setDraft((prev: Partial<AgentTeachingEmbeddingCollectionRecord>): Partial<AgentTeachingEmbeddingCollectionRecord> => ({ ...prev, description: event.target.value }))
              }
              placeholder='Optional description'
              className='min-h-[90px]'
            />
          </div>
          <div className='space-y-2'>
            <Label>Embedding model</Label>
            <UnifiedSelect
              value={draft.embeddingModel ?? ''}
              onValueChange={(value: string): void => setDraft((prev: Partial<AgentTeachingEmbeddingCollectionRecord>): Partial<AgentTeachingEmbeddingCollectionRecord> => ({ ...prev, embeddingModel: value }))}
              options={embeddingModels.map((model: string) => ({ value: model, label: model }))}
              placeholder='Select embedding model'
            />
            <div className='text-[11px] text-gray-500'>
              This model will be used to embed documents added to this collection.
            </div>
          </div>
        </div>
      </AppModal>
    </div>
  );
}