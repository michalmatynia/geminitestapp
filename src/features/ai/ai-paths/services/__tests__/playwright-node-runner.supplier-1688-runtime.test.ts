import type { Page } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const supplier1688SequencerMock = vi.hoisted(() => ({
  instances: [] as Array<{ context: Record<string, unknown>; input: Record<string, unknown> }>,
  scan: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/shared/lib/browser-execution/sequencers/Supplier1688ScanSequencer', () => ({
  Supplier1688ScanSequencer: vi.fn().mockImplementation(function supplier1688ScanSequencerMock(
    context,
    input
  ) {
    supplier1688SequencerMock.instances.push({ context, input });
    return {
      scan: supplier1688SequencerMock.scan,
    };
  }),
}));

describe('playwright-node-runner.supplier-1688-runtime', () => {
  beforeEach(() => {
    supplier1688SequencerMock.instances.length = 0;
    supplier1688SequencerMock.scan.mockReset();
  });

  it('executes supplier 1688 runtime requests through the centralized sequencer', async () => {
    const { executeSupplier1688ProbeScanRuntime } = await import(
      '../playwright-node-runner.supplier-1688-runtime'
    );
    const page = { url: () => 'https://detail.1688.com/offer/1.html' } as unknown as Page;
    const emit = vi.fn();
    const log = vi.fn();
    const artifacts = {};
    const helpers = {};

    supplier1688SequencerMock.scan.mockImplementation(async () => {
      const instance = supplier1688SequencerMock.instances[0];
      const contextEmit = instance?.context['emit'] as
        | ((type: string, payload: unknown) => void)
        | undefined;

      contextEmit?.('result', {
        status: 'completed',
        currentUrl: 'https://detail.1688.com/offer/1.html',
        matchedImageId: 'image-1',
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
    });

    const result = await executeSupplier1688ProbeScanRuntime({
      page,
      input: {
        imageCandidates: [{ id: 'image-1', localPath: '/tmp/image.jpg' }],
      },
      emit,
      log,
      artifacts,
      helpers,
    });

    expect(supplier1688SequencerMock.instances).toHaveLength(1);
    expect(supplier1688SequencerMock.instances[0]?.context['page']).toBe(page);
    expect(supplier1688SequencerMock.instances[0]?.input).toMatchObject({
      imageCandidates: [{ id: 'image-1', localPath: '/tmp/image.jpg' }],
    });
    expect(supplier1688SequencerMock.scan).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('result', expect.objectContaining({ matchedImageId: 'image-1' }));
    expect(result).toMatchObject({
      status: 'completed',
      matchedImageId: 'image-1',
      actionRunSteps: expect.arrayContaining([
        expect.objectContaining({ key: 'browser_preparation' }),
        expect.objectContaining({ key: 'browser_open' }),
        expect.objectContaining({ key: 'supplier_1688_upload_image' }),
        expect.objectContaining({ key: 'supplier_1688_submit_search' }),
        expect.objectContaining({ key: 'supplier_1688_finalize' }),
        expect.objectContaining({ key: 'browser_close' }),
      ]),
    });
  });
});
