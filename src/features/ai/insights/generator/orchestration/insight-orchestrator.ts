import { type AiInsightType } from "@/shared/contracts/ai-insights";
import { callInsightChatModel } from "../chat-runtime";
import { appendAiInsight } from "../repository";
export async function generateAiInsightByType(
  type: AiInsightType,
  options?: {
    range?: AiPathRuntimeAnalyticsRange;
    force?: boolean;
    source?: AiInsightSource;
    contextRegistry?: ContextRegistryConsumerEnvelope | null;
  }
