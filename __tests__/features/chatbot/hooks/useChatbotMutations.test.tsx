import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@/__tests__/test-utils';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as chatbotApi from '@/features/ai/chatbot/api';
import {
  useCreateChatbotSession,
  useUpdateSessionTitle,
  useDeleteChatbotSession,
  useSaveChatbotSettings,
} from '@/features/ai/chatbot/hooks/useChatbotMutations';
import type { ChatbotSessionListItem, CreateChatbotSettingsDto } from '@/shared/contracts/chatbot';

vi.mock('@/features/ai/chatbot/api', () => ({
  chatbotQueryKeys: {
    all: ['ai', 'chatbot'],
    sessions: () => ['chatbot', 'sessions'],
    session: (id: string) => ['chatbot', 'session', id],
    settings: (key?: string) => ['chatbot', 'settings', key],
    mutations: () => ['ai', 'chatbot', 'mutation'],
    mutation: (name: string) => ['ai', 'chatbot', 'mutation', name],
  },
  createChatbotSession: vi.fn(),
  updateChatbotSessionTitle: vi.fn(),
  deleteChatbotSession: vi.fn(),
  saveChatbotSettings: vi.fn(),
}));

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
);

describe('Chatbot Mutation Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCreateChatbotSession', () => {
    it('calls createChatbotSession and returns session ID', async () => {
      vi.mocked(chatbotApi.createChatbotSession).mockResolvedValue({ sessionId: 'new-s' });

      const { result } = renderHook(() => useCreateChatbotSession(), { wrapper });

      result.current.mutate({ title: 'New' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chatbotApi.createChatbotSession).toHaveBeenCalledWith(
        { title: 'New' },
        expect.objectContaining({
          queryClient: expect.any(QueryClient),
        })
      );
      expect(result.current.data).toEqual({ sessionId: 'new-s' });
    });
  });
  describe('useUpdateSessionTitle', () => {
    it('calls updateChatbotSessionTitle', async () => {
      vi.mocked(chatbotApi.updateChatbotSessionTitle).mockResolvedValue({
        id: 's1',
        title: 'Updated',
      } as unknown as ChatbotSessionListItem);

      const { result } = renderHook(() => useUpdateSessionTitle(), { wrapper });

      result.current.mutate({ sessionId: 's1', title: 'Updated' });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chatbotApi.updateChatbotSessionTitle).toHaveBeenCalledWith('s1', 'Updated');
    });
  });

  describe('useDeleteChatbotSession', () => {
    it('calls deleteChatbotSession', async () => {
      vi.mocked(chatbotApi.deleteChatbotSession).mockResolvedValue(undefined);

      const { result } = renderHook(() => useDeleteChatbotSession(), { wrapper });

      result.current.mutate('s1');

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chatbotApi.deleteChatbotSession).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({
          queryClient: expect.any(QueryClient),
        })
      );
    });
  });
  describe('useSaveChatbotSettings', () => {
    it('calls saveChatbotSettings', async () => {
      vi.mocked(chatbotApi.saveChatbotSettings).mockResolvedValue({
        settings: { settings: { model: 'm1' } },
      } as any);

      const { result } = renderHook(() => useSaveChatbotSettings(), { wrapper });

      result.current.mutate({
        key: 'general',
        settings: { model: 'm1' } as unknown as CreateChatbotSettingsDto,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(chatbotApi.saveChatbotSettings).toHaveBeenCalledWith('general', { model: 'm1' });
    });
  });
});
