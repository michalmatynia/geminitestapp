import { describe, expect, it } from 'vitest';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  getProductScanProviderDefinition,
} from './product-scan-providers';

describe('product-scan-providers', () => {
  it('keeps the amazon scanner wired as a runtime-backed provider', () => {
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.provider).toBe('amazon');
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.defaultScanType).toBe('google_reverse_image');
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.runtime).not.toBeNull();
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.runtime?.script).toContain('google');
  });

  it('registers 1688 supplier scanning as a runtime-backed batch-capable provider', () => {
    const provider = getProductScanProviderDefinition('1688');

    expect(provider).toMatchObject({
      provider: '1688',
      defaultScanType: 'supplier_reverse_image',
      resultKind: 'supplier',
      supportsBatchQueue: true,
    });
    expect(provider.runtime).not.toBeNull();
    expect(provider.runtime?.script).toContain('normalize1688OfferUrl');
    expect(provider.runtime?.script).toContain('supplier_evaluate');
    expect(provider.runtime?.script).toContain('heuristic_1688_probe_v1');
    expect(provider.runtime?.script).toContain('supplier_extract');
    expect(provider.runtime?.script).toContain('1688 supplier reverse image scan completed');
    expect(
      provider.runtime?.createBaseRecord({
        productId: 'product-1688',
        productName: '1688 Probe',
        imageCandidates: [],
        status: 'queued',
      })
    ).toMatchObject({
      provider: '1688',
      scanType: 'supplier_reverse_image',
      supplierDetails: null,
      supplierProbe: null,
      supplierEvaluation: null,
    });
  });
});
