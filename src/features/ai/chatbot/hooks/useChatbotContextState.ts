'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import type { ChatbotContextSegmentDto } from '@/shared/contracts/chatbot';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast, type FileUploadHelpers } from '@/shared/ui';

import * as chatbotApi from '../api';

export type ContextItem = {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  source?: 'manual' | 'pdf';
  createdAt: string;
};

export type ContextDraft = ContextItem & {
  active: boolean;
};

const buildContextItems = (
  rawItems?: string,
  rawLegacy?: string
): ContextItem[] => {
  if (rawItems) {
    try {
      const parsed: unknown = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        return parsed as ContextItem[];
      }
    } catch {
      // ignore invalid payload
    }
  }
  if (rawLegacy?.trim()) {
    return [
      {
        id: 'legacy-context',
        title: 'Legacy context',
        content: rawLegacy,
        source: 'manual',
        createdAt: new Date().toISOString(),
      },
    ];
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
    } catch {
      // ignore invalid payload
    }
  }
  return items ? items.map((item: ContextItem): string => item.id) : [];
};

export function useChatbotContextState() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const contextSettingsQuery = useQuery({
    queryKey: QUERY_KEYS.ai.chatbot.settings.allSettings('global-context'),
    queryFn: chatbotApi.fetchSettings,
    staleTime: 60_000,
  });

  const saveContextsMutation = useMutation({
    mutationFn: async (payload: {
      nextContexts: ContextItem[];
      nextActiveIds: string[];
    }): Promise<void> => {
      await chatbotApi.saveSetting(
        'chatbot_global_context_items',
        JSON.stringify(payload.nextContexts),
        'Failed to save contexts.'
      );
      await chatbotApi.saveSetting(
        'chatbot_global_context_active',
        JSON.stringify(payload.nextActiveIds),
        'Failed to save active contexts.'
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ai.chatbot.settings.allSettings('global-context'),
      });
    },
  });

  const uploadPdfMutation = useMutation({
    mutationFn: async (payload: {
      file: File;
      helpers?: FileUploadHelpers;
    }): Promise<{ segments: ChatbotContextSegmentDto[] }> =>
      chatbotApi.uploadChatbotContextPdf(
        payload.file,
        (loaded: number, total?: number) => payload.helpers?.reportProgress(loaded, total)
      ),
  });

  useEffect(() => {
    if (!contextSettingsQuery.data || hasInitializedData.current) return;

    const storedItems = contextSettingsQuery.data.find(
      (item: { key: string; value?: string }) => item.key === 'chatbot_global_context_items'
    );
    const storedActive = contextSettingsQuery.data.find(
      (item: { key: string; value?: string }) => item.key === 'chatbot_global_context_active'
    );
    const storedLegacy = contextSettingsQuery.data.find(
      (item: { key: string; value?: string }) => item.key === 'chatbot_global_context'
    );

    const items = buildContextItems(storedItems?.value, storedLegacy?.value);
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
        ? tagsFromUrl.split(',').map((tag) => tag.trim()).filter(Boolean)
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

  const openEditModal = useCallback((item: ContextItem) => {
    setModalDraft({
      ...item,
      tags: item.tags || [],
      active: activeIds.includes(item.id),
    });
    setTagDraft('');
    setIsModalOpen(true);
  }, [activeIds]);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setModalDraft(null);
    setTagDraft('');
  }, []);

  const handleDeleteContext = useCallback((id: string) => {
    setContexts((prev) => prev.filter((item) => item.id !== id));
    setActiveIds((prev) => prev.filter((item) => item !== id));
    if (modalDraft?.id === id) {
      closeModal();
    }
  }, [modalDraft?.id, closeModal]);

  const handleSaveDraft = useCallback(() => {
    if (!modalDraft) return;
    const nextItem: ContextItem = {
      id: modalDraft.id,
      title: modalDraft.title,
      content: modalDraft.content,
      createdAt: modalDraft.createdAt,
      ...(modalDraft.tags !== undefined && { tags: modalDraft.tags }),
      ...(modalDraft.source !== undefined && { source: modalDraft.source }),
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
        ...(helpers !== undefined && { helpers }) 
      });
      if (data.segments.length === 0) {
        toast('No text found in PDF.', { variant: 'info' });
        return;
      }
      const now = new Date().toISOString();
      const nextItems: ContextItem[] = data.segments.map((segment) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: `PDF Content ${segment.id}`,
        content: segment.content,
        tags: ['pdf'],
        source: 'pdf',
        createdAt: now,
      }));
      setContexts((prev) => [...prev, ...nextItems]);
      setActiveIds((prev) => [...prev, ...nextItems.map((item) => item.id)]);
      toast('PDF added to context list', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to parse PDF.';
      toast(message, { variant: 'error' });
    }
  };

  const handleSaveContexts = async () => {
    try {
      await saveContextsMutation.mutateAsync({
        nextContexts: contexts,
        nextActiveIds: activeIds,
      });
      toast('Global contexts saved', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save contexts.';
      toast(message, { variant: 'error' });
    }
  };

  const uniqueTags = useMemo(() => 
    Array.from(new Set(contexts.flatMap((item) => item.tags || []))), 
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
        tagFilters.length === 0 ||
        tagFilters.some((tag) => (item.tags || []).includes(tag));
      return matchesQuery && matchesTags;
    });
  }, [contexts, tagQuery, tagFilters]);

  const toggleActive = useCallback((id: string, active: boolean) => {
    setActiveIds((prev) => 
      active ? [...prev, id] : prev.filter((item) => item !== id)
    );
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
    saving: saveContextsMutation.isPending,
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
