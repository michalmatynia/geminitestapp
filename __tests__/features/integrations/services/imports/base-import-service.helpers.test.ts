import { describe, expect, it } from 'vitest';

import {
  classifyBaseImportError,
  determineBaseImportTerminalStatus,
} from '@/features/integrations/services/imports/base-import-error-utils';

import { AppErrorCodes, createAppError } from '@/shared/errors/app-error';

describe('base-import-service helpers', () => {
  it('classifies timeout app errors as transient and retryable', () => {
    const error = createAppError('Request timed out', {
      code: AppErrorCodes.timeout,
      httpStatus: 504,
      retryable: true,
      retryAfterMs: 1500,
    });

    const classified = classifyBaseImportError(error);

    expect(classified).toMatchObject({
      code: 'TIMEOUT',
      errorClass: 'transient',
      retryable: true,
      message: 'Request timed out',
      retryAfterMs: 1500,
    });
  });

  it('classifies network errors as transient and retryable', () => {
    const classified = classifyBaseImportError(new Error('ECONNRESET: network failure'));

    expect(classified).toMatchObject({
      code: 'NETWORK_ERROR',
      errorClass: 'transient',
      retryable: true,
    });
  });

  it('classifies validation errors as permanent and non-retryable', () => {
    const classified = classifyBaseImportError(new Error('Validation failed for product payload.'));

    expect(classified).toMatchObject({
      code: 'VALIDATION_ERROR',
      errorClass: 'permanent',
      retryable: false,
    });
  });

  it('classifies rate-limited app errors with retry metadata intact', () => {
    const error = createAppError('Too many requests', {
      code: AppErrorCodes.rateLimited,
      httpStatus: 429,
      retryable: true,
      retryAfterMs: 2500,
    });

    const classified = classifyBaseImportError(error);

    expect(classified).toMatchObject({
      code: 'RATE_LIMITED',
      errorClass: 'transient',
      retryable: true,
      retryAfterMs: 2500,
    });
  });

  it('classifies duplicate sku errors as permanent and non-retryable', () => {
    const classified = classifyBaseImportError(new Error('Duplicate SKU conflict detected.'));

    expect(classified).toMatchObject({
      code: 'DUPLICATE_SKU',
      errorClass: 'permanent',
      retryable: false,
    });
  });

  it('derives terminal statuses deterministically from stats', () => {
    const baseStats = {
      total: 10,
      pending: 0,
      processing: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    };

    expect(
      determineBaseImportTerminalStatus({
        ...baseStats,
        imported: 3,
        failed: 2,
      })
    ).toBe('partial_success');

    expect(
      determineBaseImportTerminalStatus({
        ...baseStats,
        failed: 2,
      })
    ).toBe('failed');

    expect(
      determineBaseImportTerminalStatus({
        ...baseStats,
        imported: 2,
      })
    ).toBe('completed');

    expect(
      determineBaseImportTerminalStatus(
        {
          ...baseStats,
          updated: 1,
          pending: 2,
        },
        { hasPendingItems: true }
      )
    ).toBe('partial_success');

    expect(
      determineBaseImportTerminalStatus(
        {
          ...baseStats,
          pending: 2,
        },
        { hasPendingItems: true }
      )
    ).toBe('failed');
  });
});
