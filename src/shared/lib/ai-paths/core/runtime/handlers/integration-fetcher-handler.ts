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
type FetcherEntityState = {
  entityId: string | null;
  entityType: string | null;
  entity: Record<string, unknown> | null;
};
type FetcherResolvedState = FetcherEntityState & {
  sourceTag: 'trigger_fetcher' | 'simulation_fetcher';
  resolvedSource: FetcherResolvedSource;
};

const DEFAULT_FETCHER_SOURCE_MODE: FetcherSourceMode = 'live_context';
const ENTITY_OBJECT_CONTEXT_KEYS = ['entity', 'entityJson', 'product'] as const;

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

  for (const key of ENTITY_OBJECT_CONTEXT_KEYS) {
    const candidate = context[key];
    if (isObjectRecord(candidate)) {
      return candidate;
    }
  }

  return null;
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

  appendFetcherEntityAliases(next, args);

  return next;
};

const appendFetcherEntityAliases = (
  target: Record<string, unknown>,
  args: {
    entity: Record<string, unknown> | null;
    entityId: string | null;
    entityType: string | null;
  }
): void => {
  if (args.entityId && args.entityType === 'product') {
    target['productId'] = args.entityId;
  }
  if (!args.entity) {
    return;
  }

  target['entity'] = args.entity;
  target['entityJson'] = args.entity;
  if (args.entityType === 'product') {
    target['product'] = args.entity;
  }
};

const hydrateFetcherEntity = async (args: {
  entityId: string | null;
  entityType: string | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  toast: NodeHandlerContext['toast'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  node: NodeHandlerContext['node'];
  sourceMode: FetcherSourceMode;
  phase: 'live' | 'simulation';
}): Promise<Record<string, unknown> | null> => {
  if (!args.entityId || !args.entityType) return null;

  try {
    const entity = await args.fetchEntityCached(args.entityType, args.entityId);
    if (!entity) {
      args.toast(`No ${args.entityType} data found for ID ${args.entityId}.`, {
        variant: 'error',
      });
    }
    return entity;
  } catch (error) {
    logClientError(error);
    args.reportAiPathsError(
      error,
      {
        service: 'ai-paths-runtime',
        nodeId: args.node.id,
        nodeType: args.node.type,
        fetcherSourceMode: args.sourceMode,
        entityId: args.entityId,
        entityType: args.entityType,
      },
      `Fetcher ${args.phase} hydration failed for ${args.entityType}:${args.entityId}`
    );
    return null;
  }
};

const resolveSimulationEntity = async (args: {
  simulationEntityId: string | null;
  simulationEntityType: string | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  toast: NodeHandlerContext['toast'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  node: NodeHandlerContext['node'];
  sourceMode: FetcherSourceMode;
}): Promise<FetcherEntityState> => ({
  entityId: args.simulationEntityId,
  entityType: args.simulationEntityType,
  entity: await hydrateFetcherEntity({
    entityId: args.simulationEntityId,
    entityType: args.simulationEntityType,
    fetchEntityCached: args.fetchEntityCached,
    toast: args.toast,
    reportAiPathsError: args.reportAiPathsError,
    node: args.node,
    sourceMode: args.sourceMode,
    phase: 'simulation',
  }),
});

const resolveSimulationSourceSelection = async (args: {
  liveEntityId: string | null;
  liveEntityType: string | null;
  liveEntity: Record<string, unknown> | null;
  simulationEntityId: string | null;
  simulationEntityType: string | null;
  incomingContextRecord: Record<string, unknown> | null;
  triggerContextRecord: Record<string, unknown> | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  toast: NodeHandlerContext['toast'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  node: NodeHandlerContext['node'];
  sourceMode: FetcherSourceMode;
}): Promise<FetcherResolvedState> => {
  if (
    shouldPreferLiveEntityOverSimulation({
      liveEntityId: args.liveEntityId,
      liveEntityType: args.liveEntityType,
      simulationEntityId: args.simulationEntityId,
      simulationEntityType: args.simulationEntityType,
      incomingContextRecord: args.incomingContextRecord,
      triggerContextRecord: args.triggerContextRecord,
    })
  ) {
    return {
      entityId: args.liveEntityId,
      entityType: args.liveEntityType,
      entity: args.liveEntity,
      sourceTag: 'trigger_fetcher',
      resolvedSource: 'live_context_override',
    };
  }

  if (!args.simulationEntityId) {
    throw new Error(
      `Fetcher ${args.node.title ?? args.node.id} is set to "Simulated entity by ID" but no entity ID is configured.`
    );
  }

  const simulated = await resolveSimulationEntity(args);
  return {
    ...simulated,
    sourceTag: 'simulation_fetcher',
    resolvedSource: 'simulation_id',
  };
};

const resolveLiveThenSimulationSourceSelection = async (args: {
  liveEntityId: string | null;
  liveEntityType: string | null;
  liveEntity: Record<string, unknown> | null;
  simulationEntityId: string | null;
  simulationEntityType: string | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  toast: NodeHandlerContext['toast'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  node: NodeHandlerContext['node'];
  sourceMode: FetcherSourceMode;
}): Promise<FetcherResolvedState> => {
  const hasLiveReference = Boolean(args.liveEntityId && args.liveEntityType);
  if (!hasLiveReference && args.simulationEntityId) {
    const simulated = await resolveSimulationEntity(args);
    return {
      ...simulated,
      sourceTag: 'simulation_fetcher',
      resolvedSource: 'simulation_id',
    };
  }

  return {
    entityId: args.liveEntityId,
    entityType: args.liveEntityType,
    entity: args.liveEntity,
    sourceTag: 'trigger_fetcher',
    resolvedSource: 'live_context',
  };
};

const resolveFetcherSourceSelection = async (args: {
  sourceMode: FetcherSourceMode;
  liveEntityId: string | null;
  liveEntityType: string | null;
  liveEntity: Record<string, unknown> | null;
  simulationEntityId: string | null;
  simulationEntityType: string | null;
  incomingContextRecord: Record<string, unknown> | null;
  triggerContextRecord: Record<string, unknown> | null;
  fetchEntityCached: NodeHandlerContext['fetchEntityCached'];
  toast: NodeHandlerContext['toast'];
  reportAiPathsError: NodeHandlerContext['reportAiPathsError'];
  node: NodeHandlerContext['node'];
}): Promise<FetcherResolvedState> => {
  if (args.sourceMode === 'simulation_id') {
    return resolveSimulationSourceSelection(args);
  }
  if (args.sourceMode === 'live_then_simulation') {
    return resolveLiveThenSimulationSourceSelection(args);
  }
  return {
    entityId: args.liveEntityId,
    entityType: args.liveEntityType,
    entity: args.liveEntity,
    sourceTag: 'trigger_fetcher',
    resolvedSource: 'live_context',
  };
};

const hasResolvedFetcherEntity = (entity: unknown): boolean =>
  isObjectRecord(entity) && Object.keys(entity).length > 0;

const shouldFailMissingResolvedSimulationEntity = (args: {
  resolvedSource: FetcherResolvedSource;
  resolvedEntityId: string | null;
  resolvedEntityType: string | null;
  sourceMode: FetcherSourceMode;
  strictFlowMode: boolean;
}): boolean =>
  args.resolvedSource === 'simulation_id' &&
  Boolean(args.resolvedEntityId && args.resolvedEntityType) &&
  (args.sourceMode === 'simulation_id' || args.strictFlowMode);

const buildFetcherMetaPayload = (args: {
  base: Record<string, unknown>;
  now: string;
  sourceMode: FetcherSourceMode;
  resolvedSource: FetcherResolvedSource;
  resolvedEntityId: string | null;
  resolvedEntityType: string | null;
  activePathId: string | null;
}): Record<string, unknown> => ({
  ...args.base,
  fetchedAt: args.now,
  fetcherSourceMode: args.sourceMode,
  fetcherResolvedSource: args.resolvedSource,
  entityId: args.resolvedEntityId,
  entityType: args.resolvedEntityType,
  pathId: args.activePathId,
});

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
    liveEntity = await hydrateFetcherEntity({
      entityId: liveEntityId,
      entityType: liveEntityType,
      fetchEntityCached,
      toast,
      reportAiPathsError,
      node,
      sourceMode,
      phase: 'live',
    });
  }

  const configEntityId =
    readString(node.config?.fetcher?.entityId) ??
    readString(node.config?.fetcher?.productId) ??
    null;
  const configEntityType =
    normalizeEntityType(node.config?.fetcher?.entityType) ?? liveEntityType ?? 'product';

  const simulationEntityId = configEntityId ?? liveEntityId;
  const simulationEntityType = configEntityType;

  const resolved = await resolveFetcherSourceSelection({
    sourceMode,
    liveEntityId,
    liveEntityType,
    liveEntity,
    simulationEntityId,
    simulationEntityType,
    incomingContextRecord,
    triggerContextRecord,
    fetchEntityCached,
    toast,
    reportAiPathsError,
    node,
  });

  const resolvedEntityId = resolved.entityId;
  const resolvedEntityType = resolved.entityType;
  const resolvedEntity = resolved.entity;
  const sourceTag = resolved.sourceTag;
  const resolvedSource = resolved.resolvedSource;

  const hasResolvedEntity = hasResolvedFetcherEntity(resolvedEntity);
  const shouldFailMissingSimulationEntity = shouldFailMissingResolvedSimulationEntity({
    resolvedSource,
    resolvedEntityId,
    resolvedEntityType,
    sourceMode,
    strictFlowMode,
  });

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
    ...buildFetcherMetaPayload({
      base: incomingMetaRecord,
      now,
      sourceMode,
      resolvedSource,
      resolvedEntityId,
      resolvedEntityType,
      activePathId,
    }),
  };

  return {
    context,
    meta,
    entityId: resolvedEntityId,
    entityType: resolvedEntityType,
  };
};
