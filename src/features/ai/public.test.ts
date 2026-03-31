import { describe, expect, it } from 'vitest';

import * as aiPublic from './public';

describe('ai public barrel', () => {
  it('exposes the app-facing admin and agent entrypoints used by app route wrappers', () => {
    expect(aiPublic.AdminAiPathsPage).toBeDefined();
    expect(aiPublic.AdminAiPathsQueuePage).toBeDefined();
    expect(aiPublic.AdminAiPathsValidationPage).toBeDefined();
    expect(aiPublic.AdminAiPathsTriggerButtonsPage).toBeDefined();
    expect(aiPublic.AdminAiPathsDeadLetterPage).toBeDefined();
    expect(aiPublic.AdminImageStudioPage).toBeDefined();
    expect(aiPublic.AdminImageStudioUiPresetsPage).toBeDefined();
    expect(aiPublic.AdminChatbotPage).toBeDefined();
    expect(aiPublic.AdminChatbotSessionsPage).toBeDefined();
    expect(aiPublic.AdminChatbotMemoryPage).toBeDefined();
    expect(aiPublic.AdminChatbotContextPage).toBeDefined();
    expect(aiPublic.AgentRunsPage).toBeDefined();
    expect(aiPublic.AgentRunProvider).toBeDefined();
    expect(aiPublic.AgentPersonasPage).toBeDefined();
    expect(aiPublic.AgentPersonaMemoryPage).toBeDefined();
    expect(aiPublic.AgentTeachingAgentsPage).toBeDefined();
    expect(aiPublic.AgentTeachingChatPage).toBeDefined();
    expect(aiPublic.AgentTeachingCollectionsPage).toBeDefined();
    expect(aiPublic.AgentTeachingCollectionDetailPage).toBeDefined();
    expect(aiPublic.AgentTeachingProvider).toBeDefined();
    expect(aiPublic.AdminAiContextRegistryPage).toBeDefined();
    expect(aiPublic.AdminAiInsightsPage).toBeDefined();
    expect(aiPublic.AdminBrainPage).toBeDefined();
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
