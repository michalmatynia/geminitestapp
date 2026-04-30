import { type Filter } from 'mongodb';

import { getProductAdvancedFilterMetrics } from '@/shared/contracts/products/filters';
import { type ProductAdvancedFilterCondition, type ProductAdvancedFilterRule, type ProductFilters } from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { TRADERA_INTEGRATION_SLUGS } from '@/shared/lib/integration-slugs';
import {
  MARKET_EXCLUSION_FIELD_NAME,
  normalizeBaseMarketplaceCheckboxKey,
} from '@/shared/lib/integrations/base-marketplace-checkboxes';
import { PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE } from '@/shared/lib/products/constants';
import { logger } from '@/shared/utils/logger';

import { type ProductDocument } from './mongo-product-repository-mappers';
import { buildMongoExpandedCategoryFilter } from './mongo-category-filter';
import {
  appendAndCondition,
  buildLookupValues,
  buildProductIdFilter,
  buildLookupFilterForIds,
  escapeRegex,
  integrationCollectionName,
  isEmptyFilter,
  listingCollectionName,
  normalizeLookupId,
  parseAdvancedFilterGroup,
  toAdvancedBooleanValue,
  toAdvancedDateValue,
  toAdvancedNumberValue,
  toAdvancedStringArrayValues,
  toAdvancedStringValue,
  loadMongoBaseExportLookupContext,
  type BaseExportLookupContext,
  type IntegrationSlugDocument,
  type ProductListingFilterDocument,
} from './mongo-product-repository.helpers';

const PRODUCT_CUSTOM_FIELD_COLLECTION = 'product_custom_fields';
const TRADERA_NOT_ADDED_STATUS = 'not_added';
const TRADERA_NOT_STARTED_STATUS = 'not_started';
const TRADERA_DISABLED_STATUS = 'disabled';
const TRADERA_STATUS_NO_MATCH_ID = '__no_tradera_status_products__';
const TRADERA_MARKET_EXCLUSION_FIELD_ID_FALLBACKS = ['market-exclusion', 'base-market-exclusion'];
const TRADERA_MARKET_EXCLUSION_OPTION_ID_FALLBACKS = [
  'tradera',
  'market-exclusion-tradera',
];
const TRADERA_SUCCESS_STATUSES = new Set(['active', 'success', 'completed', 'listed', 'ok']);
const TRADERA_CLOSED_STATUS = 'closed';
const TRADERA_STATUS_RANK: Record<string, number> = {
  active: 5,
  success: 5,
  completed: 5,
  listed: 5,
  ok: 5,
  running: 4,
  processing: 4,
  in_progress: 4,
  pending: 3,
  queued: 3,
  queued_relist: 3,
  closed: 2,
  unsold: 2,
  ended: 2,
  sold: 2,
  expired: 2,
  failed: 1,
  needs_login: 1,
  auth_required: 1,
  error: 1,
  cancelled: 1,
  disabled: 0,
  archived: 0,
  removed: 0,
};

type ProductCustomFieldFilterDocument = {
  _id?: unknown;
  id?: string;
  name?: string;
  type?: string;
  options?: Array<{ id?: string; label?: string }>;
};

type TraderaStatusCandidateMeta = {
  productId: string;
  status: string;
  updatedAtMs: number;
  rank: number;
  success: boolean;
};

type TraderaStatusLookupContext = {
  disabledCondition: Filter<ProductDocument>;
  listedProductIds: string[];
  productIdsByStatus: Map<string, string[]>;
};

type AdvancedMongoFilterContext = {
  baseExport: BaseExportLookupContext;
  loadTraderaStatus: () => Promise<TraderaStatusLookupContext>;
};

const buildEmptyStringPathCondition = (path: string): Filter<ProductDocument> =>
  ({
    $or: [{ [path]: { $exists: false } }, { [path]: null }, { [path]: '' }],
  }) as Filter<ProductDocument>;

const buildNonEmptyStringPathCondition = (path: string): Filter<ProductDocument> =>
  ({
    [path]: { $exists: true, $nin: [null, ''] },
  }) as Filter<ProductDocument>;

const buildMongoUnassignedCategoryFilter = (): Filter<ProductDocument> =>
  ({
    $or: [{ categoryId: { $exists: false } }, { categoryId: null }, { categoryId: '' }],
  }) as Filter<ProductDocument>;

const buildMongoStringFieldCondition = (
  paths: string[],
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (paths.length === 0) return null;

  if (condition.operator === 'isEmpty') {
    if (paths.length === 1) return buildEmptyStringPathCondition(paths[0]!);
    return {
      $and: paths.map((path: string) => buildEmptyStringPathCondition(path)),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    if (paths.length === 1) return buildNonEmptyStringPathCondition(paths[0]!);
    return {
      $or: paths.map((path: string) => buildNonEmptyStringPathCondition(path)),
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'contains') {
    const regex = { $regex: escapeRegex(value), $options: 'i' };
    if (paths.length === 1) {
      return { [paths[0]!]: regex } as Filter<ProductDocument>;
    }
    return {
      $or: paths.map((path: string) => ({ [path]: regex })),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'eq') {
    if (paths.length === 1) {
      return { [paths[0]!]: value } as Filter<ProductDocument>;
    }
    return {
      $or: paths.map((path: string) => ({ [path]: value })),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'in') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    if (paths.length === 1) {
      return { [paths[0]!]: { $in: values } } as Filter<ProductDocument>;
    }
    return {
      $or: paths.map((path: string) => ({ [path]: { $in: values } })),
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'notIn') {
    const inCondition = buildMongoStringFieldCondition(paths, {
      ...condition,
      operator: 'in',
    });
    if (!inCondition) return null;
    return { $nor: [inCondition] } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    const equalCondition = buildMongoStringFieldCondition(paths, {
      ...condition,
      operator: 'eq',
    });
    if (!equalCondition) return null;
    return { $nor: [equalCondition] } as Filter<ProductDocument>;
  }

  return null;
};

const buildStructuredTitleSegmentValuePattern = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .map((segment: string) => escapeRegex(segment))
    .join('\\s+');

const buildStructuredTitleSegmentPrefixPattern = (segmentIndex: number): string =>
  Array.from({ length: segmentIndex }, () => '\\s*[^|]*\\s*\\|').join('');

const buildStructuredTitleSegmentExactPattern = (segmentIndex: number, value: string): string =>
  `^${buildStructuredTitleSegmentPrefixPattern(segmentIndex)}\\s*${buildStructuredTitleSegmentValuePattern(value)}${segmentIndex === 4 ? '\\s*$' : '\\s*\\|'}`;

const buildStructuredTitleSegmentPresencePattern = (segmentIndex: number): string =>
  `^${buildStructuredTitleSegmentPrefixPattern(segmentIndex)}\\s*[^|]*\\S[^|]*${segmentIndex === 4 ? '\\s*$' : '\\s*\\|'}`;

const buildMongoStructuredTitleFieldCondition = (
  path: 'structuredTitle.size' | 'structuredTitle.material' | 'structuredTitle.theme',
  segmentIndex: 1 | 2 | 4,
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $and: [
        buildEmptyStringPathCondition(path),
        {
          $nor: [
            {
              name_en: {
                $regex: buildStructuredTitleSegmentPresencePattern(segmentIndex),
              },
            },
          ],
        },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      $or: [
        buildNonEmptyStringPathCondition(path),
        {
          name_en: {
            $regex: buildStructuredTitleSegmentPresencePattern(segmentIndex),
          },
        },
      ],
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (condition.operator === 'eq') {
    if (!value) return null;
    return {
      $or: [
        { [path]: value },
        {
          name_en: {
            $regex: buildStructuredTitleSegmentExactPattern(segmentIndex, value),
          },
        },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'in') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return {
      $or: [
        { [path]: { $in: values } },
        ...values.map((entry: string) => ({
          name_en: {
            $regex: buildStructuredTitleSegmentExactPattern(segmentIndex, entry),
          },
        })),
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    const equalCondition = buildMongoStructuredTitleFieldCondition(path, segmentIndex, {
      ...condition,
      operator: 'eq',
    });
    if (!equalCondition) return null;
    return { $nor: [equalCondition] } as Filter<ProductDocument>;
  }

  if (condition.operator === 'notIn') {
    const inCondition = buildMongoStructuredTitleFieldCondition(path, segmentIndex, {
      ...condition,
      operator: 'in',
    });
    if (!inCondition) return null;
    return { $nor: [inCondition] } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoIdCondition = (
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [{ id: { $exists: false } }, { id: null }, { id: '' }],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      id: { $exists: true, $nin: [null, ''] },
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'eq') {
    return buildProductIdFilter(value);
  }

  if (condition.operator === 'neq') {
    return {
      $nor: [buildProductIdFilter(value)],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'contains') {
    const escapedId = escapeRegex(value);
    return {
      $or: [
        { id: { $regex: escapedId, $options: 'i' } },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: '$_id' },
              regex: escapedId,
              options: 'i',
            },
          },
        },
      ],
    } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoCategoryCondition = async (
  condition: ProductAdvancedFilterCondition
): Promise<Filter<ProductDocument> | null> => {
  if (condition.operator === 'isEmpty') {
    return buildMongoUnassignedCategoryFilter();
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      categoryId: { $exists: true, $nin: [null, ''] },
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (value === PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE) {
    if (condition.operator === 'eq' || condition.operator === 'contains') {
      return buildMongoUnassignedCategoryFilter();
    }
    if (condition.operator === 'neq') {
      const assignedCategoryFilter: Filter<ProductDocument> = {
        categoryId: { $exists: true, $nin: [null, ''] },
      };
      return assignedCategoryFilter;
    }
    return null;
  }

  if (condition.operator === 'contains') {
    const regex = { $regex: escapeRegex(value), $options: 'i' };
    return { categoryId: regex } as Filter<ProductDocument>;
  }

  if (condition.operator === 'eq') {
    return buildMongoExpandedCategoryFilter(value);
  }

  if (condition.operator === 'neq') {
    const eqCondition = await buildMongoCategoryCondition({
      ...condition,
      operator: 'eq',
    });
    if (!eqCondition) return null;
    return { $nor: [eqCondition] } as Filter<ProductDocument>;
  }

  return null;
};

const normalizeTraderaStatusValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized.length === 0) return null;
  if (normalized === TRADERA_NOT_STARTED_STATUS || normalized === 'notadded') {
    return TRADERA_NOT_ADDED_STATUS;
  }
  return normalized;
};

const normalizeTraderaStatusValues = (value: unknown): string[] => {
  const rawValues = Array.isArray(value) ? value : [value];
  const seen = new Set<string>();
  const statuses: string[] = [];
  rawValues.forEach((entry: unknown) => {
    const normalized = normalizeTraderaStatusValue(entry);
    if (normalized === null || seen.has(normalized)) return;
    seen.add(normalized);
    statuses.push(normalized);
  });
  return statuses;
};

const readRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const resolvePendingTraderaExecutionAction = (marketplaceData: unknown): string | null => {
  const traderaData = readRecord(readRecord(marketplaceData)['tradera']);
  const pendingExecution = readRecord(traderaData['pendingExecution']);
  return normalizeTraderaStatusValue(pendingExecution['action']);
};

const toTimestampMs = (value: unknown): number => {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? 0 : time;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
  }
  return 0;
};

const buildTraderaStatusCandidateMeta = (
  doc: ProductListingFilterDocument
): TraderaStatusCandidateMeta | null => {
  const productId = normalizeLookupId(doc.productId);
  if (productId.length === 0) return null;
  const status = normalizeTraderaStatusValue(doc.status) ?? 'unknown';
  return {
    productId,
    status,
    updatedAtMs: toTimestampMs(doc.updatedAt),
    rank: TRADERA_STATUS_RANK[status] ?? -1,
    success: TRADERA_SUCCESS_STATUSES.has(status),
  };
};

const shouldReplaceTraderaClosedCandidate = (
  currentMeta: TraderaStatusCandidateMeta,
  nextMeta: TraderaStatusCandidateMeta
): boolean | null => {
  const currentIsClosed = currentMeta.status === TRADERA_CLOSED_STATUS;
  const nextIsClosed = nextMeta.status === TRADERA_CLOSED_STATUS;
  if (!currentIsClosed && !nextIsClosed) return null;
  if (currentIsClosed !== nextIsClosed) {
    const otherMeta = currentIsClosed ? nextMeta : currentMeta;
    if (!otherMeta.success) {
      return nextIsClosed;
    }
  }
  if (nextMeta.updatedAtMs !== currentMeta.updatedAtMs) {
    return nextMeta.updatedAtMs > currentMeta.updatedAtMs;
  }
  return nextIsClosed && !currentIsClosed;
};

const shouldReplaceTraderaStatusCandidate = (
  currentMeta: TraderaStatusCandidateMeta,
  nextMeta: TraderaStatusCandidateMeta
): boolean => {
  const closedDecision = shouldReplaceTraderaClosedCandidate(currentMeta, nextMeta);
  if (closedDecision !== null) return closedDecision;

  if (currentMeta.success !== nextMeta.success) return nextMeta.success;

  if (!currentMeta.success && !nextMeta.success) {
    if (nextMeta.updatedAtMs !== currentMeta.updatedAtMs) {
      return nextMeta.updatedAtMs > currentMeta.updatedAtMs;
    }
    return nextMeta.rank > currentMeta.rank;
  }

  if (nextMeta.rank !== currentMeta.rank) return nextMeta.rank > currentMeta.rank;

  return nextMeta.updatedAtMs > currentMeta.updatedAtMs;
};

const buildTraderaListingFilter = (
  integrationLookupValues: ReturnType<typeof buildLookupValues>
): Filter<ProductListingFilterDocument> => {
  const filters: Array<Filter<ProductListingFilterDocument>> = [
    { 'marketplaceData.marketplace': 'tradera' } as Filter<ProductListingFilterDocument>,
    {
      'marketplaceData.source': { $regex: 'tradera', $options: 'i' },
    } as Filter<ProductListingFilterDocument>,
    { 'marketplaceData.tradera': { $exists: true } } as Filter<ProductListingFilterDocument>,
    {
      integrationId: { $regex: 'tradera', $options: 'i' },
    } as Filter<ProductListingFilterDocument>,
  ];

  if (integrationLookupValues.length > 0) {
    filters.unshift({
      integrationId: { $in: integrationLookupValues },
    } as Filter<ProductListingFilterDocument>);
  }

  return { $or: filters } as Filter<ProductListingFilterDocument>;
};

const resolveProductCustomFieldId = (doc: ProductCustomFieldFilterDocument): string => {
  const explicitId = normalizeLookupId(doc.id);
  return explicitId.length > 0 ? explicitId : normalizeLookupId(doc._id);
};

const buildTraderaDisabledCondition = (
  customFieldDocs: ProductCustomFieldFilterDocument[]
): Filter<ProductDocument> => {
  const marketExclusionNameKey = normalizeBaseMarketplaceCheckboxKey(
    MARKET_EXCLUSION_FIELD_NAME
  );
  const marketExclusionFieldIds = new Set<string>(TRADERA_MARKET_EXCLUSION_FIELD_ID_FALLBACKS);
  const traderaOptionIds = new Set<string>(TRADERA_MARKET_EXCLUSION_OPTION_ID_FALLBACKS);

  customFieldDocs.forEach((doc: ProductCustomFieldFilterDocument) => {
    if (doc.type !== 'checkbox_set') return;
    if (normalizeBaseMarketplaceCheckboxKey(doc.name ?? '') !== marketExclusionNameKey) return;

    const fieldId = resolveProductCustomFieldId(doc);
    if (fieldId.length > 0) marketExclusionFieldIds.add(fieldId);

    if (!Array.isArray(doc.options)) return;
    doc.options.forEach((option) => {
      if (normalizeBaseMarketplaceCheckboxKey(option.label ?? '') !== 'tradera') return;
      const optionId = typeof option.id === 'string' ? option.id.trim() : '';
      if (optionId.length > 0) traderaOptionIds.add(optionId);
    });
  });

  return {
    customFields: {
      $elemMatch: {
        fieldId: { $in: Array.from(marketExclusionFieldIds) },
        selectedOptionIds: { $in: Array.from(traderaOptionIds) },
      },
    },
  } as Filter<ProductDocument>;
};

const buildMongoNoTraderaStatusProductsCondition = (): Filter<ProductDocument> =>
  ({ id: TRADERA_STATUS_NO_MATCH_ID }) as Filter<ProductDocument>;

const buildMongoProductIdsInCondition = (productIds: string[]): Filter<ProductDocument> => {
  if (productIds.length === 0) return buildMongoNoTraderaStatusProductsCondition();
  return {
    $or: [
      { id: { $in: productIds } },
      { _id: { $in: buildLookupValues(productIds) } },
    ],
  } as Filter<ProductDocument>;
};

const buildMongoProductIdsNotInCondition = (productIds: string[]): Filter<ProductDocument> => {
  if (productIds.length === 0) return {};
  return {
    $and: [
      { id: { $nin: productIds } },
      { _id: { $nin: buildLookupValues(productIds) } },
    ],
  } as Filter<ProductDocument>;
};

const combineMongoAndFilters = (
  filters: Array<Filter<ProductDocument> | null>
): Filter<ProductDocument> => {
  const meaningfulFilters = filters.filter(
    (filter): filter is Filter<ProductDocument> => filter !== null && !isEmptyFilter(filter)
  );
  if (meaningfulFilters.length === 0) return {};
  if (meaningfulFilters.length === 1 && meaningfulFilters[0] !== undefined) {
    return meaningfulFilters[0];
  }
  return { $and: meaningfulFilters } as Filter<ProductDocument>;
};

const combineMongoOrFilters = (
  filters: Array<Filter<ProductDocument> | null>
): Filter<ProductDocument> => {
  const meaningfulFilters = filters.filter(
    (filter): filter is Filter<ProductDocument> => filter !== null
  );
  if (meaningfulFilters.some((filter: Filter<ProductDocument>) => isEmptyFilter(filter))) {
    return {};
  }
  if (meaningfulFilters.length === 0) return buildMongoNoTraderaStatusProductsCondition();
  if (meaningfulFilters.length === 1 && meaningfulFilters[0] !== undefined) {
    return meaningfulFilters[0];
  }
  return { $or: meaningfulFilters } as Filter<ProductDocument>;
};

const buildMongoNotCondition = (filter: Filter<ProductDocument>): Filter<ProductDocument> =>
  ({ $nor: [filter] }) as Filter<ProductDocument>;

const loadMongoTraderaStatusLookupContext = async (): Promise<TraderaStatusLookupContext> => {
  const db = await getMongoDb();
  const [integrations, customFieldDocs] = await Promise.all([
    db
      .collection<IntegrationSlugDocument>(integrationCollectionName)
      .find(
        { slug: { $in: Array.from(TRADERA_INTEGRATION_SLUGS) } },
        { projection: { _id: 1 } }
      )
      .toArray(),
    db
      .collection<ProductCustomFieldFilterDocument>(PRODUCT_CUSTOM_FIELD_COLLECTION)
      .find(
        { type: 'checkbox_set' },
        { projection: { _id: 1, id: 1, name: 1, type: 1, options: 1 } }
      )
      .toArray(),
  ]);

  const integrationIds = integrations
    .map((integration: IntegrationSlugDocument) => normalizeLookupId(integration._id))
    .filter((id: string) => id.length > 0);
  const integrationLookupValues = buildLookupValues(integrationIds);
  const listingDocs = await db
    .collection<ProductListingFilterDocument>(listingCollectionName)
    .find(buildTraderaListingFilter(integrationLookupValues), {
      projection: {
        productId: 1,
        integrationId: 1,
        status: 1,
        marketplaceData: 1,
        updatedAt: 1,
      },
    })
    .toArray();

  const listedProductIds = new Set<string>();
  const candidateByProductId = new Map<string, TraderaStatusCandidateMeta>();
  const productsWithPendingStatusCheck = new Set<string>();

  listingDocs.forEach((doc: ProductListingFilterDocument) => {
    const candidate = buildTraderaStatusCandidateMeta(doc);
    if (candidate === null) return;

    listedProductIds.add(candidate.productId);
    if (resolvePendingTraderaExecutionAction(doc.marketplaceData) === 'check_status') {
      productsWithPendingStatusCheck.add(candidate.productId);
    }

    const current = candidateByProductId.get(candidate.productId);
    if (current === undefined || shouldReplaceTraderaStatusCandidate(current, candidate)) {
      candidateByProductId.set(candidate.productId, candidate);
    }
  });

  productsWithPendingStatusCheck.forEach((productId: string) => {
    candidateByProductId.set(productId, {
      productId,
      status: 'processing',
      updatedAtMs: Date.now(),
      rank: TRADERA_STATUS_RANK['processing'] ?? 4,
      success: false,
    });
  });

  const productIdsByStatus = new Map<string, string[]>();
  candidateByProductId.forEach((candidate: TraderaStatusCandidateMeta) => {
    const existing = productIdsByStatus.get(candidate.status) ?? [];
    existing.push(candidate.productId);
    productIdsByStatus.set(candidate.status, existing);
  });

  return {
    disabledCondition: buildTraderaDisabledCondition(customFieldDocs),
    listedProductIds: Array.from(listedProductIds),
    productIdsByStatus,
  };
};

const getTraderaStatusLookupContext = (
  context: AdvancedMongoFilterContext
): Promise<TraderaStatusLookupContext> => context.loadTraderaStatus();

const createAdvancedMongoFilterContext = (
  baseExport: BaseExportLookupContext
): AdvancedMongoFilterContext => {
  let traderaStatusPromise: Promise<TraderaStatusLookupContext> | null = null;

  return {
    baseExport,
    loadTraderaStatus: (): Promise<TraderaStatusLookupContext> => {
      if (traderaStatusPromise === null) {
        traderaStatusPromise = loadMongoTraderaStatusLookupContext();
      }
      return traderaStatusPromise;
    },
  };
};

const buildMongoTraderaNotAddedCondition = (
  context: TraderaStatusLookupContext
): Filter<ProductDocument> =>
  combineMongoAndFilters([
    buildMongoProductIdsNotInCondition(context.listedProductIds),
    buildMongoNotCondition(context.disabledCondition),
  ]);

const buildMongoTraderaStatusPositiveCondition = (
  statuses: string[],
  context: TraderaStatusLookupContext
): Filter<ProductDocument> => {
  const filters: Array<Filter<ProductDocument> | null> = [];
  const listingStatusProductIds = new Set<string>();

  statuses.forEach((status: string) => {
    if (status === TRADERA_NOT_ADDED_STATUS) {
      filters.push(buildMongoTraderaNotAddedCondition(context));
      return;
    }

    if (status === TRADERA_DISABLED_STATUS) {
      filters.push(context.disabledCondition);
    }

    (context.productIdsByStatus.get(status) ?? []).forEach((productId: string) => {
      listingStatusProductIds.add(productId);
    });
  });

  if (listingStatusProductIds.size > 0) {
    filters.push(buildMongoProductIdsInCondition(Array.from(listingStatusProductIds)));
  }

  return combineMongoOrFilters(filters);
};

const buildMongoTraderaStatusCondition = async (
  condition: ProductAdvancedFilterCondition,
  advancedContext: AdvancedMongoFilterContext
): Promise<Filter<ProductDocument> | null> => {
  const context = await getTraderaStatusLookupContext(advancedContext);

  if (condition.operator === 'isEmpty') {
    return buildMongoTraderaNotAddedCondition(context);
  }

  if (condition.operator === 'isNotEmpty') {
    return buildMongoNotCondition(buildMongoTraderaNotAddedCondition(context));
  }

  const statuses = normalizeTraderaStatusValues(condition.value);
  if (statuses.length === 0) return null;

  if (condition.operator === 'eq' || condition.operator === 'in') {
    return buildMongoTraderaStatusPositiveCondition(statuses, context);
  }

  if (condition.operator === 'neq' || condition.operator === 'notIn') {
    return buildMongoNotCondition(buildMongoTraderaStatusPositiveCondition(statuses, context));
  }

  return null;
};

const buildMongoNestedIdArrayCondition = (
  fieldPath: 'catalogs.catalogId' | 'tags.tagId' | 'producers.producerId',
  arrayPath: 'catalogs' | 'tags' | 'producers',
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [
        { [fieldPath]: { $exists: false } },
        { [fieldPath]: null },
        { [arrayPath]: { $exists: false } },
        { [arrayPath]: { $size: 0 } },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      $or: [
        { [fieldPath]: { $exists: true, $nin: [null, ''] } },
        { [`${arrayPath}.0`]: { $exists: true } },
      ],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'eq') {
    const value = toAdvancedStringValue(condition.value);
    if (!value) return null;
    return { [fieldPath]: value } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    const value = toAdvancedStringValue(condition.value);
    if (!value) return null;
    return { [fieldPath]: { $ne: value } } as Filter<ProductDocument>;
  }

  if (condition.operator === 'in') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return { [fieldPath]: { $in: values } } as Filter<ProductDocument>;
  }

  if (condition.operator === 'notIn') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return { [fieldPath]: { $nin: values } } as Filter<ProductDocument>;
  }

  return null;
};

const buildMongoNumericCondition = (
  field: 'price' | 'stock',
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [{ [field]: { $exists: false } }, { [field]: null }],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      [field]: { $exists: true, $ne: null },
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'between') {
    const left = toAdvancedNumberValue(condition.value);
    const right = toAdvancedNumberValue(condition.valueTo);
    if (left === null || right === null) return null;
    const [min, max] = left <= right ? [left, right] : [right, left];
    return { [field]: { $gte: min, $lte: max } } as Filter<ProductDocument>;
  }

  const value = toAdvancedNumberValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') return { [field]: value } as Filter<ProductDocument>;
  if (condition.operator === 'neq') return { [field]: { $ne: value } } as Filter<ProductDocument>;
  if (condition.operator === 'gt') return { [field]: { $gt: value } } as Filter<ProductDocument>;
  if (condition.operator === 'gte') return { [field]: { $gte: value } } as Filter<ProductDocument>;
  if (condition.operator === 'lt') return { [field]: { $lt: value } } as Filter<ProductDocument>;
  if (condition.operator === 'lte') return { [field]: { $lte: value } } as Filter<ProductDocument>;

  return null;
};

const buildMongoCreatedAtCondition = (
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') return { id: '__invalid_createdAt_empty__' };
  if (condition.operator === 'isNotEmpty') return null;

  if (condition.operator === 'between') {
    const left = toAdvancedDateValue(condition.value);
    const right = toAdvancedDateValue(condition.valueTo);
    if (!left || !right) return null;
    const [min, max] = left <= right ? [left, right] : [right, left];
    return { createdAt: { $gte: min, $lte: max } } as Filter<ProductDocument>;
  }

  const value = toAdvancedDateValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'eq') return { createdAt: value } as Filter<ProductDocument>;
  if (condition.operator === 'neq') return { createdAt: { $ne: value } } as Filter<ProductDocument>;
  if (condition.operator === 'gt') return { createdAt: { $gt: value } } as Filter<ProductDocument>;
  if (condition.operator === 'gte')
    return { createdAt: { $gte: value } } as Filter<ProductDocument>;
  if (condition.operator === 'lt') return { createdAt: { $lt: value } } as Filter<ProductDocument>;
  if (condition.operator === 'lte')
    return { createdAt: { $lte: value } } as Filter<ProductDocument>;

  return null;
};

const buildMongoBooleanCondition = (
  field: 'published',
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  const value = toAdvancedBooleanValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') return { [field]: value } as Filter<ProductDocument>;
  if (condition.operator === 'neq') return { [field]: { $ne: value } } as Filter<ProductDocument>;

  return null;
};

export const buildMongoExportedByBaseProductIdCondition = (): Filter<ProductDocument> =>
  ({
    baseProductId: { $exists: true, $nin: [null, ''] },
  }) as Filter<ProductDocument>;

export const buildMongoUnexportedByBaseProductIdCondition = (): Filter<ProductDocument> =>
  ({
    $or: [{ baseProductId: { $exists: false } }, { baseProductId: null }, { baseProductId: '' }],
  }) as Filter<ProductDocument>;

export const buildMongoBaseExportedCondition = (
  baseExported: boolean,
  context: BaseExportLookupContext
): Filter<ProductDocument> | null => {
  const exportedByBaseProductId = buildMongoExportedByBaseProductIdCondition();
  const unexportedByBaseProductId = buildMongoUnexportedByBaseProductIdCondition();

  if (context.integrationLookupValues.length === 0) {
    if (baseExported) {
      return {
        id: '__no_base_exported_products__',
      } as Filter<ProductDocument>;
    }
    return null;
  }

  if (baseExported) {
    if (context.exportedProductIds.length === 0) {
      return exportedByBaseProductId;
    }
    return {
      $or: [
        exportedByBaseProductId,
        { id: { $in: context.exportedProductIds } },
        { _id: { $in: context.exportedProductLookupValues } },
      ],
    } as Filter<ProductDocument>;
  }

  if (context.exportedProductIds.length === 0) {
    return unexportedByBaseProductId;
  }

  return {
    $and: [
      unexportedByBaseProductId,
      { id: { $nin: context.exportedProductIds } },
      { _id: { $nin: context.exportedProductLookupValues } },
    ],
  } as Filter<ProductDocument>;
};

const compileAdvancedMongoCondition = async (
  condition: ProductAdvancedFilterCondition,
  context: AdvancedMongoFilterContext
): Promise<Filter<ProductDocument> | null> => {
  if (condition.field === 'id') return buildMongoIdCondition(condition);
  if (condition.field === 'sku') return buildMongoStringFieldCondition(['sku'], condition);
  if (condition.field === 'name')
    return buildMongoStringFieldCondition(['name_en', 'name_pl', 'name_de'], condition);
  if (condition.field === 'description')
    return buildMongoStringFieldCondition(
      ['description_en', 'description_pl', 'description_de'],
      condition
    );
  if (condition.field === 'titleSize')
    return buildMongoStructuredTitleFieldCondition('structuredTitle.size', 1, condition);
  if (condition.field === 'titleMaterial')
    return buildMongoStructuredTitleFieldCondition('structuredTitle.material', 2, condition);
  if (condition.field === 'titleTheme')
    return buildMongoStructuredTitleFieldCondition('structuredTitle.theme', 4, condition);
  if (condition.field === 'categoryId') return buildMongoCategoryCondition(condition);
  if (condition.field === 'traderaStatus') {
    return buildMongoTraderaStatusCondition(condition, context);
  }
  if (condition.field === 'catalogId')
    return buildMongoNestedIdArrayCondition('catalogs.catalogId', 'catalogs', condition);
  if (condition.field === 'tagId')
    return buildMongoNestedIdArrayCondition('tags.tagId', 'tags', condition);
  if (condition.field === 'producerId')
    return buildMongoNestedIdArrayCondition('producers.producerId', 'producers', condition);
  if (condition.field === 'price') return buildMongoNumericCondition('price', condition);
  if (condition.field === 'stock') return buildMongoNumericCondition('stock', condition);
  if (condition.field === 'published') return buildMongoBooleanCondition('published', condition);
  if (condition.field === 'baseExported') {
    const value = toAdvancedBooleanValue(condition.value);
    if (value === null) return null;
    if (condition.operator === 'eq') {
      return buildMongoBaseExportedCondition(value, context.baseExport);
    }
    if (condition.operator === 'neq') {
      return buildMongoBaseExportedCondition(!value, context.baseExport);
    }
    return null;
  }
  if (condition.field === 'baseProductId')
    return buildMongoStringFieldCondition(['baseProductId'], condition);
  if (condition.field === 'createdAt') return buildMongoCreatedAtCondition(condition);
  return null;
};

const compileAdvancedMongoRule = async (
  rule: ProductAdvancedFilterRule,
  context: AdvancedMongoFilterContext
): Promise<Filter<ProductDocument> | null> => {
  if (rule.type === 'condition') {
    return compileAdvancedMongoCondition(rule, context);
  }

  const compiledRules = (await Promise.all(
    rule.rules.map((nested: ProductAdvancedFilterRule) =>
      compileAdvancedMongoRule(nested, context)
    )
  )).filter((nested): nested is Filter<ProductDocument> => nested !== null);

  if (compiledRules.length === 0) return null;

  const combined =
    compiledRules.length === 1
      ? compiledRules[0]!
      : ({
        [rule.combinator === 'and' ? '$and' : '$or']: compiledRules,
      } as Filter<ProductDocument>);

  if (!rule.not) return combined;
  return { $nor: [combined] } as Filter<ProductDocument>;
};

export const buildAdvancedMongoWhere = async (
  payload: string | undefined,
  context: BaseExportLookupContext
): Promise<Filter<ProductDocument> | null> => {
  const parsedGroup = parseAdvancedFilterGroup(payload);
  if (!parsedGroup) return null;
  const metrics = getProductAdvancedFilterMetrics(parsedGroup);
  const compileStart = Date.now();
  const compiled = await compileAdvancedMongoRule(
    parsedGroup,
    createAdvancedMongoFilterContext(context)
  );
  logger.info('[products.advanced-filter.mongo] compiled', {
    rules: metrics.rules,
    depth: metrics.depth,
    setItems: metrics.setItems,
    compileDurationMs: Date.now() - compileStart,
    compiled: Boolean(compiled),
  });
  return compiled;
};

export const buildMongoWhere = async (
  filters: ProductFilters
): Promise<Filter<ProductDocument>> => {
  let filter: Filter<ProductDocument> = {};

  if (Array.isArray(filters.ids) && filters.ids.length > 0) {
    filter = appendAndCondition(
      filter,
      buildLookupFilterForIds(filters.ids) as Filter<ProductDocument>
    );
  }

  if (filters.id) {
    const normalizedId = filters.id.trim();
    if (normalizedId.length > 0) {
      if (filters.idMatchMode === 'partial') {
        const escapedId = escapeRegex(normalizedId);
        filter = appendAndCondition(filter, {
          $or: [
            { id: { $regex: escapedId, $options: 'i' } },
            {
              $expr: {
                $regexMatch: {
                  input: { $toString: '$_id' },
                  regex: escapedId,
                  options: 'i',
                },
              },
            },
          ],
        } as Filter<ProductDocument>);
      } else {
        filter = appendAndCondition(filter, buildProductIdFilter(normalizedId));
      }
    }
  }

  if (filters.sku) {
    filter = appendAndCondition(filter, {
      sku: { $regex: escapeRegex(filters.sku), $options: 'i' },
    } as Filter<ProductDocument>);
  }

  if (filters.search) {
    const regex = { $regex: escapeRegex(filters.search), $options: 'i' };
    if (filters.searchLanguage) {
      filter = appendAndCondition(filter, {
        [filters.searchLanguage]: regex,
      } as Filter<ProductDocument>);
    } else {
      filter = appendAndCondition(filter, {
        $or: [
          { name_en: regex },
          { name_pl: regex },
          { name_de: regex },
          { description_en: regex },
          { description_pl: regex },
          { description_de: regex },
        ],
      } as Filter<ProductDocument>);
    }
  }

  if (filters.description) {
    const regex = { $regex: escapeRegex(filters.description), $options: 'i' };
    filter = appendAndCondition(filter, {
      $or: [{ description_en: regex }, { description_pl: regex }, { description_de: regex }],
    } as Filter<ProductDocument>);
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceFilter: Record<string, number> = {};
    if (filters.minPrice !== undefined) priceFilter['$gte'] = filters.minPrice;
    if (filters.maxPrice !== undefined) priceFilter['$lte'] = filters.maxPrice;
    filter = appendAndCondition(filter, { price: priceFilter } as Filter<ProductDocument>);
  }

  if (filters.stockValue !== undefined) {
    const operator = filters.stockOperator ?? 'eq';
    const mongoOperator =
      operator === 'gt'
        ? '$gt'
        : operator === 'gte'
          ? '$gte'
          : operator === 'lt'
            ? '$lt'
            : operator === 'lte'
              ? '$lte'
              : null;
    filter = appendAndCondition(
      filter,
      (mongoOperator
        ? { stock: { [mongoOperator]: filters.stockValue } }
        : { stock: filters.stockValue }) as Filter<ProductDocument>
    );
  }

  if (filters.startDate || filters.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (filters.startDate) dateFilter['$gte'] = new Date(filters.startDate);
    if (filters.endDate) dateFilter['$lte'] = new Date(filters.endDate);
    filter = appendAndCondition(filter, {
      createdAt: dateFilter,
    } as Filter<ProductDocument>);
  }

  if (filters.catalogId) {
    if (filters.catalogId === 'unassigned') {
      filter = appendAndCondition(filter, {
        $or: [{ catalogs: { $exists: false } }, { catalogs: { $size: 0 } }],
      } as Filter<ProductDocument>);
    } else {
      filter = appendAndCondition(filter, {
        'catalogs.catalogId': filters.catalogId,
      } as Filter<ProductDocument>);
    }
  }

  if (typeof filters.categoryId === 'string' && filters.categoryId.trim().length > 0) {
    const categoryFilter =
      filters.categoryId === PRODUCT_CATEGORY_FILTER_UNASSIGNED_VALUE
        ? buildMongoUnassignedCategoryFilter()
        : await buildMongoExpandedCategoryFilter(filters.categoryId);
    if (categoryFilter !== null) {
      filter = appendAndCondition(filter, categoryFilter);
    }
  }

  if (filters.archived !== undefined) {
    filter = appendAndCondition(
      filter,
      (filters.archived
        ? { archived: true }
        : { archived: { $ne: true } }) as Filter<ProductDocument>
    );
  }

  if (filters.baseExported !== undefined || filters.advancedFilter) {
    const exportContext = await loadMongoBaseExportLookupContext();

    if (filters.baseExported !== undefined) {
      const baseCondition = buildMongoBaseExportedCondition(filters.baseExported, exportContext);
      if (baseCondition) {
        filter = appendAndCondition(filter, baseCondition);
      }
    }

    if (filters.advancedFilter) {
      const advancedWhere = await buildAdvancedMongoWhere(filters.advancedFilter, exportContext);
      if (advancedWhere) {
        filter = appendAndCondition(filter, advancedWhere);
      }
    }
  }

  return filter;
};
