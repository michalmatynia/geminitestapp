'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import React from 'react';

import type { AgentTeachingChatSource, AgentTeachingEmbeddingCollectionRecord, AgentTeachingEmbeddingDocumentListItem } from '@/shared/types/domain/agent-teaching';
import { Button, ConfirmDialog, Input, SectionHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea, useToast, FormSection, FormField } from '@/shared/ui';

import { useAgentTeachingContext } from '../context/AgentTeachingContext';
import { useAddEmbeddingDocumentMutation, useDeleteEmbeddingDocumentMutation, useEmbeddingDocuments, useSearchEmbeddingCollectionMutation } from '../hooks/useAgentTeaching';

export function AgentTeachingCollectionDetailPage(): React.JSX.Element {
  const { toast } = useToast();
  const params = useParams<{ collectionId: string }>();
  const collectionId = params?.collectionId ?? null;

  const { collections, isLoading: loadingCollections } = useAgentTeachingContext();
  const collection: AgentTeachingEmbeddingCollectionRecord | null =
    collectionId
      ? collections.find((c: AgentTeachingEmbeddingCollectionRecord) => c.id === collectionId) ?? null
      : null;

  const { data: docsResult, isLoading: loadingDocs } = useEmbeddingDocuments(collectionId);
  const { mutateAsync: addDoc, isPending: adding } = useAddEmbeddingDocumentMutation();
  const { mutateAsync: deleteDoc, isPending: deleting } = useDeleteEmbeddingDocumentMutation();
  const searchMutation = useSearchEmbeddingCollectionMutation();

  const [text, setText] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [source, setSource] = React.useState('');
  const [tags, setTags] = React.useState('');
  const [docToDelete, setDocToDelete] = React.useState<AgentTeachingEmbeddingDocumentListItem | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchTopK, setSearchTopK] = React.useState(8);
  const [searchMinScore, setSearchMinScore] = React.useState(0.15);
  const [searchResults, setSearchResults] = React.useState<AgentTeachingChatSource[]>([]);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const isLoading = loadingCollections || loadingDocs;
  const searching = searchMutation.isPending;

  const handleAdd = async (): Promise<void> => {
    if (!collectionId) return;
    const trimmed = text.trim();
    if (!trimmed) {
      toast('Text is required.', { variant: 'error' });
      return;
    }
    try {
      await addDoc({
        collectionId,
        text: trimmed,
        title: title.trim() || null,
        source: source.trim() || null,
        tags: tags
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean),
      });
      toast('Document embedded and saved.', { variant: 'success' });
      setText('');
      setTitle('');
      setSource('');
      setTags('');
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to add document.', { variant: 'error' });
    }
  };

  const handleSearch = async (): Promise<void> => {
    if (!collectionId) return;
    const queryText = searchQuery.trim();
    if (!queryText) return;
    setSearchError(null);
    try {
      const results = await searchMutation.mutateAsync({
        collectionId,
        queryText,
        topK: searchTopK,
        minScore: searchMinScore,
      });
      setSearchResults(results);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Search failed.');
      setSearchResults([]);
    }
  };

  return (
    <div className='container mx-auto py-10 space-y-6'>
      <SectionHeader
        title={collection ? collection.name : 'Collection'}
        description='Manage documents (original text + embedding vectors).'
        eyebrow={(
          <Link href='/admin/agentcreator/teaching/collections' className='text-blue-300 hover:text-blue-200'>
            ← Back to collections
          </Link>
        )}
        actions={collection ? (
          <div className='text-xs text-gray-400'>
            Embedding model: <span className='text-gray-200'>{collection.embeddingModel}</span>
          </div>
        ) : undefined}
      />

      <FormSection title='Add document' className='p-4 space-y-4'>
        <div className='grid gap-4 md:grid-cols-2'>
          <FormField label='Title (optional)'>
            <Input value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder='e.g. Product naming rules' />
          </FormField>
          <FormField label='Source (optional)'>
            <Input value={source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSource(e.target.value)} placeholder='e.g. internal wiki / URL / note id' />
          </FormField>
        </div>
        <FormField label='Tags (comma separated)'>
          <Input value={tags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} placeholder='pricing, listings, seo' />
        </FormField>
        <FormField
          label='Text to embed'
          description='This stores both the text and the embedding vector in MongoDB.'
        >
          <Textarea
            value={text}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
            placeholder='Paste the original text you want the agent to learn from...'
            className='min-h-[160px]'
          />
          <div className='flex justify-end mt-2'>
            <Button type='button' onClick={() => void handleAdd()} disabled={adding || deleting || !collectionId || !text.trim()}>
              {adding ? 'Embedding...' : 'Add to collection'}
            </Button>
          </div>
        </FormField>
      </FormSection>

      <FormSection
        title='Search the embedding school'
        description='Embed a query and preview which documents would be retrieved.'
        actions={(
          <Button
            type='button'
            onClick={() => void handleSearch()}
            disabled={searching || !collectionId || !searchQuery.trim()}
          >
            {searching ? 'Searching...' : 'Search'}
          </Button>
        )}
        className='p-4 space-y-3'
      >
        <div className='grid gap-4 md:grid-cols-3'>
          <div className='md:col-span-2'>
            <FormField label='Query'>
              <Textarea
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSearchQuery(e.target.value)}
                placeholder='Ask something you expect the learner agent to answer from this collection...'
                className='min-h-[90px]'
                disabled={searching || !collectionId}
              />
            </FormField>
          </div>
          <div className='space-y-3'>
            <FormField label='Top K'>
              <Input
                type='number'
                min={1}
                max={50}
                value={String(searchTopK)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTopK(Number(e.target.value))}
                disabled={searching || !collectionId}
              />
            </FormField>
            <FormField label='Min score'>
              <Input
                type='number'
                min={-1}
                max={1}
                step={0.01}
                value={String(searchMinScore)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchMinScore(Number(e.target.value))}
                disabled={searching || !collectionId}
              />
            </FormField>
          </div>
        </div>

        {searchError ? (
          <div className='rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200'>
            {searchError}
          </div>
        ) : null}

        <div className='rounded-md border border-border bg-card/30 p-3'>
          <div className='text-sm font-semibold text-white'>Top matches</div>
          {searchResults.length === 0 ? (
            <div className='mt-2 text-sm text-gray-400'>
              {searching ? 'Searching…' : 'No matches yet. Run a search.'}
            </div>
          ) : (
            <div className='mt-2 space-y-2'>
              {searchResults.map((src: AgentTeachingChatSource) => (
                <div key={src.documentId} className='rounded-md border border-border bg-card/50 p-2'>
                  <div className='flex items-center justify-between gap-2'>
                    <div className='text-xs text-gray-300'>
                      [doc:{src.documentId}] • score {src.score.toFixed(3)}
                    </div>
                    {src.metadata?.title ? (
                      <div className='text-[11px] text-gray-500'>
                        {src.metadata.title}
                      </div>
                    ) : null}
                  </div>
                  {src.metadata?.source ? (
                    <div className='mt-1 text-[11px] text-gray-500'>Source: {src.metadata.source}</div>
                  ) : null}
                  <div className='mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-gray-200'>
                    {src.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FormSection>

      <div className='rounded-md border bg-card/60 backdrop-blur'>
        <Table>
          <TableHeader>
            <TableRow className='border-border/60'>
              <TableHead className='text-xs text-gray-400'>Text</TableHead>
              <TableHead className='text-xs text-gray-400'>Meta</TableHead>
              <TableHead className='text-xs text-gray-400'>Updated</TableHead>
              <TableHead className='text-xs text-gray-400 text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(docsResult?.items ?? []).map((doc: AgentTeachingEmbeddingDocumentListItem) => (
              <TableRow key={doc.id} className='border-border/50'>
                <TableCell className='text-sm text-gray-200'>
                  <div className='max-w-[520px] truncate' title={doc.text}>
                    {doc.text}
                  </div>
                </TableCell>
                <TableCell className='text-xs text-gray-400'>
                  <div className='space-y-1'>
                    {doc.metadata?.title ? <div>Title: {doc.metadata.title}</div> : null}
                    {doc.metadata?.source ? <div>Source: {doc.metadata.source}</div> : null}
                    {doc.metadata?.tags?.length ? <div>Tags: {doc.metadata.tags.join(', ')}</div> : null}
                    <div className='text-[11px] text-gray-500'>
                      {doc.embeddingModel} ({doc.embeddingDimensions})
                    </div>
                  </div>
                </TableCell>
                <TableCell className='text-xs text-gray-400'>
                  {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '—'}
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={(): void => setDocToDelete(doc)}
                    disabled={adding || deleting}
                  >
                    <Trash2 className='mr-1 size-3' />
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {!isLoading && (docsResult?.items ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className='h-24 text-center text-sm text-gray-400'>
                  No documents yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open: boolean): void => {
          if (!open) setDocToDelete(null);
        }}
        title='Delete document'
        description='Delete this embedded document? This cannot be undone.'
        confirmText='Delete'
        variant='destructive'
        onConfirm={(): void => {
          if (!collectionId || !docToDelete) return;
          void deleteDoc({ collectionId, documentId: docToDelete.id })
            .then(() => toast('Document deleted.', { variant: 'success' }))
            .catch((error: unknown) =>
              toast(error instanceof Error ? error.message : 'Failed to delete document.', { variant: 'error' })
            )
            .finally(() => setDocToDelete(null));
        }}
      />
    </div>
  );
}
