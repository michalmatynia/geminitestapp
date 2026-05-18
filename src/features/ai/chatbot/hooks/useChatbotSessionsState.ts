'use client';

import type { ChatbotSessionListItem } from '@/shared/contracts/chatbot';

import {
  useChatbotSessions,
} from '../hooks';
import {
  useChatbotSessionsFiltering,
  useChatbotSessionsSelection,
} from './useChatbotSessionsState.utils';
import {
  useChatbotSessionsEditing,
} from './useChatbotSessionsState.handlers';
import {
  useChatbotSessionDeletion,
  useChatbotBulkDeletion,
} from './useChatbotSessionsState.deletion';

export interface UseChatbotSessionsStateReturn {
  sessions: ChatbotSessionListItem[];
  filteredSessions: ChatbotSessionListItem[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  editingId: string | null;
  draftTitle: string;
  setDraftTitle: (title: string) => void;
  deletingId: string | null;
  selectedIds: Set<string>;
  skipBulkConfirm: boolean;
  setSkipBulkConfirm: (skip: boolean) => void;
  sessionToDelete: ChatbotSessionListItem | null;
  setSessionToDelete: (session: ChatbotSessionListItem | null) => void;
  isBulkDeleteConfirmOpen: boolean;
  setIsBulkDeleteConfirmOpen: (open: boolean) => void;
  loading: boolean;
  isFetching: boolean;
  error: string | null;
  bulkDeleting: boolean;
  selectingAll: boolean;
  clearSelection: () => void;
  selectAllVisible: () => void;
  selectAllMatching: () => Promise<void>;
  toggleSelected: (id: string) => void;
  startEditing: (session: ChatbotSessionListItem) => void;
  cancelEditing: () => void;
  saveTitle: (sessionId: string) => Promise<void>;
  deleteSession: (session: ChatbotSessionListItem) => Promise<void>;
  handleBulkDeleteClick: () => void;
  bulkDelete: () => Promise<void>;
  refetch: () => void;
}

export function useChatbotSessionsState(): UseChatbotSessionsStateReturn {
  const sessionsQuery = useChatbotSessions();
  const sessions = sessionsQuery.data ?? [];

  const filtering = useChatbotSessionsFiltering(sessions);
  const selection = useChatbotSessionsSelection(filtering.searchQuery, filtering.filteredSessions);
  const editing = useChatbotSessionsEditing();

  const deletion = useChatbotSessionDeletion({
    editingId: editing.editingId,
    cancelEditing: editing.cancelEditing,
    setSelectedIds: selection.setSelectedIds,
  });

  const bulk = useChatbotBulkDeletion({
    selectedIds: selection.selectedIds,
    clearSelection: selection.clearSelection,
  });

  const { isLoading: loading, isFetching, isError, error: sessionsError } = sessionsQuery;

  return {
    sessions, ...filtering, ...selection, ...editing, ...deletion, ...bulk,
    loading, isFetching, error: isError ? sessionsError.message : null,
    handleBulkDeleteClick: () => bulk.handleBulkDeleteClick(bulk.bulkDelete),
    refetch: () => { void sessionsQuery.refetch(); },
  };
}
