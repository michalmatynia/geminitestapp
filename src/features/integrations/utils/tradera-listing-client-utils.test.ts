import { describe, expect, it } from 'vitest';

import {
  resolveDuplicateLinkedFromFeedback,
  resolveDuplicateLinkedFromListing,
  resolveDuplicateMatchStrategyFromFeedback,
  resolveDuplicateMatchStrategyFromListing,
} from './tradera-listing-client-utils';

describe('tradera-listing-client-utils', () => {
  it('reads duplicate-link metadata from top-level execution metadata', () => {
    const listing = {
      marketplaceData: {
        tradera: {
          lastExecution: {
            metadata: {
              duplicateLinked: true,
              duplicateMatchStrategy: 'existing-linked-record',
            },
          },
        },
      },
    } as never;

    expect(resolveDuplicateLinkedFromListing(listing)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromListing(listing)).toBe('existing-linked-record');
  });

  it('falls back to rawResult duplicate-link metadata when top-level metadata is missing', () => {
    const listing = {
      marketplaceData: {
        tradera: {
          lastExecution: {
            metadata: {
              rawResult: {
                duplicateLinked: true,
                duplicateMatchStrategy: 'exact-title-single-candidate',
              },
            },
          },
        },
      },
    } as never;

    expect(resolveDuplicateLinkedFromListing(listing)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromListing(listing)).toBe(
      'exact-title-single-candidate'
    );
  });

  it('treats duplicate match strategy as implicit duplicate-link state for listings', () => {
    const listing = {
      marketplaceData: {
        tradera: {
          lastExecution: {
            metadata: {
              rawResult: {
                duplicateMatchStrategy: 'exact-title-single-candidate',
              },
            },
          },
        },
      },
    } as never;

    expect(resolveDuplicateLinkedFromListing(listing)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromListing(listing)).toBe(
      'exact-title-single-candidate'
    );
  });

  it('treats duplicate-linked latest stage as implicit linked state for listings', () => {
    const listing = {
      marketplaceData: {
        tradera: {
          lastExecution: {
            metadata: {
              latestStage: 'duplicate_linked',
            },
          },
        },
      },
    } as never;

    expect(resolveDuplicateLinkedFromListing(listing)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromListing(listing)).toBeNull();
  });

  it('prefers top-level duplicate-match strategy over rawResult fallback', () => {
    const listing = {
      marketplaceData: {
        tradera: {
          lastExecution: {
            metadata: {
              duplicateLinked: true,
              duplicateMatchStrategy: 'existing-linked-record',
              rawResult: {
                duplicateLinked: true,
                duplicateMatchStrategy: 'exact-title-single-candidate',
              },
            },
          },
        },
      },
    } as never;

    expect(resolveDuplicateMatchStrategyFromListing(listing)).toBe('existing-linked-record');
  });

  it('reads duplicate-link metadata from top-level persisted feedback', () => {
    const feedback = {
      duplicateLinked: true,
      duplicateMatchStrategy: 'existing-linked-record',
    } as never;

    expect(resolveDuplicateLinkedFromFeedback(feedback)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromFeedback(feedback)).toBe('existing-linked-record');
  });

  it('falls back to persisted feedback rawResult duplicate metadata when top-level fields are missing', () => {
    const feedback = {
      metadata: {
        rawResult: {
          duplicateLinked: true,
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    } as never;

    expect(resolveDuplicateLinkedFromFeedback(feedback)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromFeedback(feedback)).toBe(
      'exact-title-single-candidate'
    );
  });

  it('treats duplicate match strategy as implicit duplicate-link state for feedback', () => {
    const feedback = {
      metadata: {
        rawResult: {
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    } as never;

    expect(resolveDuplicateLinkedFromFeedback(feedback)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromFeedback(feedback)).toBe(
      'exact-title-single-candidate'
    );
  });

  it('treats duplicate-linked latest stage as implicit linked state for feedback', () => {
    const feedback = {
      metadata: {
        latestStage: 'duplicate_linked',
      },
    } as never;

    expect(resolveDuplicateLinkedFromFeedback(feedback)).toBe(true);
    expect(resolveDuplicateMatchStrategyFromFeedback(feedback)).toBeNull();
  });

  it('prefers top-level feedback strategy over nested metadata fallback', () => {
    const feedback = {
      duplicateLinked: true,
      duplicateMatchStrategy: 'existing-linked-record',
      metadata: {
        rawResult: {
          duplicateLinked: true,
          duplicateMatchStrategy: 'exact-title-single-candidate',
        },
      },
    } as never;

    expect(resolveDuplicateMatchStrategyFromFeedback(feedback)).toBe(
      'existing-linked-record'
    );
  });
});
