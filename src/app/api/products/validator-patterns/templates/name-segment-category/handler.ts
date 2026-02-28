import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import { invalidateValidationPatternRuntimeCache } from '@/features/products/services/validation-pattern-runtime-cache';
import type {
  ProductValidationInstanceScopeDto as ProductValidationInstanceScope,
  ProductValidationPatternDto as ProductValidationPattern,
} from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const TEMPLATE_SCOPES: ProductValidationInstanceScope[] = [
  'draft_template',
  'product_create',
  'product_edit',
];

const parseRuntimeConfig = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  return [...new Set(fields)];
};

const isNameSegmentCategoryPattern = (pattern: ProductValidationPattern): boolean => {
  if (pattern.target !== 'category') return false;
  if (pattern.label.trim().toLowerCase() === 'name segment #4 -> category') {
    return true;
  }
  if (!pattern.runtimeEnabled || pattern.runtimeType !== 'database_query') return false;
  if (!pattern.replacementEnabled) return false;
  if (!normalizeReplacementFields(pattern.replacementFields).includes('categoryId')) return false;

  const config = parseRuntimeConfig(pattern.runtimeConfig);
  if (!config) return false;
  const payload =
    config['payload'] && typeof config['payload'] === 'object' && !Array.isArray(config['payload'])
      ? (config['payload'] as Record<string, unknown>)
      : null;
  if (!payload) return false;
  return String(payload['collection'] ?? '').trim() === 'product_categories';
};

const getPatternSequence = (pattern: ProductValidationPattern, fallbackIndex: number): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const patterns = await repository.listPatterns();
  const existing = patterns.find(isNameSegmentCategoryPattern);
  const maxSequence = patterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0
  );

  const runtimeConfig = {
    version: 1,
    operation: 'query',
    payload: {
      provider: 'auto',
      collection: 'product_categories',
      single: true,
      limit: 1,
      query: {
        catalogId: '[primaryCatalogId]',
        name: {
          $regex: '^\\s*[nameEnSegment4RegexEscaped]\\s*$',
          $options: 'i',
        },
      },
      projection: {
        id: 1,
        _id: 1,
        name: 1,
        catalogId: 1,
      },
    },
    resultPath: 'item',
    operator: 'truthy',
    replacementPaths: ['item.id', 'item._id'],
  };

  const payload = {
    label: 'Name Segment #4 -> Category',
    target: 'category' as const,
    locale: null,
    regex: '^.*$',
    flags: null,
    message: 'Propose Category from Name segment #4 (between third and fourth "|").',
    severity: 'warning' as const,
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: false,
    skipNoopReplacementProposal: true,
    replacementValue: null,
    replacementFields: ['categoryId'],
    replacementAppliesToScopes: [...TEMPLATE_SCOPES],
    runtimeEnabled: true,
    runtimeType: 'database_query' as const,
    runtimeConfig: JSON.stringify(runtimeConfig),
    postAcceptBehavior: 'revalidate' as const,
    validationDebounceMs: 500,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence: maxSequence + 10,
    chainMode: 'continue' as const,
    maxExecutions: 1,
    passOutputToNext: false,
    launchEnabled: true,
    launchAppliesToScopes: [...TEMPLATE_SCOPES],
    launchScopeBehavior: 'gate' as const,
    launchSourceMode: 'form_field' as const,
    launchSourceField: 'nameEnSegment4',
    launchOperator: 'is_not_empty' as const,
    launchValue: null,
    launchFlags: null,
    appliesToScopes: [...TEMPLATE_SCOPES],
  };

  if (existing) {
    const updated = await repository.updatePattern(existing.id, {
      ...payload,
      label: existing.label,
    });
    invalidateValidationPatternRuntimeCache();
    return NextResponse.json({
      outcomes: [
        {
          id: updated.id,
          target: 'category',
          label: updated.label,
          action: 'updated' as const,
        },
      ],
      ensuredPattern: updated,
    });
  }

  const created = await repository.createPattern(payload);
  invalidateValidationPatternRuntimeCache();
  return NextResponse.json({
    outcomes: [
      {
        id: created.id,
        target: 'category',
        label: created.label,
        action: 'created' as const,
      },
    ],
    ensuredPattern: created,
  });
}
