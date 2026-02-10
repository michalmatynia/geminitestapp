import type { ChatMessage, ChatSession } from '@/shared/types/domain/chatbot';

import { fetchWithTimeout, readErrorMessage, requestJson } from './client';

import type { ChatbotSessionListItem } from '../types';

export const fetchChatbotSessions = async <TSession = ChatSession>(params?: {
  scope?: 'ids';
  query?: string;
}): Promise<{ sessions?: TSession[]; ids?: string[] }> => {
  const searchParams = new URLSearchParams();
  if (params?.scope) searchParams.set('scope', params.scope);
  if (params?.query) searchParams.set('query', params.query);
  const query = searchParams.toString();
  const url = query ? `/api/chatbot/sessions?${query}` : '/api/chatbot/sessions';
  return requestJson<{ sessions?: TSession[]; ids?: string[] }>(url, undefined, {
    fallbackMessage: 'Failed to load sessions.',
  });
};

export const fetchChatbotSessionIds = async (query?: string): Promise<string[]> => {
  const searchParams = new URLSearchParams({ scope: 'ids' });
  if (query) searchParams.set('query', query);
  const url = `/api/chatbot/sessions?${searchParams.toString()}`;
  const data = await requestJson<{ ids?: string[] }>(url, undefined, {
    fallbackMessage: 'Failed to load session ids.',
  });
  return Array.isArray(data.ids) ? data.ids : [];
};

export const fetchChatbotSession = async (sessionId: string): Promise<ChatSession> => {
  const data = await requestJson<{ session: ChatSession }>(
    `/api/chatbot/sessions/${sessionId}`,
    undefined,
    { fallbackMessage: 'Failed to fetch session.' }
  );
  return data.session;
};

export const createChatbotSession = async (payload: {
  title?: string;
  settings?: ChatSession['settings'];
}): Promise<{ sessionId: string; session?: ChatSession }> =>
  requestJson<{ sessionId: string; session?: ChatSession }>(
    '/api/chatbot/sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { fallbackMessage: 'Failed to create session.' }
  );

export const updateChatbotSessionTitle = async (
  sessionId: string,
  title: string
): Promise<ChatbotSessionListItem> => {
  const data = await requestJson<{ session: ChatbotSessionListItem }>(
    '/api/chatbot/sessions',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, title }),
    },
    { fallbackMessage: 'Failed to update session title.' }
  );
  return data.session;
};

export const deleteChatbotSession = async (sessionId: string): Promise<void> => {
  await requestJson<{ success?: boolean }>(
    '/api/chatbot/sessions',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    },
    { fallbackMessage: 'Failed to delete session.' }
  );
};

export const deleteChatbotSessions = async (sessionIds: string[]): Promise<void> => {
  await requestJson<{ success?: boolean }>(
    '/api/chatbot/sessions',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds }),
    },
    { fallbackMessage: 'Failed to delete sessions.' }
  );
};

export const persistSessionMessage = async (
  sessionId: string,
  role: ChatMessage['role'],
  content: string
): Promise<void> => {
  const res = await fetchWithTimeout(
    `/api/chatbot/sessions/${sessionId}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, content }),
    },
    12000
  );
  if (!res.ok) {
    const message = await readErrorMessage(
      res,
      'Failed to persist session message.'
    );
    throw new Error(message);
  }
};
