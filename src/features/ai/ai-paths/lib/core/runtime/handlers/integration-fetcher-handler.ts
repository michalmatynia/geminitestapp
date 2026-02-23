import type { NodeHandler, NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { coerceInput } from '../../utils';
import { buildFallbackEntity } from '../utils';

type FetcherSourceMode = 'live_context' | 'simulation_id' | 'live_then_simulation';

const DEFAULT_FETCHER_SOURCE_MODE: FetcherSourceMode = 'live_context';

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeEntityType = (value: unknown): string | null => {
  const raw = readString(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized === 'products') return 'product';
  if (normalized === 'notes') return 'note';
  return normalized;
};

const readEntityIdFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  return readString(context['entityId']) ?? readString(context['productId']) ?? null;
};

const readEntityTypeFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  return normalizeEntityType(context['entityType']);
};

const readEntityObjectFromContext = (
  context: Record<string, unknown> | null | undefined
): Record<string, unknown> | null => {
  if (!context) return null;
  const candidate =
    context['entity'] ?? context['entityJson'] ?? context['product'] ?? null;
  return isPlainRecord(candidate) ? candidate : null;
};

const readFetcherSourceMode = (node: NodeHandlerContext['node']): FetcherSourceMode => {
  const mode = node.config?.fetcher?.sourceMode;
  if (
    mode === 'live_context' ||
    mode === 'simulation_id' ||
    mode === 'live_then_simulation'
  ) {
    return mode;
  }
  return DEFAULT_FETCHER_SOURCE_MODE;
};

const buildFetcherContextPayload = (args: {
  base: Record<string, unknown>;
  nodeTitle: string;
  nodeId: string;
  now: string;
  sourceTag: 'trigger_fetcher' | 'simulation_fetcher';
  activePathId: string | null;
  entity: Record<string, unknown> | null;
  entityId: string | null;
  entityType: string | null;
}): Record<string, unknown> => {
  const next: Record<string, unknown> = {
    ...args.base,
    source: args.nodeTitle,
    timestamp: args.now,
    pathId: args.activePathId,
    contextSource: args.sourceTag,
    fetcherNodeId: args.nodeId,
    fetcherNodeTitle: args.nodeTitle,
    entityId: args.entityId ?? args.base['entityId'],
    entityType: args.entityType ?? args.base['entityType'],
  };

  if (args.entityId && args.entityType === 'product') {
    next['productId'] = args.entityId;
  }
  if (args.entity) {
    next['entity'] = args.entity;
    next['entityJson'] = args.entity;
    if (args.entityType === 'product') {
      next['product'] = args.entity;
    }
  }

  return next;
};

export const handleFetcher: NodeHandler = async ({
  node,
  nodeInputs,
  triggerContext,
  fetchEntityCached,
  reportAiPathsError,
  activePathId,
  strictFlowMode = true,
  now,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const triggerSignal = coerceInput(nodeInputs['trigger']);
  if (triggerSignal === undefined || triggerSignal === null || triggerSignal === false) {
    return {};
  }

  const sourceMode = readFetcherSourceMode(node);
  const triggerContextRecord = isPlainRecord(triggerContext) ? triggerContext : null;
  const incomingContext = coerceInput(nodeInputs['context']);
  const incomingContextRecord = isPlainRecord(incomingContext) ? incomingContext : null;
  const incomingMeta = coerceInput(nodeInputs['meta']);
  const incomingMetaRecord = isPlainRecord(incomingMeta) ? incomingMeta : {};

  const inputEntityId = readString(coerceInput(nodeInputs['entityId']));
  const inputEntityType = normalizeEntityType(coerceInput(nodeInputs['entityType']));

  const liveBaseContext = incomingContextRecord ?? triggerContextRecord ?? {};
  const liveEntityId =
    inputEntityId ??
    readEntityIdFromContext(incomingContextRecord) ??
    readEntityIdFromContext(triggerContextRecord);
  const liveEntityType =
    inputEntityType ??
    readEntityTypeFromContext(incomingContextRecord) ??
    readEntityTypeFromContext(triggerContextRecord) ??
    normalizeEntityType(node.config?.fetcher?.entityType);
  let liveEntity =
    readEntityObjectFromContext(incomingContextRecord) ??
    readEntityObjectFromContext(triggerContextRecord);

  if (!liveEntity && liveEntityId && liveEntityType) {
    try {
      liveEntity = await fetchEntityCached(liveEntityType, liveEntityId);
    } catch (error) {
      reportAiPathsError(
        error,
        {
          service: 'ai-paths-runtime',
          nodeId: node.id,
          nodeType: node.type,
          fetcherSourceMode: sourceMode,
          entityId: liveEntityId,
          entityType: liveEntityType,
        },
        `Fetcher live hydration failed for ${liveEntityType}:${liveEntityId}`
      );
    }
  }

  const configEntityId =
    readString(node.config?.fetcher?.entityId) ??
    readString(node.config?.fetcher?.productId) ??
    null;
  const configEntityType =
    normalizeEntityType(node.config?.fetcher?.entityType) ??
    liveEntityType ??
    'product';

  const simulationEntityId = configEntityId ?? liveEntityId;
  const simulationEntityType = configEntityType;

  const resolveSimulation = async (): Promise<{
    entityId: string | null;
    entityType: string | null;
    entity: Record<string, unknown> | null;
  }> => {
    if (!simulationEntityId) {
      return { entityId: null, entityType: simulationEntityType, entity: null };
    }
    try {
      const entity = await fetchEntityCached(simulationEntityType, simulationEntityId);
      return {
        entityId: simulationEntityId,
        entityType: simulationEntityType,
        entity,
      };
    } catch (error) {
      reportAiPathsError(
        error,
        {
          service: 'ai-paths-runtime',
          nodeId: node.id,
          nodeType: node.type,
          fetcherSourceMode: sourceMode,
          entityId: simulationEntityId,
          entityType: simulationEntityType,
        },
        `Fetcher simulation hydration failed for ${simulationEntityType}:${simulationEntityId}`
      );
      return {
        entityId: simulationEntityId,
        entityType: simulationEntityType,
        entity: null,
      };
    }
  };

  let resolvedEntityId = liveEntityId;
  let resolvedEntityType = liveEntityType;
  let resolvedEntity = liveEntity;
  let sourceTag: 'trigger_fetcher' | 'simulation_fetcher' = 'trigger_fetcher';

  if (sourceMode === 'simulation_id') {
    if (!simulationEntityId) {
      throw new Error(
        `Fetcher ${node.title ?? node.id} is set to "Simulated entity by ID" but no entity ID is configured.`
      );
    }
    const simulated = await resolveSimulation();
    resolvedEntityId = simulated.entityId;
    resolvedEntityType = simulated.entityType;
    resolvedEntity = simulated.entity;
    sourceTag = 'simulation_fetcher';
  } else if (sourceMode === 'live_then_simulation') {
    const hasLiveReference = Boolean(liveEntityId && liveEntityType);
    if (!hasLiveReference && simulationEntityId) {
      const simulated = await resolveSimulation();
      resolvedEntityId = simulated.entityId;
      resolvedEntityType = simulated.entityType;
      resolvedEntity = simulated.entity;
      sourceTag = 'simulation_fetcher';
    }
  }

  if (!resolvedEntity && resolvedEntityId && !strictFlowMode) {
    try {
      resolvedEntity = buildFallbackEntity(resolvedEntityId);
    } catch {
      resolvedEntity = { id: resolvedEntityId };
    }
  }

  const context = buildFetcherContextPayload({
    base: liveBaseContext,
    nodeTitle: node.title ?? node.id,
    nodeId: node.id,
    now,
    sourceTag,
    activePathId,
    entity: resolvedEntity,
    entityId: resolvedEntityId,
    entityType: resolvedEntityType,
  });

  const meta: Record<string, unknown> = {
    ...incomingMetaRecord,
    fetchedAt: now,
    fetcherSourceMode: sourceMode,
    fetcherResolvedSource:
      sourceTag === 'simulation_fetcher' ? 'simulation_id' : 'live_context',
    entityId: resolvedEntityId,
    entityType: resolvedEntityType,
    pathId: activePathId,
  };

  return {
    context,
    meta,
    entityId: resolvedEntityId,
    entityType: resolvedEntityType,
  };
};
