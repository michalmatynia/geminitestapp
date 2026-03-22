import { describe, expect, it, vi } from 'vitest';

import type { ApiPayloadResult } from '@/shared/contracts/http';
import { ApiError } from '@/shared/lib/api-client';

import {
  createMutationErrorHandler,
  extractMutationErrorMessage,
  resolvePayloadErrorMessage,
  unwrapMutationResult,
} from './mutation-error-handler';

describe('mutation-error-handler', () => {
  it('extracts payload error messages from supported fields and falls back safely', () => {
    expect(resolvePayloadErrorMessage({ error: 'Primary error' }, 'Fallback')).toBe(
      'Primary error',
    );
    expect(resolvePayloadErrorMessage({ error: '   ', message: 'Secondary message' }, 'Fallback')).toBe(
      'Secondary message',
    );
    expect(resolvePayloadErrorMessage({ message: '   ' }, 'Fallback')).toBe('Fallback');
    expect(resolvePayloadErrorMessage(null, 'Fallback')).toBe('Fallback');
  });

  it('unwraps successful mutation results and throws ApiError for failed ones', () => {
    const success = {
      ok: true,
      payload: { id: 'product-1' },
    } as ApiPayloadResult<{ id: string }>;
    expect(unwrapMutationResult(success, 'Fallback message')).toEqual({
      id: 'product-1',
    });

    expect(() =>
      unwrapMutationResult(
        {
          ok: false,
          payload: { message: 'Server rejected request' },
        } as ApiPayloadResult<never>,
        'Fallback message',
      ),
    ).toThrowError(new ApiError('Server rejected request', 400));
  });

  it('extracts mutation error messages consistently and forwards them through the handler factory', () => {
    expect(extractMutationErrorMessage(new ApiError('API failed', 500), 'Fallback')).toBe(
      'API failed',
    );
    expect(extractMutationErrorMessage(new Error('Native error'), 'Fallback')).toBe(
      'Native error',
    );
    expect(extractMutationErrorMessage('String error', 'Fallback')).toBe('String error');
    expect(extractMutationErrorMessage({ unexpected: true }, 'Fallback')).toBe('Fallback');

    const onCustomError = vi.fn();
    const handler = createMutationErrorHandler(onCustomError);
    const rawError = new Error('Mutation exploded');

    handler(rawError);

    expect(onCustomError).toHaveBeenCalledWith('Mutation exploded', rawError);
  });

  it('allows the handler factory to be used without a custom callback', () => {
    expect(() => createMutationErrorHandler()(new Error('ignored'))).not.toThrow();
  });
});
