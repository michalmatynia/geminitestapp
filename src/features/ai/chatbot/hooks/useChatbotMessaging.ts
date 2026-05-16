'use client';

import { useCallback } from 'react';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import * as chatbotApi from '../api';

interface ChatbotMessagingParams {
  input: string; setInput: (input: string) => void;
  isSending: boolean; setIsSending: (sending: boolean) => void;
  messages: ChatMessage[]; setMessages: (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;
  sessionId: string | null; contextRegistry: ContextRegistryConsumerEnvelope | null;
}

interface ChatbotMessagingResult {
  sendMessage: () => Promise<void>;
}

function createMsg(params: { id: string; sid: string; role: 'user' | 'assistant'; content: string; mood?: string | null }): ChatMessage {
  const { id, sid, role, content, mood } = params;
  return {
    id, sessionId: sid, role, content, timestamp: new Date().toISOString(),
    ...(mood !== null && mood !== undefined && mood !== '' ? { metadata: { suggestedPersonaMoodId: mood } } : {}),
  };
}

export function useChatbotMessaging(params: ChatbotMessagingParams): ChatbotMessagingResult {
  const { toast } = useToast();
  const { input, isSending, sessionId, setMessages, setInput, setIsSending, messages, contextRegistry } = params;

  const handleResponse = useCallback((data: { message?: string | null; suggestedMoodId?: string | null }): void => {
    const msg = data.message;
    if (typeof msg === 'string' && msg !== '') {
      const sid = sessionId ?? '';
      setMessages((prev) => [...prev, createMsg({ id: `msg_${Date.now()}_${Math.random()}`, sid, role: 'assistant', content: msg, mood: data.suggestedMoodId })]);
    }
  }, [sessionId, setMessages]);

  const sendMessage = useCallback(async (): Promise<void> => {
    const trimmed = input.trim();
    if (trimmed === '' || isSending) return;
    const sid = sessionId ?? '';
    const userMsg = createMsg({ id: `msg_${Date.now()}_${Math.random()}`, sid, role: 'user', content: trimmed });
    setMessages((prev) => [...prev, userMsg]);
    setInput(''); setIsSending(true);
    try {
      const data = await chatbotApi.sendChatbotMessage({
        messages: [...messages, userMsg], sessionId, ...(contextRegistry !== null ? { contextRegistry } : {}),
      });
      handleResponse(data);
    } catch (error: unknown) {
      logClientCatch(error, { source: 'useChatbotMessaging.sendMessage', sessionId });
      toast('Failed to send message', { variant: 'error' });
    } finally { setIsSending(false); }
  }, [input, isSending, sessionId, setMessages, setInput, setIsSending, messages, contextRegistry, toast, handleResponse]);

  return { sendMessage };
}
