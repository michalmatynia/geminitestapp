/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useChatbotMessagesMock,
  useChatbotSettingsMock,
  useChatbotSessionsMock,
  useAgentPersonasMock,
} = vi.hoisted(() => ({
  useChatbotMessagesMock: vi.fn(),
  useChatbotSettingsMock: vi.fn(),
  useChatbotSessionsMock: vi.fn(),
  useAgentPersonasMock: vi.fn(),
}));

vi.mock('../context/ChatbotContext', () => ({
  useChatbotMessages: useChatbotMessagesMock,
  useChatbotSettings: useChatbotSettingsMock,
  useChatbotSessions: useChatbotSessionsMock,
}));

vi.mock('@/features/ai/agentcreator/hooks/useAgentPersonas', () => ({
  useAgentPersonas: useAgentPersonasMock,
}));

import { ChatInterface } from './ChatInterface';

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useChatbotMessagesMock.mockReturnValue({
      messages: [],
      input: '',
      setInput: vi.fn(),
      isSending: false,
      sendMessage: vi.fn(),
    });
    useChatbotSettingsMock.mockReturnValue({
      personaId: 'persona-default',
    });
    useChatbotSessionsMock.mockReturnValue({
      sessions: [],
      currentSessionId: null,
    });
    useAgentPersonasMock.mockReturnValue({
      data: [],
    });
  });

  it('renders the active session persona and the latest memory-informed mood', () => {
    useChatbotMessagesMock.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Let us break the problem into smaller steps.',
          timestamp: '2026-03-08T05:40:00.000Z',
          metadata: {
            suggestedPersonaMoodId: 'encouraging',
          },
        },
      ],
      input: '',
      setInput: vi.fn(),
      isSending: false,
      sendMessage: vi.fn(),
    });
    useChatbotSessionsMock.mockReturnValue({
      sessions: [
        {
          id: 'session-1',
          title: 'Fractions',
          personaId: 'persona-session',
        },
      ],
      currentSessionId: 'session-1',
    });
    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-default',
          name: 'Default Persona',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#ffffff" /></svg>',
            },
          ],
        },
        {
          id: 'persona-session',
          name: 'Session Persona',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#ffffff" /></svg>',
            },
            {
              id: 'encouraging',
              label: 'Encouraging',
              svgContent:
                '<svg viewBox="0 0 100 100"><path d="M18 58 Q50 24 82 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
            },
            {
              id: 'thinking',
              label: 'Thinking',
              svgContent:
                '<svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="56" fill="#ffffff" /></svg>',
            },
          ],
        },
      ],
    });

    render(<ChatInterface />);

    expect(screen.getByTestId('chatbot-persona-name')).toHaveTextContent('Session Persona');
    expect(screen.getByTestId('chatbot-persona-mood')).toHaveTextContent(
      'Memory mood: Encouraging'
    );
    expect(screen.getByTestId('chatbot-persona-avatar').querySelector('svg')).not.toBeNull();
  });

  it('prefers the thinking mood while a response is in flight', () => {
    useChatbotMessagesMock.mockReturnValue({
      messages: [
        {
          id: 'msg-1',
          sessionId: 'session-1',
          role: 'assistant',
          content: 'Let us break the problem into smaller steps.',
          timestamp: '2026-03-08T05:40:00.000Z',
          metadata: {
            suggestedPersonaMoodId: 'encouraging',
          },
        },
      ],
      input: '',
      setInput: vi.fn(),
      isSending: true,
      sendMessage: vi.fn(),
    });
    useAgentPersonasMock.mockReturnValue({
      data: [
        {
          id: 'persona-default',
          name: 'Default Persona',
          defaultMoodId: 'neutral',
          moods: [
            {
              id: 'neutral',
              label: 'Neutral',
              svgContent:
                '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" fill="#ffffff" /></svg>',
            },
            {
              id: 'thinking',
              label: 'Thinking',
              svgContent:
                '<svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="56" fill="#ffffff" /></svg>',
            },
            {
              id: 'encouraging',
              label: 'Encouraging',
              svgContent:
                '<svg viewBox="0 0 100 100"><path d="M18 58 Q50 24 82 58" fill="none" stroke="#ffffff" stroke-width="8" /></svg>',
            },
          ],
        },
      ],
    });

    render(<ChatInterface />);

    expect(screen.getByTestId('chatbot-persona-name')).toHaveTextContent('Default Persona');
    expect(screen.getByTestId('chatbot-persona-mood')).toHaveTextContent('Memory mood: Thinking');
  });
});
