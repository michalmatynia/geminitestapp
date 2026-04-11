import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ProductScanAmazonDetails,
  ProductScanAmazonProvenanceSummary,
} from './ProductScanAmazonDetails';

describe('ProductScanAmazonDetails', () => {
  beforeEach(() => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
  });

  it('shows summary chips and groups extracted attributes by source', () => {
    render(
      <ProductScanAmazonDetails
        scan={{
          asin: 'B00TEST123',
          title: 'Amazon product title',
          description: 'Amazon product description',
          amazonProbe: {
            asin: 'B00TEST123',
            pageTitle: 'Amazon product title',
            descriptionSnippet: 'Amazon product description',
            candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
            canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
            heroImageUrl: 'https://m.media-amazon.com/images/I/example.jpg',
            heroImageAlt: 'Acme product',
            heroImageArtifactName: 'amazon-scan-probe-image-2-attempt-1-rank-1-hero.png',
            artifactKey: 'amazon-scan-probe-image-2-attempt-1-rank-1',
            bulletPoints: ['Steel frame', 'Blue finish'],
            bulletCount: 2,
            attributeCount: 2,
          },
          amazonEvaluation: {
            status: 'approved',
            sameProduct: true,
            imageMatch: true,
            descriptionMatch: true,
            pageRepresentsSameProduct: true,
            confidence: 0.93,
            proceed: true,
            threshold: 0.85,
            reasons: ['Packaging and title align with the source product.'],
            mismatches: [],
            modelId: 'gpt-4o',
            brainApplied: null,
            evidence: {
              candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
              pageTitle: 'Amazon product title',
              heroImageSource: 'https://m.media-amazon.com/images/I/example.jpg',
              heroImageArtifactName: 'amazon-scan-probe-image-2-attempt-1-rank-1-hero.png',
              screenshotArtifactName: 'amazon-scan-match.png',
              htmlArtifactName: 'amazon-scan-match.html',
              productImageSource: '/uploads/product-1.jpg',
            },
            error: null,
            evaluatedAt: '2026-04-11T10:00:08.000Z',
          },
          steps: [
            {
              key: 'google_captcha',
              label: 'Google captcha',
              group: 'google_lens',
              attempt: 1,
              candidateId: 'image-2',
              candidateRank: null,
              inputSource: null,
              retryOf: null,
              resultCode: 'captcha_resolved',
              status: 'completed',
              message: 'Google Lens captcha resolved.',
              warning: null,
              details: [],
              url: 'https://lens.google.com/',
              startedAt: '2026-04-11T09:59:55.000Z',
              completedAt: '2026-04-11T09:59:59.000Z',
              durationMs: 4000,
            },
            {
              key: 'google_upload',
              label: 'Upload image to Google Lens',
              group: 'google_lens',
              attempt: 1,
              candidateId: 'image-2',
              candidateRank: null,
              inputSource: 'url',
              retryOf: 'Local file upload',
              resultCode: 'url_submitted',
              status: 'completed',
              message: 'Submitted image URL for image-2.',
              warning: null,
              details: [],
              url: 'https://lens.google.com/uploadbyurl?url=https://cdn.example.com/image-2.jpg',
              startedAt: '2026-04-11T10:00:00.000Z',
              completedAt: '2026-04-11T10:00:02.000Z',
              durationMs: 2000,
            },
            {
              key: 'amazon_probe',
              label: 'Probe Amazon product page',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'probe_reused',
              status: 'skipped',
              message: 'Reused earlier Amazon probe evidence for approved direct extraction.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B00TEST123',
              startedAt: '2026-04-11T10:00:04.000Z',
              completedAt: '2026-04-11T10:00:04.000Z',
              durationMs: 0,
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'match_found',
              status: 'completed',
              message: 'Extracted Amazon ASIN B00TEST123.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B00TEST123',
              startedAt: '2026-04-11T10:00:05.000Z',
              completedAt: '2026-04-11T10:00:08.000Z',
              durationMs: 3000,
            },
          ],
          amazonDetails: {
            brand: 'Acme',
            manufacturer: 'Acme Manufacturing',
            modelNumber: 'MODEL-1',
            partNumber: 'PART-1',
            color: 'Blue',
            style: 'Modern',
            material: 'Steel',
            size: 'Large',
            pattern: null,
            finish: 'Matte',
            itemDimensions: '12 x 8 x 4 inches',
            packageDimensions: '14 x 10 x 5 inches',
            itemWeight: '1.2 pounds',
            packageWeight: '1.5 pounds',
            bestSellersRank: '#42 in Home & Kitchen',
            ean: '5901234567890',
            gtin: '5901234567890',
            upc: null,
            isbn: null,
            bulletPoints: ['Steel frame', 'Blue finish'],
            rankings: [
              {
                rank: '#42',
                category: 'Home & Kitchen',
                source: 'best_sellers_rank',
              },
            ],
            attributes: [
              {
                key: 'manufacturer',
                label: 'Manufacturer',
                value: 'Acme Manufacturing',
                source: 'technical_details',
              },
              {
                key: 'color',
                label: 'Color',
                value: 'Blue',
                source: 'product_overview',
              },
            ],
          },
        }}
      />
    );

    expect(screen.getByText('Strong match')).toBeInTheDocument();
    expect(screen.getByText('Title available')).toBeInTheDocument();
    expect(screen.getByText('2 bullet points')).toBeInTheDocument();
    expect(screen.getByText('2 extracted attributes')).toBeInTheDocument();
    expect(screen.getByText('1 ranking entry')).toBeInTheDocument();
    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    expect(screen.getByText('Product Overview')).toBeInTheDocument();
    expect(screen.getByText('Listing Text')).toBeInTheDocument();
    expect(screen.getAllByText('Amazon product title')).toHaveLength(2);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getAllByText('Amazon product description')).toHaveLength(2);
    expect(screen.getByText('Showing 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Scan Provenance')).toBeInTheDocument();
    expect(screen.getAllByText('AI approved')).toHaveLength(2);
    expect(screen.getByText('AI confidence 93%')).toBeInTheDocument();
    expect(screen.getByText('AI Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Amazon Probe')).toBeInTheDocument();
    expect(screen.getByText('Acme product')).toBeInTheDocument();
    expect(screen.getByText('Artifact key')).toBeInTheDocument();
    expect(screen.getByText('amazon-scan-probe-image-2-attempt-1-rank-1')).toBeInTheDocument();
    expect(screen.getByText('Probe ASIN')).toBeInTheDocument();
    expect(screen.getByText('Description snippet')).toBeInTheDocument();
    expect(screen.getByText('Probe Bullet Points')).toBeInTheDocument();
    expect(screen.getByText('Hero image source')).toBeInTheDocument();
    expect(screen.getAllByText('Hero image artifact')).toHaveLength(2);
    expect(screen.getAllByText('amazon-scan-probe-image-2-attempt-1-rank-1-hero.png')).toHaveLength(2);
    expect(screen.getByText('Packaging and title align with the source product.')).toBeInTheDocument();
    expect(screen.getAllByText('URL input')).toHaveLength(2);
    expect(screen.getByText('Fallback used')).toBeInTheDocument();
    expect(screen.getByText('Probe reused')).toBeInTheDocument();
    expect(screen.getByText('Captcha path')).toBeInTheDocument();
    expect(screen.getByText('Amazon candidate #1')).toBeInTheDocument();
    expect(screen.getByText('Winning image candidate')).toBeInTheDocument();
    expect(screen.getByText('image-2')).toBeInTheDocument();
    expect(screen.getByText('Probe handling')).toBeInTheDocument();
    expect(screen.getByText('Reused earlier approved probe')).toBeInTheDocument();
    expect(screen.getByText('Retry path')).toBeInTheDocument();
    expect(screen.getByText('Local file upload')).toBeInTheDocument();
    expect(screen.getByText('Extraction result')).toBeInTheDocument();
    expect(screen.getByText('Match Found')).toBeInTheDocument();
  });

  it('shows probe reuse in the shared provenance summary', () => {
    render(
      <ProductScanAmazonProvenanceSummary
        scan={{
          steps: [
            {
              key: 'amazon_probe',
              label: 'Probe Amazon product page',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'probe_reused',
              status: 'skipped',
              message: 'Reused earlier Amazon probe evidence for approved direct extraction.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B00TEST123',
              startedAt: '2026-04-11T10:00:04.000Z',
              completedAt: '2026-04-11T10:00:04.000Z',
              durationMs: 0,
            },
            {
              key: 'amazon_extract',
              label: 'Extract Amazon details',
              group: 'amazon',
              attempt: 2,
              candidateId: 'image-2',
              candidateRank: 1,
              inputSource: null,
              retryOf: null,
              resultCode: 'match_found',
              status: 'completed',
              message: 'Extracted Amazon ASIN B00TEST123.',
              warning: null,
              details: [],
              url: 'https://www.amazon.com/dp/B00TEST123',
              startedAt: '2026-04-11T10:00:05.000Z',
              completedAt: '2026-04-11T10:00:08.000Z',
              durationMs: 3000,
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Probe reused')).toBeInTheDocument();
    expect(screen.getByText('Amazon rank: #1')).toBeInTheDocument();
    expect(screen.getByText('Result: Match Found')).toBeInTheDocument();
  });

  it('filters extracted Amazon attributes by label or value', () => {
    render(
      <ProductScanAmazonDetails
        scan={{
          asin: 'B00TEST123',
          title: 'Amazon product title',
          description: null,
          amazonProbe: null,
          amazonEvaluation: null,
          steps: [],
          amazonDetails: {
            brand: null,
            manufacturer: null,
            modelNumber: null,
            partNumber: null,
            color: null,
            style: null,
            material: null,
            size: null,
            pattern: null,
            finish: null,
            itemDimensions: null,
            packageDimensions: null,
            itemWeight: null,
            packageWeight: null,
            bestSellersRank: null,
            ean: null,
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            rankings: [],
            attributes: [
              {
                key: 'manufacturer',
                label: 'Manufacturer',
                value: 'Acme Manufacturing',
                source: 'technical_details',
              },
              {
                key: 'power_source',
                label: 'Power Source',
                value: 'Battery Powered',
                source: 'technical_details',
              },
            ],
          },
        }}
      />
    );

    const filterInput = screen.getByRole('textbox', { name: 'Filter extracted Amazon attributes' });
    fireEvent.change(filterInput, { target: { value: 'battery' } });

    expect(screen.getByText('Showing 1 of 2')).toBeInTheDocument();
    expect(screen.queryByText('Manufacturer')).not.toBeInTheDocument();
    expect(screen.getByText('Power Source')).toBeInTheDocument();

    fireEvent.change(filterInput, { target: { value: 'missing value' } });

    expect(screen.getByText('Showing 0 of 2')).toBeInTheDocument();
    expect(screen.getByText('No extracted attributes match the current filter.')).toBeInTheDocument();
  });

  it('copies extracted values from identifiers, listing text, and raw attributes', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });

    render(
      <ProductScanAmazonDetails
        scan={{
          asin: 'B00TEST123',
          title: 'Amazon product title',
          description: 'Amazon product description',
          amazonProbe: null,
          amazonEvaluation: null,
          steps: [],
          amazonDetails: {
            brand: null,
            manufacturer: null,
            modelNumber: null,
            partNumber: null,
            color: null,
            style: null,
            material: null,
            size: null,
            pattern: null,
            finish: null,
            itemDimensions: null,
            packageDimensions: null,
            itemWeight: null,
            packageWeight: null,
            bestSellersRank: null,
            ean: '5901234567890',
            gtin: null,
            upc: null,
            isbn: null,
            bulletPoints: [],
            rankings: [],
            attributes: [
              {
                key: 'power_source',
                label: 'Power Source',
                value: 'Battery Powered',
                source: 'technical_details',
              },
            ],
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy ASIN' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Description' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy Power Source' }));

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenNthCalledWith(1, 'B00TEST123');
      expect(writeTextMock).toHaveBeenNthCalledWith(2, 'Amazon product description');
      expect(writeTextMock).toHaveBeenNthCalledWith(3, 'Battery Powered');
    });
  });

  it('renders AI evaluation details even when extracted Amazon fields were cleared', () => {
    render(
      <ProductScanAmazonDetails
        scan={{
          asin: null,
          title: null,
          description: null,
          amazonProbe: {
            asin: 'B00TEST123',
            pageTitle: 'Wrong Amazon product',
            descriptionSnippet: 'Wrong Amazon description',
            candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
            canonicalUrl: 'https://www.amazon.com/dp/B00TEST123',
            heroImageUrl: 'https://m.media-amazon.com/images/I/wrong.jpg',
            heroImageAlt: 'Wrong product image',
            heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
            artifactKey: 'amazon-scan-probe-image-1-attempt-1-rank-1',
            bulletPoints: ['Wrong bullet'],
            bulletCount: 1,
            attributeCount: 0,
          },
          amazonEvaluation: {
            status: 'rejected',
            sameProduct: false,
            imageMatch: false,
            descriptionMatch: false,
            pageRepresentsSameProduct: false,
            confidence: 0.24,
            proceed: false,
            threshold: 0.85,
            reasons: ['The Amazon page shows a different product.'],
            mismatches: ['Brand and visible image do not match.'],
            modelId: 'gpt-4o',
            brainApplied: null,
            evidence: {
              candidateUrl: 'https://www.amazon.com/dp/B00TEST123',
              pageTitle: 'Wrong Amazon product',
              heroImageSource: 'https://m.media-amazon.com/images/I/wrong.jpg',
              heroImageArtifactName: 'amazon-scan-probe-image-1-attempt-1-rank-1-hero.png',
              screenshotArtifactName: 'amazon-scan-match.png',
              htmlArtifactName: null,
              productImageSource: '/uploads/product-1.jpg',
            },
            error: null,
            evaluatedAt: '2026-04-11T10:00:08.000Z',
          },
          steps: [],
          amazonDetails: null,
        }}
      />
    );

    expect(screen.getAllByText('AI rejected')).toHaveLength(2);
    expect(screen.getByText('AI Evaluation')).toBeInTheDocument();
    expect(screen.getByText('Brand and visible image do not match.')).toBeInTheDocument();
  });
});
