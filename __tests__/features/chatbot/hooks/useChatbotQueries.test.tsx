import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as chatbotApi from '@/features/ai/chatbot/api';
import {
  useChatbotSessions,
  useChatbotSession,
  useChatbotSettings,
  useChatbotModels,
  useChatbotMemory,
} from '@/features/ai/chatbot/hooks/useChatbotQueries';
import type { ChatbotSessionDto as ChatSession } from '@/shared/contracts/chatbot';

vi.mock('@/features/ai/chatbot/api', () => ({
  chatbotQueryKeys: {
    sessions: () => ['chatbot', 'sessions'],
    session: (id: string) => ['chatbot', 'session', id],
    settings: (key?: string) => ['chatbot', 'settings', key],
    models: () => ['chatbot', 'models'],
  },
  fetchChatbotSessions: vi.fn(),
  fetchChatbotSession: vi.fn(),
  fetchChatbotSettings: vi.fn(),
  fetchChatbotModels: vi.fn(),
  fetchChatbotMemory: vi.fn(),
  fetchOllamaModels: vi.fn(),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

describe('Chatbot Queries Hooks', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    queryClient = createQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useChatbotSessions', () => {
    it('fetches and returns sessions', async () => {
      const mockSessions = [{ id: 's1', title: 'Session 1' }];
      vi.mocked(chatbotApi.fetchChatbotSessions).mockResolvedValue({ sessions: mockSessions });

      const { result } = renderHook(() => useChatbotSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSessions);
    });
  });

  describe('useChatbotSession', () => {
    it('fetches and returns a single session', async () => {
      const mockSession = { id: 's1', title: 'Session 1', messages: [] } as unknown as ChatSession;
      vi.mocked(chatbotApi.fetchChatbotSession).mockResolvedValue(mockSession);

      const { result } = renderHook(() => useChatbotSession('s1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSession);
    });
  });

  describe('useChatbotSettings', () => {
    it('fetches and returns settings', async () => {
      const mockSettings = {
        settings: {
          id: 'settings-1',
          key: 'general',
          settings: { model: 'gpt-4' },
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:00:00.000Z',
        },
      };
      vi.mocked(chatbotApi.fetchChatbotSettings).mockResolvedValue(mockSettings);

      const { result } = renderHook(() => useChatbotSettings('general'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSettings);
    });
  });

  describe('useChatbotMemory', () => {
    it('fetches and returns memory items', async () => {
      const mockItems = [
        {
          id: 'memory-1',
          sessionId: 'session-1',
          key: 'summary',
          value: 'Stored memory',
          createdAt: '2026-03-11T10:00:00.000Z',
          updatedAt: '2026-03-11T10:00:00.000Z',
        },
      ];
      vi.mocked(chatbotApi.fetchChatbotMemory).mockResolvedValue(mockItems);

      const { result } = renderHook(() => useChatbotMemory('sessionId=session-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockItems);
    });
  });

  describe('useChatbotModels', () => {
    it('fetches models from API', async () => {
      vi.mocked(chatbotApi.fetchChatbotModels).mockResolvedValue({ models: ['m1', 'm2'] });

      const { result } = renderHook(() => useChatbotModels({ enabled: true, staleTime: 0 }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(['m1', 'm2']);
    });
  });
});
