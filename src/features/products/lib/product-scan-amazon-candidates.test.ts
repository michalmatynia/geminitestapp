import { describe, expect, it } from 'vitest';

import {
  isProductScanAmazonCandidateSelectionReady,
  resolveProductScanAmazonCandidatePreviews,
  resolveProductScanAmazonCandidateUrls,
} from './product-scan-amazon-candidates';

describe('product-scan-amazon-candidates', () => {
  it('prefers explicit candidate previews from raw result', () => {
    const previews = resolveProductScanAmazonCandidatePreviews({
      rawResult: {
        candidatePreviews: [
          {
            id: 'preview-1',
            url: 'https://www.amazon.com/dp/B0001',
            title: 'Amazon preview',
            heroImageArtifactName: 'preview-1.png',
            rank: 2,
          },
        ],
      },
    } as never);

    expect(previews).toEqual([
      expect.objectContaining({
        id: 'preview-1',
        url: 'https://www.amazon.com/dp/B0001',
        title: 'Amazon preview',
        heroImageArtifactName: 'preview-1.png',
        rank: 2,
      }),
    ]);
  });

  it('falls back to candidate results when previews are absent', () => {
    const previews = resolveProductScanAmazonCandidatePreviews({
      rawResult: {
        candidateResults: [
          {
            url: 'https://www.amazon.com/dp/B0002',
            asin: 'B0002',
            title: 'Fallback candidate',
            rank: 1,
          },
        ],
      },
    } as never);

    expect(previews).toEqual([
      expect.objectContaining({
        url: 'https://www.amazon.com/dp/B0002',
        asin: 'B0002',
        title: 'Fallback candidate',
        heroImageUrl: null,
      }),
    ]);
  });

  it('detects candidate selection readiness for Amazon scans without extracted details', () => {
    expect(
      isProductScanAmazonCandidateSelectionReady({
        provider: 'amazon',
        rawResult: {
          candidateSelectionRequired: true,
          candidatePreviews: [{ url: 'https://www.amazon.com/dp/B0001' }],
        },
        amazonDetails: null,
        asin: null,
      } as never)
    ).toBe(true);
  });

  it('treats undefined amazon details as not yet extracted', () => {
    expect(
      isProductScanAmazonCandidateSelectionReady({
        provider: 'amazon',
        rawResult: {
          candidateSelectionRequired: true,
          candidatePreviews: [{ url: 'https://www.amazon.com/dp/B0004' }],
        },
        asin: null,
      } as never)
    ).toBe(true);
  });

  it('does not treat candidate previews alone as manual-selection ready', () => {
    expect(
      isProductScanAmazonCandidateSelectionReady({
        provider: 'amazon',
        rawResult: {
          candidatePreviews: [{ url: 'https://www.amazon.com/dp/B0005' }],
        },
        amazonDetails: null,
        asin: null,
      } as never)
    ).toBe(false);
  });

  it('resolves ordered candidate urls from raw result', () => {
    expect(
      resolveProductScanAmazonCandidateUrls({
        rawResult: {
          candidateUrls: [
            'https://www.amazon.com/dp/B0003',
            'https://www.amazon.com/dp/B0001',
          ],
        },
      } as never)
    ).toEqual([
      'https://www.amazon.com/dp/B0003',
      'https://www.amazon.com/dp/B0001',
    ]);
  });
});
