import { logAgentAudit } from './agent-runtime/audit';
import { registerErrorEnricher } from '@/shared/utils/observability/error-enricher-registry';

// Register AI-specific error enricher to ErrorSystem without circular dependencies
if (typeof logAgentAudit === 'function') {
  registerErrorEnricher(async (error, context) => {
    if (context['runId']) {
      const message = error instanceof Error ? error.message : String(error);
      const level = context['level'] === 'warn' ? 'warning' : 'error';
      await logAgentAudit(context['runId'] as string, level, message, context);
    }
  });
}

export * from './ai-context-registry/server';
export * from './ai-context-registry/services/runtime-providers/kangur-recent-features';
export * from './ai-paths/workers/aiPathRunQueue';
export {
  buildPersonaChatMemoryContext,
  persistAgentPersonaExchangeMemory,
} from './agentcreator/server/persona-memory';
export {
  mergeContextRegistryResolutionBundles,
} from './ai-context-registry/context/page-context-shared';
export {
  buildChatbotContextRegistrySystemPrompt,
} from './chatbot/context-registry/system-prompt';
export * from './agent-runtime/audit';
export { getAgentLongTermMemoryDelegate } from './agent-runtime/store-delegates';
export * from './ai-paths/services/playwright-node-runner';
export * from './agent-runtime/workers/agentQueue';
export * from './chatbot/workers/chatbotJobQueue';
export * from './image-studio/server';
export * from './image-studio/workers/imageStudioRunQueue';
export * from './image-studio/workers/imageStudioSequenceQueue';
export * from './insights/workers/aiInsightsQueue';
