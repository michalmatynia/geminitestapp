import { type AiInsightType } from '@/shared/contracts/ai-insights';
import { type AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';

export const CAPABILITY_MAP: Record<AiInsightType, AiBrainCapabilityKey> = {
  analytics: 'insights.analytics',
  runtime_analytics: 'insights.runtime_analytics',
  system_logs: 'insights.system_logs',
  logs: 'insights.system_logs',
  product_recommendation: 'insights.analytics',
  content_optimization: 'insights.analytics',
  anomaly_detection: 'insights.analytics',
  trend_analysis: 'insights.analytics',
  system_health: 'insights.system_logs',
};
