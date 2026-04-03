/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  countDocuments: vi.fn(),
  createIndex: vi.fn(),
  find: vi.fn(),
  findLimit: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findSkip: vi.fn(),
  findSort: vi.fn(),
  findToArray: vi.fn(),
  getMongoDb: vi.fn(),
  insertOne: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import {
  createImageStudioRun,
  listImageStudioRuns,
  updateImageStudioRun,
} from '@/features/ai/image-studio/server/run-repository';

type CursorLike = {
  limit: typeof mocks.findLimit;
  skip: typeof mocks.findSkip;
  sort: typeof mocks.findSort;
  toArray: typeof mocks.findToArray;
};

const baseRequest = {
  projectId: 'project-1',
  prompt: 'hello world',
} as const;

describe('run-repository shared-lib', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00.000Z'));

    const cursor: CursorLike = {
      limit: mocks.findLimit,
      skip: mocks.findSkip,
      sort: mocks.findSort,
      toArray: mocks.findToArray,
    };

    mocks.countDocuments.mockReset();
    mocks.createIndex.mockReset().mockResolvedValue('ok');
    mocks.find.mockReset().mockReturnValue(cursor);
    mocks.findLimit.mockReset().mockReturnValue(cursor);
    mocks.findOneAndUpdate.mockReset();
    mocks.findSkip.mockReset().mockReturnValue(cursor);
    mocks.findSort.mockReset().mockReturnValue(cursor);
    mocks.findToArray.mockReset();
    mocks.getMongoDb.mockReset().mockResolvedValue({
      collection: (name: string) => {
        if (name !== 'image_studio_runs') return {};
        return {
          countDocuments: mocks.countDocuments,
          createIndex: mocks.createIndex,
          find: mocks.find,
          findOneAndUpdate: mocks.findOneAndUpdate,
          insertOne: mocks.insertOne,
        };
      },
    });
    mocks.insertOne.mockReset().mockResolvedValue({ acknowledged: true });
  });

  it('normalizes expected outputs when creating runs', async () => {
    const created = await createImageStudioRun({
      projectId: 'project-1',
      request: baseRequest,
      expectedOutputs: 20.8,
    });

    expect(created.expectedOutputs).toBe(10);
    expect(mocks.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'project-1',
        expectedOutputs: 10,
        historyEvents: [
          expect.objectContaining({
            type: 'accepted',
            source: 'api',
            payload: expect.objectContaining({
              expectedOutputs: 10,
              projectId: 'project-1',
              request: baseRequest,
            }),
          }),
        ],
      })
    );
  });

  it('normalizes expected outputs and appends trimmed history events when updating runs', async () => {
    mocks.findOneAndUpdate.mockResolvedValueOnce({
      _id: 'run-1',
      projectId: 'project-1',
      status: 'running',
      dispatchMode: 'queued',
      request: baseRequest,
      expectedOutputs: 1,
      outputs: [],
      errorMessage: null,
      createdAt: '2026-04-03T11:59:00.000Z',
      updatedAt: '2026-04-03T12:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      historyEvents: [],
    });

    const updated = await updateImageStudioRun('run-1', {
      status: 'running',
      expectedOutputs: 0,
      appendHistoryEvents: [
        {
          type: ' progress ',
          source: 'queue',
          message: ' queued ',
          payload: { step: 1 },
        },
      ],
    });

    expect(mocks.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'run-1' },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: 'running',
          expectedOutputs: 1,
          updatedAt: '2026-04-03T12:00:00.000Z',
        }),
        $push: {
          historyEvents: {
            $each: [
              expect.objectContaining({
                type: 'progress',
                source: 'queue',
                message: 'queued',
                at: '2026-04-03T12:00:00.000Z',
                payload: { step: 1 },
              }),
            ],
          },
        },
      }),
      { returnDocument: 'after' }
    );
    expect(updated).toEqual(expect.objectContaining({ expectedOutputs: 1 }));
  });

  it('normalizes list pagination bounds', async () => {
    mocks.findToArray.mockResolvedValueOnce([]);
    mocks.countDocuments.mockResolvedValueOnce(0);

    await listImageStudioRuns({
      limit: 999.4,
      offset: -5,
      projectId: 'project-1',
    });

    expect(mocks.find).toHaveBeenCalledWith({ projectId: 'project-1' });
    expect(mocks.findSkip).toHaveBeenCalledWith(0);
    expect(mocks.findLimit).toHaveBeenCalledWith(200);
  });
});
