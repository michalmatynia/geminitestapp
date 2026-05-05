import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { type AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import { 
  getRuntimeAnalyticsSummary, 
  resolveRuntimeAnalyticsRangeWindow 
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { 
  readInsightSettingValue 
} from './settings-service';
import { 
  AI_INSIGHTS_SETTINGS_KEYS, 
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT 
} from '../settings';
import { 
  buildRuntimeAnalyticsInsightContextRegistrySystemPrompt 
} from '@/features/ai/insights/context-registry/system-prompt';
import { 
  assessRuntimeKernelParityRisk,
  buildRuntimeKernelParityMetadata,
  buildRuntimeKernelParityPrompt 
} from './runtime-analytics-prompt';

export async function buildRuntimeAnalyticsPrompt(
  range: AiPathRuntimeAnalyticsRange,
  options?: { contextRegistry?: ContextRegistryConsumerEnvelope | null }
): Promise<{
  systemPrompt: string;
  userPrompt: string;
  name: string;
  metadata?: Record<string, unknown>;
}> {
  const now = new Date();
  const window = resolveRuntimeAnalyticsRangeWindow(range);
  const summary = await getRuntimeAnalyticsSummary(window);
  const kernelParityAssessment = assessRuntimeKernelParityRisk(summary);
  const kernelParityPrompt = buildRuntimeKernelParityPrompt(summary, kernelParityAssessment);
  const insightMetadata = buildRuntimeKernelParityMetadata(summary, kernelParityAssessment);
  const rawPrompt = await readInsightSettingValue(AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem);
  const runtimeAnalyticsPromptSystem = (rawPrompt !== null && rawPrompt !== undefined && rawPrompt !== '') ? rawPrompt : DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT;
  const registryPrompt = buildRuntimeAnalyticsInsightContextRegistrySystemPrompt(options?.contextRegistry?.resolved);
  const systemPrompt = [runtimeAnalyticsPromptSystem, registryPrompt].filter((p): p is string => !!p).join('\n\n');
  const userPrompt = `AI Path Runtime Analytics Summary (${range}):
${JSON.stringify(summary, null, 2)}

Kernel Runtime Parity Snapshot:
${kernelParityPrompt}

Analyze performance and success rates of AI Path executions. Include migration risk commentary using kernel parity distribution and the computed parity risk level. Recommend rollout/rollback actions when parity coverage or v3 share is weak.`;
  return {
    systemPrompt,
    userPrompt,
    name: `runtime_analytics Insight [${kernelParityAssessment.riskLevel.toUpperCase()} risk] - ${now.toLocaleDateString()}`,
    metadata: insightMetadata,
  };
}
