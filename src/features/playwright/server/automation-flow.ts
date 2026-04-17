import 'server-only';

import type { IntegrationConnectionRecord } from '@/shared/contracts/integration-storage';
import type {
  PlaywrightAutomationBlock,
  PlaywrightAutomationWriteErrorMode,
  PlaywrightAutomationProductDefaults,
  PlaywrightAutomationValueSource,
  PlaywrightImportAutomationFlow,
} from '@/shared/contracts/playwright-automation';
import { playwrightImportAutomationFlowSchema } from '@/shared/contracts/playwright-automation';
import { getValueAtPath } from '@/shared/lib/ai-paths/core/utils/json';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { createDraft } from '@/features/drafter/server';
import type { ProductDraft, ProductWithImages } from '@/features/products/server';
import { productService } from '@/features/products/server';
import {
  buildPlaywrightProductCreateInput,
  buildPlaywrightProductDraftInput,
  mapPlaywrightImportProduct,
  parsePlaywrightFieldMapperJson,
  type PlaywrightFieldMapperEntry,
  type PlaywrightMappedImportProduct,
} from '@/features/integrations/services/playwright-listing/field-mapper';
import {
  mapScrapedProductToDraftPreview,
  parsePlaywrightDraftMapperJson,
  type PlaywrightDraftMapperRow,
} from '@/features/integrations/services/playwright-listing/draft-mapper';

import { buildPlaywrightImportInput } from './import-input';
import { runPlaywrightProgrammableImportForConnection } from './programmable';

type PlaywrightAutomationScope = {
  input: Record<string, unknown>;
  vars: Record<string, unknown>;
  current: unknown;
  results: Record<string, unknown[]>;
};

type PlaywrightMappedProductEnvelope = {
  kind: 'mapped_product';
  mappedProduct: PlaywrightMappedImportProduct;
  defaults?: PlaywrightAutomationProductDefaults | null;
};

type PlaywrightMappedDraftEnvelope = {
  kind: 'mapped_draft';
  draftPayload: Parameters<typeof createDraft>[0];
  diagnostics: ReturnType<typeof mapScrapedProductToDraftPreview>['diagnostics'];
};

type PlaywrightAutomationWriteErrorEnvelope = {
  kind: 'write_error';
  operation: 'create_draft' | 'create_product';
  status: 'failed';
  payload: unknown;
  errorMessage: string;
  errorName: string | null;
};

type PlaywrightAutomationExecutionContext = {
  dryRun: boolean;
  draftMapperRows: PlaywrightDraftMapperRow[];
  fieldMappings: PlaywrightFieldMapperEntry[];
  scope: PlaywrightAutomationScope;
  drafts: ProductDraft[];
  draftPayloads: Parameters<typeof createDraft>[0][];
  writeOutcomes: PlaywrightAutomationWriteOutcome[];
  products: ProductWithImages[];
  productPayloads: Parameters<typeof productService.createProduct>[0][];
};

export type PlaywrightAutomationWriteOutcome =
  | {
      kind: 'draft';
      status: 'dry_run' | 'created' | 'failed';
      index: number;
      payload: Parameters<typeof createDraft>[0];
      record: ProductDraft | null;
      errorMessage?: string | null;
      errorName?: string | null;
    }
  | {
      kind: 'product';
      status: 'dry_run' | 'created' | 'failed';
      index: number;
      payload: Parameters<typeof productService.createProduct>[0];
      record: ProductWithImages | null;
      errorMessage?: string | null;
      errorName?: string | null;
    };

export type PlaywrightImportAutomationRunResult = {
  flow: PlaywrightImportAutomationFlow;
  input: Record<string, unknown>;
  rawProducts: Array<Record<string, unknown>>;
  rawResult: Record<string, unknown>;
  drafts: ProductDraft[];
  draftPayloads: Parameters<typeof createDraft>[0][];
  writeOutcomes: PlaywrightAutomationWriteOutcome[];
  products: ProductWithImages[];
  productPayloads: Parameters<typeof productService.createProduct>[0][];
  results: Record<string, unknown[]>;
  vars: Record<string, unknown>;
};

const evaluateValueSource = (
  source: PlaywrightAutomationValueSource,
  scope: PlaywrightAutomationScope
): unknown => {
  if (source.type === 'literal') return source.value;
  return getValueAtPath(scope, source.path);
};

const resolveBlockSourceValue = ({
  source,
  scope,
}: {
  source?: PlaywrightAutomationValueSource;
  scope: PlaywrightAutomationScope;
}): unknown => {
  if (!source) return scope.current;
  return evaluateValueSource(source, scope);
};

const setValueAtPath = (
  scope: PlaywrightAutomationScope,
  path: string,
  value: unknown
): void => {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  if (segments.length === 0) {
    throw new Error('Automation flow paths must not be empty.');
  }

  let cursor: Record<string, unknown> = scope as Record<string, unknown>;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index] as string;
    const nextValue = cursor[segment];
    if (!isObjectRecord(nextValue)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  }

  cursor[segments[segments.length - 1] as string] = value;
};

const createMappedProductEnvelope = ({
  rawProduct,
  fieldMappings,
  defaults,
}: {
  rawProduct: Record<string, unknown>;
  fieldMappings: PlaywrightFieldMapperEntry[];
  defaults?: PlaywrightAutomationProductDefaults | null;
}): PlaywrightMappedProductEnvelope => ({
  kind: 'mapped_product',
  mappedProduct: mapPlaywrightImportProduct(rawProduct, fieldMappings),
  defaults: defaults ?? null,
});

const isMappedProductEnvelope = (value: unknown): value is PlaywrightMappedProductEnvelope =>
  isObjectRecord(value) &&
  value['kind'] === 'mapped_product' &&
  isObjectRecord(value['mappedProduct']);

const isMappedDraftEnvelope = (value: unknown): value is PlaywrightMappedDraftEnvelope =>
  isObjectRecord(value) &&
  value['kind'] === 'mapped_draft' &&
  isObjectRecord(value['draftPayload']);

const createMappedDraftEnvelope = ({
  draftMapperRows,
  rawProduct,
}: {
  draftMapperRows: PlaywrightDraftMapperRow[];
  rawProduct: Record<string, unknown>;
}): PlaywrightMappedDraftEnvelope => {
  if (draftMapperRows.length === 0) {
    throw new Error(
      'Automation flow map_draft blocks require saved draft mapper JSON on the programmable connection.'
    );
  }

  const preview = mapScrapedProductToDraftPreview(rawProduct, draftMapperRows);

  return {
    kind: 'mapped_draft',
    draftPayload: preview.draftInput as Parameters<typeof createDraft>[0],
    diagnostics: preview.diagnostics,
  };
};

const resolveDraftPayload = (
  value: unknown
): Parameters<typeof createDraft>[0] => {
  if (isMappedDraftEnvelope(value)) {
    return value.draftPayload;
  }
  if (isMappedProductEnvelope(value)) {
    return buildPlaywrightProductDraftInput(value.mappedProduct, value.defaults);
  }
  if (!isObjectRecord(value)) {
    throw new Error('Automation flow create_draft blocks require an object payload.');
  }
  return value as Parameters<typeof createDraft>[0];
};

const resolveProductPayload = (
  value: unknown
): Parameters<typeof productService.createProduct>[0] => {
  if (isMappedProductEnvelope(value)) {
    return buildPlaywrightProductCreateInput(value.mappedProduct, value.defaults);
  }
  if (!isObjectRecord(value)) {
    throw new Error('Automation flow create_product blocks require an object payload.');
  }
  return value;
};

const appendResult = ({
  resultKey,
  value,
  scope,
}: {
  resultKey: string;
  value: unknown;
  scope: PlaywrightAutomationScope;
}): void => {
  const nextItems = scope.results[resultKey] ?? [];
  nextItems.push(value);
  scope.results[resultKey] = nextItems;
};

const normalizeErrorDetails = (
  error: unknown
): {
  errorMessage: string;
  errorName: string | null;
} => {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
    };
  }

  return {
    errorMessage: typeof error === 'string' ? error : 'Unknown write failure.',
    errorName: null,
  };
};

const createWriteErrorEnvelope = ({
  errorMessage,
  errorName,
  operation,
  payload,
}: {
  errorMessage: string;
  errorName: string | null;
  operation: 'create_draft' | 'create_product';
  payload: unknown;
}): PlaywrightAutomationWriteErrorEnvelope => ({
  kind: 'write_error',
  operation,
  status: 'failed',
  payload,
  errorMessage,
  errorName,
});

const shouldContinueAfterWriteError = (
  mode: PlaywrightAutomationWriteErrorMode | undefined
): boolean => (mode ?? 'continue') === 'continue';

const executeBlock = async (
  block: PlaywrightAutomationBlock,
  context: PlaywrightAutomationExecutionContext
): Promise<void> => {
  switch (block.kind) {
    case 'assign': {
      setValueAtPath(
        context.scope,
        block.path,
        evaluateValueSource(block.value, context.scope)
      );
      return;
    }
    case 'for_each': {
      const items = evaluateValueSource(block.items, context.scope);
      if (!Array.isArray(items)) {
        throw new Error('Automation flow for_each blocks require an array input.');
      }

      const previousCurrent = context.scope.current;
      const itemKey = block.itemKey?.trim();
      const hadPreviousItemValue =
        typeof itemKey === 'string' && itemKey.length > 0 && Object.hasOwn(context.scope.vars, itemKey);
      const previousItemValue =
        hadPreviousItemValue && itemKey ? context.scope.vars[itemKey] : undefined;

      for (const item of items) {
        context.scope.current = item;
        if (itemKey) {
          context.scope.vars[itemKey] = item;
        }

        for (const childBlock of block.blocks) {
          await executeBlock(childBlock, context);
        }
      }

      context.scope.current = previousCurrent;
      if (itemKey) {
        if (hadPreviousItemValue) {
          context.scope.vars[itemKey] = previousItemValue;
        } else {
          delete context.scope.vars[itemKey];
        }
      }
      return;
    }
    case 'map_product': {
      const sourceValue = resolveBlockSourceValue({
        source: block.source,
        scope: context.scope,
      });
      if (!isObjectRecord(sourceValue)) {
        throw new Error('Automation flow map_product blocks require an object source.');
      }

      const mappedEnvelope = createMappedProductEnvelope({
        rawProduct: sourceValue,
        fieldMappings: context.fieldMappings,
        defaults: block.defaults,
      });
      setValueAtPath(context.scope, block.outputPath ?? 'current', mappedEnvelope);
      return;
    }
    case 'map_draft': {
      const sourceValue = resolveBlockSourceValue({
        source: block.source,
        scope: context.scope,
      });
      if (!isObjectRecord(sourceValue)) {
        throw new Error('Automation flow map_draft blocks require an object source.');
      }

      const mappedEnvelope = createMappedDraftEnvelope({
        draftMapperRows: context.draftMapperRows,
        rawProduct: sourceValue,
      });
      setValueAtPath(context.scope, block.outputPath ?? 'current', mappedEnvelope);
      return;
    }
    case 'create_draft': {
      const sourceValue = resolveBlockSourceValue({
        source: block.source,
        scope: context.scope,
      });
      const payload = resolveDraftPayload(sourceValue);
      const index = context.draftPayloads.length;
      context.draftPayloads.push(payload);
      if (context.dryRun) {
        context.writeOutcomes.push({
          kind: 'draft',
          status: 'dry_run',
          index,
          payload,
          record: null,
        });
        setValueAtPath(context.scope, block.outputPath ?? 'current', payload);
        return;
      }
      try {
        const draft = await createDraft(payload);
        context.drafts.push(draft);
        context.writeOutcomes.push({
          kind: 'draft',
          status: 'created',
          index,
          payload,
          record: draft,
        });
        setValueAtPath(context.scope, block.outputPath ?? 'current', draft);
      } catch (error) {
        const { errorMessage, errorName } = normalizeErrorDetails(error);
        context.writeOutcomes.push({
          kind: 'draft',
          status: 'failed',
          index,
          payload,
          record: null,
          errorMessage,
          errorName,
        });
        setValueAtPath(
          context.scope,
          block.outputPath ?? 'current',
          createWriteErrorEnvelope({
            errorMessage,
            errorName,
            operation: 'create_draft',
            payload,
          })
        );
        if (!shouldContinueAfterWriteError(block.onError)) {
          throw error;
        }
      }
      return;
    }
    case 'create_product': {
      const sourceValue = resolveBlockSourceValue({
        source: block.source,
        scope: context.scope,
      });
      const payload = resolveProductPayload(sourceValue);
      const index = context.productPayloads.length;
      context.productPayloads.push(payload);
      if (context.dryRun) {
        context.writeOutcomes.push({
          kind: 'product',
          status: 'dry_run',
          index,
          payload,
          record: null,
        });
        setValueAtPath(context.scope, block.outputPath ?? 'current', payload);
        return;
      }
      try {
        const product = await productService.createProduct(payload);
        context.products.push(product);
        context.writeOutcomes.push({
          kind: 'product',
          status: 'created',
          index,
          payload,
          record: product,
        });
        setValueAtPath(context.scope, block.outputPath ?? 'current', product);
      } catch (error) {
        const { errorMessage, errorName } = normalizeErrorDetails(error);
        context.writeOutcomes.push({
          kind: 'product',
          status: 'failed',
          index,
          payload,
          record: null,
          errorMessage,
          errorName,
        });
        setValueAtPath(
          context.scope,
          block.outputPath ?? 'current',
          createWriteErrorEnvelope({
            errorMessage,
            errorName,
            operation: 'create_product',
            payload,
          })
        );
        if (!shouldContinueAfterWriteError(block.onError)) {
          throw error;
        }
      }
      return;
    }
    case 'append_result': {
      appendResult({
        resultKey: block.resultKey,
        value: evaluateValueSource(block.value, context.scope),
        scope: context.scope,
      });
      return;
    }
  }
};

export const runPlaywrightImportAutomationFlow = async ({
  connection,
  flow,
  input,
  dryRun = false,
}: {
  connection: IntegrationConnectionRecord;
  flow: PlaywrightImportAutomationFlow | unknown;
  input?: Record<string, unknown>;
  dryRun?: boolean;
}): Promise<PlaywrightImportAutomationRunResult> => {
  const parsedFlow = playwrightImportAutomationFlowSchema.parse(flow);
  const effectiveInput = input ?? buildPlaywrightImportInput(connection);
  const importResult = await runPlaywrightProgrammableImportForConnection({
    connection,
    input: effectiveInput,
  });
  const fieldMappings = parsePlaywrightFieldMapperJson(connection.playwrightFieldMapperJson);
  const draftMapperRows = parsePlaywrightDraftMapperJson(connection.playwrightDraftMapperJson);

  const context: PlaywrightAutomationExecutionContext = {
    dryRun,
    draftMapperRows,
    fieldMappings,
    scope: {
      input: effectiveInput,
      vars: {
        ...(parsedFlow.initialVars ?? {}),
        rawProducts: importResult.products,
        rawResult: importResult.rawResult,
      },
      current: null,
      results: {},
    },
    drafts: [],
    draftPayloads: [],
    writeOutcomes: [],
    products: [],
    productPayloads: [],
  };

  for (const block of parsedFlow.blocks) {
    await executeBlock(block, context);
  }

  return {
    flow: parsedFlow,
    input: effectiveInput,
    rawProducts: importResult.products,
    rawResult: importResult.rawResult,
    drafts: context.drafts,
    draftPayloads: context.draftPayloads,
    writeOutcomes: context.writeOutcomes,
    products: context.products,
    productPayloads: context.productPayloads,
    results: context.scope.results,
    vars: context.scope.vars,
  };
};
