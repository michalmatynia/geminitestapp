'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo, useCallback } from 'react';

import type {
  AgentTeachingChatSource,
  AgentTeachingEmbeddingDocumentListItem,
} from '@/shared/contracts/agent-teaching';
import { useToast } from '@/shared/ui/primitives.public';

import { useAgentTeachingQueriesContext } from '../context/AgentTeachingContext';
import {
  useAddEmbeddingDocumentMutation,
  useDeleteEmbeddingDocumentMutation,
  useEmbeddingDocuments,
  useSearchEmbeddingCollectionMutation,
} from '../hooks/useAgentTeachingQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export function useAgentTeachingCollectionDetailState() {
  const { toast } = useToast();
  const params = useParams<{ collectionId: string }>();
  const collectionId = params?.collectionId ?? null;

  const { collections, isLoading: loadingCollections } = useAgentTeachingQueriesContext();
  const collection = useMemo(
    () => (collectionId ? (collections.find((c) => c.id === collectionId) ?? null) : null),
    [collectionId, collections]
  );

  const {
    data: docsResult,
    isLoading: loadingDocs,
    refetch: refetchDocs,
  } = useEmbeddingDocuments(collectionId);
  const { mutateAsync: addDoc, isPending: adding } = useAddEmbeddingDocumentMutation();
  const { mutateAsync: deleteDoc, isPending: deleting } = useDeleteEmbeddingDocumentMutation();
  const searchMutation = useSearchEmbeddingCollectionMutation();

  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [source, setSource] = useState('');
  const [tags, setTags] = useState('');
  const [docToDelete, setDocToDelete] = useState<AgentTeachingEmbeddingDocumentListItem | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTopK, setSearchTopK] = useState(8);
  const [searchMinScore, setSearchMinScore] = useState(0.15);
  const [searchResults, setSearchResults] = useState<AgentTeachingChatSource[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const isLoading = loadingCollections || loadingDocs;
  const searching = searchMutation.isPending;

  const handleAdd = useCallback(async () => {
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
          .map((t) => t.trim())
          .filter(Boolean),
      });
      toast('Document embedded and saved.', { variant: 'success' });
      setText('');
      setTitle('');
      setSource('');
      setTags('');
      void refetchDocs();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to add document.', {
        variant: 'error',
      });
    }
  }, [collectionId, text, title, source, tags, addDoc, toast, refetchDocs]);

  const handleDelete = useCallback(async () => {
    if (!collectionId || !docToDelete) return;
    try {
      await deleteDoc({ collectionId, documentId: docToDelete.id });
      toast('Document deleted.', { variant: 'success' });
      void refetchDocs();
    } catch (error) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to delete document.', {
        variant: 'error',
      });
    } finally {
      setDocToDelete(null);
    }
  }, [collectionId, docToDelete, deleteDoc, toast, refetchDocs]);

  const handleSearch = useCallback(async () => {
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
      logClientError(error);
      setSearchError(error instanceof Error ? error.message : 'Search failed.');
      setSearchResults([]);
    }
  }, [collectionId, searchQuery, searchTopK, searchMinScore, searchMutation]);

  const docs = useMemo(() => docsResult?.items ?? [], [docsResult]);

  return {
    collectionId,
    collection,
    docs,
    isLoading,
    adding,
    deleting,
    searching,
    text,
    setText,
    title,
    setTitle,
    source,
    setSource,
    tags,
    setTags,
    docToDelete,
    setDocToDelete,
    searchQuery,
    setSearchQuery,
    searchTopK,
    setSearchTopK,
    searchMinScore,
    setSearchMinScore,
    searchResults,
    searchError,
    handleAdd,
    handleDelete,
    handleSearch,
  };
}
