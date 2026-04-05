'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import type {
  ChatbotContextItem as ContextItem,
  ChatbotContextDraft as ContextDraft,
} from '@/shared/contracts/chatbot';
import type { FileUploadHelpers } from '@/shared/contracts/ui/base';
import { useToast } from '@/shared/ui/primitives.public';

import {
  useChatbotContextSettingsQuery,
  useSaveChatbotContextMutation,
  useUploadChatbotContextPdfMutation,
} from './useChatbotContextQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type { ContextItem, ContextDraft };

const buildContextItems = (rawItems?: string): ContextItem[] => {
  if (rawItems) {
    try {
      const parsed: unknown = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        return parsed as ContextItem[];
      }
    } catch (error) {
      logClientError(error);
    
      // ignore invalid payload
    }
  }
  return [];
};

const buildActiveIds = (rawActive?: string, items?: ContextItem[]): string[] => {
  if (rawActive) {
    try {
      const parsed: unknown = JSON.parse(rawActive);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    } catch (error) {
      logClientError(error);
    
      // ignore invalid payload
    }
  }
  return items ? items.map((item: ContextItem): string => item.id) : [];
};

export function useChatbotContextState() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const initializedFilters = useRef(false);
  const hasInitializedData = useRef(false);

  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState<string>('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalDraft, setModalDraft] = useState<ContextDraft | null>(null);
  const [tagDraft, setTagDraft] = useState<string>('');

  const contextSettingsQuery = useChatbotContextSettingsQuery();
  const saveMutation = useSaveChatbotContextMutation();
  const uploadPdfMutation = useUploadChatbotContextPdfMutation();

  useEffect(() => {
    if (!contextSettingsQuery.data || hasInitializedData.current) return;

    const data = contextSettingsQuery.data as Array<{ key: string; value?: string }>;
    const storedItems = data.find((item) => item.key === 'chatbot_global_context_items');
    const storedActive = data.find((item) => item.key === 'chatbot_global_context_active');

    const items = buildContextItems(storedItems?.value);
    const active = buildActiveIds(storedActive?.value, items);
    setContexts(items);
    setActiveIds(active);
    hasInitializedData.current = true;
  }, [contextSettingsQuery.data]);

  useEffect(() => {
    if (!initializedFilters.current) {
      const queryFromUrl = searchParams.get('q') || '';
      const tagsFromUrl = searchParams.get('tags');
      const parsedTags = tagsFromUrl
        ? tagsFromUrl
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
        : [];
      setTagQuery(queryFromUrl);
      setTagFilters(parsedTags);
      initializedFilters.current = true;
    }
  }, [searchParams]);

  const openCreateModal = useCallback(() => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setModalDraft({
      id,
      title: 'New context',
      content: '',
      tags: [],
      source: 'manual',
      createdAt: new Date().toISOString(),
      active: true,
    });
    setTagDraft('');
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    (item: ContextItem) => {
      setModalDraft({
        ...item,
        source: item.source ?? 'manual',
        tags: item.tags || [],
        active: activeIds.includes(item.id),
      });
      setTagDraft('');
      setIsModalOpen(true);
    },
    [activeIds]
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDraft(null);
    setTagDraft('');
  }, []);

  const handleDeleteContext = useCallback(
    (id: string) => {
      setContexts((prev) => prev.filter((item) => item.id !== id));
      setActiveIds((prev) => prev.filter((item) => item !== id));
      if (modalDraft?.id === id) {
        closeModal();
      }
    },
    [modalDraft?.id, closeModal]
  );

  const handleSaveDraft = useCallback(() => {
    if (!modalDraft) return;
    const nextItem: ContextItem = {
      id: modalDraft.id,
      title: modalDraft.title,
      content: modalDraft.content,
      source: modalDraft.source ?? 'manual',
      createdAt: modalDraft.createdAt,
      ...(modalDraft.tags !== undefined && { tags: modalDraft.tags }),
    };

    setContexts((prev) => {
      const exists = prev.some((item) => item.id === modalDraft.id);
      if (exists) {
        return prev.map((item) => (item.id === modalDraft.id ? nextItem : item));
      }
      return [...prev, nextItem];
    });
    setActiveIds((prev) => {
      const without = prev.filter((item) => item !== modalDraft.id);
      return modalDraft.active ? [...without, modalDraft.id] : without;
    });
    closeModal();
  }, [modalDraft, closeModal]);

  const handlePdfUpload = async (file: File, helpers?: FileUploadHelpers) => {
    try {
      const data = await uploadPdfMutation.mutateAsync({
        file,
        ...(helpers !== undefined && { helpers }),
      });
      if (data.segments.length === 0) {
        toast('No text found in PDF.', { variant: 'info' });
        return;
      }
      const now = new Date().toISOString();
      const nextItems: ContextItem[] = data.segments.map((segment, idx) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: segment.title || `PDF Content ${idx + 1}`,
        content: segment.content,
        tags: ['pdf'],
        source: 'pdf',
        createdAt: now,
      }));
      setContexts((prev) => [...prev, ...nextItems]);
      setActiveIds((prev) => [...prev, ...nextItems.map((item) => item.id)]);
      toast('PDF added to context list', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to parse PDF.';
      toast(message, { variant: 'error' });
    }
  };

  const handleSaveContexts = async () => {
    try {
      await saveMutation.mutateAsync({
        key: 'chatbot_global_context_items',
        value: JSON.stringify(contexts),
        errorLabel: 'Failed to save contexts.',
      });
      await saveMutation.mutateAsync({
        key: 'chatbot_global_context_active',
        value: JSON.stringify(activeIds),
        errorLabel: 'Failed to save active contexts.',
      });
      toast('Global contexts saved', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to save contexts.';
      toast(message, { variant: 'error' });
    }
  };

  const uniqueTags = useMemo(
    () => Array.from(new Set(contexts.flatMap((item) => item.tags || []))),
    [contexts]
  );

  const filteredContexts = useMemo(() => {
    const normalizedQuery = tagQuery.trim().toLowerCase();
    return contexts.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.content.toLowerCase().includes(normalizedQuery) ||
        (item.tags || []).some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchesTags =
        tagFilters.length === 0 || tagFilters.some((tag) => (item.tags || []).includes(tag));
      return matchesQuery && matchesTags;
    });
  }, [contexts, tagQuery, tagFilters]);

  const toggleActive = useCallback((id: string, active: boolean) => {
    setActiveIds((prev) => (active ? [...prev, id] : prev.filter((item) => item !== id)));
  }, []);

  return {
    contexts,
    activeIds,
    tagQuery,
    setTagQuery,
    tagFilters,
    setTagFilters,
    uniqueTags,
    filteredContexts,
    isModalOpen,
    modalDraft,
    setModalDraft,
    tagDraft,
    setTagDraft,
    loading: contextSettingsQuery.isLoading && !hasInitializedData.current,
    saving: saveMutation.isPending,
    uploading: uploadPdfMutation.isPending,
    openCreateModal,
    openEditModal,
    closeModal,
    handleDeleteContext,
    handleSaveDraft,
    handlePdfUpload,
    handleSaveContexts,
    toggleActive,
  };
}
