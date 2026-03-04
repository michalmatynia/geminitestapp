import { Prisma } from '@prisma/client';
import {
  getProductAdvancedFilterMetrics,
  type ProductAdvancedFilterCondition,
  type ProductAdvancedFilterRule,
  type ProductFilters,
} from '@/shared/contracts/products';
import { logger } from '@/shared/utils/logger';
import {
  BASE_INTEGRATION_SLUGS,
  parseAdvancedFilterGroup,
  toAdvancedBooleanValue,
  toAdvancedDateValue,
  toAdvancedNumberValue,
  toAdvancedStringArrayValues,
  toAdvancedStringValue,
} from './prisma-product-repository.helpers';

const buildPrismaSingleStringCondition = (
  field: string,
  condition: ProductAdvancedFilterCondition,
  options: { nullable?: boolean } = {}
): Prisma.ProductWhereInput | null => {
  const nullable = options.nullable ?? true;

  if (condition.operator === 'isEmpty') {
    if (nullable) {
      return {
        OR: [{ [field]: null }, { [field]: '' }],
      } as Prisma.ProductWhereInput;
    }
    return { [field]: '' } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'isNotEmpty') {
    if (nullable) {
      return {
        AND: [{ [field]: { not: null } }, { [field]: { not: '' } }],
      } as Prisma.ProductWhereInput;
    }
    return { [field]: { not: '' } } as Prisma.ProductWhereInput;
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'contains') {
    return {
      [field]: {
        contains: value,
        mode: 'insensitive',
      },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'eq') {
    return {
      [field]: {
        equals: value,
        mode: 'insensitive',
      },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'in') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return {
      [field]: {
        in: values,
      },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'notIn') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return {
      NOT: [
        {
          [field]: {
            in: values,
          },
        },
      ],
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'neq') {
    return {
      NOT: [
        {
          [field]: {
            equals: value,
            mode: 'insensitive',
          },
        },
      ],
    } as Prisma.ProductWhereInput;
  }

  return null;
};

const buildPrismaMultiStringCondition = (
  fields: string[],
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  if (fields.length === 0) return null;

  if (condition.operator === 'isEmpty') {
    const emptyConditions = fields
      .map((field: string) =>
        buildPrismaSingleStringCondition(field, condition, { nullable: true })
      )
      .filter((entry): entry is Prisma.ProductWhereInput => entry !== null);
    if (emptyConditions.length === 0) return null;
    return {
      AND: emptyConditions,
    };
  }

  if (condition.operator === 'isNotEmpty') {
    const nonEmptyConditions = fields
      .map((field: string) =>
        buildPrismaSingleStringCondition(field, condition, { nullable: true })
      )
      .filter((entry): entry is Prisma.ProductWhereInput => entry !== null);
    if (nonEmptyConditions.length === 0) return null;
    return {
      OR: nonEmptyConditions,
    };
  }

  const leafConditions = fields
    .map((field: string) =>
      buildPrismaSingleStringCondition(
        field,
        {
          ...condition,
          operator:
            condition.operator === 'neq'
              ? 'eq'
              : condition.operator === 'notIn'
                ? 'in'
                : condition.operator,
        },
        { nullable: true }
      )
    )
    .filter((entry): entry is Prisma.ProductWhereInput => entry !== null);
  if (leafConditions.length === 0) return null;

  const orCondition: Prisma.ProductWhereInput = { OR: leafConditions };
  if (condition.operator === 'neq' || condition.operator === 'notIn') {
    return {
      NOT: [orCondition],
    };
  }
  return orCondition;
};

const buildPrismaCategoryCondition = (
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  if (condition.operator === 'isEmpty') {
    return { categories: { is: null } };
  }

  if (condition.operator === 'isNotEmpty') {
    return { categories: { isNot: null } };
  }

  const value = toAdvancedStringValue(condition.value);
  if (!value) return null;

  const eqCondition: Prisma.ProductWhereInput = {
    categories: { is: { categoryId: value } },
  };

  if (condition.operator === 'eq') return eqCondition;
  if (condition.operator === 'neq') {
    return { NOT: [eqCondition] };
  }
  if (condition.operator === 'contains') {
    return {
      categories: {
        is: {
          categoryId: {
            contains: value,
            mode: 'insensitive',
          },
        },
      },
    };
  }

  return null;
};

const buildPrismaRelationIdCondition = (
  relation: 'catalogs' | 'tags' | 'producers',
  relationField: 'catalogId' | 'tagId' | 'producerId',
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  if (condition.operator === 'isEmpty') {
    return {
      [relation]: { none: {} },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'isNotEmpty') {
    return {
      [relation]: { some: {} },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'eq') {
    const value = toAdvancedStringValue(condition.value);
    if (!value) return null;
    return {
      [relation]: {
        some: {
          [relationField]: value,
        },
      },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'neq') {
    const value = toAdvancedStringValue(condition.value);
    if (!value) return null;
    return {
      [relation]: {
        none: {
          [relationField]: value,
        },
      },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'in') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return {
      [relation]: {
        some: {
          [relationField]: { in: values },
        },
      },
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'notIn') {
    const values = toAdvancedStringArrayValues(condition.value);
    if (values.length === 0) return null;
    return {
      [relation]: {
        none: {
          [relationField]: { in: values },
        },
      },
    } as Prisma.ProductWhereInput;
  }

  return null;
};

const buildPrismaBooleanCondition = (
  field: 'published',
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  const value = toAdvancedBooleanValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') {
    return {
      [field]: value,
    } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'neq') {
    return {
      NOT: [{ [field]: value }],
    } as Prisma.ProductWhereInput;
  }

  return null;
};

export const buildPrismaBaseExportedCondition = (
  baseExported: boolean
): Prisma.ProductWhereInput => {
  const exportedByListing: Prisma.ProductWhereInput = {
    listings: {
      some: {
        integration: {
          slug: { in: [...BASE_INTEGRATION_SLUGS] },
        },
        externalListingId: { not: null },
      },
    },
  };
  const exportedByBaseProductId: Prisma.ProductWhereInput = {
    AND: [{ baseProductId: { not: null } }, { baseProductId: { not: '' } }],
  };

  if (baseExported) {
    return {
      OR: [exportedByListing, exportedByBaseProductId],
    };
  }

  return {
    AND: [
      {
        OR: [{ baseProductId: null }, { baseProductId: '' }],
      },
      {
        listings: {
          none: {
            integration: {
              slug: { in: [...BASE_INTEGRATION_SLUGS] },
            },
            externalListingId: { not: null },
          },
        },
      },
    ],
  };
};

const buildPrismaNumericCondition = (
  field: 'price' | 'stock',
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  if (condition.operator === 'isEmpty') {
    return { [field]: null } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'isNotEmpty') {
    return { [field]: { not: null } } as Prisma.ProductWhereInput;
  }

  if (condition.operator === 'between') {
    const left = toAdvancedNumberValue(condition.value);
    const right = toAdvancedNumberValue(condition.valueTo);
    if (left === null || right === null) return null;
    const [min, max] = left <= right ? [left, right] : [right, left];
    return {
      AND: [{ [field]: { gte: min } }, { [field]: { lte: max } }],
    } as Prisma.ProductWhereInput;
  }

  const value = toAdvancedNumberValue(condition.value);
  if (value === null) return null;

  if (condition.operator === 'eq') {
    return { [field]: { equals: value } } as Prisma.ProductWhereInput;
  }
  if (condition.operator === 'neq') {
    return { NOT: [{ [field]: { equals: value } }] } as Prisma.ProductWhereInput;
  }
  if (condition.operator === 'gt') {
    return { [field]: { gt: value } } as Prisma.ProductWhereInput;
  }
  if (condition.operator === 'gte') {
    return { [field]: { gte: value } } as Prisma.ProductWhereInput;
  }
  if (condition.operator === 'lt') {
    return { [field]: { lt: value } } as Prisma.ProductWhereInput;
  }
  if (condition.operator === 'lte') {
    return { [field]: { lte: value } } as Prisma.ProductWhereInput;
  }

  return null;
};

const buildPrismaCreatedAtCondition = (
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  if (condition.operator === 'isEmpty') {
    // createdAt is non-null in schema; force empty-result predicate.
    return { id: '__advanced_filter_createdAt_empty__' };
  }

  if (condition.operator === 'isNotEmpty') {
    return null;
  }

  if (condition.operator === 'between') {
    const left = toAdvancedDateValue(condition.value);
    const right = toAdvancedDateValue(condition.valueTo);
    if (!left || !right) return null;
    const [min, max] = left <= right ? [left, right] : [right, left];
    return {
      AND: [{ createdAt: { gte: min } }, { createdAt: { lte: max } }],
    };
  }

  const value = toAdvancedDateValue(condition.value);
  if (!value) return null;

  if (condition.operator === 'eq') {
    return { createdAt: { equals: value } };
  }
  if (condition.operator === 'neq') {
    return { NOT: [{ createdAt: { equals: value } }] };
  }
  if (condition.operator === 'gt') {
    return { createdAt: { gt: value } };
  }
  if (condition.operator === 'gte') {
    return { createdAt: { gte: value } };
  }
  if (condition.operator === 'lt') {
    return { createdAt: { lt: value } };
  }
  if (condition.operator === 'lte') {
    return { createdAt: { lte: value } };
  }

  return null;
};

const compileAdvancedPrismaCondition = (
  condition: ProductAdvancedFilterCondition
): Prisma.ProductWhereInput | null => {
  if (condition.field === 'id') {
    return buildPrismaSingleStringCondition('id', condition, { nullable: false });
  }
  if (condition.field === 'sku') {
    return buildPrismaSingleStringCondition('sku', condition, { nullable: true });
  }
  if (condition.field === 'name') {
    return buildPrismaMultiStringCondition(['name_en', 'name_pl', 'name_de'], condition);
  }
  if (condition.field === 'description') {
    return buildPrismaMultiStringCondition(
      ['description_en', 'description_pl', 'description_de'],
      condition
    );
  }
  if (condition.field === 'categoryId') {
    return buildPrismaCategoryCondition(condition);
  }
  if (condition.field === 'catalogId') {
    return buildPrismaRelationIdCondition('catalogs', 'catalogId', condition);
  }
  if (condition.field === 'tagId') {
    return buildPrismaRelationIdCondition('tags', 'tagId', condition);
  }
  if (condition.field === 'producerId') {
    return buildPrismaRelationIdCondition('producers', 'producerId', condition);
  }
  if (condition.field === 'price') {
    return buildPrismaNumericCondition('price', condition);
  }
  if (condition.field === 'stock') {
    return buildPrismaNumericCondition('stock', condition);
  }
  if (condition.field === 'published') {
    return buildPrismaBooleanCondition('published', condition);
  }
  if (condition.field === 'baseExported') {
    const value = toAdvancedBooleanValue(condition.value);
    if (value === null) return null;
    if (condition.operator === 'eq') {
      return buildPrismaBaseExportedCondition(value);
    }
    if (condition.operator === 'neq') {
      return buildPrismaBaseExportedCondition(!value);
    }
    return null;
  }
  if (condition.field === 'baseProductId') {
    return buildPrismaSingleStringCondition('baseProductId', condition, { nullable: true });
  }
  if (condition.field === 'createdAt') {
    return buildPrismaCreatedAtCondition(condition);
  }
  return null;
};

const compileAdvancedPrismaRule = (
  rule: ProductAdvancedFilterRule
): Prisma.ProductWhereInput | null => {
  if (rule.type === 'condition') {
    return compileAdvancedPrismaCondition(rule);
  }

  const compiledRules = rule.rules
    .map((nestedRule: ProductAdvancedFilterRule) => compileAdvancedPrismaRule(nestedRule))
    .filter((nestedRule): nestedRule is Prisma.ProductWhereInput => nestedRule !== null);

  if (compiledRules.length === 0) return null;

  const combined =
    compiledRules.length === 1
      ? compiledRules[0]!
      : ({
          [rule.combinator === 'and' ? 'AND' : 'OR']: compiledRules,
        } as Prisma.ProductWhereInput);

  if (!rule.not) return combined;

  return {
    NOT: [combined],
  };
};

export const buildAdvancedPrismaWhere = (
  payload: string | undefined
): Prisma.ProductWhereInput | null => {
  const parsedGroup = parseAdvancedFilterGroup(payload);
  if (!parsedGroup) return null;
  const metrics = getProductAdvancedFilterMetrics(parsedGroup);
  const compileStart = Date.now();
  const compiled = compileAdvancedPrismaRule(parsedGroup);
  logger.info('[products.advanced-filter.prisma] compiled', {
    rules: metrics.rules,
    depth: metrics.depth,
    setItems: metrics.setItems,
    compileDurationMs: Date.now() - compileStart,
    compiled: Boolean(compiled),
  });
  return compiled;
};

export const buildProductWhere = (filters: ProductFilters): Prisma.ProductWhereInput => {
  const where: Prisma.ProductWhereInput = {};
  const andConditions: Prisma.ProductWhereInput[] = [];

  if (filters.id) {
    const normalizedId = filters.id.trim();
    if (normalizedId.length > 0) {
      if (filters.idMatchMode === 'partial') {
        andConditions.push({
          OR: [
            {
              id: {
                contains: normalizedId,
                mode: 'insensitive',
              },
            },
          ],
        });
      } else {
        where.id = normalizedId;
      }
    }
  }

  if (filters.sku) {
    where.sku = {
      contains: filters.sku,
      mode: 'insensitive',
    };
  }

  if (filters.search) {
    if (filters.searchLanguage) {
      andConditions.push({
        OR: [
          {
            [filters.searchLanguage]: {
              contains: filters.search,
              mode: 'insensitive',
            },
          },
        ],
      });
    } else {
      andConditions.push({
        OR: [
          { name_en: { contains: filters.search, mode: 'insensitive' } },
          { name_pl: { contains: filters.search, mode: 'insensitive' } },
          { name_de: { contains: filters.search, mode: 'insensitive' } },
          { description_en: { contains: filters.search, mode: 'insensitive' } },
          { description_pl: { contains: filters.search, mode: 'insensitive' } },
          { description_de: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }
  }

  if (filters.description) {
    andConditions.push({
      OR: [
        {
          description_en: {
            contains: filters.description,
            mode: 'insensitive',
          },
        },
        {
          description_pl: {
            contains: filters.description,
            mode: 'insensitive',
          },
        },
        {
          description_de: {
            contains: filters.description,
            mode: 'insensitive',
          },
        },
      ],
    });
  }

  if (filters.minPrice !== undefined) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      gte: filters.minPrice,
    };
  }
  if (filters.maxPrice !== undefined) {
    where.price = {
      ...(where.price as Prisma.IntFilter),
      lte: filters.maxPrice,
    };
  }
  if (filters.stockValue !== undefined) {
    const operator = filters.stockOperator ?? 'eq';
    const stockFilter = where.stock as Prisma.IntNullableFilter | undefined;
    const nextStockFilter: Prisma.IntNullableFilter = {
      ...(stockFilter ?? {}),
    };

    if (operator === 'gt') {
      nextStockFilter.gt = filters.stockValue;
    } else if (operator === 'gte') {
      nextStockFilter.gte = filters.stockValue;
    } else if (operator === 'lt') {
      nextStockFilter.lt = filters.stockValue;
    } else if (operator === 'lte') {
      nextStockFilter.lte = filters.stockValue;
    } else {
      nextStockFilter.equals = filters.stockValue;
    }

    where.stock = nextStockFilter;
  }
  if (filters.startDate) {
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      gte: new Date(filters.startDate),
    };
  }
  if (filters.endDate) {
    where.createdAt = {
      ...(where.createdAt as Prisma.DateTimeFilter),
      lte: new Date(filters.endDate),
    };
  }

  if (filters.catalogId) {
    if (filters.catalogId === 'unassigned') {
      where.catalogs = { none: {} };
    } else {
      where.catalogs = { some: { catalogId: filters.catalogId } };
    }
  }

  if (filters.categoryId) {
    andConditions.push({
      categories: {
        is: { categoryId: filters.categoryId },
      },
    });
  }

  if (filters.baseExported !== undefined) {
    andConditions.push(buildPrismaBaseExportedCondition(filters.baseExported));
  }

  const advancedWhere = buildAdvancedPrismaWhere(filters.advancedFilter);
  if (advancedWhere) {
    andConditions.push(advancedWhere);
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
};
