'use client';

import { useState, useCallback } from 'react';

import type { ChatbotSessionListItem } from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  useUpdateSessionTitle,
} from '../hooks';

export function useChatbotSessionsEditing(): {
  editingId: string | null;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  draftTitle: string;
  setDraftTitle: React.Dispatch<React.SetStateAction<string>>;
  startEditing: (session: ChatbotSessionListItem) => void;
  cancelEditing: () => void;
  saveTitle: (sessionId: string) => Promise<void>;
} {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>('');
  const updateTitleMutation = useUpdateSessionTitle();

  const startEditing = useCallback((session: ChatbotSessionListItem) => {
    setEditingId(session.id);
    setDraftTitle(session.title ?? '');
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
    setDraftTitle('');
  }, []);

  const saveTitle = useCallback(
    async (sessionId: string): Promise<void> => {
      try {
        await updateTitleMutation.mutateAsync({
          sessionId,
          title: draftTitle,
        });
        setEditingId(null);
        setDraftTitle('');
        toast('Session title updated', { variant: 'success' });
      } catch (err: unknown) {
        logClientError(err);
        toast(err instanceof Error ? err.message : 'Failed to update session title.', {
          variant: 'error',
        });
      }
    },
    [draftTitle, updateTitleMutation, toast]
  );

  return {
    editingId,
    setEditingId,
    draftTitle,
    setDraftTitle,
    startEditing,
    cancelEditing,
    saveTitle,
  };
}
