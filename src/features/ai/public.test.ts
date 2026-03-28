import { describe, expect, it } from 'vitest';

import * as aiPublic from './public';

describe('ai public barrel', () => {
  it('exposes the admin ai-paths pages used by app routes', () => {
    expect(aiPublic.AdminAiPathsPage).toBeDefined();
    expect(aiPublic.AdminAiPathsQueuePage).toBeDefined();
    expect(aiPublic.AdminAiPathsValidationPage).toBeDefined();
    expect(aiPublic.AdminAiPathsTriggerButtonsPage).toBeDefined();
    expect(aiPublic.AdminAiPathsDeadLetterPage).toBeDefined();
  });

  it('exposes the admin image studio pages used by app routes', () => {
    expect(aiPublic.AdminImageStudioPage).toBeDefined();
    expect(aiPublic.AdminImageStudioUiPresetsPage).toBeDefined();
  });

  it('keeps the existing chatbot and agent pages available through the shared barrel', () => {
    expect(aiPublic.AdminChatbotPage).toBeDefined();
    expect(aiPublic.AdminChatbotSessionsPage).toBeDefined();
    expect(aiPublic.AdminChatbotMemoryPage).toBeDefined();
    expect(aiPublic.AdminChatbotContextPage).toBeDefined();
    expect(aiPublic.AgentRunsPage).toBeDefined();
    expect(aiPublic.AgentPersonasPage).toBeDefined();
    expect(aiPublic.AgentPersonaMemoryPage).toBeDefined();
    expect(aiPublic.AgentTeachingAgentsPage).toBeDefined();
    expect(aiPublic.AgentTeachingChatPage).toBeDefined();
    expect(aiPublic.AgentTeachingCollectionsPage).toBeDefined();
    expect(aiPublic.AgentTeachingCollectionDetailPage).toBeDefined();
    expect(aiPublic.AgentTeachingProvider).toBeDefined();
  });
});
