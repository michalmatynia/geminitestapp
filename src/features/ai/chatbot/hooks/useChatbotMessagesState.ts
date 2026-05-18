'use client';

import { useState, useEffect, useCallback } from 'react';

import type {
  ChatMessageDto as ChatMessage,
  ChatbotMessagesData as UseChatbotMessagesStateReturn,
} from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useSendChatMessage } from './useChatbotMutations';
import { useChatbotSession } from './useChatbotQueries';

export type { UseChatbotMessagesStateReturn };

function useChatbotMessageSender({
  sessionId,
  messages,
  setMessages,
  input,
  setInput,
  isSending,
  setIsSending,
}: {
  sessionId: string | null;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
}): { sendMessage: () => Promise<void> } {
  const { toast } = useToast();
  const sendMutation = useSendChatMessage();

  const sendMessage = useCallback(async (): Promise<void> => {
    if (input.trim() === '' || isSending) return;

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
      const data = await sendMutation.mutateAsync({ messages: currentMessages, sessionId });

      if (typeof data.message === 'string' && data.message !== '') {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          sessionId: sessionId ?? '',
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev): ChatMessage[] => [...prev, assistantMessage]);
      }
    } catch (error: unknown) {
      logClientCatch(error, { source: 'useChatbotMessagesState.sendMessage', sessionId });
      toast('Failed to send message', { variant: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, sessionId, sendMutation, toast, setMessages, setInput, setIsSending]);

  return { sendMessage };
}

export function useChatbotMessagesState(sessionId: string | null): UseChatbotMessagesStateReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);

  const sessionQuery = useChatbotSession(sessionId);

  // Load messages when session changes
  useEffect((): void => {
    if (sessionQuery.data?.messages !== undefined) {
      setMessages(sessionQuery.data.messages);
    } else if (typeof sessionId !== 'string' || sessionId === '') {
      setMessages([]);
    }
  }, [sessionQuery.data, sessionId]);

  const { sendMessage } = useChatbotMessageSender({
    sessionId,
    messages,
    setMessages,
    input,
    setInput,
    isSending,
    setIsSending,
  });

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
