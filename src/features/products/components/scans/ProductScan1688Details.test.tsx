/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildProductScan1688SectionId,
  formatProductScan1688ComparisonCountLabel,
  formatProductScan1688RankLabel,
  hasNewerApproved1688Scan,
  hasProductScan1688Details,
  ProductScan1688Details,
  resolveProductScan1688ComparisonTargets,
  resolvePreferred1688SupplierScans,
  resolveProductScan1688RankingSummary,
  resolveProductScan1688RecommendationSignal,
  resolveProductScan1688ResultLabel,
} from './ProductScan1688Details';

describe('ProductScan1688Details', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders supplier, pricing, image, and evaluation details for a completed 1688 scan', () => {
    render(
      <ProductScan1688Details
        scanId='scan-1688-1'
        connectionLabel='Main 1688 Browser'
        scan={{
          id: 'scan-1688-1',
          title: '1688 supplier listing',
          url: 'https://detail.1688.com/offer/123456789.html',
          supplierDetails: {
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
            platformProductId: '123456789',
            currency: 'CNY',
            priceText: '¥12.80-14.20',
            priceRangeText: '¥12.80-14.20',
            moqText: 'MOQ 20 pcs',
            supplierLocation: 'Zhejiang, China',
            supplierRating: 'Gold supplier',
            sourceLanguage: 'zh-CN',
            images: [
              {
                url: 'https://cbu01.alicdn.com/image1.jpg',
                alt: null,
                source: 'hero',
                artifactName: null,
              },
            ],
            prices: [
              {
                label: 'Range',
                amount: '12.80',
                currency: 'CNY',
                rangeStart: '12.80',
                rangeEnd: '14.20',
                moq: '20',
                unit: 'pcs',
                source: 'page',
              },
            ],
          },
          supplierProbe: {
            candidateUrl: 'https://detail.1688.com/offer/123456789.html',
            canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
            pageTitle: 'Yiwu Supplier Listing',
            descriptionSnippet: 'Supplier listing for the scanned product.',
            pageLanguage: 'zh-CN',
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            priceText: '¥12.80-14.20',
            currency: 'CNY',
            heroImageUrl: 'https://cbu01.alicdn.com/image1.jpg',
            heroImageAlt: null,
            heroImageArtifactName: null,
            artifactKey: '1688-scan-probe-image-1',
            imageCount: 1,
          },
          supplierEvaluation: {
            status: 'approved',
            sameProduct: true,
            imageMatch: true,
            titleMatch: true,
            confidence: 0.91,
            proceed: true,
            reasons: ['Supplier gallery and title align with the source product.'],
            mismatches: [],
            modelId: 'gpt-5.4-mini',
            error: null,
            evaluatedAt: '2026-04-12T06:40:00.000Z',
          },
          rawResult: {
            candidateUrls: [
              'https://detail.1688.com/offer/123456789.html',
              'https://detail.1688.com/offer/987654321.html',
            ],
          },
        }}
      />
    );

    expect(screen.getByText('1688 supplier details')).toBeInTheDocument();
    expect(screen.getAllByText('Profile Main 1688 Browser').length).toBeGreaterThan(0);
    expect(screen.getByText('Supplier result')).toBeInTheDocument();
    expect(screen.getByText('AI-approved supplier match')).toBeInTheDocument();
    expect(screen.getByText('Pricing extracted')).toBeInTheDocument();
    expect(screen.getByText('Images extracted')).toBeInTheDocument();
    expect(screen.getByText('Store link found')).toBeInTheDocument();
    expect(screen.getByText('Yiwu Supplier Co.')).toBeInTheDocument();
    expect(screen.getByText('Supplier product')).toBeInTheDocument();
    expect(screen.getByText('Supplier store')).toBeInTheDocument();
    expect(screen.getByText('Browser profile')).toBeInTheDocument();
    expect(screen.getByText('Extracted prices')).toBeInTheDocument();
    expect(screen.getByText('Candidate supplier URLs')).toBeInTheDocument();
    expect(screen.getByText('https://detail.1688.com/offer/987654321.html')).toBeInTheDocument();
    expect(screen.getByText('Extracted images')).toBeInTheDocument();
    expect(screen.getByText('Match evaluation')).toBeInTheDocument();
    expect(
      document.getElementById(buildProductScan1688SectionId('scan-1688-1', 'candidate-urls')!)
    ).toBeTruthy();
    expect(
      document.getElementById(buildProductScan1688SectionId('scan-1688-1', 'match-evaluation')!)
    ).toBeTruthy();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/gpt-5.4-mini/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence 91%/)).toBeInTheDocument();
    expect(screen.getByText('1 extracted image')).toBeInTheDocument();
    expect(screen.getByText('1 price tier')).toBeInTheDocument();
    expect(screen.getByText('Probe saw 1 image')).toBeInTheDocument();
    expect(screen.getByText('Proceed')).toBeInTheDocument();
    expect(screen.getByText('Evaluated at')).toBeInTheDocument();
    expect(screen.getByText('Reasons')).toBeInTheDocument();
    expect(
      screen.getByText('Supplier gallery and title align with the source product.')
    ).toBeInTheDocument();
  });

  it('renders evaluator mismatches and failure details for rejected supplier scans', () => {
    render(
      <ProductScan1688Details
        scanId='scan-1688-rejected-1'
        scan={{
          id: 'scan-1688-rejected-1',
          title: '1688 supplier listing',
          url: 'https://detail.1688.com/offer/123456789.html',
          supplierDetails: null,
          supplierProbe: {
            candidateUrl: 'https://detail.1688.com/offer/123456789.html',
            canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
            pageTitle: 'Yiwu Supplier Listing',
            descriptionSnippet: null,
            pageLanguage: 'zh-CN',
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: null,
            priceText: null,
            currency: null,
            heroImageUrl: null,
            heroImageAlt: null,
            heroImageArtifactName: null,
            artifactKey: '1688-scan-probe-image-1',
            imageCount: 3,
          },
          supplierEvaluation: {
            status: 'rejected',
            sameProduct: false,
            imageMatch: false,
            titleMatch: false,
            confidence: 0.34,
            proceed: false,
            reasons: ['Supplier candidate does not match the source product.'],
            mismatches: ['Supplier gallery differs from the source product.'],
            modelId: 'gpt-4.1-mini',
            error: 'Supplier evaluator rejected the candidate.',
            evaluatedAt: '2026-04-12T06:40:00.000Z',
          },
          rawResult: {
            candidateUrls: [
              'https://detail.1688.com/offer/123456789.html',
              'https://detail.1688.com/offer/998877665.html',
            ],
          },
        }}
      />
    );

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Supplier result')).toBeInTheDocument();
    expect(screen.getByText('Supplier probe')).toBeInTheDocument();
    expect(screen.getByText('https://detail.1688.com/offer/998877665.html')).toBeInTheDocument();
    expect(screen.getByText('Mismatches')).toBeInTheDocument();
    expect(screen.getByText('Supplier gallery differs from the source product.')).toBeInTheDocument();
    expect(screen.getByText('Supplier evaluator rejected the candidate.')).toBeInTheDocument();
    expect(screen.getByText('Probe saw 3 images')).toBeInTheDocument();
  });

  it('returns null when there is no stored 1688 supplier information', () => {
    expect(
      hasProductScan1688Details({
        id: 'scan-empty',
        title: null,
        url: null,
        supplierDetails: null,
        supplierProbe: null,
        supplierEvaluation: null,
      })
    ).toBe(false);

    const { container } = render(
      <ProductScan1688Details
        scan={{
          id: 'scan-empty',
          title: null,
          url: null,
          supplierDetails: null,
          supplierProbe: null,
          supplierEvaluation: null,
          rawResult: null,
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('detects when a newer AI-approved 1688 scan exists', () => {
    expect(
      hasNewerApproved1688Scan(
        [
          {
            id: 'scan-rejected',
            provider: '1688',
            createdAt: '2026-04-12T06:00:00.000Z',
            updatedAt: '2026-04-12T06:10:00.000Z',
            completedAt: '2026-04-12T06:10:00.000Z',
            supplierEvaluation: {
              status: 'rejected',
              sameProduct: false,
              imageMatch: false,
              titleMatch: false,
              confidence: 0.41,
              proceed: false,
              reasons: [],
              mismatches: [],
              modelId: null,
              error: null,
              evaluatedAt: '2026-04-12T06:10:00.000Z',
            },
          },
          {
            id: 'scan-approved',
            provider: '1688',
            createdAt: '2026-04-12T07:00:00.000Z',
            updatedAt: '2026-04-12T07:10:00.000Z',
            completedAt: '2026-04-12T07:10:00.000Z',
            supplierEvaluation: {
              status: 'approved',
              sameProduct: true,
              imageMatch: true,
              titleMatch: true,
              confidence: 0.92,
              proceed: true,
              reasons: [],
              mismatches: [],
              modelId: null,
              error: null,
              evaluatedAt: '2026-04-12T07:10:00.000Z',
            },
          },
        ],
        'scan-rejected'
      )
    ).toBe(true);
  });

  it('prefers meaningful approved 1688 supplier matches over probe-only runs', () => {
    const preferredScans = resolvePreferred1688SupplierScans([
      {
        id: 'scan-probe-only',
        provider: '1688',
        createdAt: '2026-04-12T06:00:00.000Z',
        updatedAt: '2026-04-12T06:10:00.000Z',
        completedAt: '2026-04-12T06:10:00.000Z',
        supplierDetails: null,
        supplierProbe: {
          candidateUrl: 'https://detail.1688.com/offer/123456789.html',
          canonicalUrl: 'https://detail.1688.com/offer/123456789.html',
          pageTitle: 'Probe only listing',
          descriptionSnippet: null,
          pageLanguage: 'zh-CN',
          supplierName: 'Probe Supplier',
          supplierStoreUrl: null,
          priceText: null,
          currency: null,
          heroImageUrl: null,
          heroImageAlt: null,
          heroImageArtifactName: null,
          artifactKey: null,
          imageCount: 1,
        },
        supplierEvaluation: {
          status: 'rejected',
          sameProduct: false,
          imageMatch: false,
          titleMatch: false,
          confidence: 0.2,
          proceed: false,
          reasons: [],
          mismatches: [],
          modelId: null,
          error: null,
          evaluatedAt: '2026-04-12T06:10:00.000Z',
        },
      },
      {
        id: 'scan-approved',
        provider: '1688',
        createdAt: '2026-04-12T07:00:00.000Z',
        updatedAt: '2026-04-12T07:10:00.000Z',
        completedAt: '2026-04-12T07:10:00.000Z',
        supplierDetails: {
          supplierName: 'Approved Supplier Co.',
          supplierStoreUrl: 'https://shop.1688.com/approved-store.html',
          supplierProductUrl: 'https://detail.1688.com/offer/777777777.html',
          platformProductId: '777777777',
          currency: 'CNY',
          priceText: '¥10.20',
          priceRangeText: null,
          moqText: 'MOQ 10 pcs',
          supplierLocation: null,
          supplierRating: null,
          sourceLanguage: 'zh-CN',
          images: [],
          prices: [],
        },
        supplierProbe: null,
        supplierEvaluation: {
          status: 'approved',
          sameProduct: true,
          imageMatch: true,
          titleMatch: true,
          confidence: 0.92,
          proceed: true,
          reasons: [],
          mismatches: [],
          modelId: null,
          error: null,
          evaluatedAt: '2026-04-12T07:10:00.000Z',
        },
      },
    ]);

    expect(preferredScans.map((scan) => scan.id)).toEqual(['scan-approved']);
  });

  it('resolves compact 1688 recommendation signals for preferred, weaker, and default states', () => {
    expect(resolveProductScan1688RecommendationSignal({ isPreferred: true })).toEqual({
      variant: 'preferred',
      badgeLabel: 'Preferred 1688 supplier result',
      detail: null,
    });

    expect(
      resolveProductScan1688RecommendationSignal({
        isPreferred: true,
        hasAlternativeMeaningfulResult: true,
      })
    ).toEqual({
      variant: 'preferred',
      badgeLabel: 'Preferred 1688 supplier result',
      detail: 'Preferred over other 1688 supplier results for this product.',
    });

    expect(resolveProductScan1688RecommendationSignal({ hasStrongerAlternative: true })).toEqual({
      variant: 'weaker',
      badgeLabel: 'Weaker 1688 supplier result',
      detail: 'A stronger 1688 supplier result is available for this product.',
    });

    expect(resolveProductScan1688RecommendationSignal()).toEqual({
      variant: 'default',
      badgeLabel: '1688 supplier result',
      detail: null,
    });
  });

  it('resolves 1688 ranking summary for preferred, weaker, and unranked scans', () => {
    const preferredScans = [
      { id: 'scan-approved-best' },
      { id: 'scan-heuristic-weaker' },
    ] as const;

    expect(resolveProductScan1688RankingSummary(preferredScans, 'scan-approved-best')).toEqual({
      rank: 1,
      count: 2,
      isPreferred: true,
      hasStrongerAlternative: false,
      preferredScanId: 'scan-approved-best',
      alternativeScanIds: ['scan-heuristic-weaker'],
    });

    expect(resolveProductScan1688RankingSummary(preferredScans, 'scan-heuristic-weaker')).toEqual({
      rank: 2,
      count: 2,
      isPreferred: false,
      hasStrongerAlternative: true,
      preferredScanId: 'scan-approved-best',
      alternativeScanIds: ['scan-approved-best'],
    });

    expect(resolveProductScan1688RankingSummary(preferredScans, 'scan-rejected-unranked')).toEqual({
      rank: null,
      count: 2,
      isPreferred: false,
      hasStrongerAlternative: false,
      preferredScanId: 'scan-approved-best',
      alternativeScanIds: [],
    });
  });

  it('resolves shared 1688 result labels and rank labels for history surfaces', () => {
    expect(
      resolveProductScan1688ResultLabel({
        id: 'scan-1',
        title: 'Best approved supplier listing',
        supplierDetails: null,
        supplierProbe: null,
      })
    ).toBe('Best approved supplier listing');

    expect(
      resolveProductScan1688ResultLabel({
        id: 'scan-2',
        title: '',
        supplierDetails: { supplierName: 'Supplier Name' } as never,
        supplierProbe: null,
      })
    ).toBe('Supplier Name');

    expect(
      resolveProductScan1688ResultLabel({
        id: 'scan-3',
        title: '',
        supplierDetails: null,
        supplierProbe: { pageTitle: 'Probe title' } as never,
      })
    ).toBe('Probe title');

    expect(resolveProductScan1688ResultLabel({ id: 'scan-4' } as never)).toBe('scan-4');
    expect(formatProductScan1688RankLabel(1, 2)).toBe('Rank 1 of 2');
    expect(formatProductScan1688RankLabel(1, 1)).toBeNull();
    expect(formatProductScan1688RankLabel(null, 2)).toBeNull();
    expect(formatProductScan1688ComparisonCountLabel(1)).toBe('Compare with 1 alternative result');
    expect(formatProductScan1688ComparisonCountLabel(3)).toBe('Compare with 3 alternative results');
    expect(formatProductScan1688ComparisonCountLabel(0)).toBeNull();
  });

  it('resolves shared 1688 comparison targets with rank-aware labels', () => {
    const comparisonTargets = resolveProductScan1688ComparisonTargets(
      [
        {
          id: 'scan-approved-best',
          title: 'Best approved supplier listing',
          supplierDetails: null,
          supplierProbe: null,
        },
        {
          id: 'scan-heuristic-weaker',
          title: 'Heuristic supplier listing',
          supplierDetails: null,
          supplierProbe: null,
        },
      ],
      'scan-approved-best'
    );

    expect(comparisonTargets.preferredTarget).toEqual({
      id: 'scan-approved-best',
      label: 'Best approved supplier listing',
      rank: 1,
      labelWithRank: 'Best approved supplier listing (Rank 1 of 2)',
    });
    expect(comparisonTargets.alternativeTargets).toEqual([
      {
        id: 'scan-heuristic-weaker',
        label: 'Heuristic supplier listing',
        rank: 2,
        labelWithRank: 'Heuristic supplier listing (Rank 2 of 2)',
      },
    ]);
  });
});
