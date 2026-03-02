export type SystemLogStaticContextEnvelope = {
  staticContext: Record<string, unknown>;
};

export type SystemLogRuntimeContextHydrationResult = {
  staticContextPatch: Record<string, unknown>;
  analysisContextPatch?: Record<string, unknown> | null;
  adapterMeta?: Record<string, unknown> | null;
};

export type SystemLogRuntimeContextAdapter = {
  id: string;
  ownedStaticContextKeys: readonly string[];
  canHydrate(context: Record<string, unknown> | null): boolean;
  hydrate(
    context: Record<string, unknown>
  ): Promise<SystemLogRuntimeContextHydrationResult | null>;
};
