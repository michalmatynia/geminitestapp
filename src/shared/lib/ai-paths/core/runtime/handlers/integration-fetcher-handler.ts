import type {
  NodeHandler,
  NodeHandlerContext,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths-runtime';
import { isObjectRecord } from '@/shared/utils/object-utils';

import { coerceInput } from '../../utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


type FetcherSourceMode = 'live_context' | 'simulation_id' | 'live_then_simulation';
type FetcherResolvedSource = 'live_context' | 'simulation_id' | 'live_context_override';

const DEFAULT_FETCHER_SOURCE_MODE: FetcherSourceMode = 'live_context';

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
  const candidate = context['entity'] ?? context['entityJson'] ?? context['product'] ?? null;
  return isObjectRecord(candidate) ? candidate : null;
};

const readLocationPathnameFromContext = (
  context: Record<string, unknown> | null | undefined
): string | null => {
  if (!context) return null;
  const location = context['location'];
  if (!isObjectRecord(location)) return null;
  return readString(location['pathname']);
};

const readFetcherSourceMode = (node: NodeHandlerContext['node']): FetcherSourceMode => {
  const mode = node.config?.fetcher?.sourceMode;
  if (mode === 'live_context' || mode === 'simulation_id' || mode === 'live_then_simulation') {
    return mode;
  }
  return DEFAULT_FETCHER_SOURCE_MODE;
};

const shouldPreferLiveEntityOverSimulation = (args: {
  liveEntityId: string | null;
  liveEntityType: string | null;
  simulationEntityId: string | null;
  simulationEntityType: string | null;
  incomingContextRecord: Record<string, unknown> | null;
  triggerContextRecord: Record<string, unknown> | null;
}): boolean => {
  if (!args.liveEntityId || !args.liveEntityType) {
    return false;
  }

  if (
    args.liveEntityId === args.simulationEntityId &&
    args.liveEntityType === args.simulationEntityType
  ) {
    return false;
  }

  const pathname =
    readLocationPathnameFromContext(args.incomingContextRecord) ??
    readLocationPathnameFromContext(args.triggerContextRecord);
  if (pathname?.startsWith('/admin/ai-paths')) {
    return false;
  }

  return true;
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
  toast,
  activePathId,
  now,
  strictFlowMode,
}: NodeHandlerContext): Promise<RuntimePortValues> => {
  const triggerSignal = coerceInput(nodeInputs['trigger']);
  if (triggerSignal === undefined || triggerSignal === null || triggerSignal === false) {
    return {};
  }

  const sourceMode = readFetcherSourceMode(node);
  const triggerContextRecord = isObjectRecord(triggerContext) ? triggerContext : null;
  const incomingContext = coerceInput(nodeInputs['context']);
  const incomingContextRecord = isObjectRecord(incomingContext) ? incomingContext : null;
  const incomingMeta = coerceInput(nodeInputs['meta']);
  const incomingMetaRecord = isObjectRecord(incomingMeta) ? incomingMeta : {};

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
      if (!liveEntity) {
        toast(`No ${liveEntityType} data found for ID ${liveEntityId}.`, { variant: 'error' });
      }
    } catch (error) {
      logClientError(error);
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
    normalizeEntityType(node.config?.fetcher?.entityType) ?? liveEntityType ?? 'product';

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
      if (!entity) {
        toast(`No ${simulationEntityType} data found for ID ${simulationEntityId}.`, {
          variant: 'error',
        });
      }
      return {
        entityId: simulationEntityId,
        entityType: simulationEntityType,
        entity,
      };
    } catch (error) {
      logClientError(error);
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
  let resolvedSource: FetcherResolvedSource = 'live_context';

  if (sourceMode === 'simulation_id') {
    if (
      shouldPreferLiveEntityOverSimulation({
        liveEntityId,
        liveEntityType,
        simulationEntityId,
        simulationEntityType,
        incomingContextRecord,
        triggerContextRecord,
      })
    ) {
      resolvedEntityId = liveEntityId;
      resolvedEntityType = liveEntityType;
      resolvedEntity = liveEntity;
      resolvedSource = 'live_context_override';
    } else {
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
      resolvedSource = 'simulation_id';
    }
  } else if (sourceMode === 'live_then_simulation') {
    const hasLiveReference = Boolean(liveEntityId && liveEntityType);
    if (!hasLiveReference && simulationEntityId) {
      const simulated = await resolveSimulation();
      resolvedEntityId = simulated.entityId;
      resolvedEntityType = simulated.entityType;
      resolvedEntity = simulated.entity;
      sourceTag = 'simulation_fetcher';
      resolvedSource = 'simulation_id';
    }
  }

  const hasResolvedEntity =
    isObjectRecord(resolvedEntity) && Object.keys(resolvedEntity).length > 0;
  const shouldFailMissingSimulationEntity =
    resolvedSource === 'simulation_id' &&
    Boolean(resolvedEntityId && resolvedEntityType) &&
    (sourceMode === 'simulation_id' || strictFlowMode);

  if (shouldFailMissingSimulationEntity && !hasResolvedEntity) {
    throw new Error(
      `Fetcher ${node.title ?? node.id} could not hydrate ${resolvedEntityType}:${resolvedEntityId}. Check fetcher simulation entity configuration.`
    );
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
    fetcherResolvedSource: resolvedSource,
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
