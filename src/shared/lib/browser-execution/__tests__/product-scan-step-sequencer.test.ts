import { describe, expect, it } from 'vitest';

import {
  PRODUCT_SCAN_STEP_REGISTRY,
  PRODUCT_SCAN_STEP_SEQUENCES,
  buildProductScanPendingSteps,
  buildProductScanStepSequenceManifest,
  generateProductScanPlaywrightStepSequencerRuntime,
  resolveProductScanStepGroup,
} from '../product-scan-step-sequencer';

describe('product scan step sequencer', () => {
  it('every registered browser sequence references known step ids', () => {
    for (const [sequenceKey, entries] of Object.entries(PRODUCT_SCAN_STEP_SEQUENCES)) {
      for (const entry of entries) {
        const key = typeof entry === 'string' ? entry : entry.key;
        expect(
          PRODUCT_SCAN_STEP_REGISTRY,
          `${sequenceKey} references unknown step "${key}"`
        ).toHaveProperty(key);
      }
    }
  });

  it('keeps the amazon browser sequence granular', () => {
    const steps = buildProductScanPendingSteps({
      defaultSequenceKey: 'amazon_reverse_image_scan_browser',
    });

    expect(steps.map((step) => step.key)).toEqual([
      'validate',
      'google_lens_open',
      'google_upload',
      'google_captcha',
      'google_candidates',
      'amazon_open',
      'amazon_overlays',
      'amazon_content_ready',
      'amazon_probe',
      'amazon_extract',
    ]);
  });

  it('supports a supplier direct-candidate follow-up sequence', () => {
    const steps = buildProductScanPendingSteps({
      defaultSequenceKey: 'supplier_direct_candidate_followup',
    });

    expect(steps.map((step) => step.key)).toEqual([
      'validate',
      'supplier_open',
      'supplier_overlays',
      'supplier_content_ready',
      'supplier_probe',
      'supplier_evaluate',
      'supplier_extract',
    ]);
  });

  it('supports custom sequence entries with custom labels', () => {
    const manifest = buildProductScanStepSequenceManifest({
      customSequence: [
        { key: 'validate', label: 'Validate custom trigger' },
        { key: 'supplier_content_ready', label: 'Wait for custom supplier content' },
      ],
    });

    expect(manifest).toEqual([
      { key: 'validate', label: 'Validate custom trigger', group: 'input' },
      {
        key: 'supplier_content_ready',
        label: 'Wait for custom supplier content',
        group: 'supplier',
      },
    ]);
  });

  it('resolves the new supplier content steps through the shared group resolver', () => {
    expect(resolveProductScanStepGroup('supplier_overlays')).toBe('supplier');
    expect(resolveProductScanStepGroup('supplier_content_ready')).toBe('supplier');
    expect(resolveProductScanStepGroup('amazon_probe')).toBe('amazon');
  });

  it('generates a script runtime with shared sequencing helpers', () => {
    const runtime = generateProductScanPlaywrightStepSequencerRuntime();

    expect(runtime).toContain('const PRODUCT_SCAN_STEP_REGISTRY =');
    expect(runtime).toContain('const PRODUCT_SCAN_STEP_SEQUENCES =');
    expect(runtime).toContain('seedProductScanStepSequence');
    expect(runtime).toContain('productScanIsPendingTemplateStep');
    expect(runtime).toContain('supplier_content_ready');
    expect(runtime).toContain('amazon_reverse_image_scan_browser');
    expect(runtime).toContain('supplier_reverse_image_scan_browser');
    expect(runtime).toContain('supplier_direct_candidate_followup');
  });

  it('reuses seeded pending templates when the first concrete browser step arrives', () => {
    const executeRuntime = new Function(`
      const scanSteps = [];
      const page = { url: () => 'https://example.com/scan' };
      ${generateProductScanPlaywrightStepSequencerRuntime()}
      seedProductScanStepSequence({ defaultSequenceKey: 'amazon_reverse_image_scan_browser' });
      upsertScanStep({
        key: 'amazon_open',
        status: 'running',
        attempt: 1,
        candidateId: 'candidate-1',
        candidateRank: 1,
        message: 'Opening first Amazon candidate.',
      });
      return scanSteps;
    `) as () => Array<{
      key: string;
      status: string;
      candidateId: string | null;
      attempt: number | null;
      message: string | null;
    }>;

    const steps = executeRuntime();
    const amazonOpenSteps = steps.filter((step) => step.key === 'amazon_open');

    expect(amazonOpenSteps).toHaveLength(1);
    expect(amazonOpenSteps[0]).toMatchObject({
      key: 'amazon_open',
      status: 'running',
      candidateId: 'candidate-1',
      attempt: 1,
      message: 'Opening first Amazon candidate.',
    });
  });
});
