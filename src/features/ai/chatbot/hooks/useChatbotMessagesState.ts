'use client';

import { useState, useEffect, useCallback } from 'react';

import type {
  ChatMessageDto as ChatMessage,
  ChatbotMessagesData as UseChatbotMessagesStateReturn,
} from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useSendChatMessage } from './useChatbotMutations';
import { useChatbotSession } from './useChatbotQueries';

export type { UseChatbotMessagesStateReturn };

export function useChatbotMessagesState(sessionId: string | null): UseChatbotMessagesStateReturn {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  const sessionQuery = useChatbotSession(sessionId);
  const sendMutation = useSendChatMessage();

  // Load messages when session changes
  useEffect((): void => {
    if (sessionQuery.data?.messages) {
      setMessages(sessionQuery.data.messages);
    } else if (!sessionId) {
      setMessages([]);
    }
  }, [sessionQuery.data, sessionId]);

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      sessionId: sessionId ?? '',
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsSending(true);

    try {
      const data = await sendMutation.mutateAsync({
        messages: currentMessages,
        sessionId,
      });

      if (data.message) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          sessionId: sessionId ?? '',
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev: ChatMessage[]): ChatMessage[] => [...prev, assistantMessage]);
      }
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'useChatbotMessagesState.sendMessage', sessionId },
      });
      toast('Failed to send message', { variant: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, sessionId, sendMutation, toast]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    sendMessage,
    attachments,
    setAttachments,
    isSending,
    setIsSending,
  };
}
