/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildProductScan1688SectionId,
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
        scanId='scan-1688-1'
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
    expect(screen.getByText('Supplier result')).toBeInTheDocument();
    expect(screen.getByText('AI-approved supplier match')).toBeInTheDocument();
    expect(screen.getByText('Pricing extracted')).toBeInTheDocument();
    expect(screen.getByText('Images extracted')).toBeInTheDocument();
    expect(screen.getByText('Store link found')).toBeInTheDocument();
    expect(screen.getByText('Yiwu Supplier Co.')).toBeInTheDocument();
    expect(screen.getByText('Supplier product')).toBeInTheDocument();
    expect(screen.getByText('Supplier store')).toBeInTheDocument();
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
});
