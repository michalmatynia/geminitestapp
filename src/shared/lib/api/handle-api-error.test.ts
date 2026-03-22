import { beforeEach, describe, expect, it, vi } from 'vitest';

const { reportErrorMock, captureExceptionMock } = vi.hoisted(() => ({
  reportErrorMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/utils/observability/report-error', () => ({
  reportError: reportErrorMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

import {
  createErrorResponse,
  createSimpleErrorResponse,
  createValidationErrorResponse,
} from './handle-api-error';

describe('handle-api-error helpers', () => {
  beforeEach(() => {
    reportErrorMock.mockReset();
    captureExceptionMock.mockReset();
  });

  it('creates traced error responses with retry headers and merged payload extras', async () => {
    reportErrorMock.mockResolvedValue({
      resolved: {
        code: 'RATE_LIMITED',
        errorId: 'error-1',
        category: 'rate_limit',
        suggestedActions: ['retry'],
        retryable: true,
        retryAfterMs: 2500,
        expected: false,
        meta: { hidden: true },
        httpStatus: 429,
      },
      userMessage: 'Try again later.',
      fingerprint: 'fingerprint-1',
    });

    const response = await createErrorResponse(new Error('boom'), {
      request: new Request('https://kangur.example/api/demo?foo=1&bar=2', {
        method: 'POST',
        headers: {
          'x-request-id': 'request-1',
          'x-trace-id': 'trace-1',
          'x-correlation-id': 'corr-1',
        },
      }),
      source: 'analytics.events.POST',
      extra: { feature: 'analytics' },
    });

    expect(response.status).toBe(429);
    expect(response.headers.get('x-request-id')).toBe('request-1');
    expect(response.headers.get('x-trace-id')).toBe('trace-1');
    expect(response.headers.get('x-correlation-id')).toBe('corr-1');
    expect(response.headers.get('x-error-id')).toBe('error-1');
    expect(response.headers.get('x-error-fingerprint')).toBe('fingerprint-1');
    expect(response.headers.get('Retry-After')).toBe('3');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toEqual({
      error: 'Try again later.',
      code: 'RATE_LIMITED',
      errorId: 'error-1',
      category: 'rate_limit',
      suggestedActions: ['retry'],
      fingerprint: 'fingerprint-1',
      retryable: true,
      retryAfterMs: 2500,
      feature: 'analytics',
    });
  });

  it('creates simple and validation error responses', async () => {
    const simple = createSimpleErrorResponse('Bad request', 400, 'BAD_REQUEST');
    expect(simple.status).toBe(400);
    expect(simple.headers.get('Cache-Control')).toBe('no-store');
    await expect(simple.json()).resolves.toEqual({
      error: 'Bad request',
      code: 'BAD_REQUEST',
    });

    reportErrorMock.mockResolvedValue({
      resolved: {
        code: 'VALIDATION_ERROR',
        errorId: 'validation-1',
        category: 'validation',
        suggestedActions: ['fix_input'],
        retryable: false,
        retryAfterMs: null,
        expected: true,
        meta: { fields: { name: ['Required'] } },
        httpStatus: 400,
      },
      userMessage: 'Validation failed',
      fingerprint: null,
    });

    const response = await createValidationErrorResponse(
      { name: ['Required'] },
      { source: 'analytics.events.POST' }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errorId: 'validation-1',
      category: 'validation',
      suggestedActions: ['fix_input'],
      fingerprint: null,
      details: { fields: { name: ['Required'] } },
    });
  });
});
