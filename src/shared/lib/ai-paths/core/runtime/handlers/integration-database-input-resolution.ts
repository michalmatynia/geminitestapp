import { coerceInput } from '../../utils';

export type ResolveDatabaseInputsInput = {
  nodeInputs: Record<string, unknown>;
  triggerContext: unknown;
  fallbackEntityId: string | null;
  simulationEntityType: string | null;
  strictFlowMode?: boolean;
};

export function resolveDatabaseInputs({
  nodeInputs,
  triggerContext,
  fallbackEntityId,
  simulationEntityType,
  strictFlowMode = true,
}: ResolveDatabaseInputsInput): Record<string, unknown> {
  const next: Record<string, unknown> = { ...nodeInputs };
  const pickString = (value: unknown): string | undefined =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  const pickCatalogId = (
    record: Record<string, unknown> | null | undefined
  ): string | undefined => {
    if (!record || typeof record !== 'object') return undefined;
    return pickString(record['catalogId']);
  };
  const pickFromContext = (ctx: Record<string, unknown> | null | undefined): void => {
    if (!ctx || typeof ctx !== 'object') return;
    const entityId: string | undefined =
      pickString(ctx['entityId']) ??
      pickString(ctx['productId']) ??
      pickString(ctx['id']) ??
      pickString(ctx['_id']);
    const productId: string | undefined =
      pickString(ctx['productId']) ??
      pickString(ctx['entityId']) ??
      pickString(ctx['id']) ??
      pickString(ctx['_id']);
    const entityType: string | undefined = pickString(ctx['entityType']);
    const catalogId: string | undefined = pickCatalogId(ctx);
    if (next['entityId'] === undefined && entityId) next['entityId'] = entityId;
    if (next['productId'] === undefined && productId) next['productId'] = productId;
    if (next['entityType'] === undefined && entityType) {
      next['entityType'] = entityType;
    }
    if (next['catalogId'] === undefined && catalogId) {
      next['catalogId'] = catalogId;
    }
  };
  const applyFromObject = (record: Record<string, unknown>): void => {
    const entityId: string | undefined =
      pickString(record['entityId']) ??
      pickString(record['productId']) ??
      pickString(record['id']) ??
      pickString(record['_id']);
    const productId: string | undefined =
      pickString(record['productId']) ??
      pickString(record['entityId']) ??
      pickString(record['id']) ??
      pickString(record['_id']);
    const entityType: string | undefined = pickString(record['entityType']);
    const catalogId: string | undefined = pickCatalogId(record);
    if (next['entityId'] === undefined && entityId) next['entityId'] = entityId;
    if (next['productId'] === undefined && productId) next['productId'] = productId;
    if (next['entityType'] === undefined && entityType) {
      next['entityType'] = entityType;
    }
    if (next['catalogId'] === undefined && catalogId) {
      next['catalogId'] = catalogId;
    }
  };
  const contextValue: unknown = coerceInput(nodeInputs['context']);
  if (contextValue && typeof contextValue === 'object') {
    applyFromObject(contextValue as Record<string, unknown>);
  }
  const metaValue: unknown = coerceInput(nodeInputs['meta']);
  if (metaValue && typeof metaValue === 'object') {
    applyFromObject(metaValue as Record<string, unknown>);
  }
  const bundleValue: unknown = coerceInput(nodeInputs['bundle']);
  if (bundleValue && typeof bundleValue === 'object') {
    applyFromObject(bundleValue as Record<string, unknown>);
  }
  if (!strictFlowMode) {
    pickFromContext(triggerContext as Record<string, unknown>);
    if (next['entityId'] === undefined && fallbackEntityId) {
      next['entityId'] = fallbackEntityId;
    }
    if (next['productId'] === undefined && next['entityId']) {
      next['productId'] = next['entityId'];
    }
    if (next['entityType'] === undefined && simulationEntityType) {
      next['entityType'] = simulationEntityType;
    }
    if (next['value'] === undefined) {
      const fallbackValue =
        (typeof next['entityId'] === 'string' && next['entityId'].trim()
          ? next['entityId']
          : undefined) ??
        (typeof next['productId'] === 'string' && next['productId'].trim()
          ? next['productId']
          : undefined);
      if (fallbackValue) {
        next['value'] = fallbackValue;
      }
    }
  }
  return next;
}
