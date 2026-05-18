'use client';

import { useMemo, useState, useCallback } from 'react';

import type { ChatbotSessionListItem } from '@/shared/contracts/chatbot';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import * as chatbotApi from '../api';

export function useChatbotSessionsFiltering(sessions: ChatbotSessionListItem[]): {
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  filteredSessions: ChatbotSessionListItem[];
} {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredSessions = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (term === '') return sessions;
    return sessions.filter((session) => {
      const title = session.title?.toLowerCase() ?? '';
      return title.includes(term) || session.id.toLowerCase().includes(term);
    });
  }, [searchQuery, sessions]);

  return { searchQuery, setSearchQuery, filteredSessions };
}

function useSelectAllMatchingMutation(): MutationResult<string[], string | undefined> {
  return useMutationV2<string[], string | undefined>({
    mutationKey: QUERY_KEYS.ai.chatbot.mutation('sessions.select-all-matching'),
    mutationFn: chatbotApi.fetchChatbotSessionIds,
    meta: {
      source: 'chatbot.hooks.useChatbotSessionsState.selectAllMatching',
      operation: 'action',
      resource: 'chatbot.sessions.ids',
      domain: 'global',
      tags: ['chatbot', 'sessions', 'selection'],
      description: 'Runs chatbot sessions ids.',
    },
  });
}

export function useChatbotSessionsSelection(
  searchQuery: string,
  filteredSessions: ChatbotSessionListItem[]
): {
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectingAll: boolean;
  clearSelection: () => void;
  selectAllVisible: () => void;
  selectAllMatching: () => Promise<void>;
  toggleSelected: (id: string) => void;
} {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectAllMatchingMutation = useSelectAllMatchingMutation();

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const selectAllVisible = useCallback(
    () => setSelectedIds(new Set(filteredSessions.map((s) => s.id))),
    [filteredSessions]
  );

  const selectAllMatching = useCallback(async (): Promise<void> => {
    if (selectAllMatchingMutation.isPending) return;
    try {
      const ids = await selectAllMatchingMutation.mutateAsync(
        searchQuery.trim() === '' ? undefined : searchQuery.trim()
      );
      setSelectedIds(new Set(ids));
      toast(ids.length > 0 ? `Selected ${ids.length} sessions` : 'No matching sessions found');
    } catch (err: unknown) {
      logClientError(err);
      toast(err instanceof Error ? err.message : 'Failed to select sessions.', { variant: 'error' });
    }
  }, [searchQuery, selectAllMatchingMutation, toast]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  return {
    selectedIds, setSelectedIds, selectingAll: selectAllMatchingMutation.isPending,
    clearSelection, selectAllVisible, selectAllMatching, toggleSelected,
  };
}
