'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

import type {
  ChatbotContextItem as ContextItem,
  ChatbotContextDraft as ContextDraft,
} from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui/primitives.public';

import {
  useChatbotContextSettingsQuery,
  useSaveChatbotContextMutation,
} from './useChatbotContextQueries';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const buildContextItems = (rawItems?: string): ContextItem[] => {
  if (typeof rawItems === 'string' && rawItems !== '') {
    try {
      const parsed: unknown = JSON.parse(rawItems);
      if (Array.isArray(parsed)) {
        return parsed as ContextItem[];
      }
    } catch (error) {
      logClientError(error);
    }
  }
  return [];
};

export const buildActiveIds = (rawActive?: string, items?: ContextItem[]): string[] => {
  if (typeof rawActive === 'string' && rawActive !== '') {
    try {
      const parsed: unknown = JSON.parse(rawActive);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    } catch (error) {
      logClientError(error);
    }
  }
  return items ? items.map((item: ContextItem): string => item.id) : [];
};

export function useChatbotContextData(): {
  contexts: ContextItem[];
  setContexts: React.Dispatch<React.SetStateAction<ContextItem[]>>;
  activeIds: string[];
  setActiveIds: React.Dispatch<React.SetStateAction<string[]>>;
  contextSettingsQuery: ReturnType<typeof useChatbotContextSettingsQuery>;
  hasInitializedData: React.MutableRefObject<boolean>;
} {
  const [contexts, setContexts] = useState<ContextItem[]>([]);
  const [activeIds, setActiveIds] = useState<string[]>([]);
  const hasInitializedData = useRef(false);
  const contextSettingsQuery = useChatbotContextSettingsQuery();

  useEffect(() => {
    if (contextSettingsQuery.data === undefined || hasInitializedData.current) return;

    const data = contextSettingsQuery.data as Array<{ key: string; value?: string }>;
    const storedItems = data.find((item) => item.key === 'chatbot_global_context_items');
    const storedActive = data.find((item) => item.key === 'chatbot_global_context_active');

    const items = buildContextItems(storedItems?.value);
    const active = buildActiveIds(storedActive?.value, items);
    setContexts(items);
    setActiveIds(active);
    hasInitializedData.current = true;
  }, [contextSettingsQuery.data]);

  return { contexts, setContexts, activeIds, setActiveIds, contextSettingsQuery, hasInitializedData };
}

export function useChatbotContextFilters(contexts: ContextItem[]): {
  tagQuery: string;
  setTagQuery: React.Dispatch<React.SetStateAction<string>>;
  tagFilters: string[];
  setTagFilters: React.Dispatch<React.SetStateAction<string[]>>;
  uniqueTags: string[];
  filteredContexts: ContextItem[];
} {
  const searchParams = useSearchParams();
  const [tagQuery, setTagQuery] = useState<string>('');
  const [tagFilters, setTagFilters] = useState<string[]>([]);
  const initializedFilters = useRef(false);

  useEffect(() => {
    if (!initializedFilters.current) {
      const queryFromUrl = searchParams.get('q') ?? '';
      const tagsFromUrl = searchParams.get('tags');
      const parsedTags =
        tagsFromUrl !== null
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

  const uniqueTags = useMemo(
    () => Array.from(new Set(contexts.flatMap((item) => item.tags ?? []))),
    [contexts]
  );

  const filteredContexts = useMemo(() => {
    const normalizedQuery = tagQuery.trim().toLowerCase();
    return contexts.filter((item) => {
      const matchesQuery =
        normalizedQuery === '' ||
        item.title.toLowerCase().includes(normalizedQuery) ||
        item.content.toLowerCase().includes(normalizedQuery) ||
        (item.tags ?? []).some((tag) => tag.toLowerCase().includes(normalizedQuery));
      const matchesTags =
        tagFilters.length === 0 || tagFilters.some((tag) => (item.tags ?? []).includes(tag));
      return matchesQuery && matchesTags;
    });
  }, [contexts, tagQuery, tagFilters]);

  return { tagQuery, setTagQuery, tagFilters, setTagFilters, uniqueTags, filteredContexts };
}

export function useChatbotContextModals(activeIds: string[]): {
  isModalOpen: boolean;
  modalDraft: ContextDraft | null;
  setModalDraft: React.Dispatch<React.SetStateAction<ContextDraft | null>>;
  tagDraft: string;
  setTagDraft: React.Dispatch<React.SetStateAction<string>>;
  closeModal: () => void;
  openCreateModal: () => void;
  openEditModal: (item: ContextItem) => void;
} {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalDraft, setModalDraft] = useState<ContextDraft | null>(null);
  const [tagDraft, setTagDraft] = useState<string>('');

  const closeModal = useCallback((): void => {
    setIsModalOpen(false);
    setModalDraft(null);
    setTagDraft('');
  }, []);

  const openCreateModal = useCallback((): void => {
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
    (item: ContextItem): void => {
      setModalDraft({
        ...item,
        source: item.source ?? 'manual',
        tags: item.tags ?? [],
        active: activeIds.includes(item.id),
      });
      setTagDraft('');
      setIsModalOpen(true);
    },
    [activeIds]
  );

  return { isModalOpen, modalDraft, setModalDraft, tagDraft, setTagDraft, closeModal, openCreateModal, openEditModal };
}

export function useChatbotContextPersistence({
  contexts,
  activeIds,
}: {
  contexts: ContextItem[];
  activeIds: string[];
}): {
  handleSaveContexts: () => Promise<void>;
  saveMutation: ReturnType<typeof useSaveChatbotContextMutation>;
} {
  const { toast } = useToast();
  const saveMutation = useSaveChatbotContextMutation();

  const handleSaveContexts = async (): Promise<void> => {
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
      toast(error instanceof Error ? error.message : 'Failed to save contexts.', {
        variant: 'error',
      });
    }
  };

  return { handleSaveContexts, saveMutation };
}
