import type { Page } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY } from '@/shared/lib/browser-execution/amazon-runtime-constants';

const amazonSequencerMock = vi.hoisted(() => ({
  instances: [] as Array<{ context: Record<string, unknown>; input: Record<string, unknown> }>,
  scan: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/shared/lib/browser-execution/sequencers/AmazonScanSequencer', () => ({
  AmazonScanSequencer: vi.fn().mockImplementation(function amazonScanSequencerMock(
    context,
    input
  ) {
    amazonSequencerMock.instances.push({ context, input });
    return {
      scan: amazonSequencerMock.scan,
    };
  }),
}));

describe('playwright-node-runner.amazon-runtime', () => {
  beforeEach(() => {
    amazonSequencerMock.instances.length = 0;
    amazonSequencerMock.scan.mockReset();
  });

  it('executes Amazon runtime requests through the centralized sequencer', async () => {
    const { executeAmazonReverseImageScanRuntime } = await import(
      '../playwright-node-runner.amazon-runtime'
    );
    const page = { url: () => 'https://lens.google.com/search' } as unknown as Page;
    const emit = vi.fn();
    const log = vi.fn();
    const artifacts = {};
    const helpers = {};

    amazonSequencerMock.scan.mockImplementation(async () => {
      const instance = amazonSequencerMock.instances[0];
      const contextEmit = instance?.context['emit'] as
        | ((type: string, payload: unknown) => void)
        | undefined;

      contextEmit?.('result', {
        status: 'matched',
        asin: 'B000TEST',
        title: 'Matched product',
        url: 'https://www.amazon.com/dp/B000TEST',
        currentUrl: 'https://lens.google.com/search',
        stage: 'google_candidates',
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
    });

    const result = await executeAmazonReverseImageScanRuntime({
      page,
      runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
      input: {
        runtimeKey: 'stale_runtime_key',
        imageCandidates: [{ id: 'image-1', filepath: '/tmp/image.jpg' }],
      },
      emit,
      log,
      artifacts,
      helpers,
    });

    expect(amazonSequencerMock.instances).toHaveLength(1);
    expect(amazonSequencerMock.instances[0]?.context['page']).toBe(page);
    expect(amazonSequencerMock.instances[0]?.input).toMatchObject({
      runtimeKey: AMAZON_GOOGLE_LENS_CANDIDATE_SEARCH_RUNTIME_KEY,
      imageCandidates: [{ id: 'image-1', filepath: '/tmp/image.jpg' }],
    });
    expect(amazonSequencerMock.scan).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('result', expect.objectContaining({ asin: 'B000TEST' }));
    expect(result).toMatchObject({
      status: 'matched',
      asin: 'B000TEST',
      actionRunSteps: expect.arrayContaining([
        expect.objectContaining({ key: 'browser_preparation' }),
        expect.objectContaining({ key: 'browser_open' }),
        expect.objectContaining({ key: 'google_upload' }),
        expect.objectContaining({ key: 'browser_close' }),
      ]),
    });
  });
});
