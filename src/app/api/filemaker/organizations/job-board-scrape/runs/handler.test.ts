import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancelFilemakerJobBoardScrapeRunMock: vi.fn(),
  readFilemakerJobBoardScrapeRunMock: vi.fn(),
  readLatestFilemakerJobBoardScrapeRunMock: vi.fn(),
  requireFilemakerMailAdminSessionMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: mocks.requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-job-board-scrape-runtime', () => ({
  cancelFilemakerJobBoardScrapeRun: mocks.cancelFilemakerJobBoardScrapeRunMock,
  readFilemakerJobBoardScrapeRun: mocks.readFilemakerJobBoardScrapeRunMock,
  readLatestFilemakerJobBoardScrapeRun: mocks.readLatestFilemakerJobBoardScrapeRunMock,
}));

import { postHandler as cancelRunHandler } from './[runId]/cancel/handler';
import { getHandler as getRunHandler } from './[runId]/handler';
import { getHandler as getLatestRunHandler } from './latest/handler';

const sourceUrl = 'https://www.pracuj.pl/praca/it;kw';

const snapshot = {
  events: [
    {
      at: '2026-04-28T10:00:00.000Z',
      message: 'Collecting job-board offer links.',
      type: 'status',
    },
  ],
  run: {
    completedAt: null,
    createdAt: '2026-04-28T10:00:00.000Z',
    error: null,
    id: 'run/with space',
    mode: 'preview',
    result: null,
    sourceUrl,
    startedAt: '2026-04-28T10:00:01.000Z',
    status: 'running',
    updatedAt: '2026-04-28T10:00:01.000Z',
  },
};

const request = new NextRequest(
  'http://localhost/api/filemaker/organizations/job-board-scrape/runs/run-1'
);
const context = { params: {} } as Parameters<typeof getLatestRunHandler>[1];

describe('filemaker job-board scrape run handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
    mocks.readLatestFilemakerJobBoardScrapeRunMock.mockResolvedValue(snapshot);
    mocks.readFilemakerJobBoardScrapeRunMock.mockResolvedValue(snapshot);
    mocks.cancelFilemakerJobBoardScrapeRunMock.mockResolvedValue({
      ...snapshot,
      run: { ...snapshot.run, completedAt: '2026-04-28T10:03:00.000Z', status: 'canceled' },
    });
  });

  it('returns the latest runtime snapshot', async () => {
    const response = await getLatestRunHandler(request, context);

    expect(mocks.requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(mocks.readLatestFilemakerJobBoardScrapeRunMock).toHaveBeenCalled();
    expect(response.headers.get('cache-control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      run: { id: 'run/with space', status: 'running' },
    });
  });

  it('returns a decoded runtime snapshot by run id', async () => {
    const response = await getRunHandler(request, context, {
      runId: encodeURIComponent('run/with space'),
    });

    expect(mocks.readFilemakerJobBoardScrapeRunMock).toHaveBeenCalledWith('run/with space');
    await expect(response.json()).resolves.toMatchObject({
      events: [expect.objectContaining({ type: 'status' })],
      run: { id: 'run/with space' },
    });
  });

  it('cancels a decoded runtime run', async () => {
    const response = await cancelRunHandler(request, context, {
      runId: encodeURIComponent('run/with space'),
    });

    expect(mocks.cancelFilemakerJobBoardScrapeRunMock).toHaveBeenCalledWith('run/with space');
    await expect(response.json()).resolves.toMatchObject({
      run: { id: 'run/with space', status: 'canceled' },
    });
  });
});
