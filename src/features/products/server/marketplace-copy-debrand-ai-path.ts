import 'server-only';

import {
  ensureCanonicalStarterWorkflowSettingsForPathIds,
  enqueuePathRun,
  getAiPathsSetting,
} from '@/features/ai/ai-paths/server';
import { assertAiPathRunQueueReadyForEnqueue } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import {
  buildMarketplaceCopyDebrandTriggerInput,
  sanitizeMarketplaceCopyDebrandTriggerInput,
} from '@/features/products/lib/buildMarketplaceCopyDebrandTriggerInput';
import { buildTriggeredProductEntityJson } from '@/features/products/lib/build-triggered-product-entity-json';
import { resolveMarketplaceCopyDebrandIntegrationName } from '@/features/products/server/marketplace-copy-debrand-batch';
import { prepareMarketplaceCopyDebrandRuntimeConfig } from '@/features/products/server/marketplace-copy-debrand-runtime-config';
import type { AiNode, PathConfig } from '@/shared/contracts/ai-paths';
import type { IntegrationRecord } from '@/shared/contracts/integrations/repositories';
import type { MarketplaceCopyDebrandTriggerInput } from '@/shared/contracts/products/marketplace-copy-debrand-run';
import type {
  ProductMarketplaceContentOverrideDraft,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import { badRequestError } from '@/shared/errors/app-error';
import { PATH_CONFIG_PREFIX } from '@/shared/lib/ai-paths/core/constants';
import { loadCanonicalStoredPathConfig } from '@/shared/lib/ai-paths/core/utils/stored-path-config';
import { buildTriggerContext } from '@/shared/lib/ai-paths/hooks/trigger-event-context';
import { createAiPathTriggerRequestId } from '@/shared/lib/ai-paths/hooks/trigger-event-utils';
import {
  MARKETPLACE_COPY_DEBRAND_PATH_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION,
  MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
} from '@/shared/lib/ai-paths/marketplace-copy-debrand';

type EnqueueMarketplaceCopyDebrandRunInput = {
  product: ProductWithImages;
  integration: IntegrationRecord;
  row: ProductMarketplaceContentOverrideDraft;
  rowIndex: number;
  userId?: string | null;
  integrationNameById?: Map<string, string>;
};

type EnqueueMarketplaceCopyDebrandRowRunInput = {
  productId: string | null;
  entityJson: Record<string, unknown>;
  marketplaceCopyDebrandInput: MarketplaceCopyDebrandTriggerInput;
  integration: IntegrationRecord;
  userId?: string | null;
};

type MarketplaceCopyDebrandRunMode = 'batch' | 'row';

const loadMarketplaceCopyDebrandPathConfig = async (): Promise<PathConfig> => {
  await ensureCanonicalStarterWorkflowSettingsForPathIds([MARKETPLACE_COPY_DEBRAND_PATH_ID]);
  const rawConfig = await getAiPathsSetting(
    `${PATH_CONFIG_PREFIX}${MARKETPLACE_COPY_DEBRAND_PATH_ID}`
  );
  if (typeof rawConfig !== 'string' || rawConfig.trim().length === 0) {
    throw badRequestError(
      `Stored AI Path config not found for "${MARKETPLACE_COPY_DEBRAND_PATH_ID}".`
    );
  }

  return loadCanonicalStoredPathConfig({
    pathId: MARKETPLACE_COPY_DEBRAND_PATH_ID,
    rawConfig,
  });
};

const findMarketplaceCopyDebrandTriggerNode = (config: PathConfig): AiNode => {
  const triggerNode = config.nodes.find(
    (node: AiNode): boolean =>
      node.type === 'trigger' &&
      (node.config?.trigger?.event ?? 'manual') === MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID
  );
  if (!triggerNode) {
    throw badRequestError('Debrand trigger node was not found in the configured AI Path.', {
      pathId: config.id,
      triggerEventId: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
    });
  }
  return triggerNode;
};

const toRecordOrUndefined = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const resolveIntegrationNamesForRow = (input: {
  row: ProductMarketplaceContentOverrideDraft;
  fallbackIntegration: IntegrationRecord;
  integrationNameById?: Map<string, string>;
}): string[] => {
  const fallbackName = resolveMarketplaceCopyDebrandIntegrationName(input.fallbackIntegration);
  return input.row.integrationIds.map((integrationId: string): string => {
    const named = input.integrationNameById?.get(integrationId)?.trim();
    if (typeof named === 'string' && named.length > 0) return named;
    if (integrationId === input.fallbackIntegration.id) return fallbackName;
    return integrationId;
  });
};

const buildMarketplaceCopyDebrandInput = (
  input: EnqueueMarketplaceCopyDebrandRunInput
): ReturnType<typeof buildMarketplaceCopyDebrandTriggerInput> => {
  const integrationNames = resolveIntegrationNamesForRow({
    row: input.row,
    fallbackIntegration: input.integration,
    integrationNameById: input.integrationNameById,
  });

  return buildMarketplaceCopyDebrandTriggerInput({
    values: {
      name_en: input.product.name_en ?? '',
      description_en: input.product.description_en ?? '',
    },
    row: {
      id: `batch:${input.product.id}:${input.row.integrationIds.join(',')}`,
      index: input.rowIndex,
      integrationIds: input.row.integrationIds,
      integrationNames,
      currentAlternateTitle: input.row.title ?? '',
      currentAlternateDescription: input.row.description ?? '',
    },
  });
};

const buildMarketplaceCopyDebrandEntityJson = (
  product: ProductWithImages,
  marketplaceCopyDebrandInput: ReturnType<typeof buildMarketplaceCopyDebrandTriggerInput>
): Record<string, unknown> => {
  const entityJson = buildTriggeredProductEntityJson({
    product,
    values: { ...product, imageLinks: product.imageLinks ?? [] },
  });
  entityJson['marketplaceCopyDebrandInput'] = marketplaceCopyDebrandInput;
  return entityJson;
};

const buildMarketplaceCopyDebrandContext = (input: {
  pathConfig: PathConfig;
  entityId: string | null;
  triggerNode: AiNode;
  marketplaceCopyDebrandInput: MarketplaceCopyDebrandTriggerInput;
  entityJson: Record<string, unknown>;
  mode: MarketplaceCopyDebrandRunMode;
}): Record<string, unknown> =>
  buildTriggerContext({
    triggerNode: input.triggerNode,
    triggerEventId: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
    triggerLabel: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
    entityType: 'product',
    entityId: input.entityId,
    entityJson: input.entityJson,
    pathInfo: { id: input.pathConfig.id, name: input.pathConfig.name },
    source: { tab: 'product', location: MARKETPLACE_COPY_DEBRAND_TRIGGER_LOCATION },
    extras: {
      marketplaceCopyDebrandInput: input.marketplaceCopyDebrandInput,
      mode: input.mode,
    },
  });

const buildMarketplaceCopyDebrandRunMeta = (input: {
  pathConfig: PathConfig;
  requestId: string;
  integration: IntegrationRecord;
  rowIndex: number;
  mode: MarketplaceCopyDebrandRunMode;
}): Record<string, unknown> => {
  const runtimeState = toRecordOrUndefined(input.pathConfig.runtimeState);
  const parserSamples = toRecordOrUndefined(input.pathConfig.parserSamples);
  const updaterSamples = toRecordOrUndefined(input.pathConfig.updaterSamples);
  const source =
    input.mode === 'batch'
      ? 'product_marketplace_copy_debrand_batch'
      : 'product_marketplace_copy_debrand_row';
  const serverSource =
    input.mode === 'batch' ? 'marketplace-copy-debrand-batch' : 'marketplace-copy-debrand-row';

  return {
    source,
    requestId: input.requestId,
    triggerLabel: MARKETPLACE_COPY_DEBRAND_TRIGGER_NAME,
    strictFlowMode: input.pathConfig.strictFlowMode !== false,
    historyRetentionPasses: input.pathConfig.historyRetentionPasses,
    aiPathsValidation: input.pathConfig.aiPathsValidation,
    preflightRuntimeHints: {
      ...(parserSamples !== undefined ? { parserSamples } : {}),
      ...(updaterSamples !== undefined ? { updaterSamples } : {}),
      ...(runtimeState !== undefined ? { runtimeState } : {}),
    },
    serverMetadata: {
      source: serverSource,
      integrationId: input.integration.id,
      integrationSlug: input.integration.slug,
      rowIndex: input.rowIndex,
    },
  };
};

export const enqueueMarketplaceCopyDebrandRun = async (
  input: EnqueueMarketplaceCopyDebrandRunInput
): Promise<string> => {
  await assertAiPathRunQueueReadyForEnqueue();
  const pathConfig = await loadMarketplaceCopyDebrandPathConfig();
  const runtimeConfig = prepareMarketplaceCopyDebrandRuntimeConfig(pathConfig);
  const triggerNode = findMarketplaceCopyDebrandTriggerNode(pathConfig);
  const marketplaceCopyDebrandInput = buildMarketplaceCopyDebrandInput(input);
  const entityJson = buildMarketplaceCopyDebrandEntityJson(
    input.product,
    marketplaceCopyDebrandInput
  );
  const triggerContext = buildMarketplaceCopyDebrandContext({
    pathConfig,
    entityId: input.product.id,
    triggerNode,
    marketplaceCopyDebrandInput,
    entityJson,
    mode: 'batch',
  });
  const requestId = createAiPathTriggerRequestId({
    pathId: pathConfig.id,
    triggerEventId: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
    entityType: 'product',
    entityId: input.product.id,
  });

  const run = await enqueuePathRun({
    userId: input.userId ?? null,
    pathId: runtimeConfig.id,
    pathName: runtimeConfig.name,
    nodes: runtimeConfig.nodes,
    edges: runtimeConfig.edges,
    triggerEvent: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
    triggerNodeId: triggerNode.id,
    triggerContext,
    entityId: input.product.id,
    entityType: 'product',
    requestId,
    meta: buildMarketplaceCopyDebrandRunMeta({
      pathConfig,
      requestId,
      integration: input.integration,
      rowIndex: input.rowIndex,
      mode: 'batch',
    }),
  });

  return run.id;
};

export const enqueueMarketplaceCopyDebrandRowRun = async (
  input: EnqueueMarketplaceCopyDebrandRowRunInput
): Promise<string> => {
  await assertAiPathRunQueueReadyForEnqueue();
  const pathConfig = await loadMarketplaceCopyDebrandPathConfig();
  const runtimeConfig = prepareMarketplaceCopyDebrandRuntimeConfig(pathConfig);
  const triggerNode = findMarketplaceCopyDebrandTriggerNode(pathConfig);
  const marketplaceCopyDebrandInput = sanitizeMarketplaceCopyDebrandTriggerInput(
    input.marketplaceCopyDebrandInput
  );
  const entityJson = {
    ...input.entityJson,
    marketplaceCopyDebrandInput,
  };
  const triggerContext = buildMarketplaceCopyDebrandContext({
    pathConfig,
    entityId: input.productId,
    triggerNode,
    marketplaceCopyDebrandInput,
    entityJson,
    mode: 'row',
  });
  const requestId = createAiPathTriggerRequestId({
    pathId: pathConfig.id,
    triggerEventId: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
    entityType: 'product',
    entityId: input.productId,
  });

  const run = await enqueuePathRun({
    userId: input.userId ?? null,
    pathId: runtimeConfig.id,
    pathName: runtimeConfig.name,
    nodes: runtimeConfig.nodes,
    edges: runtimeConfig.edges,
    triggerEvent: MARKETPLACE_COPY_DEBRAND_TRIGGER_BUTTON_ID,
    triggerNodeId: triggerNode.id,
    triggerContext,
    entityId: input.productId,
    entityType: 'product',
    requestId,
    meta: buildMarketplaceCopyDebrandRunMeta({
      pathConfig,
      requestId,
      integration: input.integration,
      rowIndex: marketplaceCopyDebrandInput.targetRow.index,
      mode: 'row',
    }),
  });

  return run.id;
};
