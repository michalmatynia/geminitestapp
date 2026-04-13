import { describe, expect, it } from 'vitest';

import {
  resolveDisplayedTraderaDuplicateSummary,
  resolveTraderaExecutionSummary,
  resolveTraderaStatusBadge,
} from './ProductListingDetails.utils';

describe('ProductListingDetails.utils', () => {
  it('resolves Tradera duplicate-ignore diagnostics from raw result and reconstructs execution steps', () => {
    const summary = resolveTraderaExecutionSummary({
      listingUrl: 'https://www.tradera.com/item/725447805',
      tradera: {
        lastExecution: {
          action: 'list',
          executedAt: '2026-04-13T10:15:00.000Z',
          metadata: {
            rawResult: {
              stage: 'duplicate_checked',
              duplicateIgnoredNonExactCandidateCount: 5,
              duplicateIgnoredCandidateTitles: [
                'Katanas',
                'Katana Sword',
                'Japanese Blades',
                'Wooden Katana',
                'Samurai Replica',
              ],
            },
            logTail: [
              '[user] tradera.quicklist.start {"listingAction":"list"}',
              '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
              '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
            ],
          },
        },
      },
    });

    expect(summary.executedAt).toBe('2026-04-13T10:15:00.000Z');
    expect(summary.listingUrl).toBe('https://www.tradera.com/item/725447805');
    expect(summary.latestStage).toBe('duplicate_checked');
    expect(summary.duplicateIgnoredNonExactCandidateCount).toBe(5);
    expect(summary.duplicateIgnoredCandidateTitles).toEqual([
      'Katanas',
      'Katana Sword',
      'Japanese Blades',
      'Wooden Katana',
      'Samurai Replica',
    ]);
    expect(summary.executionSteps.find((step) => step.id === 'duplicate_check')).toMatchObject({
      status: 'success',
      message:
        'Duplicate search ignored 5 non-exact title match(es); deep inspection only runs on exact title matches. Ignored titles: Katanas, Katana Sword, Japanese Blades, +2 more.',
    });
    expect(
      summary.executionSteps.find((step) => step.id === 'deep_duplicate_check')
    ).toMatchObject({
      status: 'skipped',
      message: 'Skipped because only non-exact title matches were found.',
    });
  });

  it('prefers top-level Tradera metadata over raw result fallback values', () => {
    const summary = resolveTraderaExecutionSummary({
      tradera: {
        lastExecution: {
          action: 'list',
          metadata: {
            latestStage: 'duplicate_checked',
            duplicateIgnoredNonExactCandidateCount: 2,
            duplicateIgnoredCandidateTitles: ['Primary One', 'Primary Two'],
            rawResult: {
              stage: 'duplicate_checked',
              duplicateIgnoredNonExactCandidateCount: 5,
              duplicateIgnoredCandidateTitles: [
                'Fallback One',
                'Fallback Two',
                'Fallback Three',
              ],
            },
            logTail: [
              '[user] tradera.quicklist.start {"listingAction":"list"}',
              '[user] tradera.quicklist.auth.initial {"loggedIn":true}',
              '[user] tradera.quicklist.duplicate.result {"duplicateFound":false}',
            ],
          },
        },
      },
    });

    expect(summary.duplicateIgnoredNonExactCandidateCount).toBe(2);
    expect(summary.duplicateIgnoredCandidateTitles).toEqual(['Primary One', 'Primary Two']);
  });

  it('normalizes duplicate-linked Tradera rows to a linked status badge', () => {
    expect(resolveTraderaStatusBadge('failed', true)).toEqual({
      status: 'active',
      label: 'linked',
    });
    expect(resolveTraderaStatusBadge('failed', false)).toEqual({
      status: 'failed',
    });
  });

  it('prefers live Tradera duplicate fields over persisted listing metadata', () => {
    expect(
      resolveDisplayedTraderaDuplicateSummary({
        persisted: {
          duplicateLinked: null,
          duplicateMatchStrategy: 'title+product-id',
          duplicateMatchedProductId: 'PERSISTED-1',
          duplicateCandidateCount: 1,
          duplicateSearchTitle: 'Persisted title',
          duplicateIgnoredNonExactCandidateCount: 1,
          duplicateIgnoredCandidateTitles: ['Old persisted title'],
        },
        liveRawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
          duplicateMatchedProductId: 'LIVE-1',
          duplicateCandidateCount: 5,
          duplicateSearchTitle: 'Live title',
          duplicateIgnoredNonExactCandidateCount: 3,
          duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword', 'Japanese Blades'],
        },
        liveLatestStage: 'duplicate_linked',
      })
    ).toEqual({
      duplicateLinked: true,
      duplicateMatchStrategy: 'exact-title-single-candidate',
      duplicateMatchedProductId: 'LIVE-1',
      duplicateCandidateCount: 5,
      duplicateSearchTitle: 'Live title',
      duplicateIgnoredNonExactCandidateCount: 3,
      duplicateIgnoredCandidateTitles: ['Katanas', 'Katana Sword', 'Japanese Blades'],
    });
  });

  it('keeps persisted Tradera duplicate fields when the live run has no duplicate metadata', () => {
    expect(
      resolveDisplayedTraderaDuplicateSummary({
        persisted: {
          duplicateLinked: true,
          duplicateMatchStrategy: 'title+product-id',
          duplicateMatchedProductId: 'PERSISTED-1',
          duplicateCandidateCount: 2,
          duplicateSearchTitle: 'Persisted title',
          duplicateIgnoredNonExactCandidateCount: 2,
          duplicateIgnoredCandidateTitles: ['Persisted One', 'Persisted Two'],
        },
        liveRawResult: {
          stage: 'image_upload',
        },
        liveLatestStage: 'image_upload',
      })
    ).toEqual({
      duplicateLinked: true,
      duplicateMatchStrategy: 'title+product-id',
      duplicateMatchedProductId: 'PERSISTED-1',
      duplicateCandidateCount: 2,
      duplicateSearchTitle: 'Persisted title',
      duplicateIgnoredNonExactCandidateCount: 2,
      duplicateIgnoredCandidateTitles: ['Persisted One', 'Persisted Two'],
    });
  });
});
