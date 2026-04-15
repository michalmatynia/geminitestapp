import { type Filter } from 'mongodb';

import { getProductAdvancedFilterMetrics } from '@/shared/contracts/products/filters';
import { type ProductAdvancedFilterCondition, type ProductAdvancedFilterRule, type ProductFilters } from '@/shared/contracts/products';
import { logger } from '@/shared/utils/logger';

import { type ProductDocument } from './mongo-product-repository-mappers';
import {
  appendAndCondition,
  buildProductIdFilter,
  escapeRegex,
  parseAdvancedFilterGroup,
  toAdvancedBooleanValue,
  toAdvancedDateValue,
  toAdvancedNumberValue,
  toAdvancedStringArrayValues,
  toAdvancedStringValue,
  loadMongoBaseExportLookupContext,
  type BaseExportLookupContext,
} from './mongo-product-repository.helpers';

const buildEmptyStringPathCondition = (path: string): Filter<ProductDocument> =>
  ({
    $or: [{ [path]: { $exists: false } }, { [path]: null }, { [path]: '' }],
  }) as Filter<ProductDocument>;

const buildNonEmptyStringPathCondition = (path: string): Filter<ProductDocument> =>
  ({
    [path]: { $exists: true, $nin: [null, ''] },
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

const buildMongoCategoryCondition = (
  condition: ProductAdvancedFilterCondition
): Filter<ProductDocument> | null => {
  if (condition.operator === 'isEmpty') {
    return {
      $or: [{ categoryId: { $exists: false } }, { categoryId: null }, { categoryId: '' }],
    } as Filter<ProductDocument>;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      categoryId: { $exists: true, $nin: [null, ''] },
    } as Filter<ProductDocument>;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'contains') {
    const regex = { $regex: escapeRegex(value), $options: 'i' };
    return { categoryId: regex } as Filter<ProductDocument>;
  }

  if (condition.operator === 'eq') {
    return { categoryId: value } as Filter<ProductDocument>;
  }

  if (condition.operator === 'neq') {
    const eqCondition = buildMongoCategoryCondition({
      ...condition,
      operator: 'eq',
    });
    if (!eqCondition) return null;
    return { $nor: [eqCondition] } as Filter<ProductDocument>;
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

const compileAdvancedMongoCondition = (
  condition: ProductAdvancedFilterCondition,
  context: BaseExportLookupContext
): Filter<ProductDocument> | null => {
  if (condition.field === 'id') return buildMongoIdCondition(condition);
  if (condition.field === 'sku') return buildMongoStringFieldCondition(['sku'], condition);
  if (condition.field === 'name')
    return buildMongoStringFieldCondition(['name_en', 'name_pl', 'name_de'], condition);
  if (condition.field === 'description')
    return buildMongoStringFieldCondition(
      ['description_en', 'description_pl', 'description_de'],
      condition
    );
  if (condition.field === 'categoryId') return buildMongoCategoryCondition(condition);
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
    if (condition.operator === 'eq') return buildMongoBaseExportedCondition(value, context);
    if (condition.operator === 'neq') return buildMongoBaseExportedCondition(!value, context);
    return null;
  }
  if (condition.field === 'baseProductId')
    return buildMongoStringFieldCondition(['baseProductId'], condition);
  if (condition.field === 'createdAt') return buildMongoCreatedAtCondition(condition);
  return null;
};

const compileAdvancedMongoRule = (
  rule: ProductAdvancedFilterRule,
  context: BaseExportLookupContext
): Filter<ProductDocument> | null => {
  if (rule.type === 'condition') {
    return compileAdvancedMongoCondition(rule, context);
  }

  const compiledRules = rule.rules
    .map((nested: ProductAdvancedFilterRule) => compileAdvancedMongoRule(nested, context))
    .filter((nested): nested is Filter<ProductDocument> => nested !== null);

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

export const buildAdvancedMongoWhere = (
  payload: string | undefined,
  context: BaseExportLookupContext
): Filter<ProductDocument> | null => {
  const parsedGroup = parseAdvancedFilterGroup(payload);
  if (!parsedGroup) return null;
  const metrics = getProductAdvancedFilterMetrics(parsedGroup);
  const compileStart = Date.now();
  const compiled = compileAdvancedMongoRule(parsedGroup, context);
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

  if (filters.categoryId) {
    filter = appendAndCondition(filter, {
      categoryId: filters.categoryId,
    } as Filter<ProductDocument>);
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
      const advancedWhere = buildAdvancedMongoWhere(filters.advancedFilter, exportContext);
      if (advancedWhere) {
        filter = appendAndCondition(filter, advancedWhere);
      }
    }
  }

  return filter;
};
