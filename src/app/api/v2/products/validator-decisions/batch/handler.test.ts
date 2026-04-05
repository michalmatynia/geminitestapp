import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';

const { appendProductValidationDecisionsBatchMock } = vi.hoisted(() => ({
  appendProductValidationDecisionsBatchMock: vi.fn(),
}));

vi.mock('@/shared/lib/products/services/validator-decision-log-service', () => ({
  appendProductValidationDecisionsBatch: appendProductValidationDecisionsBatchMock,
}));

import { POST_handler } from './handler';

const buildContext = (body?: unknown): ApiHandlerContext =>
  ({
    requestId: 'req-validator-decisions-batch',
    traceId: 'trace-validator-decisions-batch',
    correlationId: 'corr-validator-decisions-batch',
    startTime: Date.now(),
    getElapsedMs: () => 0,
    body,
    userId: 'user-1',
  }) as ApiHandlerContext;

describe('validator-decisions batch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appendProductValidationDecisionsBatchMock.mockResolvedValue([{ id: 'decision-1' }]);
  });

  it('persists a validated batch decision payload', async () => {
    const response = await POST_handler(
      {} as NextRequest,
      buildContext({
        decisions: [
          {
            patternId: 'pattern-1',
            fieldName: 'name_en',
          },
          {
            action: 'replace',
            productId: 'product-1',
            draftId: null,
            patternId: 'pattern-2',
            fieldName: 'description_en',
            denyBehavior: null,
            message: 'Updated',
            replacementValue: 'Replacement',
            sessionId: 'session-1',
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    expect(appendProductValidationDecisionsBatchMock).toHaveBeenCalledWith([
      {
        action: 'accept',
        productId: null,
        draftId: null,
        patternId: 'pattern-1',
        fieldName: 'name_en',
        denyBehavior: null,
        message: null,
        replacementValue: null,
        sessionId: null,
        userId: 'user-1',
      },
      {
        action: 'replace',
        productId: 'product-1',
        draftId: null,
        patternId: 'pattern-2',
        fieldName: 'description_en',
        denyBehavior: null,
        message: 'Updated',
        replacementValue: 'Replacement',
        sessionId: 'session-1',
        userId: 'user-1',
      },
    ]);
  });

  it('rejects missing request bodies with a validation error instead of crashing', async () => {
    await expect(POST_handler({} as NextRequest, buildContext())).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      httpStatus: 400,
    });

    expect(appendProductValidationDecisionsBatchMock).not.toHaveBeenCalled();
  });
});
