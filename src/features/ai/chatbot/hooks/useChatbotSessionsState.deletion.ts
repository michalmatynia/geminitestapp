'use client';

import { useState, useCallback } from 'react';

import type { ChatbotSessionListItem } from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  useDeleteChatbotSession,
  useDeleteChatbotSessions,
} from '../hooks';

export function useChatbotSessionDeletion({
  editingId,
  cancelEditing,
  setSelectedIds,
}: {
  editingId: string | null;
  cancelEditing: () => void;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}): {
  deletingId: string | null;
  setDeletingId: React.Dispatch<React.SetStateAction<string | null>>;
  sessionToDelete: ChatbotSessionListItem | null;
  setSessionToDelete: React.Dispatch<React.SetStateAction<ChatbotSessionListItem | null>>;
  deleteSession: (session: ChatbotSessionListItem) => Promise<void>;
} {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sessionToDelete, setSessionToDelete] = useState<ChatbotSessionListItem | null>(null);
  const deleteSessionMutation = useDeleteChatbotSession();

  const deleteSession = useCallback(
    async (session: ChatbotSessionListItem): Promise<void> => {
      setDeletingId(session.id);
      try {
        await deleteSessionMutation.mutateAsync(session.id);
        if (editingId === session.id) cancelEditing();
        setSelectedIds((prev) => {
          if (!prev.has(session.id)) return prev;
          const next = new Set(prev);
          next.delete(session.id);
          return next;
        });
        toast('Session deleted', { variant: 'success' });
      } catch (err: unknown) {
        logClientError(err);
        toast(err instanceof Error ? err.message : 'Failed to delete session.', {
          variant: 'error',
        });
      } finally {
        setDeletingId(null);
        setSessionToDelete(null);
      }
    },
    [editingId, cancelEditing, deleteSessionMutation, setSelectedIds, toast]
  );

  return { deletingId, setDeletingId, sessionToDelete, setSessionToDelete, deleteSession };
}

export function useChatbotBulkDeletion({
  selectedIds,
  clearSelection,
}: {
  selectedIds: Set<string>;
  clearSelection: () => void;
}): {
  skipBulkConfirm: boolean;
  setSkipBulkConfirm: React.Dispatch<React.SetStateAction<boolean>>;
  isBulkDeleteConfirmOpen: boolean;
  setIsBulkDeleteConfirmOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleBulkDeleteClick: (bulkDelete: () => Promise<void>) => void;
  bulkDelete: () => Promise<void>;
  bulkDeleting: boolean;
} {
  const { toast } = useToast();
  const [skipBulkConfirm, setSkipBulkConfirm] = useState<boolean>(false);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const deleteSessionsMutation = useDeleteChatbotSessions();

  const bulkDelete = useCallback(async (): Promise<void> => {
    const idsToDelete = Array.from(selectedIds);
    try {
      await deleteSessionsMutation.mutateAsync(idsToDelete);
      clearSelection();
      toast('Selected sessions deleted', { variant: 'success' });
    } catch (err: unknown) {
      logClientError(err);
      toast(err instanceof Error ? err.message : 'Failed to delete sessions.', {
        variant: 'error',
      });
    } finally {
      setIsBulkDeleteConfirmOpen(false);
    }
  }, [selectedIds, deleteSessionsMutation, clearSelection, toast]);

  const handleBulkDeleteClick = useCallback((actualBulkDelete: () => Promise<void>) => {
    if (selectedIds.size === 0) return;
    if (skipBulkConfirm) {
      void actualBulkDelete();
    } else {
      setIsBulkDeleteConfirmOpen(true);
    }
  }, [selectedIds.size, skipBulkConfirm]);

  return {
    skipBulkConfirm,
    setSkipBulkConfirm,
    isBulkDeleteConfirmOpen,
    setIsBulkDeleteConfirmOpen,
    handleBulkDeleteClick,
    bulkDelete,
    bulkDeleting: deleteSessionsMutation.isPending,
  };
}
