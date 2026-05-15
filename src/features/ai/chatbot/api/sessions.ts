/**
 * Chatbot Session API Client
 * 
 * Provides an interface for managing chatbot sessions (CRUD operations) and 
 * persisting session messages.
 * 
 * Features:
 * - Session Discovery: Methods to fetch all sessions or specific session identifiers.
 * - Session Management: CRUD support for creating sessions, updating titles, 
 *   and batch deletion of outdated or unused threads.
 * - Message Persistence: Provides a direct channel to persist messages into existing threads.
 * 
 * Usage:
 * Use these methods in the frontend to sync the local session view with the 
 * chatbot backend. All responses are validated against shared Zod schemas 
 * to ensure integrity.
 */

import {
  chatbotSessionCreateResponseSchema,
  chatbotSessionDeleteResponseSchema,
  chatbotSessionIdsResponseSchema,
  chatbotSessionResponseSchema,
  chatbotSessionsResponseSchema,
  type ChatMessageDto as ChatMessage,
  type ChatbotSessionCreateResponse,
  type ChatbotSessionDeleteResponse,
  type ChatbotSessionDto as ChatSession,
  type ChatbotSessionListItem,
} from '@/shared/contracts/chatbot';

import { fetchWithTimeout, readErrorMessage, requestJson } from './client';
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

/**
 * Fetches chatbot sessions. Can be filtered by scope or query string.
 * 
 * @param params - Optional parameters to restrict results.
 * @returns Object containing optional arrays of sessions or IDs.
 * @throws AppError if the request fails, with specific context about the scope.
 */
export const fetchChatbotSessions = async <TSession = ChatSession>(params?: {
  scope?: 'ids';
  query?: string;
}): Promise<{ sessions?: TSession[]; ids?: string[] }> => {
  const searchParams = new URLSearchParams();
  if (params?.scope) searchParams.set('scope', params.scope);
  if (params?.query) searchParams.set('query', params.query);
  const query = searchParams.toString();
  const url = query ? `/api/chatbot/sessions?${query}` : '/api/chatbot/sessions';
  
  const data = await requestJson<unknown>(url, undefined, {
    fallbackMessage: 'Failed to load sessions.',
  });
  
  try {
    if (params?.scope === 'ids') {
      return chatbotSessionIdsResponseSchema.parse(data);
    }
    const parsed = chatbotSessionsResponseSchema.parse(data);
    return {
      ...(parsed.sessions ? { sessions: parsed.sessions as TSession[] } : {}),
    };
  } catch (error) {
    throw new AppError('Failed to parse response while fetching chatbot sessions.', {
      code: AppErrorCodes.validation,
      httpStatus: 502,
      cause: error,
      meta: { scope: params?.scope },
    });
  }
};

/** Retrieves session IDs matching an optional search query. */
export const fetchChatbotSessionIds = async (query?: string): Promise<string[]> => {
  const searchParams = new URLSearchParams({ scope: 'ids' });
  if (query) searchParams.set('query', query);
  const url = `/api/chatbot/sessions?${searchParams.toString()}`;
  const data = await requestJson<unknown>(url, undefined, {
    fallbackMessage: 'Failed to load session ids.',
  });
  try {
    return chatbotSessionIdsResponseSchema.parse(data).ids;
  } catch (error) {
    throw new AppError('Failed to parse session ID response.', {
        code: AppErrorCodes.validation,
        httpStatus: 502,
        cause: error,
    });
  }
};

/** Retrieves a single chatbot session by ID. */
export const fetchChatbotSession = async (sessionId: string): Promise<ChatSession> => {
  const data = await requestJson<unknown>(
    `/api/chatbot/sessions/${sessionId}`,
    undefined,
    { fallbackMessage: `Failed to fetch chatbot session: ${sessionId}` }
  );
  try {
      return chatbotSessionResponseSchema.parse(data).session;
  } catch (error) {
    throw new AppError(`Failed to parse response for session: ${sessionId}`, {
        code: AppErrorCodes.validation,
        httpStatus: 502,
        cause: error,
        meta: { sessionId },
    });
  }
};

/** Creates a new chatbot session. */
export const createChatbotSession = async (payload: {
  title?: string;
  settings?: ChatSession['settings'];
}): Promise<ChatbotSessionCreateResponse> => {
  const data = await requestJson<unknown>(
    '/api/chatbot/sessions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
    { fallbackMessage: 'Failed to create session.' }
  );
  try {
    return chatbotSessionCreateResponseSchema.parse(data);
  } catch (error) {
    throw new AppError('Failed to parse response while creating session.', {
        code: AppErrorCodes.validation,
        httpStatus: 502,
        cause: error,
    });
  }
};

/** Updates the title of an existing chatbot session. */
export const updateChatbotSessionTitle = async (
  sessionId: string,
  title: string
): Promise<ChatbotSessionListItem> => {
  const data = await requestJson<unknown>(
    '/api/chatbot/sessions',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, title }),
    },
    { fallbackMessage: `Failed to update title for session: ${sessionId}` }
  );
  try {
    return chatbotSessionResponseSchema.parse(data).session;
  } catch (error) {
    throw new AppError(`Failed to parse response for session title update: ${sessionId}`, {
        code: AppErrorCodes.validation,
        httpStatus: 502,
        cause: error,
        meta: { sessionId },
    });
  }
};

/** Deletes a specific chatbot session by ID. */
export const deleteChatbotSession = async (sessionId: string): Promise<ChatbotSessionDeleteResponse> => {
  const data = await requestJson<unknown>(
    '/api/chatbot/sessions',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    },
    { fallbackMessage: `Failed to delete session: ${sessionId}` }
  );
  try {
    return chatbotSessionDeleteResponseSchema.parse(data);
  } catch (error) {
    throw new AppError(`Failed to parse response for session deletion: ${sessionId}`, {
        code: AppErrorCodes.validation,
        httpStatus: 502,
        cause: error,
        meta: { sessionId },
    });
  }
};

/** Deletes multiple chatbot sessions in a batch. */
export const deleteChatbotSessions = async (
  sessionIds: string[]
): Promise<ChatbotSessionDeleteResponse> => {
  const data = await requestJson<unknown>(
    '/api/chatbot/sessions',
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds }),
    },
    { fallbackMessage: 'Failed to delete sessions.' }
  );
  try {
    return chatbotSessionDeleteResponseSchema.parse(data);
  } catch (error) {
    throw new AppError('Failed to parse response for batch session deletion.', {
        code: AppErrorCodes.validation,
        httpStatus: 502,
        cause: error,
    });
  }
};

/**
 * Persists a new message to a specific chat session thread.
 * 
 * @param sessionId - Target session ID.
 * @param role - Message role (user/assistant).
 * @param content - Message text content.
 * @throws AppError if persistence fails, including status-specific diagnostics.
 */
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
    const message = await readErrorMessage(res, `Failed to persist message for session: ${sessionId}`);
    throw new AppError(message, {
      code: AppErrorCodes.internal,
      httpStatus: res.status,
      meta: { sessionId, role, statusCode: res.status },
    });
  }
};
