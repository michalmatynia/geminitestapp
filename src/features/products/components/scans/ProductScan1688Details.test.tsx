/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasProductScan1688Details,
  ProductScan1688Details,
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
        scan={{
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
        }}
      />
    );

    expect(screen.getByText('1688 supplier details')).toBeInTheDocument();
    expect(screen.getByText('Yiwu Supplier Co.')).toBeInTheDocument();
    expect(screen.getByText('Supplier product')).toBeInTheDocument();
    expect(screen.getByText('Supplier store')).toBeInTheDocument();
    expect(screen.getByText('Extracted prices')).toBeInTheDocument();
    expect(screen.getByText('Extracted images')).toBeInTheDocument();
    expect(screen.getByText('Match evaluation')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/Confidence 91%/)).toBeInTheDocument();
  });

  it('returns null when there is no stored 1688 supplier information', () => {
    expect(
      hasProductScan1688Details({
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
          title: null,
          url: null,
          supplierDetails: null,
          supplierProbe: null,
          supplierEvaluation: null,
        }}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
