import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PUT } from '@/app/api/products/validator-patterns/[id]/route';
import { POST } from '@/app/api/products/validator-patterns/route';
import { encodeDynamicReplacementRecipe } from '@/features/products/utils/validator-replacement-recipe';

const repositoryMock = vi.hoisted(() => ({
  listPatterns: vi.fn(),
  getPatternById: vi.fn(),
  createPattern: vi.fn(),
  updatePattern: vi.fn(),
  deletePattern: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getValidationPatternRepository: vi.fn(async () => repositoryMock),
}));

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
      replacementValue: 'REPL',
      replacementFields: [],
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: null,
      chainMode: 'continue',
      maxExecutions: 1,
      passOutputToNext: true,
      launchEnabled: false,
      launchSourceMode: 'current_field',
      launchSourceField: null,
      launchOperator: 'equals',
      launchValue: null,
      launchFlags: null,
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
      new NextRequest('http://localhost/api/products/validator-patterns', {
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
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('Invalid regex or flags');
    expect(repositoryMock.createPattern).not.toHaveBeenCalled();
  });

  it('POST rejects regex launch operator without pattern value', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/products/validator-patterns', {
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
      }),
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('launchValue is required');
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
      new NextRequest('http://localhost/api/products/validator-patterns/pattern-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          replacementEnabled: true,
          replacementValue,
        }),
      }),
      { params: Promise.resolve({ id: 'pattern-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('Invalid regex or flags');
    expect(repositoryMock.updatePattern).not.toHaveBeenCalled();
  });

  it('PUT rejects launch regex with invalid regex flags/pattern', async () => {
    const response = await PUT(
      new NextRequest('http://localhost/api/products/validator-patterns/pattern-1', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          launchEnabled: true,
          launchOperator: 'regex',
          launchValue: '(',
          launchFlags: '',
        }),
      }),
      { params: Promise.resolve({ id: 'pattern-1' }) },
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(String(data.error ?? '')).toContain('Invalid regex or flags');
    expect(repositoryMock.updatePattern).not.toHaveBeenCalled();
  });
});

