import { describe, expect, it } from 'vitest';

import type { ResolvedError } from '@/shared/contracts/base';
import { AppErrorCodes } from '@/shared/errors/app-error';
import {
  resolveErrorLogMessage,
  resolveErrorUserMessage,
} from '@/shared/errors/error-catalog';

const buildResolved = (overrides: Partial<ResolvedError>): ResolvedError => ({
  errorId: 'err_test',
  message: 'Unauthorized',
  code: AppErrorCodes.unauthorized,
  httpStatus: 401,
  expected: true,
  critical: false,
  retryable: false,
  category: 'AUTH',
  suggestedActions: [],
  ...overrides,
});

describe('error-catalog message resolution', () => {
  it('uses catalog user message for default expected errors', () => {
    const resolved = buildResolved({});
    expect(resolveErrorUserMessage(resolved)).toBe(
      'Your session has expired. Log in again to continue.'
    );
  });

  it('preserves custom expected messages', () => {
    const resolved = buildResolved({ message: 'Invalid credentials' });
    expect(resolveErrorUserMessage(resolved)).toBe('Invalid credentials');
  });

  it('uses catalog log message for default errors', () => {
    const resolved = buildResolved({});
    expect(resolveErrorLogMessage(resolved)).toBe('Authentication required');
  });
});
