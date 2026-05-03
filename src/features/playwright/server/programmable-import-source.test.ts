import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  runPlaywrightProgrammableImportForConnectionMock: vi.fn(),
  listPlaywrightActionRunsMock: vi.fn(),
  getPlaywrightActionRunDetailMock: vi.fn(),
}));

vi.mock('./programmable', () => ({
  runPlaywrightProgrammableImportForConnection: (...args: unknown[]) =>
    mocks.runPlaywrightProgrammableImportForConnectionMock(...args),
}));

vi.mock('@/shared/lib/playwright/action-run-history-repository', () => ({
  listPlaywrightActionRuns: (...args: unknown[]) => mocks.listPlaywrightActionRunsMock(...args),
  getPlaywrightActionRunDetail: (...args: unknown[]) => mocks.getPlaywrightActionRunDetailMock(...args),
}));

import { resolvePlaywrightProgrammableImportSource } from './programmable-import-source';

const createConnection = (
  overrides: Partial<{
    playwrightImportScript: string | null;
    playwrightImportActionId: string | null;
  }> = {}
) =>
  ({
    id: 'connection-1',
    integrationId: 'integration-1',
    name: 'Programmable',
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    playwrightImportScript: 'export default async function runImport() {}',
    playwrightImportActionId: 'import-action-1',
    ...overrides,
  }) as const;

describe('resolvePlaywrightProgrammableImportSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the programmable import script when one is configured', async () => {
    mocks.runPlaywrightProgrammableImportForConnectionMock.mockResolvedValue({
      products: [{ title: 'Imported product' }],
      rawResult: { ok: true },
    });

    await expect(
      resolvePlaywrightProgrammableImportSource({
        connection: createConnection(),
        input: { sourceUrl: 'https://example.test/import' },
      })
    ).resolves.toEqual({
      products: [{ title: 'Imported product' }],
      rawResult: { ok: true },
      source: {
        type: 'script',
        actionId: 'import-action-1',
        runId: null,
      },
    });

    expect(mocks.runPlaywrightProgrammableImportForConnectionMock).toHaveBeenCalledWith({
      connection: expect.objectContaining({ id: 'connection-1' }),
      input: { sourceUrl: 'https://example.test/import' },
    });
    expect(mocks.listPlaywrightActionRunsMock).not.toHaveBeenCalled();
  });

  it('falls back to the latest retained completed import action run when no script exists', async () => {
    mocks.listPlaywrightActionRunsMock.mockResolvedValue({
      runs: [{ runId: 'run-1' }],
      total: 1,
      nextCursor: null,
    });
    mocks.getPlaywrightActionRunDetailMock.mockResolvedValue({
      run: {
        runId: 'run-1',
        scrapedItems: [{ title: 'Retained product' }],
        result: {
          outputs: {
            result: {
              source: 'retained',
            },
          },
        },
      },
      steps: [
        {
          id: 'step-1',
          refId: 'title_fill',
          label: 'Fill title',
          status: 'failed',
        },
      ],
    });

    await expect(
      resolvePlaywrightProgrammableImportSource({
        connection: createConnection({
          playwrightImportScript: null,
        }),
        input: { sourceUrl: 'https://example.test/import' },
      })
    ).resolves.toEqual({
      products: [{ title: 'Retained product' }],
      rawResult: { source: 'retained' },
      source: {
        type: 'retained_action_run',
        actionId: 'import-action-1',
        runId: 'run-1',
        failedStepId: 'step-1',
        failedStepRefId: 'title_fill',
        failedStepLabel: 'Fill title',
      },
    });

    expect(mocks.listPlaywrightActionRunsMock).toHaveBeenCalledWith({
      actionId: 'import-action-1',
      status: 'completed',
      limit: 1,
    });
    expect(mocks.getPlaywrightActionRunDetailMock).toHaveBeenCalledWith('run-1');
    expect(mocks.runPlaywrightProgrammableImportForConnectionMock).not.toHaveBeenCalled();
  });

  it('throws when neither an import script nor a retained import action is configured', async () => {
    await expect(
      resolvePlaywrightProgrammableImportSource({
        connection: createConnection({
          playwrightImportScript: null,
          playwrightImportActionId: null,
        }),
        input: { sourceUrl: 'https://example.test/import' },
      })
    ).rejects.toThrow(
      'This connection does not have a Playwright import script or import action configured.'
    );
  });
});
