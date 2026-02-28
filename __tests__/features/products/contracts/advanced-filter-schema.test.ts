import { describe, expect, it } from 'vitest';

import {
  productAdvancedFilterGroupSchema,
  productAdvancedFilterPresetBundleSchema,
  productFilterSchema,
  PRODUCT_ADVANCED_FILTER_MAX_DEPTH,
  PRODUCT_ADVANCED_FILTER_MAX_RULES,
  PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS,
  type ProductAdvancedFilterGroup,
  type ProductAdvancedFilterField,
  type ProductAdvancedFilterOperator,
} from '@/shared/contracts/products';

const makeCondition = (
  id: string,
  field: ProductAdvancedFilterField,
  operator: ProductAdvancedFilterOperator,
  value?: unknown,
  valueTo?: unknown
) =>
  ({
    type: 'condition' as const,
    id,
    field,
    operator,
    ...(value !== undefined ? { value } : {}),
    ...(valueTo !== undefined ? { valueTo } : {}),
  }) as any;

const makeGroup = (
  id: string,
  rules: ProductAdvancedFilterGroup['rules'],
  options: { combinator?: 'and' | 'or'; not?: boolean } = {}
): ProductAdvancedFilterGroup => ({
  type: 'group',
  id,
  combinator: options.combinator ?? 'and',
  not: options.not ?? false,
  rules,
});

const buildDepth = (depth: number): ProductAdvancedFilterGroup => {
  if (depth <= 1) {
    return makeGroup('group_1', [makeCondition('cond_1', 'name', 'contains', 'desk')]);
  }

  let group = makeGroup(`group_${depth}`, [
    makeCondition(`cond_${depth}`, 'name', 'contains', `depth_${depth}`),
  ]);

  for (let index = depth - 1; index >= 1; index -= 1) {
    group = makeGroup(`group_${index}`, [group]);
  }

  return group;
};

describe('advanced filter contract v2', () => {
  it('accepts valid new relation and boolean operators', () => {
    const payload = makeGroup('root', [
      makeCondition('c1', 'catalogId', 'in', ['cat-1', 'cat-2']),
      makeCondition('c2', 'tagId', 'eq', 'tag-1'),
      makeCondition('c3', 'producerId', 'notIn', ['prod-1']),
      makeCondition('c4', 'published', 'eq', true),
      makeCondition('c5', 'baseExported', 'neq', false),
      makeCondition('c6', 'baseProductId', 'contains', 'base-'),
    ]);

    const result = productAdvancedFilterGroupSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('rejects invalid field/operator compatibility with actionable message', () => {
    const payload = makeGroup('root', [makeCondition('c1', 'published', 'contains', 'yes')]);

    const result = productAdvancedFilterGroupSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toContain('not allowed for field "published"');
  });

  it('rejects list operators above max items', () => {
    const values = Array.from(
      { length: PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS + 1 },
      (_, index) => `id-${index}`
    );
    const payload = makeGroup('root', [makeCondition('c1', 'catalogId', 'in', values)]);

    const result = productAdvancedFilterGroupSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((issue) =>
        issue.message.includes(String(PRODUCT_ADVANCED_FILTER_MAX_SET_ITEMS))
      )
    ).toBe(true);
  });

  it('rejects depth above max', () => {
    const payload = buildDepth(PRODUCT_ADVANCED_FILTER_MAX_DEPTH + 1);
    const result = productAdvancedFilterGroupSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues.some((issue) => issue.message.includes('max depth'))).toBe(true);
  });

  it('rejects rule counts above max', () => {
    const rules = Array.from({ length: PRODUCT_ADVANCED_FILTER_MAX_RULES + 1 }, (_, index) =>
      makeCondition(`c${index}`, 'name', 'contains', `item-${index}`)
    );
    const payload = makeGroup('root', rules);

    const result = productAdvancedFilterGroupSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.error.issues.some((issue) =>
        issue.message.includes(String(PRODUCT_ADVANCED_FILTER_MAX_RULES))
      )
    ).toBe(true);
  });

  it('rejects malformed advancedFilter JSON at query-schema level', () => {
    const result = productFilterSchema.safeParse({
      advancedFilter: '{not-json',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]?.message).toContain('valid JSON');
  });

  it('validates preset bundle export/import shape', () => {
    const filter = makeGroup('root', [makeCondition('c1', 'name', 'contains', 'chair')]);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      presets: [
        {
          id: 'preset-1',
          name: 'Chairs',
          filter,
        },
      ],
    };

    const result = productAdvancedFilterPresetBundleSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
