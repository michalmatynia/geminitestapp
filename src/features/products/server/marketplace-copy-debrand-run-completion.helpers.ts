import 'server-only';

import {
  extractDebrandedMarketplaceCopyResultFromAiPathRunDetail,
  type DebrandedMarketplaceCopyAiPathResult,
} from '@/features/products/lib/extractDebrandedMarketplaceCopyFromAiPathRunDetail';
import {
  isMarketplaceCopyDebrandNonProductDescription,
  sanitizeMarketplaceCopyDebrandGeneratedCopy,
} from '@/features/products/lib/marketplaceCopyDebrandText';
import type { AiPathRunRecord, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type {
  ProductMarketplaceContentOverrideDraft,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import { normalizeProductMarketplaceContentOverrideDrafts } from '@/shared/contracts/products/product';

import { buildRuntimeNodeMetadataById } from './marketplace-copy-debrand-run-runtime-metadata';

export type PersistMarketplaceCopyDebrandBatchRunResultInput = {
  run: Pick<AiPathRunRecord, 'id' | 'entityId' | 'triggerContext' | 'userId'>;
  runMeta: Record<string, unknown>;
  runtimeState: unknown;
  accOutputs: Record<string, RuntimePortValues>;
};

export type PersistMarketplaceCopyDebrandBatchRunResultOutcome = {
  applied: boolean;
  reason:
    | 'applied'
    | 'not_marketplace_copy_debrand_batch'
    | 'missing_product_id'
    | 'missing_generated_copy'
    | 'missing_target_row'
    | 'product_not_found'
    | 'already_current'
    | 'persist_failed';
  productId?: string;
  rowIndex?: number;
};

export type MarketplaceCopyOverrideUpdateResolution =
  | {
      kind: 'skip';
      outcome: PersistMarketplaceCopyDebrandBatchRunResultOutcome;
    }
  | {
      kind: 'update';
      integrationId: string | null;
      nextOverrides: ProductMarketplaceContentOverrideDraft[];
      rowIndex: number;
    };

const BATCH_META_SOURCE = 'product_marketplace_copy_debrand_batch';
const BATCH_SERVER_SOURCE = 'marketplace-copy-debrand-batch';
const ROW_META_SOURCE = 'product_marketplace_copy_debrand_row';
const ROW_SERVER_SOURCE = 'marketplace-copy-debrand-row';

export const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asInteger = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;
  const text = asTrimmedString(value);
  if (text === null) return null;
  const parsed = Number.parseInt(text, 10);
  return Number.isInteger(parsed) && parsed >= 0 && String(parsed) === text ? parsed : null;
};

const readServerMetadata = (runMeta: Record<string, unknown>): Record<string, unknown> | null =>
  asRecord(runMeta['serverMetadata']);

export const isMarketplaceCopyDebrandBatchRun = (
  runMeta: Record<string, unknown>
): boolean => {
  const serverMetadata = readServerMetadata(runMeta);
  return (
    asTrimmedString(runMeta['source']) === BATCH_META_SOURCE ||
    asTrimmedString(runMeta['source']) === ROW_META_SOURCE ||
    asTrimmedString(serverMetadata?.['source']) === BATCH_SERVER_SOURCE ||
    asTrimmedString(serverMetadata?.['source']) === ROW_SERVER_SOURCE
  );
};

const readMarketplaceCopyDebrandInput = (
  input: PersistMarketplaceCopyDebrandBatchRunResultInput
): Record<string, unknown> | null => {
  const triggerContext = asRecord(input.run.triggerContext);
  const extras = asRecord(triggerContext?.['extras']);
  return (
    asRecord(extras?.['marketplaceCopyDebrandInput']) ??
    asRecord(input.runMeta['marketplaceCopyDebrandInput'])
  );
};

const resolveIntegrationId = (
  input: PersistMarketplaceCopyDebrandBatchRunResultInput
): string | null => {
  const serverMetadata = readServerMetadata(input.runMeta);
  const directIntegrationId =
    asTrimmedString(serverMetadata?.['integrationId']) ??
    asTrimmedString(input.runMeta['integrationId']);
  if (directIntegrationId !== null) return directIntegrationId;

  const marketplaceCopyDebrandInput = readMarketplaceCopyDebrandInput(input);
  const targetRow = asRecord(marketplaceCopyDebrandInput?.['targetRow']);
  return (
    asArray(targetRow?.['integrationIds'])
      .map(asTrimmedString)
      .find((integrationId: string | null): integrationId is string => integrationId !== null) ??
    null
  );
};

const resolveFallbackRowIndex = (
  input: PersistMarketplaceCopyDebrandBatchRunResultInput
): number | null => {
  const serverMetadata = readServerMetadata(input.runMeta);
  const directIndex = asInteger(serverMetadata?.['rowIndex']);
  if (directIndex !== null) return directIndex;

  const marketplaceCopyDebrandInput = readMarketplaceCopyDebrandInput(input);
  const targetRow = asRecord(marketplaceCopyDebrandInput?.['targetRow']);
  return asInteger(targetRow?.['index']);
};

const findMarketplaceOverrideIndex = (input: {
  overrides: ProductMarketplaceContentOverrideDraft[];
  integrationId: string | null;
  fallbackRowIndex: number | null;
}): number => {
  if (input.integrationId !== null) {
    const matchingIndex = input.overrides.findIndex(
      (entry: ProductMarketplaceContentOverrideDraft): boolean =>
        entry.integrationIds.includes(input.integrationId as string)
    );
    if (matchingIndex >= 0) return matchingIndex;
  }

  if (
    input.fallbackRowIndex !== null &&
    input.fallbackRowIndex >= 0 &&
    input.fallbackRowIndex < input.overrides.length
  ) {
    return input.fallbackRowIndex;
  }

  return -1;
};

const buildRunDetailForExtraction = (input: {
  runtimeState: unknown;
  accOutputs: Record<string, RuntimePortValues>;
}): Record<string, unknown> => {
  const nodeMetadataById = buildRuntimeNodeMetadataById(input.runtimeState);

  return {
    run: { runtimeState: input.runtimeState },
    nodes: Object.entries(input.accOutputs).map(
      ([id, outputs]: [string, RuntimePortValues]): Record<string, unknown> => {
        const metadata = nodeMetadataById.get(id);
        const nodeType = metadata?.nodeType ?? null;
        const nodeTitle = metadata?.nodeTitle ?? null;
        return {
          id,
          nodeId: id,
          ...(nodeType !== null ? { type: nodeType, nodeType } : {}),
          ...(nodeTitle !== null ? { nodeTitle } : {}),
          outputs,
        };
      }
    ),
  };
};

export const buildUpdateOptions = (
  run: Pick<AiPathRunRecord, 'userId'>
): { userId: string } | undefined => {
  const userId = asTrimmedString(run.userId);
  return userId === null ? undefined : { userId };
};

const appendTargetOverride = (input: {
  overrides: ProductMarketplaceContentOverrideDraft[];
  integrationId: string | null;
  title: string | null;
  description: string | null;
}): ProductMarketplaceContentOverrideDraft[] | null => {
  if (input.integrationId === null) return null;
  return [
    ...input.overrides,
    {
      integrationIds: [input.integrationId],
      title: input.title,
      description: input.description,
    },
  ];
};

export const extractGeneratedCopy = (
  input: PersistMarketplaceCopyDebrandBatchRunResultInput
): DebrandedMarketplaceCopyAiPathResult | null => {
  const generatedCopy = extractDebrandedMarketplaceCopyResultFromAiPathRunDetail(
    buildRunDetailForExtraction(input)
  );
  const sanitizedCopy =
    generatedCopy !== null ? sanitizeMarketplaceCopyDebrandGeneratedCopy(generatedCopy) : null;
  return sanitizedCopy !== null &&
    (sanitizedCopy.title !== null || sanitizedCopy.description !== null)
    ? sanitizedCopy
    : null;
};

const resolveCurrentOverrideDescriptionFallback = (
  entry: ProductMarketplaceContentOverrideDraft
): string | null =>
  isMarketplaceCopyDebrandNonProductDescription(entry.description)
    ? null
    : (entry.description ?? null);

const updateExistingOverride = (input: {
  overrides: ProductMarketplaceContentOverrideDraft[];
  rowIndex: number;
  generatedCopy: DebrandedMarketplaceCopyAiPathResult;
}): ProductMarketplaceContentOverrideDraft[] =>
  input.overrides.map(
    (
      entry: ProductMarketplaceContentOverrideDraft,
      index: number
    ): ProductMarketplaceContentOverrideDraft =>
      index === input.rowIndex
        ? {
            ...entry,
            title: input.generatedCopy.title ?? entry.title ?? null,
            description:
              input.generatedCopy.description ?? resolveCurrentOverrideDescriptionFallback(entry),
          }
        : entry
  );

const buildNextOverrides = (input: {
  overrides: ProductMarketplaceContentOverrideDraft[];
  rowIndex: number;
  integrationId: string | null;
  generatedCopy: DebrandedMarketplaceCopyAiPathResult;
}): ProductMarketplaceContentOverrideDraft[] | null =>
  input.rowIndex >= 0
    ? updateExistingOverride(input)
    : appendTargetOverride({
        overrides: input.overrides,
        integrationId: input.integrationId,
        title: input.generatedCopy.title,
        description: input.generatedCopy.description,
      });

const hasOverrideChanged = (input: {
  currentOverrides: ProductMarketplaceContentOverrideDraft[];
  nextOverrides: ProductMarketplaceContentOverrideDraft[];
  rowIndex: number;
}): boolean => {
  const currentRow = input.currentOverrides[input.rowIndex];
  const nextRow = input.nextOverrides[input.rowIndex];
  if (currentRow === undefined || nextRow === undefined) return true;
  return (
    (currentRow.title ?? null) !== (nextRow.title ?? null) ||
    (currentRow.description ?? null) !== (nextRow.description ?? null)
  );
};

export const resolveMarketplaceCopyOverrideUpdate = (input: {
  runInput: PersistMarketplaceCopyDebrandBatchRunResultInput;
  product: ProductWithImages;
  productId: string;
  generatedCopy: DebrandedMarketplaceCopyAiPathResult;
}): MarketplaceCopyOverrideUpdateResolution => {
  const integrationId = resolveIntegrationId(input.runInput);
  const fallbackRowIndex = resolveFallbackRowIndex(input.runInput);
  const overrides = normalizeProductMarketplaceContentOverrideDrafts(
    input.product.marketplaceContentOverrides ?? []
  );
  const rowIndex = findMarketplaceOverrideIndex({ overrides, integrationId, fallbackRowIndex });
  const nextOverrides = buildNextOverrides({
    overrides,
    rowIndex,
    integrationId,
    generatedCopy: input.generatedCopy,
  });

  if (nextOverrides === null) {
    return {
      kind: 'skip',
      outcome: { applied: false, reason: 'missing_target_row', productId: input.productId },
    };
  }

  const resolvedRowIndex = rowIndex >= 0 ? rowIndex : nextOverrides.length - 1;
  if (
    !hasOverrideChanged({
      currentOverrides: overrides,
      nextOverrides,
      rowIndex: resolvedRowIndex,
    })
  ) {
    return {
      kind: 'skip',
      outcome: {
        applied: false,
        reason: 'already_current',
        productId: input.productId,
        rowIndex: resolvedRowIndex,
      },
    };
  }

  return { kind: 'update', integrationId, nextOverrides, rowIndex: resolvedRowIndex };
};
