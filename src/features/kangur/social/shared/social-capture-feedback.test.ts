import { describe, expect, it } from 'vitest';

import {
  buildKangurSocialCaptureFailureSummary,
  normalizeKangurSocialCaptureFailureReason,
  resolveKangurSocialCaptureTargetLabel,
} from './social-capture-feedback';

describe('social-capture-feedback', () => {
  it('normalizes generic runtime failure tokens into user-facing copy', () => {
    expect(normalizeKangurSocialCaptureFailureReason('capture_failed')).toBe('Capture failed');
    expect(normalizeKangurSocialCaptureFailureReason('artifact_missing')).toBe(
      'Screenshot artifact missing'
    );
    expect(normalizeKangurSocialCaptureFailureReason('')).toBe('Capture failed');
  });

  it('resolves preset ids into capture preset titles', () => {
    expect(resolveKangurSocialCaptureTargetLabel('game')).toBe('Kangur Game Home');
    expect(resolveKangurSocialCaptureTargetLabel('missing-id')).toBe('missing-id');
  });

  it('formats programmable route failures with titles and truncates long lists', () => {
    expect(
      buildKangurSocialCaptureFailureSummary(
        [
          { id: 'route-1', reason: 'Timeout waiting for selector' },
          { id: 'route-2', reason: 'capture_failed' },
          { id: 'route-3', reason: 'Navigation failed' },
        ],
        {
          maxItems: 2,
          routes: [
            { id: 'route-1', title: 'Pricing page' },
            { id: 'route-2', title: 'Checkout' },
          ],
        }
      )
    ).toBe('Pricing page: Timeout waiting for selector; Checkout: Capture failed; +1 more');
  });
});
