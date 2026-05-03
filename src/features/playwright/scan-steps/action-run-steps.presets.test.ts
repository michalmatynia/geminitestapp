import { describe, expect, it } from 'vitest';

import {
  withAmazonScanActionRunSteps,
  withFilemakerOrganizationPresenceScanActionRunSteps,
  withJobBoardScanActionRunSteps,
  withSupplier1688ScanActionRunSteps,
} from './action-run-steps.presets';

const readActionRunStepKeys = (payload: unknown): string[] => {
  const steps =
    typeof payload === 'object' && payload !== null && 'actionRunSteps' in payload
      ? (payload as { actionRunSteps?: Array<{ key?: string }> }).actionRunSteps
      : null;
  return Array.isArray(steps) ? steps.map((step) => step.key ?? '') : [];
};

describe('Playwright scan action run step presets', () => {
  it('wraps Amazon product scan steps with browser lifecycle steps', () => {
    const payload = withAmazonScanActionRunSteps({
      status: 'matched',
      currentUrl: 'https://lens.google.com/search',
      steps: [
        {
          key: 'google_upload',
          label: 'Upload image',
          status: 'completed',
          startedAt: '2026-04-18T00:00:00.000Z',
          completedAt: '2026-04-18T00:00:01.000Z',
        },
      ],
    });

    expect(readActionRunStepKeys(payload)).toEqual([
      'browser_preparation',
      'browser_open',
      'google_upload',
      'browser_close',
    ]);
  });

  it('expands supplier product scan steps into 1688 runtime steps', () => {
    const payload = withSupplier1688ScanActionRunSteps({
      status: 'completed',
      currentUrl: 'https://detail.1688.com/offer/1.html',
      steps: [
        {
          key: '1688_upload',
          label: 'Upload image',
          status: 'completed',
          startedAt: '2026-04-18T00:00:00.000Z',
          completedAt: '2026-04-18T00:00:01.000Z',
        },
      ],
    });

    expect(readActionRunStepKeys(payload)).toEqual([
      'browser_preparation',
      'browser_open',
      'supplier_1688_upload_image',
      'supplier_1688_submit_search',
      'supplier_1688_finalize',
      'browser_close',
    ]);
  });

  it('uses the shared lifecycle mapper for non-product scan sequencers', () => {
    const jobBoardPayload = withJobBoardScanActionRunSteps({
      status: 'completed',
      currentUrl: 'https://jobs.example/opening',
      steps: [],
    });
    const filemakerPayload = withFilemakerOrganizationPresenceScanActionRunSteps({
      status: 'completed',
      currentUrl: 'https://company.example',
      steps: [],
    });

    expect(readActionRunStepKeys(jobBoardPayload)).toEqual([
      'browser_preparation',
      'browser_open',
      'browser_close',
    ]);
    expect(readActionRunStepKeys(filemakerPayload)).toEqual([
      'browser_preparation',
      'browser_open',
      'browser_close',
    ]);
  });
});
