import type { Page } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const jobBoardSequencerMock = vi.hoisted(() => ({
  instances: [] as Array<{ context: Record<string, unknown>; input: Record<string, unknown> }>,
  scan: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/shared/lib/browser-execution/sequencers/JobBoardScrapeSequencer', () => ({
  JobBoardScrapeSequencer: vi.fn().mockImplementation(function jobBoardScrapeSequencerMock(
    context,
    input
  ) {
    jobBoardSequencerMock.instances.push({ context, input });
    return {
      scan: jobBoardSequencerMock.scan,
    };
  }),
}));

describe('playwright-node-runner.job-board-runtime', () => {
  beforeEach(() => {
    jobBoardSequencerMock.instances.length = 0;
    jobBoardSequencerMock.scan.mockReset();
  });

  it('executes job-board runtime requests through the centralized sequencer', async () => {
    const { executeJobBoardScrapeRuntime } = await import('../playwright-node-runner.job-board-runtime');
    const page = { url: () => 'https://justjoin.it/job-offers/all-locations/javascript' } as unknown as Page;
    const emit = vi.fn();
    const log = vi.fn();
    const helpers = { actionPause: vi.fn() };

    jobBoardSequencerMock.scan.mockImplementation(async () => {
      const instance = jobBoardSequencerMock.instances[0];
      const contextEmit = instance?.context['emit'] as
        | ((type: string, payload: unknown) => void)
        | undefined;

      contextEmit?.('result', {
        status: 'completed',
        provider: 'justjoin_it',
        sourceSite: 'justjoin.it',
        currentUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
        sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
        mode: 'collect_links',
        links: [{ title: 'Senior Node', url: 'https://justjoin.it/job-offer/acme-senior-node' }],
        visitedUrls: ['https://justjoin.it/job-offers/all-locations/javascript'],
        warnings: [],
        steps: [
          {
            key: 'job_board_collect_offer_links',
            label: 'Collect offer links',
            status: 'completed',
            message: '1 offer link(s) collected.',
            warning: null,
            details: [],
            url: 'https://justjoin.it/job-offers/all-locations/javascript',
            startedAt: '2026-04-28T00:00:00.000Z',
            completedAt: '2026-04-28T00:00:01.000Z',
            durationMs: 1000,
          },
        ],
      });
    });

    const result = await executeJobBoardScrapeRuntime({
      page,
      input: {
        provider: 'justjoin_it',
        sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
        mode: 'collect_links',
      },
      emit,
      log,
      helpers,
    });

    expect(jobBoardSequencerMock.instances).toHaveLength(1);
    expect(jobBoardSequencerMock.instances[0]?.context['page']).toBe(page);
    expect(jobBoardSequencerMock.instances[0]?.context['helpers']).toBe(helpers);
    expect(jobBoardSequencerMock.instances[0]?.input).toMatchObject({
      provider: 'justjoin_it',
      sourceUrl: 'https://justjoin.it/job-offers/all-locations/javascript',
      mode: 'collect_links',
    });
    expect(jobBoardSequencerMock.scan).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('result', expect.objectContaining({ provider: 'justjoin_it' }));
    expect(result).toMatchObject({
      status: 'completed',
      provider: 'justjoin_it',
      sourceSite: 'justjoin.it',
      links: [{ title: 'Senior Node', url: 'https://justjoin.it/job-offer/acme-senior-node' }],
      actionRunSteps: expect.arrayContaining([
        expect.objectContaining({ key: 'browser_preparation' }),
        expect.objectContaining({ key: 'browser_open' }),
        expect.objectContaining({ key: 'job_board_collect_offer_links' }),
        expect.objectContaining({
          key: 'browser_close',
          output: expect.objectContaining({ provider: 'justjoin_it' }),
        }),
      ]),
    });
  });
});
