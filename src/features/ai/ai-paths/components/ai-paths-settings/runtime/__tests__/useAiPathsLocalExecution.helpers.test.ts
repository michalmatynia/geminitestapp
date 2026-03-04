import { describe, expect, it } from 'vitest';

import { extractDatabaseRuntimeMetadata } from '../useAiPathsLocalExecution.helpers';

describe('extractDatabaseRuntimeMetadata', () => {
  it('keeps canonical provider metadata and ignores legacy providerFallback payloads', () => {
    const metadata = extractDatabaseRuntimeMetadata({
      bundle: {
        collection: 'product_parameters',
        requestedProvider: 'auto',
        resolvedProvider: 'mongodb',
        count: 2,
        providerFallback: {
          provider: 'prisma',
        },
      },
    });

    expect(metadata).toEqual({
      database: {
        collection: 'product_parameters',
        requestedProvider: 'auto',
        resolvedProvider: 'mongodb',
        count: 2,
      },
    });
  });

  it('returns null when bundle has no canonical database metadata', () => {
    const metadata = extractDatabaseRuntimeMetadata({
      bundle: {
        providerFallback: {
          provider: 'prisma',
        },
      },
    });

    expect(metadata).toBeNull();
  });
});
