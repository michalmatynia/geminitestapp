import { describe, expect, it } from 'vitest';

import * as chatbotPublic from './public';

describe('chatbot public barrel', () => {
  it('continues exposing chatbot hooks and pages', () => {
    expect(chatbotPublic).toHaveProperty('useChatbotLogic');
    expect(chatbotPublic).toHaveProperty('useChatbotSessions');
    expect(chatbotPublic).toHaveProperty('AdminChatbotPage');
    expect(chatbotPublic).toHaveProperty('AdminChatbotSessionsPage');
  });

  it('continues exposing the shared chatbot UI surface', () => {
    expect(chatbotPublic).toHaveProperty('ChatInterface');
    expect(chatbotPublic).toHaveProperty('ChatMessageContent');
    expect(chatbotPublic).toHaveProperty('SessionSidebar');
  });
});
