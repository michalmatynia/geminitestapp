import { describe, expect, it } from 'vitest';

import type { ChatMessageDto, ChatbotSessionListItem } from '@/shared/contracts/chatbot';

import {
  buildChatbotWorkspaceContextBundle,
  CHATBOT_CONTEXT_ROOT_IDS,
  CHATBOT_CONTEXT_RUNTIME_REF,
} from '../workspace';

const sessions: ChatbotSessionListItem[] = [
  {
    id: 'session-1',
    title: 'Support draft',
    personaId: 'persona-1',
    lastMessageAt: '2026-03-09T09:00:00.000Z',
    messageCount: 4,
    isActive: true,
  },
  {
    id: 'session-2',
    title: 'Follow-up',
    personaId: null,
    lastMessageAt: '2026-03-09T08:00:00.000Z',
    messageCount: 2,
    isActive: true,
  },
];

const messages: ChatMessageDto[] = [
  {
    id: 'msg-1',
    sessionId: 'session-1',
    role: 'user',
    content: 'Summarize the current session for me.',
    timestamp: '2026-03-09T09:00:00.000Z',
  },
  {
    id: 'msg-2',
    sessionId: 'session-1',
    role: 'assistant',
    content: 'Here is the latest session summary.',
    timestamp: '2026-03-09T09:01:00.000Z',
  },
];

describe('buildChatbotWorkspaceContextBundle', () => {
  it('builds a runtime document from the visible chatbot workspace state', () => {
    const bundle = buildChatbotWorkspaceContextBundle({
      activeTab: 'settings',
      messages,
      sessions,
      currentSessionId: 'session-1',
      personaId: 'persona-1',
      webSearchEnabled: true,
      useGlobalContext: true,
      useLocalContext: true,
      globalContext: 'Always answer in a concise operator-focused style.',
      localContext: 'This session is preparing a support escalation summary.',
      localContextMode: 'append',
      latestAgentRunId: 'run-123',
    });

    expect(bundle.refs).toEqual([CHATBOT_CONTEXT_RUNTIME_REF]);
    expect(bundle.documents).toHaveLength(1);
    expect(bundle.documents[0]?.facts).toMatchObject({
      activeTab: 'settings',
      currentSessionId: 'session-1',
      currentSessionTitle: 'Support draft',
      sessionCount: 2,
      messageCount: 2,
      personaId: 'persona-1',
      webSearchEnabled: true,
      useGlobalContext: true,
      useLocalContext: true,
      localContextMode: 'append',
      hasGlobalContext: true,
      hasLocalContext: true,
      latestAgentRunId: 'run-123',
    });
    expect(bundle.documents[0]?.relatedNodeIds).toEqual([...CHATBOT_CONTEXT_ROOT_IDS]);
    expect(bundle.documents[0]?.sections[1]?.title).toBe('Sessions');
    expect(bundle.documents[0]?.sections[2]?.items?.[1]).toMatchObject({
      role: 'assistant',
      content: 'Here is the latest session summary.',
    });
    expect(bundle.documents[0]?.sections[3]?.title).toBe('Global context');
    expect(bundle.documents[0]?.sections[4]?.title).toBe('Local context');
  });
});
