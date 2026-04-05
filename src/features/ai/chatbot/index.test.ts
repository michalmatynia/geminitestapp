import { describe, expect, it } from 'vitest';

import * as chatbotIndex from './index';

describe('chatbot index barrel', () => {
  it('continues exposing the chatbot admin pages and hooks', () => {
    expect(chatbotIndex).toHaveProperty('useChatbotLogic');
    expect(chatbotIndex).toHaveProperty('useChatbotSessions');
    expect(chatbotIndex).toHaveProperty('AdminChatbotPage');
    expect(chatbotIndex).toHaveProperty('AdminChatbotSessionsPage');
    expect(chatbotIndex).toHaveProperty('AdminChatbotContextPage');
    expect(chatbotIndex).toHaveProperty('AdminChatbotMemoryPage');
  });
});
