import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PUT } from '@/app/api/v2/products/validator-patterns/[id]/route-handler';
import { POST } from '@/app/api/v2/products/validator-patterns/route-handler';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

const repositoryMock = vi.hoisted(() => ({
  listPatterns: vi.fn(),
  getPatternById: vi.fn(),
  createPattern: vi.fn(),
  updatePattern: vi.fn(),
  deletePattern: vi.fn(),
}));

vi.mock('@/features/products/server', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/products/server')>();
  return {
    ...actual,
    getValidationPatternRepository: vi.fn(async () => repositoryMock),
  };
});

describe('validator-pattern routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    repositoryMock.createPattern.mockResolvedValue({
      id: 'pattern-1',
      label: 'Test',
      target: 'sku',
    });
    repositoryMock.getPatternById.mockResolvedValue({
      id: 'pattern-1',
      label: 'Test',
      target: 'sku',
      locale: null,
      regex: '^KEYCHA\\d{3}$',
      flags: null,
      message: 'Invalid SKU',
      severity: 'error',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: 'REPL',
      replacementFields: [],
      replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      runtimeEnabled: false,
      runtimeType: 'none',
      runtimeConfig: null,
      postAcceptBehavior: 'revalidate',
      denyBehaviorOverride: null,
      validationDebounceMs: 0,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: null,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      launchEnabled: false,
      launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      launchScopeBehavior: 'gate',
      launchSourceMode: 'current_field',
      launchSourceField: null,
      launchOperator: 'equals',
      launchValue: null,
      launchFlags: null,
      appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    repositoryMock.updatePattern.mockResolvedValue({
      id: 'pattern-1',
      label: 'Updated',
      target: 'sku',
    });
  });

  it('POST rejects invalid dynamic source regex', async () => {
    const replacementValue = encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'latest_product_field',
      sourceField: 'sku',
      sourceRegex: '(\\d+$',
      sourceFlags: '',
      sourceMatchGroup: 1,
      mathOperation: 'add',
      mathOperand: 1,
      resultAssembly: 'source_replace_match',
      targetApply: 'replace_whole_field',
    });

    const response = await POST(
      new NextRequest('http://localhost/api/v2/products/validator-patterns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: 'Auto SKU',
          target: 'sku',
          regex: '^KEYCHA\\d{3}$',
          message: 'Invalid SKU',
          replacementEnabled: true,
          replacementValue,
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('Invalid regex or flags');
    expect(repositoryMock.createPattern).not.toHaveBeenCalled();
  });

  it('POST rejects regex launch operator without pattern value', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/v2/products/validator-patterns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: 'Launch Guard',
          target: 'sku',
          regex: '^KEYCHA\\d{3}$',
          message: 'Invalid SKU',
          launchEnabled: true,
          launchOperator: 'regex',
          launchValue: '',
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('launchValue is required');
    expect(repositoryMock.createPattern).not.toHaveBeenCalled();
  });

  it('POST allows runtime replacement without static replacementValue', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/v2/products/validator-patterns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: 'Name Segment #4 -> Category',
          target: 'category',
          regex: '^.*$',
          message: 'Resolve category from name segment.',
          replacementEnabled: true,
          replacementValue: null,
          replacementFields: ['categoryId'],
          runtimeEnabled: true,
          runtimeType: 'database_query',
          runtimeConfig: JSON.stringify({
            version: 1,
            operation: 'query',
            payload: {
              provider: 'auto',
              collection: 'product_categories',
              filter: { name: '[nameEnSegment4]' },
            },
            resultPath: 'item',
            operator: 'truthy',
            replacementPaths: ['item.id', 'item._id'],
          }),
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(repositoryMock.createPattern).toHaveBeenCalledTimes(1);
  });

  it('POST rejects missing replacementValue when runtime replacement is disabled', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/v2/products/validator-patterns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          label: 'Static Replacement Missing',
          target: 'sku',
          regex: '^.*$',
          message: 'Missing replacement',
          replacementEnabled: true,
          replacementValue: null,
          runtimeEnabled: false,
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('replacementValue is required');
    expect(repositoryMock.createPattern).not.toHaveBeenCalled();
  });

  it('PUT rejects invalid dynamic logic regex', async () => {
    const replacementValue = encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'current_field',
      logicOperator: 'regex',
      logicOperand: '[abc',
      logicFlags: '',
      logicWhenTrueAction: 'keep',
      logicWhenFalseAction: 'keep',
      resultAssembly: 'segment_only',
      targetApply: 'replace_whole_field',
    });

    const response = await PUT(
      new NextRequest('http://localhost/api/v2/products/validator-patterns/pattern-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          replacementEnabled: true,
          replacementValue,
        }),
      }),
      { params: Promise.resolve({ id: 'pattern-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('Invalid regex or flags');
    expect(repositoryMock.updatePattern).not.toHaveBeenCalled();
  });

  it('PUT rejects launch regex with invalid regex flags/pattern', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/v2/products/validator-patterns/pattern-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          launchEnabled: true,
          launchOperator: 'regex',
          launchValue: '(',
          launchFlags: '',
        }),
      }),
      { params: Promise.resolve({ id: 'pattern-1' }) }
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('Invalid regex or flags');
    expect(repositoryMock.updatePattern).not.toHaveBeenCalled();
  });

  it('PUT allows runtime replacement without static replacementValue', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/v2/products/validator-patterns/pattern-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          replacementEnabled: true,
          replacementValue: null,
          replacementFields: ['categoryId'],
          runtimeEnabled: true,
          runtimeType: 'database_query',
          runtimeConfig: JSON.stringify({
            version: 1,
            operation: 'query',
            payload: {
              provider: 'auto',
              collection: 'product_categories',
              filter: { name: '[nameEnSegment4]' },
            },
            resultPath: 'item',
            operator: 'truthy',
            replacementPaths: ['item.id'],
          }),
        }),
      }),
      { params: Promise.resolve({ id: 'pattern-1' }) }
    );

    expect(response.status).toBe(200);
    expect(repositoryMock.updatePattern).toHaveBeenCalledTimes(1);
  });

  it('PUT allows enabling auto-apply on runtime pattern with null replacementValue', async () => {
    repositoryMock.getPatternById.mockResolvedValueOnce({
      id: 'pattern-1',
      label: 'Name Segment #4 -> Category',
      target: 'category',
      locale: null,
      regex: '^.*$',
      flags: null,
      message: 'Resolve category from segment 4.',
      severity: 'warning',
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: null,
      replacementFields: ['categoryId'],
      replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: JSON.stringify({
        version: 1,
        operation: 'query',
        payload: {
          provider: 'auto',
          collection: 'product_categories',
          filter: { name: '[nameEnSegment4]' },
        },
        resultPath: 'item',
        operator: 'truthy',
        replacementPaths: ['item.id'],
      }),
      postAcceptBehavior: 'revalidate',
      denyBehaviorOverride: null,
      validationDebounceMs: 500,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: null,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      launchEnabled: true,
      launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      launchScopeBehavior: 'gate',
      launchSourceMode: 'form_field',
      launchSourceField: 'nameEnSegment4',
      launchOperator: 'is_not_empty',
      launchValue: null,
      launchFlags: null,
      appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await PUT(
      new NextRequest('http://localhost/api/v2/products/validator-patterns/pattern-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          replacementAutoApply: true,
        }),
      }),
      { params: Promise.resolve({ id: 'pattern-1' }) }
    );

    expect(response.status).toBe(200);
    expect(repositoryMock.updatePattern).toHaveBeenCalledWith(
      'pattern-1',
      expect.objectContaining({
        replacementAutoApply: true,
      })
    );
  });
});
