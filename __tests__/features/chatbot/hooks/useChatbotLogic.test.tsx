/**
 * @vitest-environment jsdom
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import * as chatbotApi from '@/features/ai/chatbot/api';
import { useChatbotLogic } from '@/features/ai/chatbot/hooks/useChatbotLogic';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { ToastProvider } from '@/shared/ui/toast';

// Mock the APIs
vi.mock('@/features/ai/chatbot/api', () => ({
  fetchChatbotSessions: vi.fn(),
  fetchChatbotSession: vi.fn(),
  createChatbotSession: vi.fn(),
  deleteChatbotSession: vi.fn(),
  fetchOllamaModels: vi.fn(),
  fetchChatbotSettings: vi.fn(),
  saveChatbotSettings: vi.fn(),
  sendChatbotMessage: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock useAgentCreatorSettings
vi.mock('@/features/ai/agentcreator', () => ({
  useAgentCreatorSettings: vi.fn(() => ({
    agentModeEnabled: false,
    setAgentModeEnabled: vi.fn(),
    agentBrowser: 'chromium',
    setAgentBrowser: vi.fn(),
    agentMaxSteps: 12,
    setAgentMaxSteps: vi.fn(),
    agentRunHeadless: true,
    setAgentRunHeadless: vi.fn(),
    agentIgnoreRobotsTxt: false,
    setAgentIgnoreRobotsTxt: vi.fn(),
    agentRequireHumanApproval: false,
    setAgentRequireHumanApproval: vi.fn(),
  })),
  DEFAULT_AGENT_SETTINGS: {
    agentBrowser: 'chromium',
    runHeadless: true,
    ignoreRobotsTxt: false,
    requireHumanApproval: false,
    memoryValidationModel: '',
    plannerModel: '',
    selfCheckModel: '',
    extractionValidationModel: '',
    loopGuardModel: '',
    approvalGateModel: '',
    memorySummarizationModel: '',
    selectorInferenceModel: '',
    outputNormalizationModel: '',
    maxSteps: 12,
    maxStepAttempts: 2,
    maxReplanCalls: 2,
    replanEverySteps: 2,
    maxSelfChecks: 4,
    loopGuardThreshold: 2,
    loopBackoffBaseMs: 2000,
    loopBackoffMaxMs: 12000,
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <SettingsStoreProvider>
        <ToastProvider>{children}</ToastProvider>
      </SettingsStoreProvider>
    </QueryClientProvider>
  );
};

describe('useChatbotLogic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatbotApi.fetchChatbotSessions).mockResolvedValue({ sessions: [] });
    vi.mocked(chatbotApi.fetchOllamaModels).mockResolvedValue(['model-1', 'model-2']);
    vi.mocked(chatbotApi.fetchChatbotSettings).mockResolvedValue({ settings: {} });
  });

  it('initializes with default values', async () => {
    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    await waitFor(() => {
      expect(chatbotApi.fetchChatbotSessions).toHaveBeenCalledTimes(1);
      expect(chatbotApi.fetchChatbotSettings).toHaveBeenCalledTimes(1);
      expect(result.current.sessionsLoading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe('');
    expect(result.current.isSending).toBe(false);
  });

  it('stores the suggested persona mood on assistant message metadata', async () => {
    vi.mocked(chatbotApi.sendChatbotMessage).mockResolvedValue({
      message: 'Persona reply',
      suggestedMoodId: 'encouraging',
    });

    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    await waitFor(() => {
      expect(chatbotApi.fetchChatbotSessions).toHaveBeenCalledTimes(1);
      expect(chatbotApi.fetchChatbotSettings).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.setInput('Hello persona');
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[1]).toMatchObject({
      role: 'assistant',
      content: 'Persona reply',
      metadata: {
        suggestedPersonaMoodId: 'encouraging',
      },
    });
  });
});
