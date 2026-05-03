import { describe, expect, it } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

import {
  buildPlaywrightListingHistoryFields,
  extractPlaywrightAppErrorMetadata,
  resolvePlaywrightFailureListingStatus,
} from './listing-service-utils';

describe('playwright listing service utils', () => {
  it('builds browser-mode history fields with optional provider extras', () => {
    expect(
      buildPlaywrightListingHistoryFields({
        browserMode: ' headed ',
        extraFields: ['action:sync', null, ''],
      })
    ).toEqual(['browser_mode:headed', 'action:sync']);

    expect(
      buildPlaywrightListingHistoryFields({
        browserMode: null,
      })
    ).toBeNull();
  });

  it('normalizes auth failures to the auth_required listing status', () => {
    expect(resolvePlaywrightFailureListingStatus('AUTH')).toBe('auth_required');
    expect(resolvePlaywrightFailureListingStatus('FORM')).toBe('failed');
    expect(resolvePlaywrightFailureListingStatus(null)).toBe('failed');
  });

  it('extracts app error metadata and ignores non-app errors', () => {
    expect(
      extractPlaywrightAppErrorMetadata(
        internalError('boom', {
          requestedBrowserMode: 'headed',
        })
      )
    ).toEqual({
      requestedBrowserMode: 'headed',
    });

    expect(extractPlaywrightAppErrorMetadata(new Error('boom'))).toBeUndefined();
  });
});
