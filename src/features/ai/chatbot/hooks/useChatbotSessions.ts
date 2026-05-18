'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { ChatMessageDto as ChatMessage, CreateChatbotSettingsDto as ChatbotSettingsPayload, ChatbotSessionDto as ChatSession } from '@/shared/contracts/chatbot';
import * as chatbotApi from '../api';

interface ChatbotSessionsParams {
  currentSessionId: string | null; setCurrentSessionId: (id: string | null) => void;
  setSessions: (sessions: ChatSession[]) => void; setSessionsLoading: (loading: boolean) => void;
  setMessages: (messages: ChatMessage[]) => void; currentSettings: ChatbotSettingsPayload;
  sessions: ChatSession[];
}

interface ChatbotSessionsResult {
  sessionId: string | null; fetchSessions: () => Promise<void>; loadSessionMessages: (id: string) => Promise<void>;
  createNewSession: () => Promise<void>; deleteSession: (id: string) => Promise<void>;
}

export function useChatbotSessions(params: ChatbotSessionsParams): ChatbotSessionsResult {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { currentSessionId, setCurrentSessionId, setSessions, setSessionsLoading, setMessages, currentSettings, sessions } = params;
  const sessionId = currentSessionId ?? searchParams.get('session') ?? null;

  const initializeFirstSession = (fetchedSessions: ChatSession[]): void => {
    if (currentSessionId === null && fetchedSessions.length > 0) {
      const item = fetchedSessions[0];
      if (item !== undefined) setCurrentSessionId(item.id);
    }
  };

  const handleSessionsFetchResult = useCallback((fetchedSessions: ChatSession[]): void => {
    setSessions(fetchedSessions);
    initializeFirstSession(fetchedSessions);
  }, [setSessions, initializeFirstSession]);

  const performSessionFetch = async (): Promise<ChatSession[]> => {
    const res = await chatbotApi.fetchChatbotSessions();
    return res.sessions ?? [];
  };

  const fetchSessions = useCallback(async (): Promise<void> => {
    setSessionsLoading(true);
    try {
      const fetchedSessions = await performSessionFetch();
      handleSessionsFetchResult(fetchedSessions);
    } catch (e: unknown) {
      logClientCatch(e, { source: 'useChatbotSessions.fetchSessions' });
      toast('Failed to load sessions', { variant: 'error' });
    } finally {
      setSessionsLoading(false);
    }
  }, [handleSessionsFetchResult, setSessionsLoading, toast]);

  const performMessagesFetch = async (id: string): Promise<ChatMessage[]> => {
    const s = await chatbotApi.fetchChatbotSession(id);
    return s.messages ?? [];
  };

  const loadSessionMessages = useCallback(async (id: string): Promise<void> => {
    try {
      const messages = await performMessagesFetch(id);
      setMessages(messages);
    } catch (e: unknown) {
      logClientCatch(e, { source: 'useChatbotSessions.loadSessionMessages', sessionId: id });
    }
  }, [setMessages]);

  const performSessionCreation = async (): Promise<void> => {
    const d = await chatbotApi.createChatbotSession({
      title: `Chat ${new Date().toLocaleString()}`,
      settings: currentSettings,
    });
    await fetchSessions();
    setCurrentSessionId(d.sessionId);
    setMessages([]);
  };

  const createNewSession = useCallback(async (): Promise<void> => {
    try {
      await performSessionCreation();
    } catch (e: unknown) {
      logClientCatch(e, { source: 'useChatbotSessions.createNewSession' });
      toast('Failed to create session', { variant: 'error' });
    }
  }, [performSessionCreation, toast]);

  const handlePostDeletion = (id: string): void => {
    if (currentSessionId === id) {
      const f = sessions[0];
      setCurrentSessionId(f !== undefined ? f.id : null);
    }
  };

  const performSessionDeletion = async (id: string): Promise<void> => {
    await chatbotApi.deleteChatbotSession(id);
    await fetchSessions();
    handlePostDeletion(id);
  };

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    try {
      await performSessionDeletion(id);
    } catch (e: unknown) {
      logClientCatch(e, { source: 'useChatbotSessions.deleteSession', sessionId: id });
      toast('Failed to delete session', { variant: 'error' });
    }
  }, [performSessionDeletion, toast]);

  return { sessionId, fetchSessions, loadSessionMessages, createNewSession, deleteSession };
}
