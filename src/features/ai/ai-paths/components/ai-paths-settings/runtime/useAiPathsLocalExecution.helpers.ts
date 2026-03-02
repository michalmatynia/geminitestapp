import type { AiNode, RuntimePortValues } from '@/shared/lib/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';

export type TriggerContextMode = 'simulation_required' | 'simulation_preferred' | 'trigger_only';
export type SimulationRunBehavior = 'before_connected_trigger' | 'manual_only';
export type FetcherSourceMode = 'live_context' | 'simulation_id' | 'live_then_simulation';

export const DEFAULT_TRIGGER_CONTEXT_MODE: TriggerContextMode = 'trigger_only';
export const DEFAULT_SIMULATION_RUN_BEHAVIOR: SimulationRunBehavior = 'before_connected_trigger';
export const DEFAULT_FETCHER_SOURCE_MODE: FetcherSourceMode = 'live_context';

export const normalizeEntityType = (value?: string | null): string | null => {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'product' || normalized === 'products') return 'product';
  if (normalized === 'note' || normalized === 'notes') return 'note';
  return normalized;
};

export const readEntityIdFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  const entityId = context['entityId'];
  if (typeof entityId === 'string' && entityId.trim().length > 0) return entityId;
  const productId = context['productId'];
  if (typeof productId === 'string' && productId.trim().length > 0) return productId;
  return null;
};

export const readEntityTypeFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  const entityType = context['entityType'];
  if (typeof entityType !== 'string') return null;
  return normalizeEntityType(entityType);
};

export const hasEntityReference = (context: Record<string, unknown> | null | undefined): boolean =>
  readEntityIdFromContext(context) !== null;

export const hasSimulationContextProvenance = (
  context: Record<string, unknown> | null | undefined
): boolean => {
  if (!context) return false;
  const contextSource = context['contextSource'];
  if (
    typeof contextSource === 'string' &&
    contextSource.trim().toLowerCase().startsWith('simulation')
  ) {
    return true;
  }
  const source = context['source'];
  if (typeof source === 'string' && source.trim().toLowerCase() === 'simulation') {
    return true;
  }
  const simulationNodeId = context['simulationNodeId'];
  return typeof simulationNodeId === 'string' && simulationNodeId.trim().length > 0;
};

export const resolveTriggerContextMode = (triggerNode: AiNode): TriggerContextMode => {
  const mode = triggerNode.config?.trigger?.contextMode;
  if (
    mode === 'simulation_required' ||
    mode === 'simulation_preferred' ||
    mode === 'trigger_only'
  ) {
    return mode;
  }
  return DEFAULT_TRIGGER_CONTEXT_MODE;
};

export const resolveSimulationRunBehavior = (simulationNode: AiNode): SimulationRunBehavior => {
  const behavior = simulationNode.config?.simulation?.runBehavior;
  if (behavior === 'before_connected_trigger' || behavior === 'manual_only') {
    return behavior;
  }
  return DEFAULT_SIMULATION_RUN_BEHAVIOR;
};

export const resolveFetcherSourceMode = (fetcherNode: AiNode): FetcherSourceMode => {
  const mode = fetcherNode.config?.fetcher?.sourceMode;
  if (mode === 'live_context' || mode === 'simulation_id' || mode === 'live_then_simulation') {
    return mode;
  }
  return DEFAULT_FETCHER_SOURCE_MODE;
};

export const isSimulationCapableFetcher = (fetcherNode: AiNode): boolean => {
  const mode = resolveFetcherSourceMode(fetcherNode);
  return mode === 'simulation_id' || mode === 'live_then_simulation';
};

export const buildSimulationOutputsFromContext = (
  context: Record<string, unknown>
): RuntimePortValues => {
  const entityId = readEntityIdFromContext(context);
  const entityType = readEntityTypeFromContext(context);
  const productId =
    typeof context['productId'] === 'string' && context['productId'].trim().length > 0
      ? context['productId']
      : entityType === 'product' && entityId
        ? entityId
        : null;
  return {
    context,
    ...(entityId ? { entityId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(productId ? { productId } : {}),
    ...(context['entityJson'] !== undefined ? { entityJson: context['entityJson'] } : {}),
  };
};

export const extractDatabaseRuntimeMetadata = (
  nextOutputs: RuntimePortValues
): Record<string, unknown> | null => {
  const bundle = nextOutputs['bundle'];
  if (!isObjectRecord(bundle)) return null;

  const collection =
    typeof bundle['collection'] === 'string' && bundle['collection'].trim().length > 0
      ? bundle['collection']
      : null;
  const requestedProvider =
    typeof bundle['requestedProvider'] === 'string' && bundle['requestedProvider'].trim().length > 0
      ? bundle['requestedProvider']
      : null;
  const resolvedProvider =
    typeof bundle['resolvedProvider'] === 'string' && bundle['resolvedProvider'].trim().length > 0
      ? bundle['resolvedProvider']
      : typeof bundle['provider'] === 'string' && bundle['provider'].trim().length > 0
        ? bundle['provider']
        : null;
  const providerFallback = isObjectRecord(bundle['providerFallback'])
    ? bundle['providerFallback']
    : null;
  const count =
    typeof bundle['count'] === 'number' && Number.isFinite(bundle['count'])
      ? bundle['count']
      : null;

  const databaseMeta: Record<string, unknown> = {};
  if (collection) {
    databaseMeta['collection'] = collection;
  }
  if (requestedProvider) {
    databaseMeta['requestedProvider'] = requestedProvider;
  }
  if (resolvedProvider) {
    databaseMeta['resolvedProvider'] = resolvedProvider;
  }
  if (providerFallback) {
    databaseMeta['providerFallback'] = providerFallback;
  }
  if (count !== null) {
    databaseMeta['count'] = count;
  }

  if (Object.keys(databaseMeta).length === 0) return null;
  return { database: databaseMeta };
};
