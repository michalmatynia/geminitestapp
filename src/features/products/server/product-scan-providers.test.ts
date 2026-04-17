import { describe, expect, it } from 'vitest';

import {
  AMAZON_PRODUCT_SCAN_PROVIDER,
  getProductScanProviderDefinition,
} from './product-scan-providers';
import { SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY } from '@/shared/lib/browser-execution/supplier-1688-runtime-constants';

describe('product-scan-providers', () => {
  it('keeps the amazon scanner wired as a runtime-backed provider', () => {
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.provider).toBe('amazon');
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.defaultScanType).toBe('google_reverse_image');
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.runtime).not.toBeNull();
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.runtime?.executionMode).toBe('script');
    expect(AMAZON_PRODUCT_SCAN_PROVIDER.runtime?.script).toContain('google');
  });

  it('registers 1688 supplier scanning as a native sequencer-backed batch-capable provider', () => {
    const provider = getProductScanProviderDefinition('1688');

    expect(provider).toMatchObject({
      provider: '1688',
      defaultScanType: 'supplier_reverse_image',
      resultKind: 'supplier',
      supportsBatchQueue: true,
    });
    expect(provider.runtime).not.toBeNull();
    expect(provider.runtime?.executionMode).toBe('native');
    expect(provider.runtime?.runtimeKey).toBe(SUPPLIER_1688_PROBE_SCAN_RUNTIME_KEY);
    expect(provider.runtime?.script).toBeUndefined();
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
