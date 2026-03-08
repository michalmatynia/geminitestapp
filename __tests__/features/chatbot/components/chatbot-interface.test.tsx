/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { ChatInterface } from '@/features/ai/chatbot/components/ChatInterface';
import {
  useChatbotMessages,
  useChatbotSessions,
  useChatbotSettings,
} from '@/features/ai/chatbot/context/ChatbotContext';
import { useAgentPersonas } from '@/features/ai/agentcreator/hooks/useAgentPersonas';

vi.mock('@/features/ai/chatbot/context/ChatbotContext', () => {
  const useChatbotMessagesMock = vi.fn();
  const useChatbotSessionsMock = vi.fn();
  const useChatbotSettingsMock = vi.fn();
  return {
    useChatbotMessages: useChatbotMessagesMock,
    useChatbotSessions: useChatbotSessionsMock,
    useChatbotSettings: useChatbotSettingsMock,
  };
});

vi.mock('@/features/ai/agentcreator/hooks/useAgentPersonas', () => ({
  useAgentPersonas: vi.fn(),
}));

describe('ChatInterface', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    vi.clearAllMocks();
    vi.mocked(useChatbotSessions).mockReturnValue({
      sessions: [],
      currentSessionId: null,
      sessionsLoading: false,
      createNewSession: vi.fn(),
      deleteSession: vi.fn(),
      selectSession: vi.fn(),
    });
    vi.mocked(useChatbotSettings).mockReturnValue({
      personaId: null,
      model: 'default',
      webSearchEnabled: false,
      useGlobalContext: false,
      useLocalContext: false,
      agentModeEnabled: false,
      searchProvider: 'serpapi',
      playwrightPersonaId: null,
      agentBrowser: 'chromium',
      agentRunHeadless: true,
      agentIgnoreRobotsTxt: false,
      agentRequireHumanApproval: false,
      agentMemoryValidationModel: null,
      agentPlannerModel: null,
      agentSelfCheckModel: null,
      agentExtractionValidationModel: null,
      agentToolRouterModel: null,
      agentLoopGuardModel: null,
      agentApprovalGateModel: null,
      agentMemorySummarizationModel: null,
      agentSelectorInferenceModel: null,
      agentOutputNormalizationModel: null,
      agentMaxSteps: 10,
      agentMaxStepAttempts: 3,
      agentMaxReplanCalls: 3,
      agentReplanEverySteps: 1,
      agentMaxSelfChecks: 3,
      agentLoopGuardThreshold: 0.5,
      agentLoopBackoffBaseMs: 500,
      agentLoopBackoffMaxMs: 60_000,
      globalContext: '',
      localContext: '',
      localContextMode: 'override',
      settingsDirty: false,
      settingsSaving: false,
      loadChatbotSettings: vi.fn(),
      saveChatbotSettings: vi.fn(),
    });
    vi.mocked(useAgentPersonas).mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isPlaceholderData: false,
      isRefetchError: false,
      isRefetching: false,
      isStale: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
      fetchStatus: 'idle',
      failureCount: 0,
      failureReason: null,
      dataUpdatedAt: 0,
      errorUpdatedAt: 0,
      isEnabled: true,
      promise: Promise.resolve([]),
    } as ReturnType<typeof useAgentPersonas>);
  });

  const mockMessages = [
    {
      id: '1',
      sessionId: 's1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date().toISOString(),
    },
    {
      id: '2',
      sessionId: 's1',
      role: 'assistant' as const,
      content: 'Hi there!',
      timestamp: new Date().toISOString(),
    },
  ];

  const defaultMockValue = {
    messages: [],
    setMessages: vi.fn(),
    input: '',
    setInput: vi.fn(),
    sendMessage: vi.fn(),
    attachments: [],
    setAttachments: vi.fn(),
    isSending: false,
    setIsSending: vi.fn(),
    modelOptions: [],
    model: 'default',
    setModel: vi.fn(),
    modelLoading: false,
    webSearchEnabled: false,
    setWebSearchEnabled: vi.fn(),
    useGlobalContext: false,
    setUseGlobalContext: vi.fn(),
    useLocalContext: false,
    setUseLocalContext: vi.fn(),
    agentModeEnabled: false,
    setAgentModeEnabled: vi.fn(),
    searchProvider: 'serpapi',
    setSearchProvider: vi.fn(),
    playwrightPersonaId: null,
    setPlaywrightPersonaId: vi.fn(),
    agentBrowser: 'chromium',
    setAgentBrowser: vi.fn(),
    agentRunHeadless: true,
    setAgentRunHeadless: vi.fn(),
    agentIgnoreRobotsTxt: false,
    setAgentIgnoreRobotsTxt: vi.fn(),
    agentRequireHumanApproval: false,
    setAgentRequireHumanApproval: vi.fn(),
    agentMemoryValidationModel: null,
    setAgentMemoryValidationModel: vi.fn(),
    agentPlannerModel: null,
    setAgentPlannerModel: vi.fn(),
    agentSelfCheckModel: null,
    setAgentSelfCheckModel: vi.fn(),
    agentExtractionValidationModel: null,
    setAgentExtractionValidationModel: vi.fn(),
    agentToolRouterModel: null,
    setAgentToolRouterModel: vi.fn(),
    agentLoopGuardModel: null,
    setAgentLoopGuardModel: vi.fn(),
    agentApprovalGateModel: null,
    setAgentApprovalGateModel: vi.fn(),
    agentMemorySummarizationModel: null,
    setAgentMemorySummarizationModel: vi.fn(),
    agentSelectorInferenceModel: null,
    setAgentSelectorInferenceModel: vi.fn(),
    agentOutputNormalizationModel: null,
    setAgentOutputNormalizationModel: vi.fn(),
    agentMaxSteps: 10,
    setAgentMaxSteps: vi.fn(),
    agentMaxStepAttempts: 3,
    setAgentMaxStepAttempts: vi.fn(),
    agentMaxReplanCalls: 3,
    setAgentMaxReplanCalls: vi.fn(),
    agentReplanEverySteps: 1,
    setAgentReplanEverySteps: vi.fn(),
    agentMaxSelfChecks: 3,
    setAgentMaxSelfChecks: vi.fn(),
    agentLoopGuardThreshold: 0.5,
    setAgentLoopGuardThreshold: vi.fn(),
    agentLoopBackoffBaseMs: 500,
    setAgentLoopBackoffBaseMs: vi.fn(),
    agentLoopBackoffMaxMs: 60000,
    setAgentLoopBackoffMaxMs: vi.fn(),
    latestAgentRunId: null,
    setLatestAgentRunId: vi.fn(),
    debugState: {
      activeRunId: null,
      isPaused: false,
      stepMode: false,
      lastUpdateAt: new Date().toISOString(),
    },
    setDebugState: vi.fn(),
    globalContext: '',
    setGlobalContext: vi.fn(),
    localContext: '',
    setLocalContext: vi.fn(),
    localContextMode: 'override' as 'override' | 'append',
    setLocalContextMode: vi.fn(),
    settingsDirty: false,
    setSettingsDirty: vi.fn(),
    settingsSaving: false,
    setSettingsSaving: vi.fn(),
    sessionId: null,
    loadChatbotSettings: vi.fn(),
    saveChatbotSettings: vi.fn(),
    sessions: [],
    currentSessionId: null,
    sessionsLoading: false,
    createNewSession: vi.fn(),
    deleteSession: vi.fn(),
    selectSession: vi.fn(),
  };

  it('renders \'Start a conversation\' when no messages', () => {
    vi.mocked(useChatbotMessages).mockReturnValue(defaultMockValue);
    render(<ChatInterface />);
    expect(screen.getByText('Start a conversation...')).toBeInTheDocument();
  });

  it('renders messages correctly', () => {
    vi.mocked(useChatbotMessages).mockReturnValue({
      ...defaultMockValue,
      messages: mockMessages,
    });
    render(<ChatInterface />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('calls setInput on input change', () => {
    const setInput = vi.fn();
    vi.mocked(useChatbotMessages).mockReturnValue({
      ...defaultMockValue,
      setInput,
    });
    render(<ChatInterface />);
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'New message' } });
    expect(setInput).toHaveBeenCalledWith('New message');
  });

  it('calls sendMessage on form submit', () => {
    const sendMessage = vi.fn();
    vi.mocked(useChatbotMessages).mockReturnValue({
      ...defaultMockValue,
      input: 'Hello',
      sendMessage,
    });
    render(<ChatInterface />);
    const button = screen.getByRole('button', { name: 'Send' });
    fireEvent.click(button);
    expect(sendMessage).toHaveBeenCalled();
  });

  it('disables input and button while sending', () => {
    vi.mocked(useChatbotMessages).mockReturnValue({
      ...defaultMockValue,
      isSending: true,
      input: 'Hello',
    });
    render(<ChatInterface />);
    expect(screen.getByPlaceholderText('Type your message...')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeDisabled();
  });

  it('disables send button when input is empty', () => {
    vi.mocked(useChatbotMessages).mockReturnValue({
      ...defaultMockValue,
      input: '',
    });
    render(<ChatInterface />);
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
  });
});
