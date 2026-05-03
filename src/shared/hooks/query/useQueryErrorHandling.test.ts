import { describe, expect, it } from 'vitest';

import {
  buildErrorToastSignature,
  buildQueryErrorSignature,
  resolveQueryErrorPresentationFromMetaBag,
  shouldShowGlobalQueryErrorToastForQuery,
} from '@/shared/hooks/query/useQueryErrorHandling';
import {
  attachTanstackFactoryMeta,
  resolveTanstackFactoryMeta,
} from '@/shared/lib/observability/tanstack-telemetry';

describe('useQueryErrorHandling', () => {
  it('dedupes auth errors across different query keys', () => {
    const message = 'Unauthorized.';
    const authError = Object.assign(new Error(message), { status: 401 });

    const firstSignature = buildErrorToastSignature(['job-queue', 'runs'], message, authError);
    const secondSignature = buildErrorToastSignature(
      ['job-queue', 'queue-status'],
      message,
      authError
    );

    expect(firstSignature).toBe('AUTH::unauthorized.');
    expect(secondSignature).toBe(firstSignature);
  });

  it('keeps non-auth errors scoped to the query key', () => {
    const message = 'Database unavailable.';
    const error = new Error(message);

    const firstSignature = buildErrorToastSignature(['job-queue', 'runs'], message, error);
    const secondSignature = buildErrorToastSignature(['job-queue', 'queue-status'], message, error);

    expect(firstSignature).toBe(buildQueryErrorSignature(['job-queue', 'runs'], message));
    expect(secondSignature).toBe(buildQueryErrorSignature(['job-queue', 'queue-status'], message));
    expect(secondSignature).not.toBe(firstSignature);
  });

  it('defaults query errors to toast presentation when no meta is attached', () => {
    expect(resolveQueryErrorPresentationFromMetaBag(undefined)).toBe('toast');
    expect(shouldShowGlobalQueryErrorToastForQuery(undefined)).toBe(true);
  });

  it('suppresses global toasts for queries marked as inline or silent', () => {
    const baseMeta = {
      source: 'kangur.test.query',
      operation: 'detail' as const,
      resource: 'kangur.test-resource',
      domain: 'kangur' as const,
      queryKey: ['kangur', 'test-resource'] as const,
    };

    const inlineMetaBag = attachTanstackFactoryMeta(
      resolveTanstackFactoryMeta({
        ...baseMeta,
        errorPresentation: 'inline',
      })
    );
    const silentMetaBag = attachTanstackFactoryMeta(
      resolveTanstackFactoryMeta({
        ...baseMeta,
        errorPresentation: 'silent',
      })
    );

    expect(resolveQueryErrorPresentationFromMetaBag(inlineMetaBag)).toBe('inline');
    expect(resolveQueryErrorPresentationFromMetaBag(silentMetaBag)).toBe('silent');
    expect(shouldShowGlobalQueryErrorToastForQuery(inlineMetaBag)).toBe(false);
    expect(shouldShowGlobalQueryErrorToastForQuery(silentMetaBag)).toBe(false);
  });
});
