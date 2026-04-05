import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ChatbotProvider,
  useChatbotMessages,
  useChatbotSessions,
  useChatbotSettings,
  useChatbotUI,
} from './ChatbotContext';

vi.mock('../hooks/useChatbotLogic', () => ({
  useChatbotLogic: () => ({
    messages: [],
    setMessages: vi.fn(),
    input: 'hello',
    setInput: vi.fn(),
    sendMessage: vi.fn(),
    attachments: [],
    setAttachments: vi.fn(),
    isSending: false,
    setIsSending: vi.fn(),
    model: 'gpt-test',
    setModel: vi.fn(),
    personaId: 'persona-1',
    setPersonaId: vi.fn(),
    webSearchEnabled: true,
    setWebSearchEnabled: vi.fn(),
    useGlobalContext: false,
    setUseGlobalContext: vi.fn(),
    useLocalContext: true,
    setUseLocalContext: vi.fn(),
    searchProvider: 'google',
    setSearchProvider: vi.fn(),
    playwrightPersonaId: null,
    setPlaywrightPersonaId: vi.fn(),
    globalContext: '',
    setGlobalContext: vi.fn(),
    localContext: 'local',
    setLocalContext: vi.fn(),
    localContextMode: 'append',
    setLocalContextMode: vi.fn(),
    settingsDirty: false,
    settingsSaving: false,
    loadChatbotSettings: vi.fn(),
    saveChatbotSettings: vi.fn(),
    sessions: [],
    currentSessionId: 'session-1',
    sessionsLoading: false,
    sessionId: 'session-1',
    createNewSession: vi.fn(),
    deleteSession: vi.fn(),
    selectSession: vi.fn(),
    debugState: { lastRequest: { ok: true }, lastResponse: null },
    setDebugState: vi.fn(),
    latestAgentRunId: 'run-1',
    setLatestAgentRunId: vi.fn(),
  }),
}));

function Consumer(): React.JSX.Element {
  const messages = useChatbotMessages();
  const settings = useChatbotSettings();
  const sessions = useChatbotSessions();
  const ui = useChatbotUI();

  return (
    <div>
      {messages.input}:{settings.model}:{sessions.currentSessionId}:{ui.latestAgentRunId}
    </div>
  );
}

describe('ChatbotContext', () => {
  it('throws outside provider', () => {
    expect(() => render(<Consumer />)).toThrow(
      'useChatbotMessages must be used within a ChatbotProvider'
    );
  });

  it('exposes all chatbot subcontexts inside provider', () => {
    render(
      <ChatbotProvider>
        <Consumer />
      </ChatbotProvider>
    );

    expect(screen.getByText('hello:gpt-test:session-1:run-1')).toBeInTheDocument();
  });
});
