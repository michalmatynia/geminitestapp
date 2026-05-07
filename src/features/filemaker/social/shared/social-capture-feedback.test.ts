import { describe, expect, it } from 'vitest';

import {
  buildSocialPublishingCaptureFailureSummary,
  buildSocialPublishingCapturePrimaryIssueSummary,
  normalizeSocialPublishingCaptureFailureReason,
  resolveFailedSocialPublishingProgrammableCaptureRoutes,
  resolveSocialPublishingCaptureTargetLabel,
} from './social-capture-feedback';

describe('social-capture-feedback', () => {
  it('normalizes generic runtime failure tokens into user-facing copy', () => {
    expect(normalizeSocialPublishingCaptureFailureReason('capture_failed')).toBe('Capture failed');
    expect(normalizeSocialPublishingCaptureFailureReason('artifact_missing')).toBe(
      'Screenshot artifact missing'
    );
    expect(normalizeSocialPublishingCaptureFailureReason('')).toBe('Capture failed');
  });

  it('resolves preset ids into capture preset titles', () => {
    expect(resolveSocialPublishingCaptureTargetLabel('game')).toBe('Kangur Game Home');
    expect(resolveSocialPublishingCaptureTargetLabel('missing-id')).toBe('missing-id');
  });

  it('formats programmable route failures with titles and truncates long lists', () => {
    expect(
      buildSocialPublishingCaptureFailureSummary(
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
      resolveFailedSocialPublishingProgrammableCaptureRoutes(
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
      buildSocialPublishingCapturePrimaryIssueSummary(
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
