import type { SystemLogRuntimeContextHydrationResult } from '@/shared/contracts/observability';
import type { JsonRecord as SystemLogStaticContextEnvelope } from '@/shared/lib/ai-paths/core/runtime/handlers/advanced-api/config';

export type { SystemLogRuntimeContextHydrationResult };
export type { SystemLogStaticContextEnvelope };

export type SystemLogRuntimeContextAdapter = {
  id: string;
  ownedStaticContextKeys: readonly string[];
  canHydrate(context: Record<string, unknown> | null): boolean;
  hydrate(context: Record<string, unknown>): Promise<SystemLogRuntimeContextHydrationResult | null>;
};
