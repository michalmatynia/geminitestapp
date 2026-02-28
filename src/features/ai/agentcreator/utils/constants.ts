import type { AgentSettingsPayload, ModelTaskRule } from '@/shared/contracts/chatbot';
import { DEFAULT_AGENT_SETTINGS as SHARED_DEFAULT_AGENT_SETTINGS } from '@/shared/contracts/chatbot';

export const MODEL_TASK_RULES: Record<string, ModelTaskRule> = {
  main: { preferLarge: true, minSize: 7, preferReasoning: true },
  planner: { preferLarge: true, minSize: 7, preferReasoning: true },
  selfCheck: { preferLarge: true, minSize: 7 },
  extractionValidation: { preferLarge: true, minSize: 7 },
  toolRouter: { preferSmall: true, targetSize: 7, maxSize: 13 },
  approvalGate: { preferLarge: true, minSize: 7, preferReasoning: true },
  memoryValidation: { preferSmall: true, targetSize: 7, maxSize: 13 },
  memorySummarization: { preferLarge: true, minSize: 7, preferReasoning: true },
  loopGuard: { preferSmall: true, targetSize: 7, maxSize: 13 },
  selectorInference: { preferSmall: true, targetSize: 7, maxSize: 13 },
  outputNormalization: { preferSmall: true, targetSize: 3, maxSize: 7 },
};

export const DEFAULT_AGENT_SETTINGS: AgentSettingsPayload = SHARED_DEFAULT_AGENT_SETTINGS;
