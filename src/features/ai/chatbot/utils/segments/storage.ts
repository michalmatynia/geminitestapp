import { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export const safeLocalStorageGet = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const safeLocalStorageSet = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    logClientError(error);
  
    // ignore storage failures
  }
};

export const safeLocalStorageRemove = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    logClientError(error);
  
    // ignore storage failures
  }
};

export const readCachedMessages = (sessionId: string): ChatMessage[] => {
  try {
    const raw: string | null = window.localStorage.getItem(`chatbotSessionCache:${sessionId}`);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as unknown[]).filter(
      (message: unknown): message is ChatMessage =>
        !!message &&
        typeof message === 'object' &&
        'content' in message &&
        typeof (message as { content: unknown }).content === 'string'
    );
  } catch (error) {
    logClientError(error);
    return [];
  }
};

export const writeCachedMessages = (sessionId: string, messages: ChatMessage[]): void => {
  try {
    const safeMessages: ChatMessage[] = messages.filter(
      (message: ChatMessage): boolean =>
        message.role !== 'system' && message.content.trim().length > 0
    );
    window.localStorage.setItem(`chatbotSessionCache:${sessionId}`, JSON.stringify(safeMessages));
  } catch (error) {
    logClientError(error);
  
    // ignore cache failures
  }
};
