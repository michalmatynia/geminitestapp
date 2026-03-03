import type { SystemLogRuntimeContextHydrationResult } from '@/shared/contracts/observability';

export type { SystemLogRuntimeContextHydrationResult };

export type SystemLogStaticContextEnvelope = Record<string, unknown>;

export type SystemLogRuntimeContextAdapter = {
  id: string;
  ownedStaticContextKeys: readonly string[];
  canHydrate(context: Record<string, unknown> | null): boolean;
  hydrate(
    context: Record<string, unknown>
  ): Promise<SystemLogRuntimeContextHydrationResult | null>;
};
