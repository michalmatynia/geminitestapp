import { describe, expect, it } from 'vitest';

import * as aiPublic from './public';

describe('ai public barrel', () => {
  it('keeps admin route pages and layouts out of the shared ai barrel', () => {
    expect(aiPublic).not.toHaveProperty('AdminAiPathsPage');
    expect(aiPublic).not.toHaveProperty('AdminAiPathsQueuePage');
    expect(aiPublic).not.toHaveProperty('AdminAiPathsValidationPage');
    expect(aiPublic).not.toHaveProperty('AdminAiPathsTriggerButtonsPage');
    expect(aiPublic).not.toHaveProperty('AdminAiPathsDeadLetterPage');
    expect(aiPublic).not.toHaveProperty('AdminImageStudioPage');
    expect(aiPublic).not.toHaveProperty('AdminImageStudioUiPresetsPage');
    expect(aiPublic).not.toHaveProperty('AdminChatbotPage');
    expect(aiPublic).not.toHaveProperty('AdminChatbotSessionsPage');
    expect(aiPublic).not.toHaveProperty('AdminChatbotMemoryPage');
    expect(aiPublic).not.toHaveProperty('AdminChatbotContextPage');
    expect(aiPublic).not.toHaveProperty('AgentRunsPage');
    expect(aiPublic).not.toHaveProperty('AgentRunProvider');
    expect(aiPublic).not.toHaveProperty('AgentPersonasPage');
    expect(aiPublic).not.toHaveProperty('AgentPersonaMemoryPage');
    expect(aiPublic).not.toHaveProperty('AgentTeachingAgentsPage');
    expect(aiPublic).not.toHaveProperty('AgentTeachingChatPage');
    expect(aiPublic).not.toHaveProperty('AgentTeachingCollectionsPage');
    expect(aiPublic).not.toHaveProperty('AgentTeachingCollectionDetailPage');
    expect(aiPublic).not.toHaveProperty('AgentTeachingProvider');
    expect(aiPublic).not.toHaveProperty('AdminAiContextRegistryPage');
    expect(aiPublic).not.toHaveProperty('AdminAiInsightsPage');
  });

  it('continues exposing shared ai runtime hooks and helpers', () => {
    expect(aiPublic.useChatbotSessions).toBeDefined();
    expect(aiPublic.useCreateChatbotSession).toBeDefined();
    expect(aiPublic.CanvasBoard).toBeDefined();
    expect(aiPublic.AiPathsProvider).toBeDefined();
    expect(aiPublic.useGraphState).toBeDefined();
    expect(aiPublic.useCanvasState).toBeDefined();
    expect(aiPublic.useStudioProjects).toBeDefined();
    expect(aiPublic.getImageStudioSlotImageSrc).toBeDefined();
    expect(aiPublic.SplitVariantPreview).toBeDefined();
    expect(aiPublic.CenterPreviewProvider).toBeDefined();
    expect(aiPublic.useCenterPreviewContext).toBeDefined();
    expect(aiPublic.AgentPersonaMoodAvatar).toBeDefined();
  });
});
