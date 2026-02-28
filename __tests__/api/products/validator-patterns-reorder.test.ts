import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/products/validator-patterns/reorder/route';
import type { ProductValidationPattern } from '@/shared/contracts/products';

const repositoryMock = vi.hoisted(() => ({
  listPatterns: vi.fn(),
  updatePattern: vi.fn(),
}));

const invalidateRuntimeCacheMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/products/server', () => ({
  getValidationPatternRepository: vi.fn(async () => repositoryMock),
}));

vi.mock('@/shared/lib/products/services/validation-pattern-runtime-cache', () => ({
  invalidateValidationPatternRuntimeCache: invalidateRuntimeCacheMock,
}));

const buildPattern = (id: string, updatedAt: string): ProductValidationPattern => ({
  id,
  label: `Pattern ${id}`,
  target: 'sku',
  locale: null,
  regex: '^KEYCHA\\d{3}$',
  flags: null,
  message: 'Invalid SKU',
  severity: 'error',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: null,
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
  sequence: 10,
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
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt,
});

describe('validator-patterns/reorder route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies a batch reorder when expected timestamps match', async () => {
    const patternA = buildPattern('pattern-a', '2026-02-01T00:00:00.000Z');
    const patternB = buildPattern('pattern-b', '2026-02-01T00:01:00.000Z');
    repositoryMock.listPatterns.mockResolvedValue([patternA, patternB]);
    repositoryMock.updatePattern
      .mockResolvedValueOnce({ ...patternA, sequence: 20 })
      .mockResolvedValueOnce({ ...patternB, sequence: 10 });

    const response = await POST(
      new NextRequest('http://localhost/api/products/validator-patterns/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          updates: [
            {
              id: 'pattern-a',
              sequence: 20,
              expectedUpdatedAt: patternA.updatedAt,
            },
            {
              id: 'pattern-b',
              sequence: 10,
              expectedUpdatedAt: patternB.updatedAt,
            },
          ],
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(repositoryMock.updatePattern).toHaveBeenCalledTimes(2);
    expect(invalidateRuntimeCacheMock).toHaveBeenCalledTimes(1);
    expect(Array.isArray(data.updated)).toBe(true);
    expect(data.updated).toHaveLength(2);
  });

  it('returns conflict when payload is stale', async () => {
    const patternA = buildPattern('pattern-a', '2026-02-01T00:00:00.000Z');
    repositoryMock.listPatterns.mockResolvedValue([patternA]);

    const response = await POST(
      new NextRequest('http://localhost/api/products/validator-patterns/reorder', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          updates: [
            {
              id: 'pattern-a',
              sequence: 20,
              expectedUpdatedAt: '2026-02-01T00:00:05.000Z',
            },
          ],
        }),
      })
    );
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(String(data.error ?? '')).toContain('modified by another request');
    expect(repositoryMock.updatePattern).not.toHaveBeenCalled();
    expect(invalidateRuntimeCacheMock).not.toHaveBeenCalled();
  });
});
