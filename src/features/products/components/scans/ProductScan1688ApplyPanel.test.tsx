/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  ProductScan1688ApplyPanel,
  type ProductScan1688FormBindings,
} from './ProductScan1688ApplyPanel';

const createBindings = (
  overrides: Partial<ProductScan1688FormBindings> = {}
): ProductScan1688FormBindings => ({
  getTextFieldValue: vi.fn((field: 'supplierName' | 'supplierLink' | 'priceComment') => {
    const values: Record<string, string> = {
      supplierName: '',
      supplierLink: '',
      priceComment: '',
    };
    return values[field] ?? '';
  }),
  applyTextField: vi.fn(),
  imageLinks: new Array(8).fill(''),
  imageBase64s: new Array(8).fill(''),
  setImageLinkAt: vi.fn(),
  setImageBase64At: vi.fn(),
  ...overrides,
});

describe('ProductScan1688ApplyPanel', () => {
  it('applies supplier name, link, and price summary into the product form', () => {
    const bindings = createBindings();

    render(
      <ProductScan1688ApplyPanel
        scan={{
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
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [],
          },
        }}
        formBindings={bindings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use Supplier Name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Product Link' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Price Summary' }));

    expect(bindings.applyTextField).toHaveBeenNthCalledWith(1, 'supplierName', 'Yiwu Supplier Co.');
    expect(bindings.applyTextField).toHaveBeenNthCalledWith(
      2,
      'supplierLink',
      'https://detail.1688.com/offer/123456789.html'
    );
    expect(bindings.applyTextField).toHaveBeenNthCalledWith(
      3,
      'priceComment',
      '¥12.80-14.20 · MOQ 20 pcs'
    );
  });

  it('applies all pending supplier updates in one click without overwriting existing image urls', () => {
    const bindings = createBindings({
      imageLinks: ['https://old.example.com/1.jpg', '', '', '', '', '', '', ''],
      imageBase64s: ['', '', '', '', '', '', '', ''],
    });

    render(
      <ProductScan1688ApplyPanel
        scan={{
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
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [
              { url: 'https://cbu01.alicdn.com/image1.jpg', alt: null, artifactName: null, source: 'hero' },
            ],
            prices: [],
          },
        }}
        formBindings={bindings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Apply All Supplier Data' }));

    expect(bindings.applyTextField).toHaveBeenCalledWith('supplierName', 'Yiwu Supplier Co.');
    expect(bindings.applyTextField).toHaveBeenCalledWith(
      'supplierLink',
      'https://detail.1688.com/offer/123456789.html'
    );
    expect(bindings.applyTextField).toHaveBeenCalledWith(
      'priceComment',
      '¥12.80-14.20 · MOQ 20 pcs'
    );
    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(0, 'https://old.example.com/1.jpg');
    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(1, 'https://cbu01.alicdn.com/image1.jpg');
  });

  it('can apply the supplier store link separately from the product page link', () => {
    const bindings = createBindings();

    render(
      <ProductScan1688ApplyPanel
        scan={{
          url: 'https://detail.1688.com/offer/123456789.html',
          supplierDetails: {
            supplierName: 'Yiwu Supplier Co.',
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
            platformProductId: '123456789',
            currency: 'CNY',
            priceText: null,
            priceRangeText: null,
            moqText: null,
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [],
          },
        }}
        formBindings={bindings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use Store Link' }));

    expect(bindings.applyTextField).toHaveBeenCalledWith(
      'supplierLink',
      'https://shop.1688.com/store/page.html'
    );
  });

  it('blocks apply actions when the 1688 AI evaluator rejects the supplier match', () => {
    const bindings = createBindings();

    render(
      <ProductScan1688ApplyPanel
        scan={{
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
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [],
          },
          supplierEvaluation: {
            status: 'rejected',
            sameProduct: false,
            imageMatch: false,
            titleMatch: false,
            confidence: 0.41,
            proceed: false,
            reasons: ['Supplier candidate does not match the source product.'],
            mismatches: ['Supplier gallery differs from the source product.'],
            modelId: 'gpt-5.4-mini',
            error: null,
            evaluatedAt: '2026-04-12T10:00:00.000Z',
          },
        }}
        formBindings={bindings}
      />
    );

    expect(screen.getByText('Apply blocked by AI rejection')).toBeInTheDocument();
    expect(screen.getByText('Supplier gallery differs from the source product.')).toBeInTheDocument();
    expect(screen.getByText('Apply actions blocked by AI rejection')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply All Supplier Data' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Use Supplier Name' })).not.toBeInTheDocument();
    expect(bindings.applyTextField).not.toHaveBeenCalled();
  });

  it('replaces image url slots with extracted supplier images and clears base64 slots', () => {
    const bindings = createBindings({
      imageLinks: ['https://old.example.com/1.jpg', 'https://old.example.com/2.jpg', '', '', '', '', '', ''],
      imageBase64s: ['data:image/png;base64,old', '', '', '', '', '', '', ''],
    });

    render(
      <ProductScan1688ApplyPanel
        scan={{
          url: null,
          supplierDetails: {
            supplierName: null,
            supplierStoreUrl: null,
            supplierProductUrl: null,
            platformProductId: null,
            currency: null,
            priceText: null,
            priceRangeText: null,
            moqText: null,
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: null,
            images: [
              { url: 'https://cbu01.alicdn.com/image1.jpg', alt: null, artifactName: null, source: 'hero' },
              { url: 'https://cbu01.alicdn.com/image2.jpg', alt: null, artifactName: null, source: 'gallery' },
            ],
            prices: [],
          },
        }}
        formBindings={bindings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Replace Image URLs' }));

    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(0, 'https://cbu01.alicdn.com/image1.jpg');
    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(1, 'https://cbu01.alicdn.com/image2.jpg');
    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(2, '');
    expect(bindings.setImageBase64At).toHaveBeenCalledWith(0, '');
    expect(bindings.setImageBase64At).toHaveBeenCalledWith(1, '');
  });

  it('appends extracted supplier images into empty slots without replacing existing urls', () => {
    const bindings = createBindings({
      imageLinks: ['https://old.example.com/1.jpg', '', '', '', '', '', '', ''],
      imageBase64s: ['', 'data:image/png;base64,old', '', '', '', '', '', ''],
    });

    render(
      <ProductScan1688ApplyPanel
        scan={{
          url: null,
          supplierDetails: {
            supplierName: null,
            supplierStoreUrl: null,
            supplierProductUrl: null,
            platformProductId: null,
            currency: null,
            priceText: null,
            priceRangeText: null,
            moqText: null,
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: null,
            images: [
              { url: 'https://old.example.com/1.jpg', alt: null, artifactName: null, source: 'hero' },
              { url: 'https://cbu01.alicdn.com/image2.jpg', alt: null, artifactName: null, source: 'gallery' },
            ],
            prices: [],
          },
        }}
        formBindings={bindings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Append Image URLs' }));

    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(0, 'https://old.example.com/1.jpg');
    expect(bindings.setImageLinkAt).toHaveBeenCalledWith(1, 'https://cbu01.alicdn.com/image2.jpg');
    expect(bindings.setImageBase64At).toHaveBeenCalledWith(1, '');
  });

  it('applies individual price tiers and the full supplier price breakdown', () => {
    const bindings = createBindings();

    render(
      <ProductScan1688ApplyPanel
        scan={{
          url: 'https://detail.1688.com/offer/123456789.html',
          supplierDetails: {
            supplierName: null,
            supplierStoreUrl: 'https://shop.1688.com/store/page.html',
            supplierProductUrl: 'https://detail.1688.com/offer/123456789.html',
            platformProductId: '123456789',
            currency: 'CNY',
            priceText: null,
            priceRangeText: null,
            moqText: null,
            supplierLocation: null,
            supplierRating: null,
            sourceLanguage: 'zh-CN',
            images: [],
            prices: [
              {
                label: 'Starter',
                amount: '12.80',
                currency: 'CNY',
                rangeStart: null,
                rangeEnd: null,
                moq: '20',
                unit: 'pcs',
                source: 'page',
              },
              {
                label: 'Bulk',
                amount: '11.50',
                currency: 'CNY',
                rangeStart: null,
                rangeEnd: null,
                moq: '100',
                unit: 'pcs',
                source: 'page',
              },
            ],
          },
        }}
        formBindings={bindings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use Tier 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Tier 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use Full Price Breakdown' }));

    expect(bindings.applyTextField).toHaveBeenNthCalledWith(
      1,
      'priceComment',
      'Starter · 12.80 CNY · MOQ 20 · pcs'
    );
    expect(bindings.applyTextField).toHaveBeenNthCalledWith(
      2,
      'priceComment',
      'Bulk · 11.50 CNY · MOQ 100 · pcs'
    );
    expect(bindings.applyTextField).toHaveBeenNthCalledWith(
      3,
      'priceComment',
      'Starter · 12.80 CNY · MOQ 20 · pcs; Bulk · 11.50 CNY · MOQ 100 · pcs'
    );
  });
});
