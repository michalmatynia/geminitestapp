'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useMemo, useCallback, useEffect } from 'react';

import type {
  ChatbotSessionDto as ChatSession,
  ChatbotSessionListItem,
  ChatbotSessionsData as UseChatbotSessionManagerReturn,
} from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useCreateChatbotSession, useDeleteChatbotSession } from './useChatbotMutations';
import { useChatbotSessions } from './useChatbotQueries';

export type { UseChatbotSessionManagerReturn };

function useChatbotSessionActions({
  sessions,
  currentSessionId,
  setCurrentSessionId,
}: {
  sessions: ChatbotSessionListItem[];
  currentSessionId: string | null;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
}): {
  createNewSession: (initialSettings?: Partial<ChatSession['settings']>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
} {
  const { toast } = useToast();
  const createMutation = useCreateChatbotSession();
  const deleteMutation = useDeleteChatbotSession();

  const createNewSession = useCallback(
    async (initialSettings?: Partial<ChatSession['settings']>): Promise<void> => {
      try {
        const data = await createMutation.mutateAsync({
          title: `Chat ${new Date().toLocaleString()}`,
          settings: initialSettings as ChatSession['settings'],
        });
        setCurrentSessionId(data.sessionId);
      } catch (error: unknown) {
        logClientCatch(error, { source: 'useChatbotSessionManager.createNewSession' });
        toast('Failed to create new chat session', { variant: 'error' });
      }
    },
    [createMutation, toast, setCurrentSessionId]
  );

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        await deleteMutation.mutateAsync(id);
        if (currentSessionId === id) {
          const nextSession = sessions.find((s) => s.id !== id);
          setCurrentSessionId(nextSession?.id ?? null);
        }
      } catch (error: unknown) {
        logClientCatch(error, { source: 'useChatbotSessionManager.deleteSession', sessionId: id });
        toast('Failed to delete chat session', { variant: 'error' });
      }
    },
    [currentSessionId, sessions, deleteMutation, toast, setCurrentSessionId]
  );

  return { createNewSession, deleteSession };
}

export function useChatbotSessionManager(): UseChatbotSessionManagerReturn {
  const searchParams = useSearchParams();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const sessionsQuery = useChatbotSessions();
  const sessions = sessionsQuery.data ?? [];
  const sessionsLoading = sessionsQuery.isLoading;

  const sessionId = useMemo((): string | null => {
    return currentSessionId ?? searchParams.get('session') ?? null;
  }, [currentSessionId, searchParams]);

  useEffect(() => {
    if (currentSessionId === null && sessions.length > 0 && sessions[0] !== undefined) {
      setCurrentSessionId(sessions[0].id);
    }
  }, [currentSessionId, sessions]);

  const { createNewSession, deleteSession } = useChatbotSessionActions({
    sessions,
    currentSessionId,
    setCurrentSessionId,
  });

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
