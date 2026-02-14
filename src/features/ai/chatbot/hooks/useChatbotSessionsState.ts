'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';

import { useToast } from '@/shared/ui';

import * as chatbotApi from '../api';
import {
  useChatbotSessions,
  useDeleteChatbotSession,
  useDeleteChatbotSessions,
  useUpdateSessionTitle,
} from '../hooks';

import type { ChatbotSessionListItem } from '../types';

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
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [skipBulkConfirm, setSkipBulkConfirm] = useState<boolean>(false);
  const [sessionToDelete, setSessionToDelete] = useState<ChatbotSessionListItem | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const sessionsQuery = useChatbotSessions();
  const updateTitleMutation = useUpdateSessionTitle();
  const deleteSessionMutation = useDeleteChatbotSession();
  const deleteSessionsMutation = useDeleteChatbotSessions();
  const selectAllMatchingMutation = useMutation({
    mutationFn: chatbotApi.fetchChatbotSessionIds,
  });

  const sessions = sessionsQuery.data ?? [];
  const loading = sessionsQuery.isLoading;
  const isFetching = sessionsQuery.isFetching;
  const error = sessionsQuery.isError ? sessionsQuery.error.message : null;
  const bulkDeleting = deleteSessionsMutation.isPending;
  const selectingAll = selectAllMatchingMutation.isPending;

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);
  
  const filteredSessions = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return sessions;
    return sessions.filter((session) => {
      const title = session.title?.toLowerCase() || '';
      return title.includes(term) || session.id.toLowerCase().includes(term);
    });
  }, [searchQuery, sessions]);

  const selectAllVisible = useCallback(() => 
    setSelectedIds(new Set(filteredSessions.map((s) => s.id))), 
  [filteredSessions]
  );

  const selectAllMatching = useCallback(async () => {
    if (selectingAll) return;
    try {
      const term = searchQuery.trim();
      const ids = await selectAllMatchingMutation.mutateAsync(term || undefined);
      setSelectedIds(new Set(ids));
      toast(ids.length ? `Selected ${ids.length} sessions` : 'No matching sessions found');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to select sessions.';
      toast(message, { variant: 'error' });
    }
  }, [searchQuery, selectingAll, selectAllMatchingMutation, toast]);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const startEditing = useCallback((session: ChatbotSessionListItem) => {
    setEditingId(session.id);
    setDraftTitle(session.title || '');
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setDraftTitle('');
  }, []);

  const saveTitle = async (sessionId: string) => {
    try {
      await updateTitleMutation.mutateAsync({
        sessionId,
        title: draftTitle,
      });
      cancelEditing();
      toast('Session title updated', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update session title.';
      toast(message, { variant: 'error' });
    }
  };

  const deleteSession = async (session: ChatbotSessionListItem) => {
    setDeletingId(session.id);
    try {
      await deleteSessionMutation.mutateAsync(session.id);
      if (editingId === session.id) {
        cancelEditing();
      }
      setSelectedIds((prev) => {
        if (!prev.has(session.id)) return prev;
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
      toast('Session deleted', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete session.';
      toast(message, { variant: 'error' });
    } finally {
      setDeletingId(null);
      setSessionToDelete(null);
    }
  };

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (skipBulkConfirm) {
      void bulkDelete();
    } else {
      setIsBulkDeleteConfirmOpen(true);
    }
  }, [selectedIds.size, skipBulkConfirm]);

  const bulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    try {
      await deleteSessionsMutation.mutateAsync(idsToDelete);
      clearSelection();
      toast('Selected sessions deleted', { variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete sessions.';
      toast(message, { variant: 'error' });
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  return {
    sessions,
    filteredSessions,
    searchQuery,
    setSearchQuery,
    editingId,
    draftTitle,
    setDraftTitle,
    deletingId,
    selectedIds,
    skipBulkConfirm,
    setSkipBulkConfirm,
    sessionToDelete,
    setSessionToDelete,
    isBulkDeleteConfirmOpen,
    setIsBulkDeleteConfirmOpen,
    loading,
    isFetching,
    error,
    bulkDeleting,
    selectingAll,
    clearSelection,
    selectAllVisible,
    selectAllMatching,
    toggleSelected,
    startEditing,
    cancelEditing,
    saveTitle,
    deleteSession,
    handleBulkDeleteClick,
    bulkDelete,
    refetch: () => void sessionsQuery.refetch(),
  };
}
