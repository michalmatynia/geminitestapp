'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect } from 'react';

import type {
  ChatbotSessionDto as ChatSession,
  ChatbotSessionListItem,
  ChatbotSessionsData as UseChatbotSessionManagerReturn,
} from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useCreateChatbotSession, useDeleteChatbotSession } from './useChatbotMutations';
import { useChatbotSessions } from './useChatbotQueries';

export type { UseChatbotSessionManagerReturn };

export function useChatbotSessionManager(): UseChatbotSessionManagerReturn {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const sessionsQuery = useChatbotSessions();
  const createMutation = useCreateChatbotSession();
  const deleteMutation = useDeleteChatbotSession();

  const sessions = sessionsQuery.data ?? ([] as ChatbotSessionListItem[]);
  const sessionsLoading = sessionsQuery.isLoading;

  const sessionId = useMemo((): string | null => {
    return currentSessionId || searchParams.get('session') || null;
  }, [currentSessionId, searchParams]);

  // If no current session and sessions exist, select the first one
  useEffect(() => {
    if (!currentSessionId && sessions.length > 0 && sessions[0]) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  const createNewSession = useCallback(
    async (initialSettings?: Partial<ChatSession['settings']>): Promise<void> => {
      try {
        const data = await createMutation.mutateAsync({
          title: `Chat ${new Date().toLocaleString()}`,
          settings: initialSettings as ChatSession['settings'],
        });
        setCurrentSessionId(data.sessionId);
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useChatbotSessionManager.createNewSession',
        });
        toast('Failed to create new chat session', { variant: 'error' });
      }
    },
    [createMutation, toast]
  );

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(id);
        if (currentSessionId === id) {
          setCurrentSessionId(sessions.find((s) => s.id !== id)?.id || null);
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useChatbotSessionManager.deleteSession',
          sessionId: id,
        });
        toast('Failed to delete chat session', { variant: 'error' });
      }
    },
    [currentSessionId, sessions, deleteMutation, toast]
  );

  return {
    sessions,
    currentSessionId,
    sessionId,
    sessionsLoading,
    createNewSession,
    deleteSession,
    selectSession: setCurrentSessionId,
  };
}
