import { describe, expect, it } from 'vitest';

import {
  buildKangurSocialCaptureFailureEntry,
  buildKangurSocialCaptureFailureSummaryText,
  buildKangurSocialCapturePrimaryIssueSummaryText,
  formatKangurSocialCaptureToken,
  resolveKangurSocialCapturePrimaryIssue,
  resolveKangurSocialCaptureTargetLabelFromSources,
} from './social-capture-feedback.helpers';

const presetTitleById = new Map([
  ['game', 'Kangur Game Home'],
  ['practice', 'Practice Home'],
]);

describe('social-capture-feedback helpers', () => {
  it('formats capture tokens and resolves target labels from routes, presets, and blanks', () => {
    expect(formatKangurSocialCaptureToken(' waiting_for_selector ')).toBe('Waiting For Selector');
    expect(formatKangurSocialCaptureToken('')).toBeNull();

    expect(
      resolveKangurSocialCaptureTargetLabelFromSources({
        id: ' route-1 ',
        routes: [{ id: 'route-1', title: ' Pricing page ' }],
        presetTitleById,
      })
    ).toBe('Pricing page');

    expect(
      resolveKangurSocialCaptureTargetLabelFromSources({
        id: 'game',
        routes: [],
        presetTitleById,
      })
    ).toBe('Kangur Game Home');

    expect(
      resolveKangurSocialCaptureTargetLabelFromSources({
        id: '   ',
        routes: [],
        presetTitleById,
      })
    ).toBe('Unknown target');
  });

  it('builds failure entries and summaries with clamped max-items behavior', () => {
    expect(
      buildKangurSocialCaptureFailureEntry({
        failure: { id: 'route-1', reason: 'capture_failed' },
        routes: [{ id: 'route-1', title: 'Checkout' }],
        presetTitleById,
      })
    ).toBe('Checkout: Capture failed');

    expect(
      buildKangurSocialCaptureFailureSummaryText({
        failures: [
          { id: 'route-1', reason: 'capture_failed' },
          { id: 'route-2', reason: 'artifact_missing' },
        ],
        routes: [{ id: 'route-1', title: 'Checkout' }],
        maxItems: 0,
        presetTitleById,
      })
    ).toBe('Checkout: Capture failed; +1 more');
  });

  it('selects the primary issue and formats skipped vs failed summaries', () => {
    const primaryIssue = resolveKangurSocialCapturePrimaryIssue([
      {
        id: 'route-2',
        title: '',
        status: 'skipped',
        reason: 'missing_url',
        resolvedUrl: 'https://example.com/checkout',
        artifactName: null,
        attemptCount: 1,
        durationMs: 100,
        stage: null,
      },
      {
        id: 'route-1',
        title: 'Pricing page',
        status: 'failed',
        reason: 'capture_failed',
        resolvedUrl: 'https://example.com/pricing',
        artifactName: null,
        attemptCount: 2,
        durationMs: 200,
        stage: 'waiting_for_selector',
      },
    ]);

    expect(primaryIssue?.id).toBe('route-1');

    expect(
      buildKangurSocialCapturePrimaryIssueSummaryText({
        issue: primaryIssue,
        routes: [{ id: 'route-1', title: 'Pricing page' }],
        presetTitleById,
      })
    ).toBe('Pricing page failed at Waiting For Selector after 2 attempts. Capture failed');

    expect(
      buildKangurSocialCapturePrimaryIssueSummaryText({
        issue: {
          id: 'game',
          title: '',
          status: 'skipped',
          reason: 'missing_url',
          resolvedUrl: 'https://example.com/game',
          artifactName: null,
          attemptCount: 1,
          durationMs: 100,
          stage: null,
        },
        routes: [],
        presetTitleById,
      })
    ).toBe('Kangur Game Home was skipped. Capture URL is missing');

    expect(
      buildKangurSocialCapturePrimaryIssueSummaryText({
        issue: null,
        routes: [],
        presetTitleById,
      })
    ).toBeNull();
  });
});
