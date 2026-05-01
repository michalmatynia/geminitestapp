import type { Page } from 'playwright';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const filemakerSequencerMock = vi.hoisted(() => ({
  instances: [] as Array<{ context: Record<string, unknown>; input: Record<string, unknown> }>,
  scan: vi.fn<() => Promise<void>>(),
}));

vi.mock(
  '@/shared/lib/browser-execution/sequencers/FilemakerOrganizationPresenceSequencer',
  () => ({
    FilemakerOrganizationPresenceSequencer: vi
      .fn()
      .mockImplementation(function filemakerOrganizationPresenceSequencerMock(context, input) {
        filemakerSequencerMock.instances.push({ context, input });
        return {
          scan: filemakerSequencerMock.scan,
        };
      }),
  })
);

describe('playwright-node-runner.filemaker-runtime', () => {
  beforeEach(() => {
    filemakerSequencerMock.instances.length = 0;
    filemakerSequencerMock.scan.mockReset();
  });

  it('executes FileMaker organisation discovery through the centralized sequencer', async () => {
    const { executeFilemakerOrganizationPresenceScrapeRuntime } = await import(
      '../playwright-node-runner.filemaker-runtime'
    );
    const page = { url: () => 'https://company.example' } as unknown as Page;
    const emit = vi.fn();
    const log = vi.fn();

    filemakerSequencerMock.scan.mockImplementation(async () => {
      const instance = filemakerSequencerMock.instances[0];
      const contextEmit = instance?.context['emit'] as
        | ((type: string, payload: unknown) => void)
        | undefined;

      contextEmit?.('result', {
        status: 'completed',
        currentUrl: 'https://company.example',
        organizationName: 'Example Company',
        steps: [
          {
            key: 'filemaker_organization_presence_search_web',
            label: 'Search web',
            status: 'completed',
            message: 'Website candidate found.',
            startedAt: '2026-04-28T00:00:00.000Z',
            completedAt: '2026-04-28T00:00:01.000Z',
          },
        ],
      });
    });

    const result = await executeFilemakerOrganizationPresenceScrapeRuntime({
      page,
      input: {
        organizationName: 'Example Company',
      },
      emit,
      log,
    });

    expect(filemakerSequencerMock.instances).toHaveLength(1);
    expect(filemakerSequencerMock.instances[0]?.context['page']).toBe(page);
    expect(filemakerSequencerMock.instances[0]?.input).toMatchObject({
      organizationName: 'Example Company',
    });
    expect(filemakerSequencerMock.scan).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'result',
      expect.objectContaining({ organizationName: 'Example Company' })
    );
    expect(result).toMatchObject({
      status: 'completed',
      organizationName: 'Example Company',
      actionRunSteps: expect.arrayContaining([
        expect.objectContaining({ key: 'browser_preparation' }),
        expect.objectContaining({ key: 'browser_open' }),
        expect.objectContaining({ key: 'filemaker_organization_presence_search_web' }),
        expect.objectContaining({ key: 'browser_close' }),
      ]),
    });
  });
});
