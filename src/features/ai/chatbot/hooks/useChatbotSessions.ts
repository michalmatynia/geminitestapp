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

  const fetchSessions = useCallback(async (): Promise<void> => {
    setSessionsLoading(true);
    try {
      const res = await chatbotApi.fetchChatbotSessions();
      setSessions(res.sessions);
      if (currentSessionId === null && res.sessions.length > 0) {
        const item = res.sessions[0];
        if (item !== undefined) setCurrentSessionId(item.id);
      }
    } catch (e: unknown) { logClientCatch(e, { source: 'useChatbotSessions.fetchSessions' }); toast('Failed to load sessions', { variant: 'error' });
    } finally { setSessionsLoading(false); }
  }, [currentSessionId, setCurrentSessionId, setSessions, setSessionsLoading, toast]);

  const loadSessionMessages = useCallback(async (id: string): Promise<void> => {
    try {
      const s = await chatbotApi.fetchChatbotSession(id);
      setMessages(s.messages);
    } catch (e: unknown) { logClientCatch(e, { source: 'useChatbotSessions.loadSessionMessages', sessionId: id }); }
  }, [setMessages]);

  const createNewSession = useCallback(async (): Promise<void> => {
    try {
      const d = await chatbotApi.createChatbotSession({ title: `Chat ${new Date().toLocaleString()}`, settings: currentSettings });
      await fetchSessions(); setCurrentSessionId(d.sessionId); setMessages([]);
    } catch (e: unknown) { logClientCatch(e, { source: 'useChatbotSessions.createNewSession' }); toast('Failed to create session', { variant: 'error' }); }
  }, [currentSettings, fetchSessions, setCurrentSessionId, setMessages, toast]);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    try {
      await chatbotApi.deleteChatbotSession(id); await fetchSessions();
      if (currentSessionId === id) {
        const f = sessions[0];
        setCurrentSessionId(f !== undefined ? f.id : null);
      }
    } catch (e: unknown) { logClientCatch(e, { source: 'useChatbotSessions.deleteSession', sessionId: id }); toast('Failed to delete session', { variant: 'error' }); }
  }, [currentSessionId, sessions, fetchSessions, setCurrentSessionId, toast]);

  return { sessionId, fetchSessions, loadSessionMessages, createNewSession, deleteSession };
}
