import { describe, expect, it } from 'vitest';

import {
  buildKangurSocialCaptureFailureSummary,
  buildKangurSocialCapturePrimaryIssueSummary,
  normalizeKangurSocialCaptureFailureReason,
  resolveFailedKangurSocialProgrammableCaptureRoutes,
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

  it('resolves failed programmable routes from the stored route list', () => {
    expect(
      resolveFailedKangurSocialProgrammableCaptureRoutes(
        [
          { id: 'route-2', reason: 'capture_failed' },
          { id: 'missing-route', reason: 'capture_failed' },
        ],
        [
          { id: 'route-1', title: 'Pricing page', path: '/pricing' },
          { id: 'route-2', title: 'Checkout', path: '/checkout' },
        ]
      )
    ).toEqual([{ id: 'route-2', title: 'Checkout', path: '/checkout' }]);
  });

  it('builds a primary issue summary from stored capture results', () => {
    expect(
      buildKangurSocialCapturePrimaryIssueSummary(
        [
          {
            id: 'route-1',
            title: 'Pricing page',
            status: 'failed',
            reason: 'capture_failed',
            resolvedUrl: 'https://example.com/pricing',
            artifactName: null,
            attemptCount: 2,
            durationMs: 3200,
            stage: 'waiting_for_selector',
          },
        ],
        {
          routes: [{ id: 'route-1', title: 'Pricing page', path: '/pricing' }],
        }
      )
    ).toBe('Pricing page failed at Waiting For Selector after 2 attempts. Capture failed');
  });
});
