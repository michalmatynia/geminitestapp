import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const { getValidationPatternRepositoryMock, listValidationPatternsCachedMock } = vi.hoisted(() => ({
  getValidationPatternRepositoryMock: vi.fn(),
  listValidationPatternsCachedMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getValidationPatternRepository: (...args: unknown[]) => getValidationPatternRepositoryMock(...args),
}));

vi.mock('@/shared/lib/products/services/validation-pattern-runtime-cache', () => ({
  listValidationPatternsCached: (...args: unknown[]) => listValidationPatternsCachedMock(...args),
}));

import { getHandler, querySchema } from './handler';

describe('product validator-config handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getValidationPatternRepositoryMock.mockResolvedValue({
      getEnabledByDefault: vi.fn(async () => true),
      getFormatterEnabledByDefault: vi.fn(async () => false),
      getInstanceDenyBehavior: vi.fn(async () => 'warn'),
    });

    listValidationPatternsCachedMock.mockResolvedValue([
      { id: 'pattern-1', label: 'Enabled', enabled: true },
      { id: 'pattern-2', label: 'Disabled', enabled: false },
    ]);
  });

  it('exports the supported handler and query schema', () => {
    expect(typeof getHandler).toBe('function');
    expect(typeof querySchema.safeParse).toBe('function');
  });

  it('filters disabled patterns by default', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/validator-config'),
      { query: {} } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: 'warn',
      patterns: [{ id: 'pattern-1', label: 'Enabled', enabled: true }],
    });
    expect(listValidationPatternsCachedMock).toHaveBeenCalledTimes(1);
  });

  it('returns disabled patterns when includeDisabled is true', async () => {
    const response = await getHandler(
      new NextRequest('http://localhost/api/v2/products/validator-config?includeDisabled=true'),
      {
        query: { includeDisabled: true },
      } as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enabledByDefault: true,
      formatterEnabledByDefault: false,
      instanceDenyBehavior: 'warn',
      patterns: [
        { id: 'pattern-1', label: 'Enabled', enabled: true },
        { id: 'pattern-2', label: 'Disabled', enabled: false },
      ],
    });
  });
});
