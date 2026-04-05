import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { appendProductValidationDecisionMock } = vi.hoisted(() => ({
  appendProductValidationDecisionMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/validator-decision-log-service', () => ({
  appendProductValidationDecision: appendProductValidationDecisionMock,
}));

import { POST_handler } from './handler';

const buildContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'req-validator-decisions',
    traceId: 'trace-validator-decisions',
    correlationId: 'corr-validator-decisions',
    startTime: Date.now(),
    getElapsedMs: () => 0,
    body,
    userId: 'user-1',
  }) as ApiHandlerContext;

describe('validator-decisions handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendProductValidationDecisionMock.mockResolvedValue({ id: 'decision-1' });
  });

  it('persists a validated decision payload', async () => {
    const response = await POST_handler({} as NextRequest, buildContext({
      action: 'accept',
      productId: 'product-1',
      draftId: null,
      patternId: 'pattern-1',
      fieldName: 'name_en',
      denyBehavior: null,
      message: 'Looks good',
      replacementValue: null,
      sessionId: 'session-1',
    }));

    expect(response.status).toBe(200);
    expect(appendProductValidationDecisionMock).toHaveBeenCalledWith({
      action: 'accept',
      productId: 'product-1',
      draftId: null,
      patternId: 'pattern-1',
      fieldName: 'name_en',
      denyBehavior: null,
      message: 'Looks good',
      replacementValue: null,
      sessionId: 'session-1',
      userId: 'user-1',
    });
  });

  it('rejects missing request bodies with a validation error instead of crashing', async () => {
    await expect(POST_handler({} as NextRequest, buildContext())).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
    });

    expect(appendProductValidationDecisionMock).not.toHaveBeenCalled();
  });
});
