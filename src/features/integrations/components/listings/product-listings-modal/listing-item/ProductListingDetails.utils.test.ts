import { describe, expect, it } from 'vitest';

import {
  formatHistoryAction,
  resolveDisplayedTraderaDuplicateSummary,
  formatTraderaSyncImageMode,
  formatTraderaSyncOutcome,
  formatTraderaSyncTargetMatchStrategy,
  formatTraderaStatusVerificationSection,
  formatTraderaStatusVerificationStrategy,
  resolveDisplayHistoryFields,
  resolveHistoryAction,
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
            requestedSelectorProfile: 'profile-market-a',
            selectorProfileResolved: 'profile-market-b',
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

    expect(summary.requestedSelectorProfile).toBe('profile-market-a');
    expect(summary.resolvedSelectorProfile).toBe('profile-market-b');
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

  it('prefers the latest checked status for Tradera badges when check_status was the last action', () => {
    expect(
      resolveTraderaStatusBadge('active', false, {
        checkedStatus: 'unknown',
        lastAction: 'check_status',
      })
    ).toEqual({
      status: 'unknown',
    });
  });

  it('extracts history action markers separately from browser mode and field lists', () => {
    const fields = ['browser_mode:headed', 'action:sync', 'title', 'description'];

    expect(resolveHistoryAction(fields)).toBe('sync');
    expect(resolveDisplayHistoryFields(fields)).toEqual(['title', 'description']);
    expect(formatHistoryAction('move_to_unsold')).toBe('End listing');
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

  it('extracts Tradera status-check verification metadata from persisted execution data', () => {
    const summary = resolveTraderaExecutionSummary({
      tradera: {
        lastExecution: {
          action: 'check_status',
          metadata: {
            checkedStatus: 'ended',
            verificationSection: 'unsold',
            verificationMatchStrategy: 'title+product-id',
            verificationRawStatusTag: 'ended',
            verificationMatchedProductId: 'BASE-1',
            verificationSearchTitle: 'Example title',
            verificationCandidateCount: 1,
          },
        },
      },
    });

    expect(summary.checkedStatus).toBe('ended');
    expect(summary.verificationSection).toBe('unsold');
    expect(summary.verificationMatchStrategy).toBe('title+product-id');
    expect(summary.verificationRawStatusTag).toBe('ended');
    expect(summary.verificationMatchedProductId).toBe('BASE-1');
    expect(summary.verificationSearchTitle).toBe('Example title');
    expect(summary.verificationCandidateCount).toBe(1);
  });

  it('extracts Tradera sync target metadata from persisted execution data', () => {
    const summary = resolveTraderaExecutionSummary({
      tradera: {
        lastExecution: {
          action: 'sync',
          metadata: {
            syncTargetMatchStrategy: 'direct_listing_url',
            syncTargetListingId: '987654321',
            syncTargetListingUrl: 'https://www.tradera.com/item/987654321',
            syncImageMode: 'fields_only',
            categorySource: 'autofill',
            executionSteps: [
              {
                id: 'title_fill',
                label: 'Enter title',
                status: 'success',
              },
              {
                id: 'description_fill',
                label: 'Enter description',
                status: 'success',
              },
              {
                id: 'price_set',
                label: 'Set price',
                status: 'success',
              },
              {
                id: 'category_select',
                label: 'Select category',
                status: 'success',
              },
              {
                id: 'attribute_select',
                label: 'Apply listing attributes',
                status: 'skipped',
                message: 'step omitted from runtime action manifest',
              },
              {
                id: 'shipping_set',
                label: 'Configure delivery',
                status: 'success',
              },
              {
                id: 'image_upload',
                label: 'Upload listing images',
                status: 'skipped',
                message: 'sync-skip-images',
              },
            ],
            logTail: [
              '[user] tradera.quicklist.field.verified {"field":"title","attempt":0}',
              '[user] tradera.quicklist.field.skipped {"field":"description","reason":"disabled-on-sync"}',
              '[user] tradera.quicklist.field.skipped {"field":"price","reason":"already-matched"}',
              '[user] tradera.quicklist.field.selected {"field":"delivery","option":"Buyer pays shipping"}',
            ],
          },
        },
      },
    });

    expect(summary.syncTargetMatchStrategy).toBe('direct_listing_url');
    expect(summary.syncTargetListingId).toBe('987654321');
    expect(summary.syncTargetListingUrl).toBe('https://www.tradera.com/item/987654321');
    expect(summary.syncImageMode).toBe('fields_only');
    expect(summary.syncFieldsOnly).toBe(true);
    expect(summary.syncTitleOutcome).toBe('updated');
    expect(summary.syncDescriptionOutcome).toBe('locked');
    expect(summary.syncPricingOutcome).toBe('unchanged');
    expect(summary.syncCategoryOutcome).toBe('preserved');
    expect(summary.syncAttributesOutcome).toBe('omitted');
    expect(summary.syncShippingOutcome).toBe('updated');
    expect(summary.syncImagesOutcome).toBe('preserved');
  });

  it('formats Tradera status-check verification labels for the modal', () => {
    expect(formatTraderaStatusVerificationSection('public_listing')).toBe(
      'Public listing page'
    );
    expect(formatTraderaStatusVerificationStrategy('seller-sections-miss')).toBe(
      'Seller sections miss'
    );
    expect(formatTraderaSyncTargetMatchStrategy('active_listings_external_listing_id')).toBe(
      'Active listings + external ID'
    );
    expect(formatTraderaSyncImageMode('fields_only')).toBe('Fields only');
    expect(formatTraderaSyncOutcome('locked')).toBe('Locked on Tradera');
  });
});
